// --- ESTADO DO APP ---
const state = {
    cycleLength: 28,
    periodLength: 5,
    history: [], // Lista de timestamps (apenas datas de INÍCIO)
};

let currentCalendarDate = new Date();
let selectedDetailDate = null;

// --- INICIALIZAÇÃO ---
function init() {
    const saved = localStorage.getItem('cicle_data');
    if (saved) {
        const data = JSON.parse(saved);
        state.cycleLength = parseInt(data.cycleLength);
        state.periodLength = parseInt(data.periodLength);
        state.history = data.history || [];
    } else {
        // Tenta migrar dados legados se existirem
        const old = localStorage.getItem('cicloAppData_v2');
        if(old) {
            const d = JSON.parse(old);
            state.cycleLength = d.cycleLength || 28;
            state.periodLength = d.periodLength || 5;
            state.history = d.history || [];
            saveState();
        } else {
            document.getElementById('settingsModal').classList.add('active');
        }
    }
    renderDashboard();
    renderCalendar();
}

function saveState() {
    localStorage.setItem('cicle_data', JSON.stringify(state));
    renderDashboard();
    renderCalendar();
}

// --- NAVEGAÇÃO ---
function switchTab(tab) {
    document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tab + '-view').classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
}

// --- LÓGICA DE DATAS ---
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function getDayStatus(targetDate) {
    if (state.history.length === 0) return { type: 'none', isPrediction: true };
    
    const targetTime = targetDate.getTime();
    const sortedHistory = [...state.history].sort((a,b) => b - a);
    
    let referenceStart = null;
    // Procura o registro passado mais próximo
    for (let t of sortedHistory) {
        if (t <= targetTime) {
            referenceStart = t;
            break;
        }
    }
    
    if (!referenceStart) return { type: 'none', isPrediction: true };
    
    const refDate = new Date(referenceStart);
    const diffTime = targetTime - refDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentCycleDay = (diffDays % state.cycleLength) + 1;
    
    let type = 'none';
    if (currentCycleDay <= state.periodLength) type = 'period';
    else {
        const ovulationDay = state.cycleLength - 14; 
        if (currentCycleDay === ovulationDay) type = 'ovulation';
        else if (currentCycleDay >= ovulationDay - 4 && currentCycleDay <= ovulationDay + 1) type = 'fertile';
    }
    
    const isFutureCycle = diffDays >= state.cycleLength;
    
    return { type, isPrediction: isFutureCycle, cycleDay: currentCycleDay, totalDaysSinceStart: diffDays };
}

// --- DASHBOARD ---
function renderDashboard() {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const status = getDayStatus(today);
    const display = document.getElementById('cycleDisplay');
    const dayText = document.getElementById('currentDayCycle');
    const phaseText = document.getElementById('phaseText');
    const lateWarning = document.getElementById('lateWarning');
    
    display.className = 'cycle-circle'; // Reset classes
    lateWarning.style.display = 'none';
    
    // Lógica de exibição principal
    if (state.history.length === 0) {
        dayText.innerText = "-";
        phaseText.innerText = "Configure o ciclo";
        return;
    }
    
    // Verifica se está atrasado (passou do dia do ciclo e não houve novo registro)
    // A lógica `getDayStatus` roda o ciclo infinitamente, então precisamos checar
    // se o dia atual é maior que a duração do ciclo baseado no ÚLTIMO registro real.
    const lastRecord = Math.max(...state.history);
    const daysSinceLastRecord = Math.floor((today.getTime() - lastRecord) / (1000 * 60 * 60 * 24)) + 1;
    
    if (daysSinceLastRecord > state.cycleLength) {
        // ESTÁ ATRASADO
        const daysLate = daysSinceLastRecord - state.cycleLength;
        dayText.innerText = daysSinceLastRecord;
        phaseText.innerText = "Atraso Menstrual";
        lateWarning.innerText = `+${daysLate} dias`;
        lateWarning.style.display = 'block';
        display.classList.add('late'); // Vermelho/Alerta
    } else {
        // CICLO NORMAL
        dayText.innerText = status.cycleDay;
        if (status.type === 'period') {
            display.classList.add('period');
            phaseText.innerText = "Menstruação";
        } else if (status.type === 'fertile' || status.type === 'ovulation') {
            display.classList.add('fertile');
            phaseText.innerText = status.type === 'ovulation' ? "Ovulação" : "Período Fértil";
        } else {
            phaseText.innerText = "Fase Segura";
        }
    }
    
    // Próxima menstruação (Previsão)
    if (state.history.length > 0) {
        const lastDateObj = new Date(lastRecord);
        let nextDate = new Date(lastDateObj);
        // Adiciona ciclos até passar de hoje
        while (nextDate <= today) {
            nextDate = addDays(nextDate, state.cycleLength);
        }
        document.getElementById('nextPeriodText').innerText = nextDate.toLocaleDateString('pt-BR');
    }
}

