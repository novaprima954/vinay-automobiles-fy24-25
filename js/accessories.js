// ==========================================
// ACCESSORIES PAGE LOGIC - COMPLETE
// ==========================================

// Model-Variant-Accessory Configuration
const MODEL_VARIANTS = {
  'Jupiter 110': {
    accessories: ['Guard', 'Grip Cover', 'Seat Cover', 'Matin', 'Helmet']
  },
  'Jupiter 125': {
    accessories: ['Guard', 'Grip Cover', 'Seat Cover', 'Matin', 'Helmet']
  },
  'Ntorq': {
    accessories: ['Guard', 'Grip Cover', 'Seat Cover', 'Matin', 'Helmet']
  },
  'Radeon': {
    accessories: ['Helmet']
  },
  'Raider': {
    accessories: ['Helmet']
  },
  'Ronin': {
    accessories: ['Helmet']
  },
  'Sport': {
    accessories: ['Helmet']
  },
  'Star': {
    accessories: ['Helmet']
  },
  'XL 100': {
    accessories: ['Grip Cover', 'Seat Cover', 'Tank Cover', 'Handle Hook', 'Helmet']
  },
  'Zest': {
    accessories: ['Guard', 'Grip Cover', 'Seat Cover', 'Matin', 'Helmet']
  },
  'iQube': {
    accessories: ['Guard', 'Grip Cover', 'Seat Cover', 'Matin', 'Helmet']
  },
  'Orbiter': {
    accessories: ['Guard', 'Grip Cover', 'Seat Cover', 'Matin', 'Helmet']
  },
  'Apache': {
    accessories: ['Helmet']
  }
};

// Additional pending items to add to all models
const ADDITIONAL_PENDING_ITEMS = ['Buzzer', 'Mirror', 'Side Stand', 'Center Stand'];

/**
 * Get model config - case insensitive lookup
 */
function getModelConfig(modelName) {
  if (!modelName) return null;
  
  // Try exact match first
  if (MODEL_VARIANTS[modelName]) {
    return MODEL_VARIANTS[modelName];
  }
  
  // Try case-insensitive match
  const modelLower = modelName.toLowerCase();
  for (const key in MODEL_VARIANTS) {
    if (key.toLowerCase() === modelLower) {
      return MODEL_VARIANTS[key];
    }
  }
  
  return null;
}

let currentDashboardData = null;
let currentFilterStatus = null;

// ==========================================
// PAGE INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('=== ACCESSORIES PAGE ===');
  
  // Check authentication
  const session = SessionManager.getSession();
  
  if (!session) {
    console.log('❌ No session - redirecting to login');
    alert('Please login first');
    window.location.href = 'index.html';
    return;
  }
  
  const user = session.user;
  
  // Check role access (admin and accessories)
  if (user.role !== 'admin' && user.role !== 'accessories') {
    console.log('❌ Access denied for role:', user.role);
    alert('Access denied. Only admin and accessories can access this page.');
    window.location.href = 'home.html';
    return;
  }
  
  console.log('✅ Access granted:', user.name, '/', user.role);
  
  // Initialize page
  initializeAccessoriesPage(user);
  
  // Setup event listeners
  setupEventListeners();
  
  // Load dashboard
  populateMonthOptions();
  loadDashboard();
});

/**
 * Initialize accessories page
 */
function initializeAccessoriesPage(user) {
  document.getElementById('currentUser').textContent = user.name + ' (' + user.role + ')';
  console.log('✅ Accessories page initialized for:', user.name);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Month selector change
  document.getElementById('monthSelector').addEventListener('change', loadDashboard);
  
  // Search by change
  document.getElementById('searchBy').addEventListener('change', handleSearchByChange);
  
  // Date filter change
  document.getElementById('dateFilter').addEventListener('change', handleDateFilterChange);
  
  // Enter key in search
  document.getElementById('searchValue').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchRecords();
  });
}

/**
 * Populate month dropdown options
 */
