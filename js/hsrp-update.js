// ==========================================
// HSRP UPDATE PAGE - FRONTEND
// Two-step upload process for HSRP data
// ==========================================

console.log('=== HSRP UPDATE PAGE ===');

let step1File = null;
let step2File = null;
let step1Completed = false;

// ==========================================
// AUTHENTICATION CHECK
// ==========================================

window.addEventListener('DOMContentLoaded', async () => {
  const session = SessionManager.getSession();
  
  if (!session) {
    window.location.href = 'login.html';
    return;
  }
  
  // Validate session
  const validation = await API.validateSession(session.sessionId);
  
  if (!validation.success) {
    SessionManager.clearSession();
    window.location.href = 'login.html';
    return;
  }
  
  // Check role - only admin and operator
  if (validation.user.role !== 'admin' && validation.user.role !== 'operator') {
    alert('Access denied. This page is only for Admin and Operator users.');
    window.location.href = 'dashboard.html';
    return;
  }
  
  console.log('✅ User:', validation.user.name, '| Role:', validation.user.role);
  
  // Initialize upload areas
  initializeUploadArea('step1');
  initializeUploadArea('step2');
});

// ==========================================
// FILE UPLOAD HANDLING
// ==========================================

/**
 * Initialize upload area with drag & drop
 */
function initializeUploadArea(step) {
  const uploadArea = document.getElementById(`${step}UploadArea`);
  const fileInput = document.getElementById(`${step}FileInput`);
  
  // Click to upload
  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });
  
  // File selected
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(step, file);
    }
  });
  
  // Drag & drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(step, file);
    }
  });
}

/**
 * Handle file selection
 */
function handleFile(step, file) {
  console.log(`File selected for ${step}:`, file.name);
  
  // Validate file type
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showMessage(step, 'Invalid file type. Please upload CSV file only.', 'error');
    return;
  }
  
  // Store file
  if (step === 'step1') {
    step1File = file;
  } else {
    step2File = file;
  }
  
  // Show file info
  document.getElementById(`${step}FileName`).textContent = file.name;
  document.getElementById(`${step}FileSize`).textContent = formatFileSize(file.size);
  document.getElementById(`${step}FileInfo`).classList.add('show');
  document.getElementById(`${step}UploadBtn`).style.display = 'inline-flex';
  
  // Hide results
  document.getElementById(`${step}Results`).classList.remove('show');
  hideMessage(step);
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ==========================================
// STEP 1: UPLOAD V301 FILE
// ==========================================

async function uploadStep1() {
  if (!step1File) {
    showMessage('step1', 'Please select a file first', 'error');
    return;
  }
  
  console.log('Processing Step 1:', step1File.name);
  
  // Show loading
  document.getElementById('step1Spinner').classList.add('show');
  document.getElementById('step1UploadBtn').disabled = true;
  hideMessage('step1');
  
  try {
    // Convert file to base64
    const base64Data = await fileToBase64(step1File);
    console.log('File converted to base64, sending to backend...');
    
    // Call backend
    const response = await API.uploadV301File(base64Data, step1File.name);
    
    console.log('Step 1 response:', response);
    
    // Hide loading
    document.getElementById('step1Spinner').classList.remove('show');
    document.getElementById('step1UploadBtn').disabled = false;
    
    if (response.success) {
      // Show success
      showMessage('step1', response.message, 'success');
      
      // Update status
      document.getElementById('step1Status').textContent = 'Completed';
      document.getElementById('step1Status').className = 'step-status completed';
      
      // Show results
      displayStep1Results(response.results);
      
      // Mark step 1 as completed
      step1Completed = true;
      
      // Unlock step 2
      unlockStep2();
      
    } else {
      showMessage('step1', response.message, 'error');
    }
    
  } catch (error) {
    console.error('Error in uploadStep1:', error);
    document.getElementById('step1Spinner').classList.remove('show');
    document.getElementById('step1UploadBtn').disabled = false;
    showMessage('step1', 'Error uploading file: ' + error.message, 'error');
  }
}

/**
 * Display Step 1 results
 */
function displayStep1Results(results) {
  const resultsCard = document.getElementById('step1Results');
  
  let html = '<div class="results-stats">';
  html += `<div class="stat-box"><div class="stat-number">${results.total}</div><div class="stat-label">Total Rows</div></div>`;
  html += `<div class="stat-box"><div class="stat-number">${results.imported}</div><div class="stat-label">Imported</div></div>`;
  html += `<div class="stat-box"><div class="stat-number">${results.skipped}</div><div class="stat-label">Skipped (Duplicates)</div></div>`;
  html += '</div>';
  
  // Show skipped items
  if (results.skippedDetails && results.skippedDetails.length > 0) {
    html += '<div class="results-section">';
    html += '<h3>⚠️ Skipped Items (Invoice Already Exists)</h3>';
    html += '<div class="results-list">';
    results.skippedDetails.forEach(item => {
      html += `<div class="result-item">Invoice No: ${item.invoiceNo} - ${item.customerName}</div>`;
    });
    html += '</div></div>';
  }
  
  resultsCard.innerHTML = html;
  resultsCard.classList.add('show');
}

/**
 * Unlock Step 2
 */
function unlockStep2() {
  const step2Card = document.getElementById('step2Card');
  step2Card.classList.remove('locked');
  document.getElementById('step2Status').textContent = 'Ready';
  document.getElementById('step2Status').className = 'step-status pending';
  console.log('✅ Step 2 unlocked');
}

// ==========================================
// STEP 2: UPLOAD REGISTRATION FILE
// ==========================================

