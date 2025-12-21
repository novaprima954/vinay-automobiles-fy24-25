// ==========================================
// ACCOUNTS PAGE LOGIC - WITH PRICEMASTER
// ==========================================

// Global variable for current receipt (for price calculation)
let currentReceiptNo = null;
let currentReceipt1Amount = 0;  // Store receipt 1 amount (read-only)
let currentStatus = '';

// Cache for variants to avoid repeated API calls
const variantCache = {};
const priceMasterCache = {};

// Debounce timer for search
let searchDebounceTimer = null;

// ==========================================
// PAGE INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('=== ACCOUNTS PAGE ===');
  
  // Check authentication
  const session = SessionManager.getSession();
  
  if (!session) {
    console.log('❌ No session - redirecting to login');
    alert('Please login first');
    window.location.href = 'index.html';
    return;
  }
  
  const user = session.user;
  
  // Check role access (only accounts and admin)
  if (user.role !== 'admin' && user.role !== 'accounts') {
    console.log('❌ Access denied for role:', user.role);
    alert('Access denied. Only admin and accounts can access this page.');
    window.location.href = 'home.html';
    return;
  }
  
  console.log('✅ Access granted:', user.name, '/', user.role);
  
  // Initialize page
  initializeAccountsPage(user);
  
  // Setup event listeners
  setupEventListeners();
  
  // Load dashboard
  populateMonthOptions();
  loadDashboard();
});

/**
 * Initialize accounts page
 */
function initializeAccountsPage(user) {
  document.getElementById('currentUser').textContent = user.name + ' (' + user.role + ')';
  console.log('✅ Accounts page initialized for:', user.name);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Month filter change
  const monthFilter = document.getElementById('monthFilter');
  if (monthFilter) {
    monthFilter.addEventListener('change', loadDashboard);
  }
  
  // Search by change
  const searchBy = document.getElementById('searchBy');
  if (searchBy) {
    searchBy.addEventListener('change', handleSearchByChange);
  }
  
  // Date filter change
  const dateFilter = document.getElementById('dateFilter');
  if (dateFilter) {
    dateFilter.addEventListener('change', handleDateFilterChange);
  }
  
  // Financier change
  const financierName = document.getElementById('financierName');
  if (financierName) {
    financierName.addEventListener('change', handleFinancierChange);
  }
  
  // Calculate totals on amount changes
  ['receipt2Amount', 'receipt3Amount', 'receipt4Amount', 'disbursedAmount', 'finalPrice', 'financeComm'].forEach(function(id) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', calculateTotals);
    }
  });
  
  // Form submission
  const accountsForm = document.getElementById('accountsForm');
  if (accountsForm) {
    accountsForm.addEventListener('submit', handleUpdate);
  }
  
  // Enter key in search
  const searchValue = document.getElementById('searchValue');
  if (searchValue) {
    searchValue.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') searchRecords();
    });
  }
}

/**
 * Populate month dropdown options
 */