function logPeriodStart() {
    const today = new Date();
    today.setHours(0,0,0,0);
    toggleDateInHistory(today);
}

// --- CALENDÁRIO ---
function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
}

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    document.getElementById('calendarMonthYear').innerText = `${monthNames[month]} ${year}`;
    
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); 
    
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    
    for (let i = 0; i < startDayOfWeek; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell empty';
        grid.appendChild(empty);
    }
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const status = getDayStatus(date);
        
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.innerText = d;
        
        if (date.getTime() === today.getTime()) cell.classList.add('today');
        
        if (status.type === 'period') {
            if (status.isPrediction) cell.classList.add('future-period');
            else cell.classList.add('period');
        } else if (status.type === 'ovulation') {
            cell.classList.add('ovulation');
        } else if (status.type === 'fertile') {
            cell.classList.add('fertile');
        }
        
        cell.onclick = () => openDayDetail(date, status);
        grid.appendChild(cell);
    }
}

// --- MODAL DETALHES ---
function openDayDetail(date, status) {
    selectedDetailDate = date;
    const modal = document.getElementById('dayDetailModal');
    document.getElementById('detailDate').innerText = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    
    let statusText = "Fase do Ciclo";
    let htmlTags = "";
    
    if (status.type === 'period') {
        statusText = status.isPrediction ? "Previsão" : "Menstruação";
        htmlTags += `<span class="tag period">Dia ${status.cycleDay}</span>`;
    } else if (status.type === 'fertile') {
        statusText = "Chance Alta de Gravidez";
        htmlTags += `<span class="tag fertile">Fértil</span>`;
    } else if (status.type === 'ovulation') {
        statusText = "Pico de Ovulação";
        htmlTags += `<span class="tag fertile">Ovulação</span>`;
    } else {
        statusText = "Fase Segura";
    }
    
    document.getElementById('detailStatus').innerText = statusText;
    document.getElementById('detailTags').innerHTML = htmlTags;
    modal.classList.add('active');
}

function closeDayModal() {
    document.getElementById('dayDetailModal').classList.remove('active');
    selectedDetailDate = null;
}

function togglePeriodOnSelectedDate() {
    if (selectedDetailDate) {
        toggleDateInHistory(selectedDetailDate);
        closeDayModal();
    }
}

// --- CONFIGURAÇÕES ---
function openSettings() {
    document.getElementById('settingsModal').classList.add('active');
    document.getElementById('cycleLength').value = state.cycleLength;
    document.getElementById('periodLength').value = state.periodLength;
    
    // Preenche a data da última menstruação se houver histórico
    if (state.history.length > 0) {
        const latest = new Date(Math.max(...state.history));
        // Formata para YYYY-MM-DD para o input type="date"
        const isoDate = latest.toISOString().split('T')[0];
        document.getElementById('lastPeriodDateSetting').value = isoDate;
    }
}

function saveSettings() {
    state.cycleLength = parseInt(document.getElementById('cycleLength').value);
    state.periodLength = parseInt(document.getElementById('periodLength').value);
    
    // Lógica para salvar a data do input manual
    const dateInput = document.getElementById('lastPeriodDateSetting').value;
    if (dateInput) {
        // Cria data em timezone local
        const parts = dateInput.split('-');
        const newDate = new Date(parts[0], parts[1] - 1, parts[2]); 
        const newTime = newDate.getTime();
        
        // Se temos histórico, atualizamos o registro mais recente
        // (Assumindo que nas configs a pessoa quer ajustar o ciclo atual)
        if (state.history.length > 0) {
            // Remove o mais recente e adiciona o novo (para garantir ordem)
            state.history.sort((a,b) => b - a);
            state.history.shift(); // Remove o último (que é o primeiro do array ordenado)
            state.history.push(newTime);
        } else {
            // Se não tem histórico, cria um
            state.history.push(newTime);
        }
        // Reordena
        state.history.sort((a,b) => b - a);
    }
    
    document.getElementById('settingsModal').classList.remove('active');
    saveState();
}

// --- CORE DATA LOGIC ---
function toggleDateInHistory(date) {
    date.setHours(0,0,0,0);
    const time = date.getTime();
    const existingIndex = state.history.indexOf(time);
    
    if (existingIndex > -1) {
        if (confirm("Remover este registro?")) {
            state.history.splice(existingIndex, 1);
            saveState();
        }
    } else {
        state.history.push(time);
        state.history.sort((a,b) => b - a);
        saveState();
        // Feedback visual simples
        if (document.getElementById('home-view').classList.contains('active')) {
            // Apenas atualiza UI
        }
    }
}

init();