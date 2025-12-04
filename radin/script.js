 // --- CONFIGURAÇÃO ---
 const SHIFT = 400; // Bit 1 = Base + 400Hz
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
		// Envelope suave
		gain.gain.setValueAtTime(0, startTime);
		gain.gain.linearRampToValueAtTime(1, startTime + 0.01);
		gain.gain.setValueAtTime(1, startTime + duration - 0.01);
		gain.gain.linearRampToValueAtTime(0, startTime + duration);
		osc.start(startTime);
		osc.stop(startTime + duration + 0.05);
	},
	send: async (text) => {
		TX.init();
		if (TX.ctx.state === 'suspended') await TX.ctx.resume();
		if (TX.isSending) return;
		TX.isSending = true;
		// Capturar configurações do momento do clique
		const txBaseFreq = parseInt(document.getElementById('txFreqBase').value);
		const bitLen = parseInt(document.getElementById('txSpeed').value);
		const bitSec = bitLen / 1000;
		const btn = document.getElementById('btnSend');
		const originalText = btn.innerHTML;
		btn.innerHTML = `<span class="animate-spin">↻</span> ENVIANDO...`;
		btn.classList.add('bg-red-600', 'cursor-not-allowed');
		// Limpar visualizador TX
		const vis = document.getElementById('txVisualizer');
		vis.innerHTML = '';
		// Agendar áudio
		let now = TX.ctx.currentTime + 0.5;
		// Funções locais de frequência baseadas na escolha do TX
		const getFreq1 = () => txBaseFreq + SHIFT;
		const getFreq0 = () => txBaseFreq;
		for (let i = 0; i < text.length; i++) {
			const charCode = text.charCodeAt(i);
			// Start Bit (Sempre 1)
			TX.playTone(getFreq1(), now, bitSec);
			TX.addVis(1, "START");
			now += bitSec;
			// 8 Bits de Dados
			for (let b = 0; b < 8; b++) {
				const bit = (charCode >> (7 - b)) & 1;
				const freq = bit === 1 ? getFreq1() : getFreq0();
				TX.playTone(freq, now, bitSec);
				TX.addVis(bit, bit);
				now += bitSec;
			}
			// Gap
			now += (bitSec * 2);
			TX.addVis('gap', 'GAP');
		}
		const totalTime = (now - TX.ctx.currentTime) * 1000;
		setTimeout(() => {
			TX.isSending = false;
			btn.innerHTML = originalText;
			btn.classList.remove('bg-red-600', 'cursor-not-allowed');
		}, totalTime);
	},
	addVis: (type, label) => {
		const vis = document.getElementById('txVisualizer');
		const el = document.createElement('div');
		el.className = `w-4 h-6 flex items-center justify-center text-[8px] rounded shrink-0 mb-1 ${
			type === 1 ? 'bg-green-600 text-white' : 
			type === 0 ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-600 w-2'
		}`;
		if(type !== 'gap') el.innerText = label === "START" ? "S" : label;
		vis.appendChild(el);
		vis.scrollTop = vis.scrollHeight;
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
	threshold: 40,
	start: async () => {
		try {
			RX.ctx = new (window.AudioContext || window.webkitAudioContext)();
			RX.analyser = RX.ctx.createAnalyser();
			RX.analyser.fftSize = 1024;
			RX.analyser.smoothingTimeConstant = 0.2;
			const stream = await navigator.mediaDevices.getUserMedia({ 
				audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false } 
			});
			const source = RX.ctx.createMediaStreamSource(stream);
			source.connect(RX.analyser);
			RX.isActive = true;
			RX.buffer = new Uint8Array(RX.analyser.frequencyBinCount);
			document.getElementById('btnListen').innerText = "OUVINDO...";
			document.getElementById('btnListen').classList.replace('bg-green-600', 'bg-red-500');
			document.getElementById('rxStateIndicator').innerText = "AGUARDANDO SINAL...";
			document.getElementById('rxStateIndicator').classList.add('animate-pulse');
			RX.loop();
		} catch (err) {
			alert("Erro Mic: " + err);
		}
	},
	getBinEnergy: (targetFreq) => {
		const nyquist = RX.ctx.sampleRate / 2;
		const index = Math.round((targetFreq / nyquist) * RX.analyser.frequencyBinCount);
		let sum = 0;
		for(let i = -1; i <= 1; i++) sum += RX.buffer[index + i] || 0;
		return sum / 3;
	},
	loop: () => {
		if (!RX.isActive) return;
		requestAnimationFrame(RX.loop);
		RX.analyser.getByteFrequencyData(RX.buffer);
		// Config dinâmica baseada no seletor RX
		const rxBaseFreq = parseInt(document.getElementById('rxFreqBase').value);
		const freq0 = rxBaseFreq;
		const freq1 = rxBaseFreq + SHIFT;
		// Desenhar
		RX.drawDebug(freq0, freq1);
		const energy0 = RX.getBinEnergy(freq0);
		const energy1 = RX.getBinEnergy(freq1);
		const maxEnergy = Math.max(energy0, energy1);
		
		// --- AJUSTE DINÂMICO DE VELOCIDADE NO RX ---
		// MODIFIED: Agora lê do seletor rxSpeed
		let currentBitLen = parseInt(document.getElementById('rxSpeed').value) || 100;
		
		const now = performance.now();
		// Máquina de Estados RX
		if (RX.state === 'IDLE') {
			if (maxEnergy < RX.threshold) RX.armed = true;
			if (RX.armed && energy1 > RX.threshold && energy1 > energy0 + 20) {
				RX.state = 'READING';
				RX.syncTime = now;
				RX.bits = [];
				RX.armed = false;
				
				document.getElementById('rxStateIndicator').innerText = "RECEBENDO...";
				document.getElementById('rxStateIndicator').className = "text-green-400 font-bold";
			}
		}
		else if (RX.state === 'READING') {
			const bitsLidos = RX.bits.length;
			const sampleTime = RX.syncTime + (currentBitLen * (1 + bitsLidos)) + (currentBitLen * 0.5);
			if (now >= sampleTime) {
				let bit = 0;
				if (maxEnergy >= RX.threshold) {
					bit = energy1 > energy0 ? 1 : 0;
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
				document.getElementById('rxStateIndicator').innerText = "AGUARDANDO...";
				document.getElementById('rxStateIndicator').className = "text-gray-500 animate-pulse";
			}
		}
	},
	processChar: () => {
		let charCode = 0;
		RX.bits.forEach(bit => { charCode = (charCode << 1) | bit; });
		if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13) {
			const char = String.fromCharCode(charCode);
			const term = document.getElementById('rxTerminal');
			let currentText = term.innerText;
			if (currentText.endsWith('_')) currentText = currentText.slice(0, -1);
			term.innerText = currentText + char + "_";
			term.scrollTop = term.scrollHeight;
			term.classList.remove('char-received');
			void term.offsetWidth;
			term.classList.add('char-received');
		}
	},
	drawDebug: (f0, f1) => {
		const cvs = document.getElementById('spectrumCanvas');
		const ctx = cvs.getContext('2d');
		const w = cvs.width;
		const h = cvs.height;
		ctx.fillStyle = 'rgba(0,0,0,0.2)';
		ctx.fillRect(0, 0, w, h);
		const barW = (w / RX.buffer.length) * 2;
		let x = 0;
		for(let i=0; i<RX.buffer.length; i++) {
			const v = RX.buffer[i];
			ctx.fillStyle = `rgb(0, ${v}, 0)`;
			ctx.fillRect(x, h - (v/2), barW, v/2);
			x += barW;
		}
		const e0 = RX.getBinEnergy(f0);
		const e1 = RX.getBinEnergy(f1);
		document.getElementById('debugLevel').innerText = `L:${e0.toFixed(0)} / H:${e1.toFixed(0)}`;
	}
};
// --- BINDINGS ---
window.onload = () => {
	document.getElementById('btnSend').onclick = () => {
		const txt = document.getElementById('txInput').value;
		if(txt) TX.send(txt);
	};
	
	document.getElementById('btnListen').onclick = RX.start;
	
	const cvs = document.getElementById('spectrumCanvas');
	cvs.width = cvs.offsetWidth;
	cvs.height = cvs.offsetHeight;
};