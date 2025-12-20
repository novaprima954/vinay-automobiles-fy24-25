// ==========================================
// OPERATOR UPDATE PAGE LOGIC
// ==========================================

let currentUser = null;
let currentRecord = null;

document.addEventListener('DOMContentLoaded', async function() {
  console.log('=== OPERATOR UPDATE PAGE ===');
  
  // Check authentication
  const session = SessionManager.getSession();
  
  if (!session) {
    console.log('❌ No session - redirecting to login');
    window.location.href = 'index.html';
    return;
  }
  
  currentUser = session.user;
  console.log('✅ User:', currentUser.name, '| Role:', currentUser.role);
  
  // Load pending counts
  await loadPendingCounts();
  
  // Setup number plate formatting
  document.getElementById('numberPlateDetails').addEventListener('input', formatNumberPlate);
  
  // Form submission
  document.getElementById('updateForm').addEventListener('submit', handleUpdate);
  
  // Check if redirected from pending list
  const urlParams = new URLSearchParams(window.location.search);
  const receiptNo = urlParams.get('receiptNo');
  if (receiptNo) {
    await loadRecordDetails(receiptNo);
  }
});

/**
 * Load pending counts
 */
async function loadPendingCounts() {
  try {
    const response = await API.getOperatorPendingCounts();
    
    if (response.success) {
      document.getElementById('dmsPendingCount').textContent = response.counts.dmsPending;
      document.getElementById('insurancePendingCount').textContent = response.counts.insurancePending;
      document.getElementById('vahanPendingCount').textContent = response.counts.vahanPending;
    }
  } catch (error) {
    console.error('Load counts error:', error);
  }
}

/**
 * Show pending list by type
 */
async function showPendingList(type) {
  showLoading(true);
  
  try {
    const response = await API.getOperatorPendingList(type);
    
    showLoading(false);
    
    if (response.success && response.results.length > 0) {
      displayResults(response.results);
    } else {
      showMessage('No pending records found', 'error');
    }
  } catch (error) {
    showLoading(false);
    console.error('Load pending list error:', error);
    showMessage('Error loading list', 'error');
  }
}

/**
 * Search records
 */
