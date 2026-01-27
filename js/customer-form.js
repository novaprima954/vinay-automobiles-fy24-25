// ==========================================
// CUSTOMER FORM PAGE LOGIC
// Includes Customer Details Form + Form No. 60 (2 pages)
// ==========================================

let currentRecord = null;
let currentPage = 0;

// ==========================================
// PAGE INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('=== CUSTOMER FORM PAGE ===');
  
  // Check authentication
  const session = SessionManager.getSession();
  
  if (!session) {
    console.log('❌ No session - redirecting to login');
    alert('Please login first');
    window.location.href = 'index.html';
    return;
  }
  
  const user = session.user;
  
  // Check role access (sales, admin, and accounts)
  if (user.role !== 'admin' && user.role !== 'sales' && user.role !== 'accounts') {
    console.log('❌ Access denied for role:', user.role);
    alert('Access denied. Only sales, admin, and accounts can access this page.');
    window.location.href = 'home.html';
    return;
  }
  
  console.log('✅ Access granted:', user.name, '/', user.role);
  
  // Load records that meet criteria
  loadCustomerFormRecords();
});

/**
 * Load records that meet customer form criteria
 * Criteria: Engine Number filled AND Frame Number filled
 * Access: Sales (only theirs, Account Check ≠ Yes), Admin (all), Accounts (all)
 */