function populateMonthOptions() {
  const select = document.getElementById('monthSelector');
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  select.innerHTML = '';
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(currentYear, currentMonth - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const value = year + '-' + month;
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    if (i === 0) option.selected = true;
    select.appendChild(option);
  }
}

/**
 * Load dashboard data
 */
async function loadDashboard() {
  const month = document.getElementById('monthSelector').value;
  const sessionId = SessionManager.getSessionId();
  
  console.log('Loading dashboard for month:', month);
  
  try {
    const response = await API.call('getAccessoryDashboardData', {
      sessionId: sessionId,
      month: month
    });
    
    if (response.success) {
      currentDashboardData = response.data;
      updateDashboardCards(response.data);
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    showMessage('Failed to load dashboard', 'error');
  }
}

/**
 * Update dashboard cards
 */
function updateDashboardCards(data) {
  document.getElementById('yesCount').textContent = data.yes || 0;
  document.getElementById('accountsYesAccessoryBlankCount').textContent = data.accountsYesAccessoryBlank || 0;
  document.getElementById('blankCount').textContent = data.blank || 0;
  document.getElementById('partialCount').textContent = data.partial || 0;
  document.getElementById('totalCount').textContent = data.total || 0;
  
  // Clear active state
  document.querySelectorAll('.stat-card').forEach(function(card) {
    card.classList.remove('active');
  });
  document.getElementById('exportBtn').style.display = 'none';
  currentFilterStatus = null;
}

/**
 * Filter by status (when clicking dashboard cards)
 */
async function filterByStatus(status) {
  currentFilterStatus = status;
  const month = document.getElementById('monthSelector').value;
  const sessionId = SessionManager.getSessionId();
  
  // Update active card
  document.querySelectorAll('.stat-card').forEach(function(card) {
    card.classList.remove('active');
  });
  
  if (status === 'yes') {
    document.querySelector('.complete-card').classList.add('active');
  } else if (status === 'accountsyes_accessoryblank') {
    document.querySelector('.accounts-verified-card').classList.add('active');
  } else if (status === 'blank') {
    document.querySelector('.not-started-card').classList.add('active');
  } else if (status === 'partial') {
    document.querySelector('.partial-card').classList.add('active');
  }
  
  console.log('Filtering by status:', status, 'for month:', month);
  
  try {
    const response = await API.call('getAccessoryFilteredData', {
      sessionId: sessionId,
      month: month,
      status: status
    });
    
    if (response.success) {
      displayResults(response.results);
      const statusText = status === 'yes' ? 'Complete' : 
                        status === 'accountsyes_accessoryblank' ? 'Account Check = Yes & Accessories = Blank' :
                        status === 'blank' ? 'Not Started' : 'Partially Complete';
      const title = statusText + ' (' + response.results.length + ' records)';
      showResultsSection(title);
      document.getElementById('exportBtn').style.display = 'inline-block';
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Filter error:', error);
    showMessage('Failed to filter records', 'error');
  }
}

/**
 * Handle search by dropdown change
 */
function handleSearchByChange() {
  const searchBy = document.getElementById('searchBy').value;
  const valueSection = document.getElementById('searchValueSection');
  const dateFilterSection = document.getElementById('dateFilterSection');
  const singleDateSection = document.getElementById('singleDateSection');
  const dateRangeFromSection = document.getElementById('dateRangeFromSection');
  const dateRangeToSection = document.getElementById('dateRangeToSection');
  
  if (searchBy === 'Delivery Date') {
    valueSection.style.display = 'none';
    dateFilterSection.style.display = 'block';
  } else {
    valueSection.style.display = 'block';
    dateFilterSection.style.display = 'none';
    singleDateSection.style.display = 'none';
    dateRangeFromSection.style.display = 'none';
    dateRangeToSection.style.display = 'none';
  }
}

/**
 * Handle date filter change
 */
function handleDateFilterChange() {
  const dateFilter = document.getElementById('dateFilter').value;
  const singleDateSection = document.getElementById('singleDateSection');
  const dateRangeFromSection = document.getElementById('dateRangeFromSection');
  const dateRangeToSection = document.getElementById('dateRangeToSection');
  
  singleDateSection.style.display = dateFilter === 'single' ? 'block' : 'none';
  dateRangeFromSection.style.display = dateFilter === 'range' ? 'block' : 'none';
  dateRangeToSection.style.display = dateFilter === 'range' ? 'block' : 'none';
}

/**
 * Search records
 */
async function searchRecords() {
  const searchBy = document.getElementById('searchBy').value;
  
  if (!searchBy) {
    showMessage('Please select a search criteria', 'error');
    return;
  }
  
  const searchValue = document.getElementById('searchValue').value.trim();
  const dateFilter = document.getElementById('dateFilter').value;
  const singleDate = document.getElementById('singleDate').value;
  const fromDate = document.getElementById('fromDate').value;
  const toDate = document.getElementById('toDate').value;
  
  if (searchBy === 'Delivery Date' && !dateFilter) {
    showMessage('Please select a date filter', 'error');
    return;
  }
  
  if (searchBy !== 'Delivery Date' && !searchValue) {
    showMessage('Please enter a search value', 'error');
    return;
  }
  
  const sessionId = SessionManager.getSessionId();
  
  console.log('Searching:', searchBy, '=', searchValue || dateFilter);
  
  // Clear dashboard filter
  document.querySelectorAll('.stat-card').forEach(function(card) {
    card.classList.remove('active');
  });
  document.getElementById('exportBtn').style.display = 'none';
  currentFilterStatus = null;
  
  try {
    const response = await API.call('searchAccessoryRecords', {
      sessionId: sessionId,
      searchBy: searchBy,
      searchValue: searchValue,
      dateFilter: dateFilter,
      singleDate: singleDate,
      fromDate: fromDate,
      toDate: toDate
    });
    
    if (response.success) {
      displayResults(response.results);
      showResultsSection('Manual Search Results (' + response.results.length + ' records)');
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Search error:', error);
    showMessage('Search failed. Please try again.', 'error');
  }
}

/**
 * Display search results
 */
function displayResults(results) {
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = '';
  
  console.log('=== SEARCH RESULTS ===');
  console.log('Total results:', results.length);
  if (results.length > 0) {
    console.log('First result sample:', results[0]);
  }
  
  if (results.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell(0);
    cell.colSpan = 6;
    cell.textContent = 'No records found';
    cell.style.textAlign = 'center';
    cell.style.padding = '20px';
    cell.style.color = '#999';
    return;
  }
  
  results.forEach(function(record) {
    const row = tbody.insertRow();
    row.style.cursor = 'pointer';
    row.onclick = function() { loadRecordDetails(record.row); };
    
    const accessoryStatus = record.accessoryFitted === 'Yes' ? 'Complete' :
                           record.accessoryFitted === 'No' ? 'Partially Complete' : 'Not Started';
    
    row.insertCell(0).textContent = record.receiptNo || '';
    row.insertCell(1).textContent = record.customerName || '';
    row.insertCell(2).textContent = record.mobileNo || '';
    row.insertCell(3).textContent = record.variant || record.variantName || '';  // Try both field names
    row.insertCell(4).textContent = record.deliveryDate || '';
    row.insertCell(5).textContent = accessoryStatus;
  });
}

/**
 * Show results section
 */
function showResultsSection(title) {
  document.getElementById('resultsTitle').textContent = title;
  document.getElementById('resultsSection').style.display = 'block';
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Load record details
 */
async function loadRecordDetails(row) {
  const sessionId = SessionManager.getSessionId();
  const user = SessionManager.getCurrentUser();
  
  console.log('Loading record at row:', row);
  
  try {
    const response = await API.call('getAccessoryRecordByRow', {
      sessionId: sessionId,
      row: row
    });
    
    if (response.success) {
      populateDetails(response.record, user);
      document.getElementById('detailsSection').style.display = 'block';
      document.getElementById('detailsSection').scrollIntoView({ behavior: 'smooth' });
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Load record error:', error);
    showMessage('Failed to load record details', 'error');
  }
}

/**
 * Populate record details
 */
function populateDetails(record, user) {
  console.log('=== POPULATE DETAILS ===');
  console.log('Full record data:', record);
  console.log('Model:', record.model);
  console.log('Variant:', record.variant);
  console.log('Guard:', record.guard);
  console.log('GripCover:', record.gripCover, 'gripcover:', record.gripcover);
  console.log('Pending:', record.pending);
  
  // Store values
  document.getElementById('selectedRow').value = record.row;
  document.getElementById('currentModel').value = record.model || '';
  document.getElementById('accountCheckValue').value = record.accountCheck || '';
  document.getElementById('accessoryFittedValue').value = record.accessoryFitted || '';
  
  // View-only fields
  document.getElementById('detailReceiptNo').textContent = record.receiptNo || '-';
  document.getElementById('detailExecName').textContent = record.execName || record.executiveName || '-';
  document.getElementById('detailDate').textContent = record.date || record.bookingDate || '-';
  document.getElementById('detailCustomerName').textContent = record.customerName || '-';
  document.getElementById('detailMobileNo').textContent = record.mobileNo || '-';
  document.getElementById('detailModel').textContent = record.model || '-';
  document.getElementById('detailVariant').textContent = record.variant || '-';
  document.getElementById('detailColour').textContent = record.colour || '-';
  document.getElementById('detailDeliveryDate').textContent = record.deliveryDate || '-';
  document.getElementById('detailSalesRemark').textContent = record.salesRemark || '-';
  document.getElementById('detailAccountantName').textContent = record.accountantName || '-';
  document.getElementById('detailAccountCheck').textContent = record.accountCheck || '-';
  document.getElementById('detailAccountRemark').textContent = record.accountRemark || '-';
  
  // Accessories ordered
  const accessoriesContainer = document.getElementById('accessoriesOrdered');
  accessoriesContainer.innerHTML = '';
  
  console.log('Checking MODEL_VARIANTS for:', record.model);
  
  const modelConfig = getModelConfig(record.model);
  console.log('Model config found:', modelConfig ? 'YES' : 'NO');
  
  if (modelConfig) {
    const accessories = modelConfig.accessories;
    console.log('Accessories for this model:', accessories);
    
    accessories.forEach(function(accessory) {
      const detailItem = document.createElement('div');
      detailItem.className = 'detail-item';
      
      const label = document.createElement('span');
      label.className = 'detail-label';
      label.textContent = accessory + ':';
      
      const value = document.createElement('span');
      value.className = 'detail-value';
      
      // Check both camelCase and lowercase variants of field names
      if (accessory === 'Guard') {
        value.textContent = record.guard || '-';
      } else if (accessory === 'Grip Cover') {
        value.textContent = record.gripCover || record.gripcover || '-';
      } else if (accessory === 'Seat Cover') {
        value.textContent = record.seatCover || record.seatcover || '-';
      } else if (accessory === 'Matin') {
        value.textContent = record.matin || '-';
      } else if (accessory === 'Tank Cover') {
        value.textContent = record.tankCover || record.tankcover || '-';
      } else if (accessory === 'Handle Hook') {
        value.textContent = record.handleHook || record.handlehook || '-';
      } else if (accessory === 'Helmet') {
        value.textContent = record.helmet || '-';
      }
      
      console.log('Accessory:', accessory, '-> Value:', value.textContent);
      
      detailItem.appendChild(label);
      detailItem.appendChild(value);
      accessoriesContainer.appendChild(detailItem);
    });
  } else {
    // If no model match, show a message
    console.log('⚠️ No MODEL_VARIANTS match found!');
    console.log('Available models in MODEL_VARIANTS:', Object.keys(MODEL_VARIANTS));
    accessoriesContainer.innerHTML = '<div style="color: #999; padding: 10px;">No accessories defined for this model: ' + (record.model || 'Unknown') + '</div>';
  }
  
  // Editable fields
  document.getElementById('accessoryCheckerName').value = record.accessoryCheckerName || user.name;
  document.getElementById('accessoryFitted').value = record.accessoryFitted || '';
  document.getElementById('accessoryRemark').value = record.accessoryRemark || '';
  document.getElementById('accessoryReceipt1').value = record.accessoryReceipt1 || '';
  document.getElementById('accessoryExtra').value = record.accessoryExtra || '';
  
  // Pending items
  populatePendingItems(record);
  
  // Check edit mode
  const accountCheck = record.accountCheck || '';
  const accessoryFitted = record.accessoryFitted || '';
  
  if (accountCheck !== 'Yes') {
    // BLOCKED - Account Check not Yes
    document.getElementById('viewOnlyBanner').style.display = 'none';
    document.getElementById('accountWarning').style.display = 'block';
    document.getElementById('limitedEditNote').style.display = 'none';
    setFieldsMode('blocked');
  } else if (accessoryFitted === 'Yes') {
    // LIMITED EDIT - Accessory Fitted is Yes
    document.getElementById('viewOnlyBanner').style.display = 'block';
    document.getElementById('accountWarning').style.display = 'none';
    document.getElementById('limitedEditNote').style.display = 'block';
    setFieldsMode('limited');
  } else {
    // FULL EDIT - Account Check = Yes and Accessory Fitted ≠ Yes
    document.getElementById('viewOnlyBanner').style.display = 'none';
    document.getElementById('accountWarning').style.display = 'none';
    document.getElementById('limitedEditNote').style.display = 'none';
    setFieldsMode('full');
  }
}

/**
 * Populate pending items with radio buttons for Pending/Customer Refused
 */
function populatePendingItems(record) {
  const pendingContainer = document.getElementById('pendingCheckboxes');
  pendingContainer.innerHTML = '';
  
  console.log('=== POPULATE PENDING ITEMS ===');
  console.log('Record model:', record.model);
  console.log('Pending string:', record.pending);
  console.log('Customer Refused string:', record.customerRefused);
  
  const pendingItemsStr = record.pending || '';
  const refusedItemsStr = record.customerRefused || ''; // New field for customer refused items
  
  const modelConfig = getModelConfig(record.model);
  
  if (modelConfig) {
    const accessories = modelConfig.accessories;
    const allPendingOptions = accessories.concat(ADDITIONAL_PENDING_ITEMS);
    
    console.log('All pending options for this model:', allPendingOptions);
    
    allPendingOptions.forEach(function(accessory) {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'pending-item';
      
      // Check status
      const isPending = pendingItemsStr.indexOf(accessory) !== -1;
      const isRefused = refusedItemsStr.indexOf(accessory) !== -1;
      
      console.log('Accessory:', accessory, '- Pending:', isPending, '- Refused:', isRefused);
      
      if (isPending) {
        itemDiv.classList.add('status-pending');
      } else if (isRefused) {
        itemDiv.classList.add('status-refused');
      }
      
      // Item name
      const nameSpan = document.createElement('span');
      nameSpan.className = 'pending-item-name';
      nameSpan.textContent = accessory;
      
      // Radio options
      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'pending-item-options';
      
      const radioName = 'pending_' + accessory.toLowerCase().replace(/ /g, '');
      
      // None option (default)
      const noneLabel = document.createElement('label');
      const noneRadio = document.createElement('input');
      noneRadio.type = 'radio';
      noneRadio.name = radioName;
      noneRadio.value = 'none';
      noneRadio.checked = !isPending && !isRefused;
      noneLabel.appendChild(noneRadio);
      noneLabel.appendChild(document.createTextNode('None'));
      
      // Pending option
      const pendingLabel = document.createElement('label');
      const pendingRadio = document.createElement('input');
      pendingRadio.type = 'radio';
      pendingRadio.name = radioName;
      pendingRadio.value = 'pending';
      pendingRadio.checked = isPending;
      pendingLabel.appendChild(pendingRadio);
      pendingLabel.appendChild(document.createTextNode('🔔 Pending'));
      
      // Customer Refused option
      const refusedLabel = document.createElement('label');
      const refusedRadio = document.createElement('input');
      refusedRadio.type = 'radio';
      refusedRadio.name = radioName;
      refusedRadio.value = 'refused';
      refusedRadio.checked = isRefused;
      refusedLabel.appendChild(refusedRadio);
      refusedLabel.appendChild(document.createTextNode('❌ Refused'));
      
      optionsDiv.appendChild(noneLabel);
      optionsDiv.appendChild(pendingLabel);
      optionsDiv.appendChild(refusedLabel);
      
      itemDiv.appendChild(nameSpan);
      itemDiv.appendChild(optionsDiv);
      pendingContainer.appendChild(itemDiv);
      
      // Add change listener to update visual state
      [noneRadio, pendingRadio, refusedRadio].forEach(function(radio) {
        radio.addEventListener('change', function() {
          itemDiv.classList.remove('status-pending', 'status-refused');
          if (pendingRadio.checked) {
            itemDiv.classList.add('status-pending');
          } else if (refusedRadio.checked) {
            itemDiv.classList.add('status-refused');
          }
        });
      });
    });
  } else {
    console.log('⚠️ No MODEL_VARIANTS match for pending items!');
    pendingContainer.innerHTML = '<div style="color: #999; padding: 10px;">Model not found in configuration</div>';
  }
}

/**
 * Set fields mode (blocked, limited, full)
 */
function setFieldsMode(mode) {
  const fields = ['accessoryFitted', 'accessoryRemark'];
  const alwaysEditableFields = ['accessoryReceipt1', 'accessoryExtra'];
  const updateBtn = document.getElementById('updateBtn');
  
  if (mode === 'blocked') {
    // BLOCKED MODE: Account Check ≠ Yes
    fields.forEach(function(id) {
      document.getElementById(id).disabled = true;
    });
    alwaysEditableFields.forEach(function(id) {
      document.getElementById(id).disabled = true;
    });
    
    // Disable all pending radio buttons
    document.querySelectorAll('#pendingCheckboxes input[type="radio"]').forEach(function(radio) {
      radio.disabled = true;
    });
    
    updateBtn.disabled = true;
    updateBtn.textContent = '🚫 Blocked - Account Check Required';
    updateBtn.style.background = '#dc3545';
    
  } else if (mode === 'limited') {
    // LIMITED EDIT MODE: Accessory Fitted = Yes
    // Disable main fields
    fields.forEach(function(id) {
      document.getElementById(id).disabled = true;
    });
    
    // Enable always-editable fields
    alwaysEditableFields.forEach(function(id) {
      document.getElementById(id).disabled = false;
    });
    
    // Enable all pending radio buttons (they can change status)
    document.querySelectorAll('#pendingCheckboxes input[type="radio"]').forEach(function(radio) {
      radio.disabled = false;
    });
    
    updateBtn.disabled = false;
    updateBtn.textContent = '💾 Update (Limited)';
    updateBtn.style.background = '#ff9800';
    
  } else {
    // FULL EDIT MODE: Account Check = Yes AND Accessory Fitted ≠ Yes
    fields.forEach(function(id) {
      document.getElementById(id).disabled = false;
    });
    alwaysEditableFields.forEach(function(id) {
      document.getElementById(id).disabled = false;
    });
    
    // Enable all pending radio buttons
    document.querySelectorAll('#pendingCheckboxes input[type="radio"]').forEach(function(radio) {
      radio.disabled = false;
    });
    
    updateBtn.disabled = false;
    updateBtn.textContent = '💾 Update';
    updateBtn.style.background = '#28a745';
  }
}

/**
 * Update record
 */
async function updateRecord() {
  const row = document.getElementById('selectedRow').value;
  const accountCheck = document.getElementById('accountCheckValue').value;
  
  if (!row) {
    showMessage('Please select a record first', 'error');
    return;
  }
  
  // Check Account Check
  if (accountCheck !== 'Yes') {
    showMessage('🚫 BLOCKED: Account Check must be "Yes" to update accessory information!', 'error');
    return;
  }
  
  // Validate mandatory fields
  const checkerName = document.getElementById('accessoryCheckerName').value.trim();
  const fitted = document.getElementById('accessoryFitted').value;
  
  if (!checkerName) {
    showMessage('⚠️ Accessory Checker Name is mandatory!', 'error');
    document.getElementById('accessoryCheckerName').focus();
    return;
  }
  
  if (!fitted) {
    showMessage('⚠️ Accessory Fitted is mandatory!', 'error');
    document.getElementById('accessoryFitted').focus();
    return;
  }
  
  // Get pending and customer refused items
  const model = document.getElementById('currentModel').value;
  const pendingItems = [];
  const refusedItems = [];
  
  const modelConfig = getModelConfig(model);
  
  if (modelConfig) {
    const accessories = modelConfig.accessories;
    const allPendingOptions = accessories.concat(ADDITIONAL_PENDING_ITEMS);
    
    allPendingOptions.forEach(function(accessory) {
      const radioName = 'pending_' + accessory.toLowerCase().replace(/ /g, '');
      const selectedRadio = document.querySelector('input[name="' + radioName + '"]:checked');
      
      if (selectedRadio) {
        if (selectedRadio.value === 'pending') {
          pendingItems.push(accessory);
        } else if (selectedRadio.value === 'refused') {
          refusedItems.push(accessory);
        }
      }
    });
  }
  
  const pendingString = pendingItems.join(', ');
  const refusedString = refusedItems.join(', ');
  
  const sessionId = SessionManager.getSessionId();
  const updateBtn = document.getElementById('updateBtn');
  updateBtn.disabled = true;
  updateBtn.textContent = '⏳ Updating...';
  
  try {
    const response = await API.call('updateAccessoryData', {
      sessionId: sessionId,
      row: row,
      checkerName: checkerName,
      fitted: fitted,
      remark: document.getElementById('accessoryRemark').value,
      pending: pendingString,
      customerRefused: refusedString,
      receipt1: document.getElementById('accessoryReceipt1').value,
      extra: document.getElementById('accessoryExtra').value
    });
    
    if (response.success) {
      showMessage('✅ ' + response.message, 'success');
      loadDashboard();
      setTimeout(closeDetails, 2000);
    } else {
      showMessage('❌ ' + response.message, 'error');
    }
  } catch (error) {
    console.error('Update error:', error);
    showMessage('❌ Update failed. Please try again.', 'error');
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = '💾 Update';
  }
}

/**
 * Export to Excel
 */
async function exportToExcel() {
  if (!currentFilterStatus) {
    showMessage('Please filter by a status first', 'error');
    return;
  }
  
  const month = document.getElementById('monthSelector').value;
  const sessionId = SessionManager.getSessionId();
  
  showMessage('Generating Excel file...', 'success');
  
  try {
    const response = await API.call('exportAccessoryToExcel', {
      sessionId: sessionId,
      month: month,
      status: currentFilterStatus
    });
    
    if (response.success) {
      showMessage('✅ Excel file created! Opening download...', 'success');
      window.open(response.fileUrl, '_blank');
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Export error:', error);
    showMessage('Export failed', 'error');
  }
}

/**
 * Close details section
 */
function closeDetails() {
  document.getElementById('detailsSection').style.display = 'none';
  document.getElementById('viewOnlyBanner').style.display = 'none';
  document.getElementById('accountWarning').style.display = 'none';
  document.getElementById('limitedEditNote').style.display = 'none';
}

/**
 * Go back to home
 */
function goBack() {
  window.location.href = 'home.html';
}

/**
 * Show message
 */
function showMessage(text, type) {
  const msg = document.getElementById('statusMessage');
  msg.textContent = text;
  msg.className = 'message ' + type;
  msg.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  setTimeout(function() {
    msg.classList.add('hidden');
  }, 5000);
}
