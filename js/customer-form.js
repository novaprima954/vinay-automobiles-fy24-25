// ==========================================
// CUSTOMER FORM PAGE LOGIC
// Shows all 3 forms in scrollable format
// ==========================================

let currentRecord = null;
let allRecords = []; // Store all records for filtering
let currentFilter = 'all'; // Current active filter

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
      allRecords = response.records || []; // Store all records
      displayRecords(allRecords); // Display all initially
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
    html += '      ' + record.variant + ' • ' + record.colour + ' • 📱 ' + record.mobileNo;
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
 * Parse accessories from database format
 * Format: "Seat Cover: Yes, Guard: Yes, Handle Cover: No"
 */
function parseAccessories(accessoriesString) {
  if (!accessoriesString || accessoriesString === 'None') {
    return 'None';
  }
  
  // Split by comma and filter only "Yes" items
  const items = accessoriesString.split(',').map(item => item.trim());
  const yesItems = [];
  
  items.forEach(function(item) {
    // Extract name before colon
    const parts = item.split(':');
    if (parts.length === 2) {
      const name = parts[0].trim();
      const value = parts[1].trim().toLowerCase();
      if (value === 'yes') {
        yesItems.push(name);
      }
    }
  });
  
  return yesItems.length > 0 ? yesItems.join(', ') : 'None';
}

/**
 * Open customer form - show all 3 pages in scrollable format
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
      
      // Populate Page 1 - Summary Section
      document.getElementById('formExecutive').textContent = currentRecord.executiveName || '-';
      
      // Parse and display accessories
      const accessoriesList = parseAccessories(currentRecord.accessories);
      document.getElementById('formAccessories').textContent = accessoriesList;
      
      // Populate Page 1 - Customer Details (Using variant instead of model)
      document.getElementById('formVariant').textContent = currentRecord.variant || '';
      document.getElementById('formColor').textContent = currentRecord.colour || '';
      document.getElementById('formEngineNo').textContent = currentRecord.engineNumber || '';
      document.getElementById('formChassisNo').textContent = currentRecord.frameNumber || '';
      document.getElementById('formCustomerName').textContent = currentRecord.customerName || '';
      document.getElementById('formMobileNo').textContent = currentRecord.mobileNo || '';
      document.getElementById('formFinancer').textContent = currentRecord.financierName || 'Cash';
      
      // Populate Form 60 (Page 2)
      populateForm60();
      
      // Conditionally show Page 3 based on financer
      const financierName = (currentRecord.financierName || 'Cash').toLowerCase().trim();
      const isCash = financierName === 'cash' || financierName === '';
      
      if (isCash) {
        // Hide Page 3 if payment is Cash
        document.getElementById('page3').style.display = 'none';
        console.log('✅ Page 3 hidden (Cash payment)');
      } else {
        // Show Page 3 if financed
        document.getElementById('page3').style.display = 'block';
        console.log('✅ Page 3 visible (Financed: ' + currentRecord.financierName + ')');
      }
      
      // Hide records container, show forms
      document.getElementById('recordsContainer').style.display = 'none';
      document.getElementById('formsWrapper').classList.add('active');
      document.getElementById('formActions').classList.add('active');
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      console.log('✅ All forms displayed');
      
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Error loading record:', error);
    showMessage('Failed to load record details', 'error');
  }
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
  const year = String(today.getFullYear()).slice(-1);
  
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
 * Share as PDF
 */
async function shareAsPDF() {
  console.log('📄 Generating PDF...');
  
  // Check if Web Share API is supported
  if (!navigator.share) {
    alert('❌ Share feature not supported on this browser.\n\nPlease use the Print button and save as PDF instead.');
    return;
  }
  
  try {
    showMessage('⏳ Generating PDF... Please wait.', 'info');
    
    // Fallback: Guide user to print to PDF
    alert('📄 Share as PDF\n\nTo share as PDF:\n1. Click "Print All Forms" button\n2. Select "Save as PDF" as the printer\n3. Save the file\n4. Share the saved PDF file');
    
    console.log('Showing print dialog for PDF generation');
    window.print();
    
  } catch (error) {
    console.error('Share error:', error);
    alert('❌ Failed to share PDF\n\nPlease use Print button and save as PDF instead.');
  }
}

/**
 * Close all forms and return to records list
 */
function closeAllForms() {
  console.log('Closing forms, returning to records list');
  
  // Hide forms
  document.getElementById('formsWrapper').classList.remove('active');
  document.getElementById('formActions').classList.remove('active');
  
  // Show records container
  document.getElementById('recordsContainer').style.display = 'block';
  
  // Clear current record
  currentRecord = null;
  
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
  
  if (type === 'success' || type === 'info') {
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

/**
 * Filter records by date
 */
function filterRecords(filterType) {
  console.log('Filtering by:', filterType);
  
  currentFilter = filterType;
  
  // Update active button
  document.querySelectorAll('.filter-btn').forEach(function(btn) {
    btn.classList.remove('filter-btn-active');
  });
  document.getElementById('filter' + filterType.charAt(0).toUpperCase() + filterType.slice(1).replace('7days', 'Next7').replace('thisMonth', 'Month').replace('all', 'All')).classList.add('filter-btn-active');
  
  // Clear search
  document.getElementById('searchInput').value = '';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let filtered = allRecords;
  
  if (filterType === 'today') {
    // Filter for today's delivery date
    filtered = allRecords.filter(function(record) {
      if (!record.deliveryDate) return false;
      const deliveryDate = parseDate(record.deliveryDate);
      return deliveryDate && deliveryDate.getTime() === today.getTime();
    });
  } else if (filterType === 'next7days') {
    // Filter for next 7 days
    const next7Days = new Date(today);
    next7Days.setDate(next7Days.getDate() + 7);
    
    filtered = allRecords.filter(function(record) {
      if (!record.deliveryDate) return false;
      const deliveryDate = parseDate(record.deliveryDate);
      return deliveryDate && deliveryDate >= today && deliveryDate <= next7Days;
    });
  } else if (filterType === 'thisMonth') {
    // Filter for this month
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    
    filtered = allRecords.filter(function(record) {
      if (!record.deliveryDate) return false;
      const deliveryDate = parseDate(record.deliveryDate);
      return deliveryDate && deliveryDate.getMonth() === thisMonth && deliveryDate.getFullYear() === thisYear;
    });
  }
  
  console.log('Filtered results:', filtered.length);
  displayRecords(filtered);
}

/**
 * Search records by customer name
 */
function searchRecords() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
  
  console.log('Searching for:', searchTerm);
  
  if (searchTerm === '') {
    // If search is empty, apply current filter
    filterRecords(currentFilter);
    return;
  }
  
  // Search in customer name
  const filtered = allRecords.filter(function(record) {
    return record.customerName && record.customerName.toLowerCase().includes(searchTerm);
  });
  
  console.log('Search results:', filtered.length);
  displayRecords(filtered);
}

/**
 * Parse date from string (handles various formats)
 */
function parseDate(dateString) {
  if (!dateString) return null;
  
  // Try to parse the date
  const date = new Date(dateString);
  
  // Check if valid date
  if (isNaN(date.getTime())) {
    return null;
  }
  
  // Reset time to midnight for comparison
  date.setHours(0, 0, 0, 0);
  return date;
}
