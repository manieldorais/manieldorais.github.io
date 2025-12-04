// --- CONSTANTES & UTILITÁRIOS ---
const SHIFT = 400; // Bit 1 = Base + 400Hz

// Helper para UI
const setGlobalStatus = (text, type = 'neutral') => {
	const elText = document.getElementById('globalStatusText');
	const elDot = document.getElementById('globalStatusDot');
	elText.innerText = text;
	
	elDot.className = 'w-1.5 h-1.5 rounded-full ';
	if(type === 'active') elDot.classList.add('bg-green-500', 'animate-pulse');
	else if(type === 'busy') elDot.classList.add('bg-blue-500', 'animate-pulse');
	else if(type === 'error') elDot.classList.add('bg-red-500');
	else elDot.classList.add('bg-gray-500');
};

document.getElementById('txInput').addEventListener('input', (e) => {
	document.getElementById('charCount').innerText = `${e.target.value.length} chars`;
});

// --- TRANSMISSOR (TX) ---
const TX = {
	ctx: null,
	isSending: false,
	
	init: () => {
		if (!TX.ctx) TX.ctx = new (window.AudioContext || window.webkitAudioContext)();
	},
	
	playTone: (freq, startTime, duration) => {
		const osc = TX.ctx.createOscillator();
		const gain = TX.ctx.createGain();
		osc.type = 'sine';
		osc.frequency.value = freq;
		osc.connect(gain);
		gain.connect(TX.ctx.destination);
		
		// Envelope suave (Fade in/out rápido para evitar cliques)
		gain.gain.setValueAtTime(0, startTime);
		gain.gain.linearRampToValueAtTime(1, startTime + 0.005); 
		gain.gain.setValueAtTime(1, startTime + duration - 0.005);
		gain.gain.linearRampToValueAtTime(0, startTime + duration);
		
		osc.start(startTime);
		osc.stop(startTime + duration + 0.02);
	},
	
	send: async (text) => {
		TX.init();
		if (TX.ctx.state === 'suspended') await TX.ctx.resume();
		if (TX.isSending) return;
		TX.isSending = true;
		
		// UI Start
		setGlobalStatus("ENVIANDO...", "busy");
		const btn = document.getElementById('btnSend');
		const btnText = document.getElementById('btnText');
		const btnIcon = document.getElementById('btnIcon');
		const progressContainer = document.getElementById('txProgressContainer');
		const progressBar = document.getElementById('txProgressBar');
		const progressPercent = document.getElementById('txPercentText');
		
		btn.disabled = true;
		btn.classList.add('opacity-50');
		btnText.innerText = "TRANSMITINDO...";
		btnIcon.classList.add('hidden'); // Ocultar ícone
		progressContainer.classList.remove('hidden');
		progressBar.style.width = '0%';
		
		// Config
		const txBaseFreq = parseInt(document.getElementById('txFreqBase').value);
		const bitLen = parseInt(document.getElementById('txSpeed').value);
		const bitSec = bitLen / 1000;
		
		const getFreq1 = () => txBaseFreq + SHIFT;
		const getFreq0 = () => txBaseFreq;
		
		let now = TX.ctx.currentTime + 0.2;
		const totalChars = text.length;
		
		// Limpar visualizador
		document.getElementById('txVisualizer').innerHTML = '';
		
		for (let i = 0; i < totalChars; i++) {
			const charCode = text.charCodeAt(i);
			
			// Start Bit (1)
			TX.playTone(getFreq1(), now, bitSec);
			TX.addVis(1);
			now += bitSec;
			
			// 8 Data Bits
			for (let b = 0; b < 8; b++) {
				const bit = (charCode >> (7 - b)) & 1;
				TX.playTone(bit ? getFreq1() : getFreq0(), now, bitSec);
				TX.addVis(bit);
				now += bitSec;
			}
			
			// Gap/Stop
			now += (bitSec * 2);
			TX.addVis(null); // Spacer
			
			// Update UI Progress Loop
			// Usamos setTimeout sincronizado com o tempo de áudio estimado para atualizar a barra visualmente
			const timeUntilCharFinish = (now - TX.ctx.currentTime) * 1000;
			setTimeout(() => {
				const pct = Math.round(((i + 1) / totalChars) * 100);
				progressBar.style.width = `${pct}%`;
				progressPercent.innerText = `${pct}%`;
			}, timeUntilCharFinish);
		}
		
		// Finish
		const totalTimeMs = (now - TX.ctx.currentTime) * 1000;
		setTimeout(() => {
			TX.isSending = false;
			btn.disabled = false;
			btn.classList.remove('opacity-50');
			btnText.innerText = "ENVIAR AGORA";
			btnIcon.classList.remove('hidden');
			setGlobalStatus("STANDBY");
			
			// Esconder barra após 1s
			setTimeout(() => {
				progressContainer.classList.add('hidden');
				progressBar.style.width = '0%';
			}, 1000);
			
		}, totalTimeMs);
	},
	
	addVis: (bit) => {
		const vis = document.getElementById('txVisualizer');
		const el = document.createElement('div');
		if (bit === null) {
			el.className = 'w-0.5 h-3 bg-gray-700/50';
		} else {
			el.className = `w-1.5 h-3 rounded-full ${bit ? 'bg-green-500' : 'bg-blue-600'}`;
		}
		vis.appendChild(el);
		if(vis.children.length > 30) vis.removeChild(vis.firstChild);
	}
};

