// ==========================================
// OPERATOR UPDATE PAGE LOGIC
// With Month Filter, Engine/Chassis, Workflow Validation
// ==========================================

let currentUser = null;
let currentRecord = null;
let currentMonth = '';

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
  
  // Populate month selector
  populateMonthSelector();
  
  // Load pending counts
  await loadPendingCounts();
  
  // Setup formatters
  document.getElementById('numberPlateDetails').addEventListener('input', formatNumberPlate);
  document.getElementById('engineNumber').addEventListener('input', formatVehicleNumber);
  document.getElementById('frameNumber').addEventListener('input', formatVehicleNumber);
  
  // Form submission
  document.getElementById('updateForm').addEventListener('submit', handleUpdate);
  
  // Check if redirected with receipt number
  const urlParams = new URLSearchParams(window.location.search);
  const receiptNo = urlParams.get('receiptNo');
  if (receiptNo) {
    await loadRecordDetails(receiptNo);
  }
});

/**
 * Populate month selector
 */
function populateMonthSelector() {
  const select = document.getElementById('monthFilter');
  const currentDate = new Date();
  
  // Generate last 12 months
  for (let i = 0; i < 12; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const option = document.createElement('option');
    option.value = `${year}-${month}`;
    option.textContent = monthName;
    select.appendChild(option);
  }
  
  // Set current month as default
  currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  select.value = currentMonth;
}

/**
 * Load pending counts with month filter
 */
async function loadPendingCounts() {
  currentMonth = document.getElementById('monthFilter').value;
  
  console.log('Loading counts for month:', currentMonth);
  
  try {
    const response = await API.getOperatorPendingCounts(currentMonth);
    
    if (response.success) {
      document.getElementById('dmsPendingCount').textContent = response.counts.dmsPending;
      document.getElementById('insurancePendingCount').textContent = response.counts.insurancePending;
      document.getElementById('vahanPendingCount').textContent = response.counts.vahanPending;
      
      console.log('Counts loaded:', response.counts);
    }
  } catch (error) {
    console.error('Load counts error:', error);
  }
}

/**
 * Show pending list by type
 */
