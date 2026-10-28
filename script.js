// Display metadata only (colours / wording per grade). The grade itself
// comes from the RandomForest classifier on the server, never computed here.
const API_BASE = 'https://ecodrop-ai.onrender.com';
const GRADE_INFO = {
    A: { color: '#4CAF50', description: 'Excellent water quality - Super fit for consumption!', recommendation: 'This water meets all quality standards and is excellent for consumption.' },
    B: { color: '#2196F3', description: 'Good water quality - Fit for consumption!', recommendation: 'This water is safe for consumption with good quality parameters.' },
    C: { color: '#FF9800', description: 'Poor water quality - OK for consumption but should be avoided', recommendation: 'This water quality is concerning. Consider filtration before consumption.' },
    D: { color: '#f44336', description: 'Very poor water quality - Not fit for consumption', recommendation: 'This water is not suitable for drinking. Use only for non-consumption purposes.' },
    E: { color: '#9C27B0', description: 'Extremely poor water quality - Requires treatment before use', recommendation: 'This water requires immediate treatment. Do not use for any consumption purposes.' }
};
const PARAM_LABELS = { temp: 'Temperature', do: 'Dissolved Oxygen', ph: 'pH Level', bod: 'BOD', nitrate: 'Nitrate', fc: 'Faecal Coliform', tc: 'Total Coliform', conductivity: 'Conductivity' };
const RADAR_LABELS = { temp: 'Temperature', do: 'Dissolved Oxygen', ph: 'pH', bod: 'BOD', nitrate: 'Nitrate', fc: 'F. Coliform', tc: 'T. Coliform', conductivity: 'Conductivity' };

// Parameter Standards and Ranges
const PARAMETER_STANDARDS = {
    temp: { ideal: 25, unit: '°C', min: 0, max: 40 },
    do: { ideal: 8, unit: 'mg/L', min: 5, max: 15 },
    ph: { ideal: 7, unit: '', min: 6.5, max: 8.5 },
    bod: { ideal: 1, unit: 'mg/L', min: 0, max: 5 },
    nitrate: { ideal: 0.5, unit: 'mg/L', min: 0, max: 10 },
    fc: { ideal: 0, unit: 'MPN/100mL', min: 0, max: 100 },
    tc: { ideal: 0, unit: 'MPN/100mL', min: 0, max: 500 },
    conductivity: { ideal: 200, unit: 'µmho/cm', min: 50, max: 1000 }
};

let radarChart;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    initializeCharts();
    drawEmptyGauge();
    loadModelInfo();
});

async function loadModelInfo() {
    try {
        const res = await fetch('/api/model-info');
        const info = await res.json();
        document.getElementById('totalSamples').textContent = info.samples;
        document.getElementById('modelAccuracy').textContent = info.r2_test + '%';
    } catch (e) { /* server not reachable; leave placeholders */ }
}

function setupEventListeners() {
    const form = document.getElementById('wqiForm');
    form.addEventListener('submit', handleFormSubmit);
    
    // Add input validation
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', validateInput);
        input.addEventListener('blur', validateInput);
    });
}