async function uploadStep2() {
  if (!step1Completed) {
    showMessage('step2', 'Please complete Step 1 first', 'error');
    return;
  }
  
  if (!step2File) {
    showMessage('step2', 'Please select a file first', 'error');
    return;
  }
  
  console.log('Processing Step 2:', step2File.name);
  
  // Show loading
  document.getElementById('step2Spinner').classList.add('show');
  document.getElementById('step2UploadBtn').disabled = true;
  hideMessage('step2');
  
  try {
    // Convert file to base64
    const base64Data = await fileToBase64(step2File);
    console.log('File converted to base64, sending to backend...');
    
    // Call backend
    const response = await API.uploadRegistrationFile(base64Data, step2File.name);
    
    console.log('Step 2 response:', response);
    
    // Hide loading
    document.getElementById('step2Spinner').classList.remove('show');
    document.getElementById('step2UploadBtn').disabled = false;
    
    if (response.success) {
      // Show success
      showMessage('step2', response.message, 'success');
      
      // Update status
      document.getElementById('step2Status').textContent = 'Completed';
      document.getElementById('step2Status').className = 'step-status completed';
      
      // Show results
      displayStep2Results(response.results);
      
    } else {
      showMessage('step2', response.message, 'error');
    }
    
  } catch (error) {
    console.error('Error in uploadStep2:', error);
    document.getElementById('step2Spinner').classList.remove('show');
    document.getElementById('step2UploadBtn').disabled = false;
    showMessage('step2', 'Error uploading file: ' + error.message, 'error');
  }
}

/**
 * Display Step 2 results
 */
function displayStep2Results(results) {
  const resultsCard = document.getElementById('step2Results');
  
  let html = '<div class="results-stats">';
  html += `<div class="stat-box"><div class="stat-number">${results.total}</div><div class="stat-label">Total Rows</div></div>`;
  html += `<div class="stat-box"><div class="stat-number">${results.updated}</div><div class="stat-label">Updated</div></div>`;
  html += `<div class="stat-box"><div class="stat-number">${results.skipped}</div><div class="stat-label">Skipped</div></div>`;
  html += `<div class="stat-box"><div class="stat-number">${results.notFound}</div><div class="stat-label">Not Found</div></div>`;
  html += '</div>';
  
  // Show not found items
  if (results.notFoundDetails && results.notFoundDetails.length > 0) {
    html += '<div class="results-section">';
    html += '<h3>❌ Frame Numbers Not Found</h3>';
    html += '<div class="results-list">';
    results.notFoundDetails.forEach(item => {
      html += `<div class="result-item">Frame No: ${item.frameNo} - Registration: ${item.registrationNo}</div>`;
    });
    html += '</div></div>';
  }
  
  // Show skipped items
  if (results.skippedDetails && results.skippedDetails.length > 0) {
    html += '<div class="results-section">';
    html += '<h3>⚠️ Skipped (Already Has Registration)</h3>';
    html += '<div class="results-list">';
    results.skippedDetails.forEach(item => {
      html += `<div class="result-item">Frame No: ${item.frameNo} - Current: ${item.currentReg}</div>`;
    });
    html += '</div></div>';
  }
  
  resultsCard.innerHTML = html;
  resultsCard.classList.add('show');
}

// ==========================================
// VIEW & DOWNLOAD DATA
// ==========================================

/**
 * View current HSRP data
 */
async function viewData() {
  console.log('Loading HSRP data...');
  
  try {
    const response = await API.getHSRPData();
    
    if (response.success) {
      displayDataTable(response.data);
    } else {
      alert('Error loading data: ' + response.message);
    }
    
  } catch (error) {
    console.error('Error viewing data:', error);
    alert('Error loading data: ' + error.message);
  }
}

/**
 * Display data in table
 */
function displayDataTable(data) {
  const tableBody = document.getElementById('dataTableBody');
  const tableContainer = document.getElementById('dataTableContainer');
  
  if (!data || data.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 40px;">No data found</td></tr>';
    tableContainer.style.display = 'block';
    return;
  }
  
  let html = '';
  data.forEach(row => {
    html += '<tr>';
    html += `<td>${row.srNo}</td>`;
    html += `<td>${row.invoiceNo}</td>`;
    html += `<td>${row.invoiceDate}</td>`;
    html += `<td>${row.status}</td>`;
    html += `<td>${row.mobileNo}</td>`;
    html += `<td>${row.customerName}</td>`;
    html += `<td>${row.frameNo}</td>`;
    html += `<td>${row.registrationNo}</td>`;
    html += `<td>${row.refCustomer}</td>`;
    html += `<td>${row.modelName}</td>`;
    html += `<td>${row.orderDate}</td>`;
    html += `<td>${row.fitmentDate}</td>`;
    html += '</tr>';
  });
  
  tableBody.innerHTML = html;
  tableContainer.style.display = 'block';
  
  console.log('✅ Data displayed:', data.length, 'rows');
}

/**
 * Download HSRP data as CSV
 */
async function downloadData() {
  console.log('Downloading HSRP data...');
  
  try {
    const response = await API.downloadHSRPData();
    
    if (response.success && response.csv) {
      // Create download
      const blob = new Blob([response.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'HSRP_Data_' + new Date().toISOString().split('T')[0] + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Download started');
    } else {
      alert('Error downloading data: ' + response.message);
    }
    
  } catch (error) {
    console.error('Error downloading data:', error);
    alert('Error downloading data: ' + error.message);
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Convert file to base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Show message
 */
function showMessage(step, text, type) {
  const messageEl = document.getElementById(`${step}Message`);
  messageEl.textContent = text;
  messageEl.className = `message ${type} show`;
}

/**
 * Hide message
 */
function hideMessage(step) {
  const messageEl = document.getElementById(`${step}Message`);
  messageEl.classList.remove('show');
}