async function searchRecords() {
  const searchBy = document.getElementById('searchBy').value;
  const searchValue = document.getElementById('searchValue').value.trim();
  
  if (!searchValue) {
    showMessage('Please enter search term', 'error');
    return;
  }
  
  showLoading(true);
  
  try {
    const response = await API.searchOperatorRecords(searchBy, searchValue);
    
    showLoading(false);
    
    if (response.success) {
      if (response.results.length > 0) {
        displayResults(response.results);
      } else {
        showMessage('No records found', 'error');
      }
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    showLoading(false);
    console.error('Search error:', error);
    showMessage('Error searching records', 'error');
  }
}

/**
 * Display search results
 */
function displayResults(results) {
  const resultsList = document.getElementById('resultsList');
  const resultsSection = document.getElementById('resultsSection');
  
  document.getElementById('resultCount').textContent = results.length;
  
  resultsList.innerHTML = results.map(record => `
    <div class="result-item" onclick="loadRecordDetails('${record.receiptNo}')">
      <div class="result-name">${record.customerName}</div>
      <div class="result-details">
        Receipt: ${record.receiptNo} • ${record.variant || record.model}<br>
        📱 ${record.mobileNo} • Executive: ${record.executiveName}
      </div>
    </div>
  `).join('');
  
  resultsSection.style.display = 'block';
  
  // Scroll to results
  resultsSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Load record details for update
 */
async function loadRecordDetails(receiptNo) {
  showLoading(true);
  
  try {
    const response = await API.getOperatorRecordDetails(receiptNo);
    
    showLoading(false);
    
    if (response.success) {
      currentRecord = response.record;
      displayUpdateForm(response.record);
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    showLoading(false);
    console.error('Load details error:', error);
    showMessage('Error loading record', 'error');
  }
}

/**
 * Display update form with record details
 */
function displayUpdateForm(record) {
  // Display customer details
  document.getElementById('customerDetails').innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Receipt No:</span>
      <span class="detail-value">${record.receiptNo}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Customer Name:</span>
      <span class="detail-value">${record.customerName}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Variant:</span>
      <span class="detail-value">${record.variant || record.model}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Mobile No:</span>
      <span class="detail-value">${record.mobileNo}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Executive:</span>
      <span class="detail-value">${record.executiveName}</span>
    </div>
  `;
  
  // Setup DMS
  setupStatusSection('dms', record.dmsStatus, record.dmsDate, record.dmsOperator);
  
  // Setup Insurance
  setupStatusSection('insurance', record.insuranceStatus, record.insuranceDate, record.insuranceOperator);
  
  // Setup Vahan
  setupStatusSection('vahan', record.vahanStatus, record.vahanDate, record.vahanOperator);
  
  // Setup Number Plate
  document.getElementById('numberPlateDetails').value = record.numberPlateDetails || '';
  setupStatusSection('numberPlate', record.numberPlateFitted, record.numberPlateDate, record.numberPlateOperator);
  
  // Show update section
  document.getElementById('updateSection').style.display = 'block';
  document.getElementById('updateSection').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Setup status section (DMS/Insurance/Vahan/NumberPlate)
 */
function setupStatusSection(type, status, date, operator) {
  const section = document.getElementById(type + 'Section');
  const badge = document.getElementById(type + 'Badge');
  const info = document.getElementById(type + 'Info');
  const yesRadio = document.getElementById(type + 'Yes');
  const noRadio = document.getElementById(type + 'No');
  
  if (status === 'Yes') {
    // Locked
    section.classList.add('locked');
    badge.textContent = 'COMPLETED ✅';
    badge.className = 'status-badge badge-locked';
    info.textContent = `Completed on ${date} by ${operator}`;
    yesRadio.checked = true;
    yesRadio.disabled = true;
    noRadio.disabled = true;
    
    if (type === 'numberPlate') {
      document.getElementById('numberPlateDetails').disabled = true;
    }
  } else {
    // Editable
    section.classList.remove('locked');
    badge.textContent = 'PENDING';
    badge.className = 'status-badge badge-pending';
    info.textContent = '';
    
    if (status === 'No') {
      noRadio.checked = true;
    }
  }
}

/**
 * Format number plate as user types
 */
function formatNumberPlate(e) {
  let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let formatted = '';
  
  // XX-00-XX-0000
  if (value.length > 0) {
    formatted = value.substring(0, 2); // First 2 letters
  }
  if (value.length >= 3) {
    formatted += '-' + value.substring(2, 4); // 2 digits
  }
  if (value.length >= 5) {
    formatted += '-' + value.substring(4, 6); // 2 letters
  }
  if (value.length >= 7) {
    formatted += '-' + value.substring(6, 10); // 4 digits
  }
  
  e.target.value = formatted;
}

/**
 * Handle form submission
 */
async function handleUpdate(e) {
  e.preventDefault();
  
  const data = {
    dmsStatus: document.querySelector('input[name="dmsStatus"]:checked')?.value || '',
    insuranceStatus: document.querySelector('input[name="insuranceStatus"]:checked')?.value || '',
    vahanStatus: document.querySelector('input[name="vahanStatus"]:checked')?.value || '',
    numberPlateDetails: document.getElementById('numberPlateDetails').value.trim(),
    numberPlateFitted: document.querySelector('input[name="numberPlateFitted"]:checked')?.value || ''
  };
  
  // Validate: at least one field filled
  if (!data.dmsStatus && !data.insuranceStatus && !data.vahanStatus && !data.numberPlateDetails && !data.numberPlateFitted) {
    showMessage('Please fill at least one field', 'error');
    return;
  }
  
  // Validate number plate format if entered
  if (data.numberPlateDetails) {
    const plateRegex = /^[A-Z]{2}-\d{2}-[A-Z]{2}-\d{4}$/;
    if (!plateRegex.test(data.numberPlateDetails)) {
      showMessage('Invalid number plate format. Use: XX-00-XX-0000', 'error');
      return;
    }
  }
  
  // Hierarchy validation (client-side check)
  if (data.insuranceStatus === 'Yes' && currentRecord.dmsStatus !== 'Yes') {
    if (!confirm('⚠️ DMS is not completed yet. Insurance should only be marked after DMS. Continue anyway?')) {
      return;
    }
  }
  
  if (data.vahanStatus === 'Yes' && currentRecord.insuranceStatus !== 'Yes') {
    if (!confirm('⚠️ Insurance is not completed yet. Vahan should only be marked after Insurance. Continue anyway?')) {
      return;
    }
  }
  
  showLoading(true);
  
  try {
    const response = await API.updateOperatorStatus(currentRecord.receiptNo, data);
    
    showLoading(false);
    
    if (response.success) {
      showMessage('✅ Status updated successfully!', 'success');
      
      // Reload counts
      await loadPendingCounts();
      
      // Reload record to show updated status
      setTimeout(async () => {
        await loadRecordDetails(currentRecord.receiptNo);
      }, 1500);
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    showLoading(false);
    console.error('Update error:', error);
    showMessage('Error updating status', 'error');
  }
}

/**
 * Cancel update
 */
function cancelUpdate() {
  document.getElementById('updateSection').style.display = 'none';
  document.getElementById('resultsSection').style.display = 'none';
  currentRecord = null;
  
  // Reset form
  document.getElementById('updateForm').reset();
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Show/hide loading
 */
function showLoading(show) {
  document.getElementById('loadingState').style.display = show ? 'block' : 'none';
}

/**
 * Show message
 */
function showMessage(text, type) {
  const msgDiv = document.getElementById('statusMessage');
  msgDiv.textContent = text;
  msgDiv.className = 'message ' + type;
  msgDiv.style.display = 'block';
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  if (type === 'success') {
    setTimeout(() => {
      msgDiv.style.display = 'none';
    }, 3000);
  }
}

/**
 * Go back to home
 */
function goBack() {
  window.location.href = 'home.html';
}