function populateMonthOptions() {
  const select = document.getElementById('monthFilter');
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  select.innerHTML = '';
  
  // Add "All Months" option
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All Months';
  select.appendChild(allOption);
  
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
  const monthFilter = document.getElementById('monthFilter');
  const month = monthFilter ? monthFilter.value : '';
  const sessionId = SessionManager.getSessionId();
  
  console.log('🔍 Loading dashboard...');
  console.log('  Month filter value:', month);
  console.log('  Session ID:', sessionId);
  
  try {
    const response = await API.getAccountsDashboard(sessionId, month);
    
    console.log('📊 Dashboard response:', JSON.stringify(response, null, 2));
    console.log('  Response keys:', Object.keys(response));
    console.log('  Response.success:', response.success);
    
    if (response.success) {
      // Backend returns: accountCheckYes, accountCheckNo, accountCheckBlank
      const yesCount = response.accountCheckYes || 0;
      const noCount = response.accountCheckNo || 0;
      const blankCount = response.accountCheckBlank || 0;
      
      console.log('  ✅ Yes Count:', yesCount);
      console.log('  ⚠️ No Count:', noCount);
      console.log('  ⭕ Blank Count:', blankCount);
      
      document.getElementById('countYes').textContent = yesCount;
      document.getElementById('countNo').textContent = noCount;
      document.getElementById('countBlank').textContent = blankCount;
    } else {
      console.error('❌ Dashboard error:', response.message);
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('❌ Dashboard exception:', error);
    showMessage('Failed to load dashboard', 'error');
  }
}

/**
 * Filter by status (when clicking dashboard cards)
 */
async function filterByStatus(status) {
  currentStatus = status;
  const month = document.getElementById('monthFilter').value;
  const sessionId = SessionManager.getSessionId();
  
  // Update active card
  document.querySelectorAll('.stat-card').forEach(function(card) {
    card.classList.remove('active');
  });
  event.currentTarget.classList.add('active');
  
  console.log('Filtering by status:', status, 'for month:', month);
  
  try {
    const response = await API.getAccountsByStatus(sessionId, month, status);
    
    if (response.success) {
      displayResults(response.results);
      const statusLabel = status === '' ? 'BLANK' : status.toUpperCase();
      showMessage(response.results.length + ' records found with Account Check = ' + statusLabel, 'success');
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
  
  // These sections may not exist in simplified HTML
  if (searchBy === 'Booking Date' && dateFilterSection) {
    if (valueSection) valueSection.style.display = 'none';
    dateFilterSection.style.display = 'block';
  } else {
    if (valueSection) valueSection.style.display = 'block';
    if (dateFilterSection) dateFilterSection.style.display = 'none';
  }
}

/**
 * Handle date filter change
 */
function handleDateFilterChange() {
  const dateFilter = document.getElementById('dateFilter');
  if (!dateFilter) return;
  
  const singleDateSection = document.getElementById('singleDateSection');
  const dateRangeFromSection = document.getElementById('dateRangeFromSection');
  const dateRangeToSection = document.getElementById('dateRangeToSection');
  
  if (!singleDateSection) return;
  
  if (dateFilter.value === 'Single Date') {
    singleDateSection.style.display = 'block';
    if (dateRangeFromSection) dateRangeFromSection.style.display = 'none';
    if (dateRangeToSection) dateRangeToSection.style.display = 'none';
  } else if (dateFilter.value === 'Date Range') {
    singleDateSection.style.display = 'none';
    if (dateRangeFromSection) dateRangeFromSection.style.display = 'block';
    if (dateRangeToSection) dateRangeToSection.style.display = 'block';
  }
}

/**
 * Search records
 */
async function searchRecords() {
  const searchBy = document.getElementById('searchBy').value;
  const searchValue = document.getElementById('searchValue').value.trim();
  const sessionId = SessionManager.getSessionId();
  
  if (!searchValue) {
    showMessage('Please enter a search value', 'error');
    return;
  }
  
  console.log('Searching:', searchBy, '=', searchValue);
  
  try {
    const response = await API.searchAccountsRecords(sessionId, searchBy, searchValue, null, null, null, null);
    
    if (response.success) {
      displayResults(response.results);
      showMessage(response.results.length + ' record(s) found', 'success');
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Search error:', error);
    showMessage('Failed to search records', 'error');
  }
}

/**
 * Display search/filter results
 */
function displayResults(results) {
  const container = document.getElementById('resultsContainer');
  const tbody = document.getElementById('resultsBody');
  
  if (!container || !tbody) return;
  
  tbody.innerHTML = '';
  
  if (results.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #999;">No records found</td></tr>';
    container.style.display = 'block';
    return;
  }
  
  results.forEach(function(record) {
    const tr = document.createElement('tr');
    tr.onclick = function() { loadRecordDetails(record.receiptNo); };
    
    const statusClass = record.accountCheck === 'Yes' ? 'status-yes' : 
                       record.accountCheck === 'No' ? 'status-no' : 'status-blank';
    const statusText = record.accountCheck || 'BLANK';
    
    tr.innerHTML = `
      <td>${record.receiptNo || '-'}</td>
      <td>${record.customerName || '-'}</td>
      <td>${record.model || '-'}</td>
      <td>${record.bookingDate || '-'}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td><button class="btn-view" onclick="event.stopPropagation(); loadRecordDetails('${record.receiptNo}');">View</button></td>
    `;
    
    tbody.appendChild(tr);
  });
  
  container.style.display = 'block';
}

/**
 * Load record details
 */
async function loadRecordDetails(receiptNo) {
  console.log('Loading record:', receiptNo);
  
  try {
    const sessionId = SessionManager.getSessionId();
    const response = await API.getRecordByReceiptNo(sessionId, receiptNo);
    
    if (response.success) {
      await populateDetails(response.record);
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
 * Populate record details - WITH PRICEMASTER INTEGRATION
 */
async function populateDetails(record) {
  const user = SessionManager.getCurrentUser();
  
  // SET CURRENT RECEIPT NO FOR PRICE CALCULATION
  currentReceiptNo = record.receiptNo;
  currentReceipt1Amount = parseFloat(record.receipt1Amount) || 0;
  
  console.log('Populating details for receipt:', currentReceiptNo);
  
  // Protected fields
  document.getElementById('receiptNoDisplay').textContent = record.receiptNo || '-';
  document.getElementById('protectedExecutiveName').textContent = record.executiveName || '-';
  document.getElementById('protectedBookingDate').textContent = record.bookingDate || '-';
  document.getElementById('protectedCustomerName').textContent = record.customerName || '-';
  document.getElementById('protectedMobileNo').textContent = record.mobileNo || '-';
  document.getElementById('protectedModel').textContent = record.model || '-';
  document.getElementById('protectedVariant').textContent = record.variant || '-';
  document.getElementById('protectedColour').textContent = record.colour || '-';
  document.getElementById('protectedDeliveryDate').textContent = record.deliveryDate || '-';
  document.getElementById('protectedReceiptNo1').textContent = record.receiptNo1 || '-';
  document.getElementById('protectedReceipt1Amount').textContent = record.receipt1Amount ? '₹' + record.receipt1Amount : '-';
  document.getElementById('protectedSalesRemark').textContent = record.salesRemark || 'N/A';
  
  // Editable sales fields
  document.getElementById('discount').value = record.discount || '';
  document.getElementById('finalPrice').value = record.finalPrice || '';
  
  // Financier
  const standardFinanciers = ['Cash', 'TVS Credit', 'Shriram Finance', 'Hinduja Finance', 
                              'Janan SFB', 'TATA Capital', 'Indusind Bank', 'Berar Finance', 'IDFC'];
  
  if (standardFinanciers.includes(record.financierName)) {
    document.getElementById('financierName').value = record.financierName;
  } else if (record.financierName) {
    document.getElementById('financierName').value = 'Other';
    const otherInput = document.getElementById('otherFinancierInput');
    if (otherInput) {
      otherInput.style.display = 'block';
      otherInput.value = record.financierName;
    }
  }
  
  // Accessories - render based on PriceMaster data
  await renderAccessoriesFromPriceMaster(record.model, record.variant, record);
  
  // Accounts fields
  document.getElementById('accountCheck').value = record.accountCheck || '';
  document.getElementById('accountRemark').value = record.accountRemark || '';
  // Receipt 1 Amount is now read-only in protected section
  document.getElementById('receiptNo2').value = record.receiptNo2 || '';
  document.getElementById('receipt2Amount').value = record.receipt2Amount || '';
  document.getElementById('receiptNo3').value = record.receiptNo3 || '';
  document.getElementById('receipt3Amount').value = record.receipt3Amount || '';
  document.getElementById('receiptNo4').value = record.receiptNo4 || '';
  document.getElementById('receipt4Amount').value = record.receipt4Amount || '';
  document.getElementById('doNumber').value = record.doNumber || '';
  document.getElementById('disbursedAmount').value = record.disbursedAmount || '';
  
  // Finance Commission
  const financeComm = document.getElementById('financeComm');
  if (financeComm) {
    financeComm.value = record.financeComm || '';
  }
  
  // Check if view-only mode (Account Check = Yes)
  const isViewOnly = record.accountCheck === 'Yes';
  
  const viewOnlyBanner = document.getElementById('viewOnlyBanner');
  if (viewOnlyBanner) {
    viewOnlyBanner.style.display = isViewOnly ? 'block' : 'none';
  }
  
  disableFormFields(isViewOnly);
  calculateTotals();
}

/**
 * Load variants from PriceMaster based on model (with caching)
 */
async function loadVariantsFromPriceMaster(model) {
  const variantSelect = document.getElementById('variant');
  
  if (!model || !variantSelect) {
    if (variantSelect) {
      variantSelect.innerHTML = '<option value="">-- Select Model First --</option>';
    }
    return;
  }
  
  // Check cache first
  if (variantCache[model]) {
    console.log('⚡ Using cached variants for', model);
    variantSelect.innerHTML = '<option value="">-- Select --</option>';
    variantCache[model].forEach(function(variant) {
      const option = document.createElement('option');
      option.value = variant;
      option.textContent = variant;
      variantSelect.appendChild(option);
    });
    return;
  }
  
  variantSelect.innerHTML = '<option value="">-- Loading variants... --</option>';
  
  try {
    const response = await API.getPriceMasterVariants(model);
    
    if (response.success) {
      // Cache the variants
      variantCache[model] = response.variants;
      
      variantSelect.innerHTML = '<option value="">-- Select --</option>';
      
      response.variants.forEach(function(variant) {
        const option = document.createElement('option');
        option.value = variant;
        option.textContent = variant;
        variantSelect.appendChild(option);
      });
      
      console.log('✅ Loaded', response.variants.length, 'variants for', model);
    } else {
      console.error('❌ Error loading variants:', response.message);
      variantSelect.innerHTML = '<option value="">-- Error loading variants --</option>';
    }
  } catch (error) {
    console.error('❌ Load variants error:', error);
    variantSelect.innerHTML = '<option value="">-- Error loading variants --</option>';
  }
}

/**
 * Render accessories from PriceMaster
 */
async function renderAccessoriesFromPriceMaster(model, variant, record) {
  const accessoryContainer = document.getElementById('accessoryFields');
  
  if (!accessoryContainer) return;
  
  accessoryContainer.innerHTML = '';
  
  if (!model || !variant) return;
  
  try {
    const response = await API.getPriceMasterDetails(model, variant);
    
    if (response.success) {
      const details = response.details;
      
      // Render accessories that have prices
      const accessories = [
        { key: 'guardPrice', name: 'Guard', id: 'guard' },
        { key: 'gripPrice', name: 'Grip Cover', id: 'gripcover' },
        { key: 'seatCoverPrice', name: 'Seat Cover', id: 'seatcover' },
        { key: 'matinPrice', name: 'Matin', id: 'matin' },
        { key: 'tankCoverPrice', name: 'Tank Cover', id: 'tankcover' },
        { key: 'handleHookPrice', name: 'Handle Hook', id: 'handlehook' }
      ];
      
      accessories.forEach(function(acc) {
        if (details[acc.key]) {
          const formGroup = document.createElement('div');
          formGroup.className = 'form-group';
          
          const label = document.createElement('label');
          label.textContent = acc.name;
          
          const select = document.createElement('select');
          select.id = acc.id;
          select.className = 'editable-highlight';
          select.innerHTML = '<option value="">-- Select --</option><option>Yes</option><option>No</option>';
          select.value = record[acc.id] || '';
          
          formGroup.appendChild(label);
          formGroup.appendChild(select);
          accessoryContainer.appendChild(formGroup);
        }
      });
      
      // Helmet with quantity
      if (details.helmetPrice) {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = 'Helmet';
        
        const select = document.createElement('select');
        select.id = 'helmet';
        select.className = 'editable-highlight';
        select.innerHTML = '<option value="">-- Select --</option><option>1</option><option>2</option><option>No</option>';
        select.value = record.helmet || '';
        
        formGroup.appendChild(label);
        formGroup.appendChild(select);
        accessoryContainer.appendChild(formGroup);
      }
      
      console.log('✅ Rendered accessories for', model, variant);
    }
  } catch (error) {
    console.error('❌ Error loading accessories:', error);
  }
}

/**
 * Handle financier change
 */
function handleFinancierChange() {
  const financierSelect = document.getElementById('financierName');
  const otherInput = document.getElementById('otherFinancierInput');
  
  if (!financierSelect || !otherInput) return;
  
  if (financierSelect.value === 'Other') {
    otherInput.style.display = 'block';
  } else {
    otherInput.style.display = 'none';
    otherInput.value = '';
  }
}

/**
 * Calculate totals
 */
function calculateTotals() {
  const r1 = currentReceipt1Amount;  // Read-only from loaded record
  const r2 = parseFloat(document.getElementById('receipt2Amount').value) || 0;
  const r3 = parseFloat(document.getElementById('receipt3Amount').value) || 0;
  const r4 = parseFloat(document.getElementById('receipt4Amount').value) || 0;
  const disbursed = parseFloat(document.getElementById('disbursedAmount').value) || 0;
  const finalPrice = parseFloat(document.getElementById('finalPrice').value) || 0;
  
  const cashTotal = r1 + r2 + r3 + r4;
  const grandTotal = cashTotal + disbursed;  // No Finance Commission in Grand Total
  
  const finalPriceDisplay = document.getElementById('finalPriceDisplay');
  const cashTotalDisplay = document.getElementById('cashTotalDisplay');
  const disbursedDisplay = document.getElementById('disbursedDisplay');
  const totalDisplay = document.getElementById('totalDisplay');
  
  if (finalPriceDisplay) finalPriceDisplay.textContent = '₹' + finalPrice.toFixed(2);
  if (cashTotalDisplay) cashTotalDisplay.textContent = '₹' + cashTotal.toFixed(2);
  if (disbursedDisplay) disbursedDisplay.textContent = '₹' + disbursed.toFixed(2);
  if (totalDisplay) totalDisplay.textContent = '₹' + grandTotal.toFixed(2);
}

/**
 * Disable/enable form fields
 */
function disableFormFields(disable) {
  const editableFields = document.querySelectorAll('.editable-highlight');
  const updateBtn = document.getElementById('updateBtn');
  
  editableFields.forEach(function(field) {
    field.disabled = disable;
  });
  
  if (updateBtn) {
    updateBtn.disabled = disable;
  }
}

/**
 * Handle update form submission
 */
async function handleUpdate(e) {
  e.preventDefault();
  
  if (!currentReceiptNo) {
    showMessage('No record loaded', 'error');
    return;
  }
  
  const sessionId = SessionManager.getSessionId();
  
  // Get financier value
  let financierValue = document.getElementById('financierName').value;
  if (financierValue === 'Other') {
    const otherInput = document.getElementById('otherFinancierInput');
    if (otherInput && otherInput.value.trim()) {
      financierValue = otherInput.value.trim();
    } else {
      showMessage('Please enter financier name', 'error');
      return;
    }
  }
  
  // Collect accessory values
  const accessories = {};
  ['guard', 'gripcover', 'seatcover', 'matin', 'tankcover', 'handlehook', 'helmet'].forEach(function(id) {
    const element = document.getElementById(id);
    if (element) {
      accessories[id] = element.value;
    }
  });
  
  // VALIDATION: Block Account Check = "Yes" if Grand Total doesn't match Final Price
  const accountCheck = document.getElementById('accountCheck').value;
  if (accountCheck === 'Yes') {
    const r1 = currentReceipt1Amount;
    const r2 = parseFloat(document.getElementById('receipt2Amount').value) || 0;
    const r3 = parseFloat(document.getElementById('receipt3Amount').value) || 0;
    const r4 = parseFloat(document.getElementById('receipt4Amount').value) || 0;
    const disbursed = parseFloat(document.getElementById('disbursedAmount').value) || 0;
    const grandTotal = r1 + r2 + r3 + r4 + disbursed;
    const finalPrice = parseFloat(document.getElementById('finalPrice').value) || 0;
    
    // Check if they match (allow 1 rupee difference for rounding)
    if (Math.abs(grandTotal - finalPrice) >= 1) {
      showMessage(
        `❌ Cannot mark Account Check as "Yes".\n\n` +
        `Grand Total: ₹${grandTotal.toFixed(2)}\n` +
        `Final Price: ₹${finalPrice.toFixed(2)}\n\n` +
        `These amounts must match!`,
        'error'
      );
      return;
    }
  }
  
  const data = {
    receiptNo: currentReceiptNo,
    // variant and colour are read-only (from sales)
    discount: document.getElementById('discount').value,
    finalPrice: document.getElementById('finalPrice').value,
    financierName: financierValue,
    ...accessories,
    accountCheck: document.getElementById('accountCheck').value,
    accountRemark: document.getElementById('accountRemark').value,
    // receipt1Amount is read-only (from sales)
    receiptNo2: document.getElementById('receiptNo2').value,
    receipt2Amount: document.getElementById('receipt2Amount').value,
    receiptNo3: document.getElementById('receiptNo3').value,
    receipt3Amount: document.getElementById('receipt3Amount').value,
    receiptNo4: document.getElementById('receiptNo4').value,
    receipt4Amount: document.getElementById('receipt4Amount').value,
    doNumber: document.getElementById('doNumber').value,
    disbursedAmount: document.getElementById('disbursedAmount').value
  };
  
  // Add finance commission if field exists
  const financeComm = document.getElementById('financeComm');
  if (financeComm) {
    data.financeComm = financeComm.value;
  }
  
  console.log('Updating record:', data);
  
  try {
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) {
      updateBtn.disabled = true;
      updateBtn.textContent = '💾 Updating...';
    }
    
    const sessionId = SessionManager.getSessionId();
    const response = await API.updateAccountsRecord(sessionId, data);
    
    if (updateBtn) {
      updateBtn.disabled = false;
      updateBtn.textContent = '💾 Update Record';
    }
    
    if (response.success) {
      showMessage('✅ Record updated successfully!', 'success');
      
      // Reload dashboard
      loadDashboard();
      
      // If Account Check was set to Yes, enable view-only mode
      if (data.accountCheck === 'Yes') {
        const viewOnlyBanner = document.getElementById('viewOnlyBanner');
        if (viewOnlyBanner) viewOnlyBanner.style.display = 'block';
        disableFormFields(true);
      }
    } else {
      showMessage(response.message || 'Error updating record', 'error');
    }
  } catch (error) {
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) {
      updateBtn.disabled = false;
      updateBtn.textContent = '💾 Update Record';
    }
    console.error('Update error:', error);
    showMessage('Error updating record', 'error');
  }
}

/**
 * Close details section
 */
function closeDetails() {
  document.getElementById('detailsSection').style.display = 'none';
  currentReceiptNo = null;
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
  const msgDiv = document.getElementById('statusMessage');
  if (!msgDiv) return;
  
  msgDiv.textContent = text;
  msgDiv.className = 'message ' + type;
  msgDiv.classList.remove('hidden');
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  if (type === 'success') {
    setTimeout(function() {
      msgDiv.classList.add('hidden');
    }, 3000);
  }
}

// ==========================================
// PRICE CALCULATION FROM PRICEMASTER
// ==========================================

/**
 * Calculate price from PriceMaster - Uses CURRENT form values
 */
async function calculatePrice() {
  if (!currentReceiptNo) {
    alert('Please search and load a record first');
    return;
  }
  
  const breakdown = document.getElementById('priceBreakdown');
  if (!breakdown) return;
  
  breakdown.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">⏳ Calculating...</div>';
  breakdown.style.display = 'block';
  
  try {
    // Get model and variant from PROTECTED fields (not editable)
    const model = document.getElementById('protectedModel').textContent.trim();
    const variant = document.getElementById('protectedVariant').textContent.trim();
    
    console.log('🔍 Calculating price for:', model, variant);
    
    if (!model || model === '-' || !variant || variant === '-') {
      breakdown.innerHTML = '<div style="text-align: center; padding: 20px; color: #e74c3c;">❌ Model/Variant not found. Please load a record first.</div>';
      return;
    }
    
    // Get PriceMaster details (sessionId handled by API wrapper)
    const pmResponse = await API.getPriceMasterDetails(model, variant);
    
    console.log('  📋 PriceMaster API response:', pmResponse);
    
    if (!pmResponse.success) {
      breakdown.innerHTML = `<div style="text-align: center; padding: 20px; color: #e74c3c;">❌ ${pmResponse.message}</div>`;
      return;
    }
    
    const pm = pmResponse.details;
    
    // Calculate base total
    let total = 0;
    total += parseFloat(pm.exShowroom) || 0;
    total += parseFloat(pm.rto) || 0;
    total += parseFloat(pm.insurance) || 0;
    total += parseFloat(pm.serviceCharge) || 0;
    total += parseFloat(pm.mandAccessories) || 0;
    
    const breakdownData = {
      exShowroom: pm.exShowroom || 0,
      rto: pm.rto || 0,
      insurance: pm.insurance || 0,
      serviceCharge: pm.serviceCharge || 0,
      mandAccessories: pm.mandAccessories || 0,
      accessories: [],
      financeComm: 0
    };
    
    // Add ONLY "Yes" accessories from CURRENT form values
    const accessoryMappings = [
      { id: 'guard', name: 'Guard', priceKey: 'guardPrice' },
      { id: 'gripcover', name: 'Grip Cover', priceKey: 'gripPrice' },
      { id: 'seatcover', name: 'Seat Cover', priceKey: 'seatCoverPrice' },
      { id: 'matin', name: 'Matin', priceKey: 'matinPrice' },
      { id: 'tankcover', name: 'Tank Cover', priceKey: 'tankCoverPrice' },
      { id: 'handlehook', name: 'Handle Hook', priceKey: 'handleHookPrice' }
    ];
    
    accessoryMappings.forEach(acc => {
      const element = document.getElementById(acc.id);
      if (element && element.value === 'Yes' && pm[acc.priceKey]) {
        const price = parseFloat(pm[acc.priceKey]);
        total += price;
        breakdownData.accessories.push({ name: acc.name, price: price });
      }
    });
    
    // Helmet - check if "Yes" or has quantity
    const helmetEl = document.getElementById('helmet');
    if (helmetEl && pm.helmetPrice) {
      const helmetValue = helmetEl.value;
      if (helmetValue && helmetValue !== 'No' && helmetValue !== '') {
        const qty = helmetValue === 'Yes' ? 1 : parseInt(helmetValue) || 1;
        const price = parseFloat(pm.helmetPrice) * qty;
        total += price;
        breakdownData.accessories.push({ name: `Helmet (x${qty})`, price: price });
      }
    }
    
    // Add Finance Commission from form
    const financeCommEl = document.getElementById('financeComm');
    if (financeCommEl && financeCommEl.value) {
      const financeComm = parseFloat(financeCommEl.value) || 0;
      if (financeComm > 0) {
        total += financeComm;
        breakdownData.financeComm = financeComm;
      }
    }
    
    // Get entered total (Final Price)
    const enteredTotal = parseFloat(document.getElementById('finalPrice').value) || 0;
    
    // Display breakdown
    displayPriceBreakdown({
      breakdown: breakdownData,
      calculatedTotal: Math.round(total),
      enteredTotal: enteredTotal
    });
    
  } catch (error) {
    console.error('Calculate price error:', error);
    breakdown.innerHTML = '<div style="text-align: center; padding: 20px; color: #e74c3c;">❌ Error calculating price</div>';
  }
}

/**
 * Display price breakdown
 */
function displayPriceBreakdown(calculation) {
  const breakdown = calculation.breakdown;
  const calculatedTotal = calculation.calculatedTotal;
  const enteredTotal = calculation.enteredTotal || 0;
  const matched = Math.abs(calculatedTotal - enteredTotal) < 1;
  
  let html = '<div style="background: white; padding: 15px; border-radius: 8px;">';
  
  // Base amounts
  html += '<div style="font-size: 14px; line-height: 2;">';
  html += `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f0f0f0; padding: 5px 0;">`;
  html += `<span style="color: #666;">Ex-Showroom:</span><span style="font-weight: 600;">₹${breakdown.exShowroom.toLocaleString()}</span></div>`;
  html += `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f0f0f0; padding: 5px 0;">`;
  html += `<span style="color: #666;">RTO:</span><span style="font-weight: 600;">₹${breakdown.rto.toLocaleString()}</span></div>`;
  html += `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f0f0f0; padding: 5px 0;">`;
  html += `<span style="color: #666;">Insurance:</span><span style="font-weight: 600;">₹${breakdown.insurance.toLocaleString()}</span></div>`;
  html += `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f0f0f0; padding: 5px 0;">`;
  html += `<span style="color: #666;">Service Charge:</span><span style="font-weight: 600;">₹${breakdown.serviceCharge.toLocaleString()}</span></div>`;
  html += `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f0f0f0; padding: 5px 0;">`;
  html += `<span style="color: #666;">Mand Accessories:</span><span style="font-weight: 600;">₹${breakdown.mandAccessories.toLocaleString()}</span></div>`;
  
  // Selected accessories
  if (breakdown.accessories.length > 0) {
    html += '<div style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #667eea20;">';
    html += '<div style="font-weight: 600; color: #667eea; margin-bottom: 5px;">Selected Accessories:</div>';
    breakdown.accessories.forEach(function(acc) {
      html += `<div style="display: flex; justify-content: space-between; padding: 3px 0 3px 15px; color: #666;">`;
      html += `<span>• ${acc.name}</span><span style="font-weight: 600;">₹${acc.price.toLocaleString()}</span></div>`;
    });
    html += '</div>';
  }
  
  // Finance commission
  if (breakdown.financeComm > 0) {
    html += `<div style="display: flex; justify-content: space-between; border-top: 1px solid #f0f0f0; padding: 8px 0; margin-top: 5px;">`;
    html += `<span style="color: #666;">Finance Comm:</span><span style="font-weight: 600;">₹${breakdown.financeComm.toLocaleString()}</span></div>`;
  }
  
  html += '</div>';
  
  // Totals comparison
  html += '<div style="margin-top: 15px; padding: 15px; background: ' + (matched ? '#d4edda' : '#fff3cd') + '; border-radius: 8px; border: 2px solid ' + (matched ? '#28a745' : '#ffc107') + ';">';
  html += '<div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; margin-bottom: 8px;">';
  html += `<span>CALCULATED TOTAL:</span><span style="color: #667eea;">₹${calculatedTotal.toLocaleString()}</span></div>`;
  html += '<div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; margin-bottom: 8px;">';
  html += `<span>ENTERED TOTAL:</span><span>₹${enteredTotal.toLocaleString()}</span></div>`;
  html += '<div style="text-align: center; font-size: 18px; font-weight: 700; margin-top: 10px; padding-top: 10px; border-top: 2px solid ' + (matched ? '#28a74550' : '#ffc10750') + ';">';
  
  if (matched) {
    html += '<span style="color: #28a745;">✅ MATCHED</span>';
  } else {
    const diff = calculatedTotal - enteredTotal;
    html += '<span style="color: #ffc107;">⚠️ MISMATCH</span>';
    html += `<div style="font-size: 13px; margin-top: 5px; color: #666;">Difference: ₹${Math.abs(diff).toLocaleString()} ${diff > 0 ? '(Undercharged)' : '(Overcharged)'}</div>`;
  }
  
  html += '</div></div>';
  
  // Save button
  html += '<button type="button" onclick="savePriceVerification(' + calculatedTotal + ', ' + matched + ')" class="btn-primary" style="width: 100%; margin-top: 15px; padding: 12px; font-size: 15px;">';
  html += '💾 Save Verification';
  html += '</button>';
  
  html += '</div>';
  
  document.getElementById('priceBreakdown').innerHTML = html;
}

/**
 * Save price verification
 */
async function savePriceVerification(calculatedTotal, matched) {
  if (!currentReceiptNo) {
    alert('Receipt number not found');
    return;
  }
  
  try {
    const response = await API.savePriceVerification(currentReceiptNo, calculatedTotal, matched);
    
    if (response.success) {
      alert('✅ Price verification saved successfully!');
    } else {
      alert('❌ ' + response.message);
    }
  } catch (error) {
    console.error('Save verification error:', error);
    alert('❌ Error saving verification');
  }
}