async function showPendingList(type) {
  console.log('Loading pending list for:', type, 'Month:', currentMonth);
  
  showLoading(true);
  
  try {
    const response = await API.getOperatorPendingList(type, currentMonth);
    
    showLoading(false);
    
    if (response.success && response.results.length > 0) {
      displayResults(response.results);
    } else {
      showMessage('No pending records found for selected month', 'error');
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
 * Display search results with engine and chassis numbers
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
      <div class="result-vehicle-info">
        🔧 Engine: ${record.engineNumber || 'Not Set'} | 🔩 Chassis: ${record.frameNumber || 'Not Set'}
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
  console.log('Loading record:', receiptNo);
  
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
  console.log('=== Displaying Update Form ===');
  console.log('Record:', record);
  
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
  
  // Check if ALL statuses are complete (locked state)
  const allComplete = record.dmsStatus === 'Yes' && 
                      record.insuranceStatus === 'Yes' && 
                      record.vahanStatus === 'Yes';
  
  console.log('All Complete:', allComplete);
  console.log('Statuses - DMS:', record.dmsStatus, 'Insurance:', record.insuranceStatus, 'Vahan:', record.vahanStatus);
  
  // Setup Vehicle Numbers Section
  setupVehicleNumbers(record.engineNumber, record.frameNumber, allComplete);
  
  // Setup Status Sections
  setupStatusSection('dms', record.dmsStatus, record.dmsDate, record.dmsOperator, allComplete);
  setupStatusSection('insurance', record.insuranceStatus, record.insuranceDate, record.insuranceOperator, allComplete);
  setupStatusSection('vahan', record.vahanStatus, record.vahanDate, record.vahanOperator, allComplete);
  
  // Setup Number Plate
  document.getElementById('numberPlateDetails').value = record.numberPlateDetails || '';
  setupStatusSection('numberPlate', record.numberPlateFitted, record.numberPlateDate, record.numberPlateOperator, false);
  
  // Show update section
  document.getElementById('updateSection').style.display = 'block';
  document.getElementById('updateSection').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Setup vehicle numbers section with lock
 */
function setupVehicleNumbers(engineNumber, frameNumber, locked) {
  const engineInput = document.getElementById('engineNumber');
  const frameInput = document.getElementById('frameNumber');
  const lockedBadge = document.getElementById('vehicleLockedBadge');
  
  engineInput.value = engineNumber || '';
  frameInput.value = frameNumber || '';
  
  if (locked) {
    // LOCK: All statuses complete
    engineInput.disabled = true;
    frameInput.disabled = true;
    lockedBadge.style.display = 'inline-block';
    
    console.log('🔒 Vehicle numbers LOCKED (all statuses complete)');
  } else {
    // UNLOCK: Can edit
    engineInput.disabled = false;
    frameInput.disabled = false;
    lockedBadge.style.display = 'none';
    
    console.log('🔓 Vehicle numbers UNLOCKED');
  }
}

/**
 * Setup status section (DMS/Insurance/Vahan/NumberPlate)
 */
function setupStatusSection(type, status, date, operator, forceLocked) {
  const section = document.getElementById(type + 'Section');
  const badge = document.getElementById(type + 'Badge');
  const info = document.getElementById(type + 'Info');
  const yesRadio = document.getElementById(type + 'Yes');
  const noRadio = document.getElementById(type + 'No');
  
  // Individual status lock OR force lock (all complete)
  const isLocked = (status === 'Yes') || forceLocked;
  
  console.log(`Setup ${type}: status=${status}, forceLocked=${forceLocked}, isLocked=${isLocked}`);
  
  if (isLocked) {
    // LOCKED
    section.classList.add('locked');
    badge.textContent = 'COMPLETED ✅';
    badge.className = 'status-badge badge-locked';
    
    if (date && operator) {
      info.textContent = `Completed on ${date} by ${operator}`;
    } else if (forceLocked) {
      info.textContent = 'All steps completed - Status locked';
    }
    
    yesRadio.checked = (status === 'Yes');
    yesRadio.disabled = true;
    noRadio.disabled = true;
    
    if (type === 'numberPlate') {
      document.getElementById('numberPlateDetails').disabled = true;
    }
  } else {
    // UNLOCKED
    section.classList.remove('locked');
    badge.textContent = 'PENDING';
    badge.className = 'status-badge badge-pending';
    info.textContent = '';
    
    yesRadio.disabled = false;
    noRadio.disabled = false;
    
    if (status === 'Yes') {
      yesRadio.checked = true;
    } else if (status === 'No') {
      noRadio.checked = true;
    } else {
      yesRadio.checked = false;
      noRadio.checked = false;
    }
    
    if (type === 'numberPlate') {
      document.getElementById('numberPlateDetails').disabled = false;
    }
  }
}

/**
 * Format vehicle number as user types
 */
function formatVehicleNumber(e) {
  e.target.value = e.target.value.toUpperCase();
}

/**
 * Format number plate as user types
 */
function formatNumberPlate(e) {
  let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let formatted = '';
  
  // XX-00-XX-0000
  if (value.length > 0) {
    formatted = value.substring(0, 2);
  }
  if (value.length >= 3) {
    formatted += '-' + value.substring(2, 4);
  }
  if (value.length >= 5) {
    formatted += '-' + value.substring(4, 6);
  }
  if (value.length >= 7) {
    formatted += '-' + value.substring(6, 10);
  }
  
  e.target.value = formatted;
}

/**
 * Handle form submission with workflow validation
 */
async function handleUpdate(e) {
  e.preventDefault();
  
  const data = {
    dmsStatus: document.querySelector('input[name="dmsStatus"]:checked')?.value || '',
    insuranceStatus: document.querySelector('input[name="insuranceStatus"]:checked')?.value || '',
    vahanStatus: document.querySelector('input[name="vahanStatus"]:checked')?.value || '',
    numberPlateDetails: document.getElementById('numberPlateDetails').value.trim(),
    numberPlateFitted: document.querySelector('input[name="numberPlateFitted"]:checked')?.value || '',
    engineNumber: document.getElementById('engineNumber').value.trim(),
    frameNumber: document.getElementById('frameNumber').value.trim()
  };
  
  console.log('=== Form Submission ===');
  console.log('Form Data:', data);
  console.log('Current Record:', currentRecord);
  
  // Validate: at least one field filled
  if (!data.dmsStatus && !data.insuranceStatus && !data.vahanStatus && 
      !data.numberPlateDetails && !data.numberPlateFitted && 
      !data.engineNumber && !data.frameNumber) {
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
  
  // CRITICAL WORKFLOW VALIDATION
  // Get current statuses (what's already in database)
  const currentDMS = currentRecord.dmsStatus || '';
  const currentInsurance = currentRecord.insuranceStatus || '';
  const currentVahan = currentRecord.vahanStatus || '';
  
  // Get new statuses (what user is trying to set)
  const newDMS = data.dmsStatus || currentDMS;
  const newInsurance = data.insuranceStatus || currentInsurance;
  const newVahan = data.vahanStatus || currentVahan;
  
  console.log('Current: DMS=' + currentDMS + ', Insurance=' + currentInsurance + ', Vahan=' + currentVahan);
  console.log('New: DMS=' + newDMS + ', Insurance=' + newInsurance + ', Vahan=' + newVahan);
  
  // Rule 1: Insurance=Yes requires DMS=Yes
  if (newInsurance === 'Yes' && newDMS !== 'Yes') {
    showMessage('❌ Workflow Error: Insurance can only be "Yes" if DMS is "Yes"', 'error');
    return;
  }
  
  // Rule 2: Vahan=Yes requires Insurance=Yes
  if (newVahan === 'Yes' && newInsurance !== 'Yes') {
    showMessage('❌ Workflow Error: Vahan can only be "Yes" if Insurance is "Yes"', 'error');
    return;
  }
  
  console.log('✅ Workflow validation passed');
  
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