async function loadCustomerFormRecords() {
  const sessionId = SessionManager.getSessionId();
  const user = SessionManager.getCurrentUser();
  
  console.log('Loading customer form records for:', user.name);
  
  try {
    const response = await API.call('getCustomerFormRecords', {
      sessionId: sessionId
    });
    
    console.log('API Response:', response);
    
    if (response.success) {
      console.log('Number of records received:', response.records ? response.records.length : 0);
      displayRecords(response.records);
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Error loading records:', error);
    showMessage('Failed to load records', 'error');
  }
}

/**
 * Display records in list
 */
function displayRecords(records) {
  const listContainer = document.getElementById('recordsList');
  const emptyState = document.getElementById('emptyState');
  
  console.log('displayRecords called with:', records);
  
  if (!records || records.length === 0) {
    listContainer.style.display = 'none';
    emptyState.style.display = 'block';
    console.log('No records to display - showing empty state');
    return;
  }
  
  listContainer.style.display = 'block';
  emptyState.style.display = 'none';
  
  let html = '';
  
  records.forEach(function(record) {
    html += '<div class="record-item" onclick="openCustomerForm(\'' + record.receiptNo + '\')">';
    html += '  <div class="record-info">';
    html += '    <div class="record-receipt">Receipt: ' + record.receiptNo + '</div>';
    html += '    <div class="record-customer">' + record.customerName + '</div>';
    html += '    <div class="record-details">';
    html += '      ' + record.model + ' • ' + record.colour + ' • 📱 ' + record.mobileNo;
    html += '    </div>';
    html += '  </div>';
    html += '  <div class="record-badge">✓ Complete</div>';
    html += '</div>';
  });
  
  console.log('Setting innerHTML...');
  listContainer.innerHTML = html;
  console.log('✅ Records displayed successfully');
}

/**
 * Open customer form - show page selection
 */
async function openCustomerForm(receiptNo) {
  const sessionId = SessionManager.getSessionId();
  
  console.log('Opening customer form for receipt:', receiptNo);
  
  try {
    // Get full record details
    const response = await API.call('getRecordByReceiptNo', {
      sessionId: sessionId,
      receiptNo: receiptNo
    });
    
    if (response.success) {
      currentRecord = response.record;
      
      // Populate Page 1 (Customer Details)
      document.getElementById('formModel').textContent = currentRecord.model || '';
      document.getElementById('formColor').textContent = currentRecord.colour || '';
      document.getElementById('formEngineNo').textContent = currentRecord.engineNumber || '';
      document.getElementById('formChassisNo').textContent = currentRecord.frameNumber || '';
      document.getElementById('formCustomerName').textContent = currentRecord.customerName || '';
      document.getElementById('formMobileNo').textContent = currentRecord.mobileNo || '';
      document.getElementById('formFinancer').textContent = currentRecord.financierName || 'Cash';
      
      // Hide records container, show page selection
      document.getElementById('recordsContainer').style.display = 'none';
      document.getElementById('pageSelection').classList.add('active');
      
      console.log('✅ Page selection displayed');
      
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Error loading record:', error);
    showMessage('Failed to load record details', 'error');
  }
}

/**
 * Show specific page
 */
function showPage(pageNum) {
  console.log('Showing page:', pageNum);
  
  // Hide all pages
  document.getElementById('page1').classList.remove('active');
  document.getElementById('page2').classList.remove('active');
  document.getElementById('page3').classList.remove('active');
  
  // Show selected page
  document.getElementById('page' + pageNum).classList.add('active');
  
  // Hide page selection, show form actions
  document.getElementById('pageSelection').classList.remove('active');
  document.getElementById('formActions').style.display = 'flex';
  
  currentPage = pageNum;
  
  // If showing page 2, populate Form 60 data
  if (pageNum === 2) {
    populateForm60();
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  console.log('✅ Page ' + pageNum + ' displayed');
}

/**
 * Populate Form 60 with customer data and today's date
 */
function populateForm60() {
  if (!currentRecord) {
    console.error('No current record to populate Form 60');
    return;
  }
  
  console.log('Populating Form 60 for:', currentRecord.customerName);
  
  // Page 2: Name fields (uppercase)
  document.getElementById('form60Name1').textContent = currentRecord.customerName || '';
  document.getElementById('form60Name2').textContent = currentRecord.customerName || '';
  
  // Page 2: Today's date
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const month = months[today.getMonth()];
  const year = String(today.getFullYear()).slice(-1); // Last digit of year (e.g., "6" for 2026)
  
  document.getElementById('form60Day').textContent = day;
  document.getElementById('form60Month').textContent = month;
  document.getElementById('form60Year').textContent = year;
  
  console.log('✅ Form 60 populated with date:', day, month, '202' + year);
}

/**
 * Print all forms
 */
function printAllForms() {
  console.log('🖨️ Printing all forms...');
  window.print();
}

/**
 * Save to Google Drive (placeholder for future implementation)
 */
function saveToGoogleDrive() {
  alert('💾 Google Drive Integration\n\nThis feature will be available soon!\n\nIt will allow you to save all forms as PDF to your Google Drive.');
  
  // Future implementation:
  // 1. Use html2canvas to capture each page
  // 2. Generate PDF using jsPDF
  // 3. Upload to Google Drive via API
  // 4. Return shareable link
  
  console.log('Google Drive save requested (not yet implemented)');
}

/**
 * Close all forms and return to page selection
 */
function closeAllForms() {
  console.log('Closing forms, returning to page selection');
  
  // Hide all pages
  document.getElementById('page1').classList.remove('active');
  document.getElementById('page2').classList.remove('active');
  document.getElementById('page3').classList.remove('active');
  
  // Hide form actions
  document.getElementById('formActions').style.display = 'none';
  
  // Show page selection
  document.getElementById('pageSelection').classList.add('active');
  
  currentPage = 0;
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Close page selection and return to records list
 */
function closeToRecordsList() {
  console.log('Closing to records list');
  
  // Hide page selection
  document.getElementById('pageSelection').classList.remove('active');
  
  // Show records container
  document.getElementById('recordsContainer').style.display = 'block';
  
  // Clear current record
  currentRecord = null;
  currentPage = 0;
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Show message
 */
function showMessage(text, type) {
  const msg = document.getElementById('statusMessage');
  if (!msg) return;
  
  msg.textContent = text;
  msg.className = 'message ' + type;
  msg.classList.remove('hidden');
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  if (type === 'success') {
    setTimeout(function() {
      msg.classList.add('hidden');
    }, 3000);
  }
}

/**
 * Go back to home
 */
function goBack() {
  window.location.href = 'home.html';
}
