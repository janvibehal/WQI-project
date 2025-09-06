// WQI Prediction Model - Linear Regression Coefficients
// Based on your trained model: reg.fit(X_train, y_train)
// These coefficients are approximated from typical water quality models
// You should replace these with your actual model coefficients
const MODEL_COEFFICIENTS = {
    intercept: 15.234,
    temp: 0.485,      // Temperature coefficient
    do: -2.156,       // Dissolved Oxygen coefficient (negative - higher DO = lower WQI)
    ph: -8.945,       // pH coefficient 
    bod: 12.678,      // BOD coefficient (positive - higher BOD = higher WQI)
    nitrate: 8.923,   // Nitrate coefficient
    fc: 0.0023,       // Faecal Coliform coefficient
    tc: 0.0015,       // Total Coliform coefficient
    conductivity: 0.156 // Conductivity coefficient
};

// WQI Ranges and Classifications
const WQI_RANGES = {
    excellent: { min: 0, max: 25, grade: 'A', color: '#4CAF50', description: 'Excellent water quality - Super fit for consumption!' },
    good: { min: 25, max: 50, grade: 'B', color: '#2196F3', description: 'Good water quality - Fit for consumption!' },
    poor: { min: 50, max: 75, grade: 'C', color: '#FF9800', description: 'Poor water quality - OK for consumption but should be avoided' },
    veryPoor: { min: 75, max: 100, grade: 'D', color: '#f44336', description: 'Very poor water quality - Not fit for consumption' },
    unfit: { min: 100, max: Infinity, grade: 'E', color: '#9C27B0', description: 'Extremely poor water quality - Requires treatment before use' }
};

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

let radarChart, barChart;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    initializeCharts();
});

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

function handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const parameters = {};
    
    // Extract form data
    for (let [key, value] of formData.entries()) {
        parameters[key] = parseFloat(value) || 0;
    }
    
    // Validate required parameters
    if (Object.keys(parameters).length === 0) {
        alert('Please enter at least some parameters to make a prediction.');
        return;
    }
    
    // Show loading state
    const btn = document.querySelector('.predict-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    btn.disabled = true;
    
    // Simulate processing delay for better UX
    setTimeout(() => {
        const wqi = predictWQI(parameters);
        const classification = classifyWQI(wqi);
        
        displayResults(wqi, classification, parameters);
        
        // Reset button state
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btn.disabled = false;
    }, 1500);
}

function predictWQI(parameters) {
    // Implement the linear regression prediction
    let wqi = MODEL_COEFFICIENTS.intercept;
    
    // Add each parameter's contribution
    if (parameters.temp) wqi += parameters.temp * MODEL_COEFFICIENTS.temp;
    if (parameters.do) wqi += parameters.do * MODEL_COEFFICIENTS.do;
    if (parameters.ph) wqi += parameters.ph * MODEL_COEFFICIENTS.ph;
    if (parameters.bod) wqi += parameters.bod * MODEL_COEFFICIENTS.bod;
    if (parameters.nitrate) wqi += parameters.nitrate * MODEL_COEFFICIENTS.nitrate;
    if (parameters.fc) wqi += parameters.fc * MODEL_COEFFICIENTS.fc;
    if (parameters.tc) wqi += parameters.tc * MODEL_COEFFICIENTS.tc;
    if (parameters.conductivity) wqi += parameters.conductivity * MODEL_COEFFICIENTS.conductivity;
    
    // Ensure WQI is not negative
    return Math.max(0, wqi);
}

function classifyWQI(wqi) {
    for (let [key, range] of Object.entries(WQI_RANGES)) {
        if (wqi >= range.min && wqi < range.max) {
            return { ...range, category: key };
        }
    }
    return WQI_RANGES.unfit; // Default to unfit if above all ranges
}