function validateInput(event) {
    const input = event.target;
    const value = parseFloat(input.value);
    const paramName = input.name;
    
    if (isNaN(value) || value < 0) return;
    
    // Add visual feedback for parameter ranges
    const standard = PARAMETER_STANDARDS[paramName];
    if (standard) {
        input.classList.remove('excellent', 'good', 'moderate', 'poor');
        
        if (paramName === 'ph') {
            if (value >= 6.5 && value <= 8.5) input.classList.add('excellent');
            else if (value >= 6 && value <= 9) input.classList.add('good');
            else input.classList.add('poor');
        } else if (paramName === 'do') {
            if (value >= 8) input.classList.add('excellent');
            else if (value >= 6) input.classList.add('good');
            else if (value >= 4) input.classList.add('moderate');
            else input.classList.add('poor');
        } else {
            // General classification based on ideal values
            const ratio = Math.abs(value - standard.ideal) / standard.ideal;
            if (ratio <= 0.2) input.classList.add('excellent');
            else if (ratio <= 0.5) input.classList.add('good');
            else if (ratio <= 1) input.classList.add('moderate');
            else input.classList.add('poor');
        }
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    // Raw inputs only - blank stays blank (server mean-imputes optional fields)
    const payload = {};
    for (let [key, value] of new FormData(event.target).entries()) {
        payload[key] = value;
    }

    const btn = document.querySelector('.predict-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    btn.disabled = true;

    try {
        const res = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Prediction failed');
        displayResults(result);
    } catch (err) {
        alert(err instanceof TypeError
            ? 'Cannot reach the ML server. Run "python app.py" and open http://localhost:5000'
            : err.message);
    } finally {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btn.disabled = false;
    }
}

function displayResults(result) {
    updateWQIDisplay(result.wqi, result.grade);
    updateParameterAnalysis(result.parameters);
    updateRadarChart(result.parameters);
}

function updateWQIDisplay(wqi, grade) {
    const info = GRADE_INFO[grade];
    document.getElementById('wqiValue').textContent = wqi.toFixed(1);

    const gradeElement = document.getElementById('qualityGrade');
    gradeElement.textContent = `Grade ${grade}`;
    gradeElement.className = `quality-grade grade-${grade}`;

    document.getElementById('qualityDescription').textContent = info.description;
    document.getElementById('qualityRecommendation').textContent = info.recommendation;

    updateWQIGauge(wqi, info);
}

function updateWQIGauge(wqi, classification) {
    const canvas = document.getElementById('wqiGauge');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;
    
    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 20;
    ctx.stroke();
    
    // Draw WQI arc
    const maxWQI = 150; // Maximum WQI for display
    const angle = (Math.max(0, Math.min(wqi, maxWQI)) / maxWQI) * 2 * Math.PI;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + angle);
    ctx.strokeStyle = classification.color;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Add gradient effect
    const gradient = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
    gradient.addColorStop(0, classification.color + '80');
    gradient.addColorStop(1, classification.color);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + angle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function updateParameterAnalysis(parameters) {
    const grid = document.getElementById('parametersGrid');
    grid.innerHTML = '';
    parameters.forEach(p => grid.appendChild(createParameterCard(p)));
}

function createParameterCard(p) {
    const statusText = { excellent: 'Lowers WQI', good: 'Slightly lowers WQI', moderate: 'Slightly raises WQI', poor: 'Raises WQI' };
    const unit = PARAMETER_STANDARDS[p.key].unit;
    const sign = p.contribution > 0 ? '+' : '';

    const card = document.createElement('div');
    card.className = 'parameter-card ' + p.status;
    card.innerHTML = `
        <div class="parameter-name">${PARAM_LABELS[p.key]}</div>
        <div class="parameter-value">${p.value.toFixed(2)} ${unit}${p.imputed ? ' (avg. used)' : ''}</div>
        <div class="parameter-status">${statusText[p.status]} (${sign}${p.contribution.toFixed(1)})</div>
    `;
    return card;
}

function initializeCharts() {
    // Initialize empty charts
    const radarCtx = document.getElementById('radarChart');
    
    if (radarCtx) {
        radarChart = new Chart(radarCtx, {
            type: 'radar',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { display: false, backdropColor: 'transparent', stepSize: 25 },
                        pointLabels: { font: { size: 11 } }
                    }
                }
            }
        });
    }
}

// Radar: where each submitted value sits within the training dataset (percentile, from server)
function updateRadarChart(parameters) {
    if (!radarChart) return;
    radarChart.options.scales.r.ticks.display = true;
    radarChart.data.labels = parameters.map(p => RADAR_LABELS[p.key]);
    radarChart.data.datasets = [{
        label: 'Percentile in training data',
        data: parameters.map(p => p.percentile),
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        borderColor: 'rgba(102, 126, 234, 1)',
        pointBackgroundColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2
    }];
    radarChart.update();
}

// Utility functions
function drawEmptyGauge() {
    const canvas = document.getElementById('wqiGauge');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, 2 * Math.PI);
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 20;
    ctx.stroke();
}

function resetForm() {
    document.getElementById('wqiForm').reset();

    // Clear results (panel stays visible so the layout never shifts)
    document.getElementById('wqiValue').textContent = '--';
    const grade = document.getElementById('qualityGrade');
    grade.textContent = '--';
    grade.className = 'quality-grade';
    document.getElementById('qualityDescription').textContent = 'Enter parameters to get prediction';
    document.getElementById('qualityRecommendation').textContent = '';
    document.getElementById('parametersGrid').innerHTML = '';
    drawEmptyGauge();
    if (radarChart) {
        radarChart.options.scales.r.ticks.display = false;
        radarChart.data.labels = [];
        radarChart.data.datasets = [];
        radarChart.update();
    }

    document.querySelectorAll('input').forEach(input => {
        input.classList.remove('excellent', 'good', 'moderate', 'poor');
    });
}

function loadSampleData() {
    // Load the sample data from your code: [29.5,10.15,6.85,4.3,2.35,86.5,159.5,288]
    const sampleData = {
        temp: 29.5,
        do: 10.15,
        ph: 6.85,
        bod: 4.3,
        nitrate: 2.35,
        fc: 86.5,
        tc: 159.5,
        conductivity: 288
    };
    
    for (let [param, value] of Object.entries(sampleData)) {
        const input = document.getElementById(param);
        if (input) {
            input.value = value;
            validateInput({ target: input });
        }
    }
}

// Modal functions
function showModal() {
    document.getElementById('infoModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('infoModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('infoModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}