// --- RECEPTOR (RX) ---
const RX = {
	ctx: null,
	analyser: null,
	buffer: new Uint8Array(0),
	isActive: false,
	state: 'IDLE',
	bits: [],
	syncTime: 0,
	armed: false,
	threshold: 40, // Sensibilidade
	
	// New Session Logic
	lastCharTime: 0,
	currentBubble: null,
	
	start: async () => {
		try {
			RX.ctx = new (window.AudioContext || window.webkitAudioContext)();
			RX.analyser = RX.ctx.createAnalyser();
			RX.analyser.fftSize = 1024;
			RX.analyser.smoothingTimeConstant = 0.3;
			
			const stream = await navigator.mediaDevices.getUserMedia({ 
				audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false } 
			});
			const source = RX.ctx.createMediaStreamSource(stream);
			source.connect(RX.analyser);
			
			RX.isActive = true;
			RX.buffer = new Uint8Array(RX.analyser.frequencyBinCount);
			
			// UI Transitions
			document.getElementById('rxStartOverlay').classList.add('hidden');
			document.getElementById('rxChatArea').classList.remove('hidden');
			document.getElementById('rxVisualizerContainer').classList.remove('hidden');
			setGlobalStatus("MICROFONE LIGADO", "active");
			
			RX.loop();
		} catch (err) {
			alert("Erro ao acessar microfone. Verifique as permissões.");
		}
	},
	
	getBinEnergy: (targetFreq) => {
		const nyquist = RX.ctx.sampleRate / 2;
		const index = Math.round((targetFreq / nyquist) * RX.analyser.frequencyBinCount);
		let sum = 0;
		// Média de 3 bins
		for(let i = -1; i <= 1; i++) sum += RX.buffer[index + i] || 0;
		return sum / 3;
	},
	
	loop: () => {
		if (!RX.isActive) return;
		requestAnimationFrame(RX.loop);
		
		RX.analyser.getByteFrequencyData(RX.buffer);
		
		const rxBaseFreq = parseInt(document.getElementById('rxFreqBase').value);
		const currentBitLen = parseInt(document.getElementById('rxSpeed').value) || 100;
		
		const freq0 = rxBaseFreq;
		const freq1 = rxBaseFreq + SHIFT;
		
		RX.drawDebug(freq0, freq1);
		
		const e0 = RX.getBinEnergy(freq0);
		const e1 = RX.getBinEnergy(freq1);
		const maxEnergy = Math.max(e0, e1);
		
		const now = performance.now();
		
		// State Machine
		if (RX.state === 'IDLE') {
			if (maxEnergy < RX.threshold) RX.armed = true;
			// Detect Start Bit (High/Freq1)
			if (RX.armed && e1 > RX.threshold && e1 > e0 + 15) {
				RX.state = 'READING';
				RX.syncTime = now;
				RX.bits = [];
				RX.armed = false;
				setGlobalStatus("RECEBENDO DADOS...", "active");
			}
		}
		else if (RX.state === 'READING') {
			const bitsLidos = RX.bits.length;
			// Sample no meio do bit
			const sampleTime = RX.syncTime + (currentBitLen * (1 + bitsLidos)) + (currentBitLen * 0.5);
			
			if (now >= sampleTime) {
				let bit = 0;
				if (maxEnergy >= RX.threshold) {
					bit = e1 > e0 ? 1 : 0;
				}
				RX.bits.push(bit);
				
				if (RX.bits.length === 8) {
					RX.processChar();
					RX.state = 'COOLDOWN';
					RX.cooldownEnd = now + currentBitLen;
				}
			}
		}
		else if (RX.state === 'COOLDOWN') {
			if (now > RX.cooldownEnd) {
				RX.state = 'IDLE';
				setGlobalStatus("MICROFONE LIGADO", "active");
			}
		}
	},
	
	processChar: () => {
		let charCode = 0;
		RX.bits.forEach(bit => { charCode = (charCode << 1) | bit; });
		
		// Filtro ASCII básico
		if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13) {
			const char = String.fromCharCode(charCode);
			const now = Date.now();
			const container = document.getElementById('rxMessagesContainer');
			
			// Lógica de nova sessão/balão
			// Se passou mais de 2 segundos desde o último caractere, cria novo balão
			if (now - RX.lastCharTime > 2000 || !RX.currentBubble) {
				const bubble = document.createElement('div');
				bubble.className = "msg-bubble bg-green-900/30 border border-green-800/50 p-3 rounded-xl rounded-tl-none self-start max-w-[90%] break-words shadow-sm font-mono text-green-400 text-lg leading-relaxed";
				container.appendChild(bubble);
				RX.currentBubble = bubble;
			}
			
			// Adicionar char ao balão atual
			RX.currentBubble.textContent += char;
			RX.lastCharTime = now;
			
			// Auto scroll
			const chatArea = document.getElementById('rxChatArea');
			chatArea.scrollTop = chatArea.scrollHeight;
		}
	},
	
	drawDebug: (f0, f1) => {
		const cvs = document.getElementById('spectrumCanvas');
		const ctx = cvs.getContext('2d');
		// Resize if needed
		if(cvs.width !== cvs.offsetWidth) {
			cvs.width = cvs.offsetWidth;
			cvs.height = cvs.offsetHeight;
		}
		
		const w = cvs.width;
		const h = cvs.height;
		
		ctx.fillStyle = 'rgba(2, 6, 23, 0.3)'; // Fade effect
		ctx.fillRect(0, 0, w, h);
		
		const barW = (w / RX.buffer.length) * 3; // Zoom um pouco
		let x = 0;
		
		for(let i=0; i<RX.buffer.length; i++) {
			const v = RX.buffer[i];
			if(v > 10) {
				ctx.fillStyle = `rgba(34, 197, 94, ${v/255})`;
				ctx.fillRect(x, h - (v/3), barW, v/3);
			}
			x += barW;
		}
		
		const eMax = Math.max(RX.getBinEnergy(f0), RX.getBinEnergy(f1));
		document.getElementById('debugLevel').innerText = eMax.toFixed(0);
	}
};

// --- BINDINGS ---
window.onload = () => {
	document.getElementById('btnSend').onclick = () => {
		const txt = document.getElementById('txInput').value;
		if(txt) TX.send(txt);
	};
	document.getElementById('btnListen').onclick = RX.start;
};