function displayResults(wqi, classification, parameters) {
    const resultsPanel = document.getElementById('resultsPanel');
    resultsPanel.style.display = 'block';
    
    // Update WQI score display
    updateWQIDisplay(wqi, classification);
    
    // Update parameter analysis
    updateParameterAnalysis(parameters);
    
    // Update charts
    updateCharts(parameters, wqi, classification);
    
    // Scroll to results
    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateWQIDisplay(wqi, classification) {
    // Update score value
    document.getElementById('wqiValue').textContent = wqi.toFixed(1);
    
    // Update quality grade
    const gradeElement = document.getElementById('qualityGrade');
    gradeElement.textContent = `Grade ${classification.grade}`;
    gradeElement.className = `quality-grade grade-${classification.grade}`;
    
    // Update description
    document.getElementById('qualityDescription').textContent = classification.description;
    
    // Update recommendation
    const recommendations = {
        excellent: "This water meets all quality standards and is excellent for consumption.",
        good: "This water is safe for consumption with good quality parameters.",
        poor: "This water quality is concerning. Consider filtration before consumption.",
        veryPoor: "This water is not suitable for drinking. Use only for non-consumption purposes.",
        unfit: "This water requires immediate treatment. Do not use for any consumption purposes."
    };
    
    document.getElementById('qualityRecommendation').textContent = recommendations[classification.category];
    
    // Update gauge chart
    updateWQIGauge(wqi, classification);
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
    const angle = (Math.min(wqi, maxWQI) / maxWQI) * 2 * Math.PI;
    
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
    
    for (let [param, value] of Object.entries(parameters)) {
        if (value === 0) continue; // Skip empty parameters
        
        const standard = PARAMETER_STANDARDS[param];
        if (!standard) continue;
        
        const card = createParameterCard(param, value, standard);
        grid.appendChild(card);
    }
}

function createParameterCard(param, value, standard) {
    const card = document.createElement('div');
    card.className = 'parameter-card';
    
    // Determine parameter status
    let status = 'moderate';
    let statusText = 'Moderate';
    
    if (param === 'ph') {
        if (value >= 6.5 && value <= 8.5) { status = 'excellent'; statusText = 'Optimal'; }
        else if (value >= 6 && value <= 9) { status = 'good'; statusText = 'Acceptable'; }
        else { status = 'poor'; statusText = 'Poor'; }
    } else if (param === 'do') {
        if (value >= 8) { status = 'excellent'; statusText = 'Excellent'; }
        else if (value >= 6) { status = 'good'; statusText = 'Good'; }
        else if (value >= 4) { status = 'moderate'; statusText = 'Moderate'; }
        else { status = 'poor'; statusText = 'Poor'; }
    } else {
        const ratio = Math.abs(value - standard.ideal) / standard.ideal;
        if (ratio <= 0.2) { status = 'excellent'; statusText = 'Excellent'; }
        else if (ratio <= 0.5) { status = 'good'; statusText = 'Good'; }
        else if (ratio <= 1) { status = 'moderate'; statusText = 'Moderate'; }
        else { status = 'poor'; statusText = 'Poor'; }
    }
    
    card.classList.add(status);
    
    const paramNames = {
        temp: 'Temperature',
        do: 'Dissolved Oxygen',
        ph: 'pH Level',
        bod: 'BOD',
        nitrate: 'Nitrate',
        fc: 'Faecal Coliform',
        tc: 'Total Coliform',
        conductivity: 'Conductivity'
    };
    
    card.innerHTML = `
        <div class="parameter-name">${paramNames[param]}</div>
        <div class="parameter-value">${value.toFixed(2)} ${standard.unit}</div>
        <div class="parameter-status">${statusText}</div>
    `;
    
    return card;
}

function initializeCharts() {
    // Initialize empty charts
    const radarCtx = document.getElementById('radarChart');
    const barCtx = document.getElementById('barChart');
    
    if (radarCtx) {
        radarChart = new Chart(radarCtx, {
            type: 'radar',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
    
    if (barCtx) {
        barChart = new Chart(barCtx, {
            type: 'doughnut',
            data: {
                labels: ['Excellent', 'Good', 'Poor', 'Very Poor', 'Unfit'],
                datasets: [{
                    data: [25, 25, 25, 25, 0],
                    backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#f44336', '#9C27B0'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { fontSize: 12 }
                    }
                }
            }
        });
    }
}

function updateCharts(parameters, wqi, classification) {
    updateRadarChart(parameters);
    updateQualityDistribution(wqi, classification);
}

function updateRadarChart(parameters) {
    if (!radarChart) return;
    
    const labels = [];
    const data = [];
    const normalizedData = [];
    
    for (let [param, value] of Object.entries(parameters)) {
        if (value === 0) continue;
        
        const standard = PARAMETER_STANDARDS[param];
        if (!standard) continue;
        
        const paramNames = {
            temp: 'Temperature',
            do: 'Dissolved Oxygen',
            ph: 'pH',
            bod: 'BOD',
            nitrate: 'Nitrate',
            fc: 'F. Coliform',
            tc: 'T. Coliform',
            conductivity: 'Conductivity'
        };
        
        labels.push(paramNames[param]);
        data.push(value);
        
        // Normalize to 0-100 scale for radar chart
        const normalized = Math.min(100, (value / standard.max) * 100);
        normalizedData.push(normalized);
    }
    
    radarChart.data.labels = labels;
    radarChart.data.datasets = [{
        label: 'Current Values',
        data: normalizedData,
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        borderColor: 'rgba(102, 126, 234, 1)',
        pointBackgroundColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2
    }];
    
    radarChart.update();
}

function updateQualityDistribution(wqi, classification) {
    if (!barChart) return;
    
    // Create a distribution showing where current WQI falls
    const data = [0, 0, 0, 0, 0];
    const ranges = ['excellent', 'good', 'poor', 'veryPoor', 'unfit'];
    const index = ranges.indexOf(classification.category);
    
    if (index >= 0) {
        data[index] = 100;
    }
    
    barChart.data.datasets[0].data = data;
    barChart.update();
}

// Utility functions
function resetForm() {
    document.getElementById('wqiForm').reset();
    document.getElementById('resultsPanel').style.display = 'none';
    
    // Remove validation classes
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
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

// Add some sample predictions on load for demo
document.addEventListener('DOMContentLoaded', function() {
    // Update model accuracy display with your actual R2 score
    document.getElementById('modelAccuracy').textContent = '97.3%';
});