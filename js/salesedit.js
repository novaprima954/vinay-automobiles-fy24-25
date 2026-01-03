// ==========================================
// SALES EDIT - COMPLETE CLEAN VERSION
// ==========================================

// PriceMaster cache
let cachedModels = null;
let variantCache = {};
let priceMasterCache = {};

// ==========================================
// PAGE INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', async function() {
  console.log('=== SALES EDIT PAGE ===');
  
  // Check authentication
  const session = SessionManager.getSession();
  if (!session) {
    alert('Please login first');
    window.location.href = 'index.html';
    return;
  }
  
  const user = session.user;
  console.log('✅ Logged in as:', user.username, '(' + user.role + ')');
  
  // Check access (sales + admin only)
  if (user.role !== 'admin' && user.role !== 'sales') {
    alert('Access denied. Only admin and sales can access this page.');
    window.location.href = 'home.html';
    return;
  }
  
  // Display current user
  const currentUserDisplay = document.getElementById('currentUser');
  if (currentUserDisplay) {
    currentUserDisplay.textContent = user.username + ' (' + user.role + ')';
  }
  
  // Setup event listeners
  setupEventListeners();
  
  // Load models from PriceMaster (non-blocking)
  loadModelsForEdit().catch(function(err) {
    console.error('Model loading error:', err);
  });
});

// ==========================================
// EVENT LISTENERS SETUP
// ==========================================

function setupEventListeners() {
  // Search by dropdown change
  const searchBySelect = document.getElementById('searchBy');
  if (searchBySelect) {
    searchBySelect.addEventListener('change', handleSearchByChange);
  }
  
  // Search button
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', searchRecords);
  }
  
  // Enter key in search
  const searchValue = document.getElementById('searchValue');
  if (searchValue) {
    searchValue.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') searchRecords();
    });
  }
  
  // Model change
  const modelSelect = document.getElementById('model');
  if (modelSelect) {
    modelSelect.addEventListener('change', handleModelChange);
  }
  
  // Variant change
  const variantSelect = document.getElementById('variant');
  if (variantSelect) {
    variantSelect.addEventListener('change', handleVariantChange);
  }
  
  // Financier change
  const financierSelect = document.getElementById('financierName');
  if (financierSelect) {
    financierSelect.addEventListener('change', handleFinancierChange);
  }
  
  // Calculate totals
  ['receipt2Amount', 'receipt3Amount', 'receipt4Amount', 'disbursedAmount', 'finalPrice'].forEach(function(id) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', calculateTotals);
    }
  });
  
  // Form submit
  const editForm = document.getElementById('editForm');
  if (editForm) {
    editForm.addEventListener('submit', handleUpdate);
  }
  
  // Cancel button
  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      const detailsSection = document.getElementById('detailsSection');
      if (detailsSection) {
        detailsSection.style.display = 'none';
      }
    });
  }
}

// ==========================================
// PRICEMASTER FUNCTIONS
// ==========================================

async function loadModelsForEdit() {
  const modelSelect = document.getElementById('model');
  if (!modelSelect) return;
  
  try {
    const response = await API.getPriceMasterModels();
    
    if (response.success && response.models) {
      cachedModels = response.models;
      
      modelSelect.innerHTML = '<option value="">-- Select Model --</option>';
      response.models.forEach(function(model) {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
      });
      
      console.log('✅ Loaded', response.models.length, 'models from PriceMaster');
    }
  } catch (error) {
    console.error('❌ Load models error:', error);
  }
}

async function loadVariantsForModel(model) {
  if (!model) return [];
  
  if (variantCache[model]) {
    return variantCache[model];
  }
  
  try {
    const response = await API.getPriceMasterVariants(model);
    
    if (response.success && response.variants) {
      variantCache[model] = response.variants;
      return response.variants;
    }
  } catch (error) {
    console.error('❌ Load variants error:', error);
  }
  
  return [];
}

async function getPriceMasterDetails(model, variant) {
  if (!model || !variant) return null;
  
  const cacheKey = model + '|' + variant;
  
  if (priceMasterCache[cacheKey]) {
    return priceMasterCache[cacheKey];
  }
  
  try {
    const response = await API.getPriceMasterDetails(model, variant);
    
    if (response.success && response.details) {
      priceMasterCache[cacheKey] = response.details;
      return response.details;
    }
  } catch (error) {
    console.error('❌ Load PriceMaster error:', error);
  }
  
  return null;
}

// ==========================================
// SEARCH FUNCTIONALITY
// ==========================================

function handleSearchByChange() {
  const searchBy = document.getElementById('searchBy').value;
  const searchValueInput = document.getElementById('searchValue');
  const executiveDropdown = document.getElementById('executiveDropdown');
  
  if (searchBy === 'Executive Name') {
    if (searchValueInput) searchValueInput.style.display = 'none';
    if (executiveDropdown) executiveDropdown.style.display = 'block';
  } else {
    if (searchValueInput) searchValueInput.style.display = 'block';
    if (executiveDropdown) executiveDropdown.style.display = 'none';
  }
}

async function searchRecords() {
  const searchBy = document.getElementById('searchBy').value;
  
  if (!searchBy) {
    showMessage('Please select a search field', 'error');
    return;
  }
  
  let searchValue;
  if (searchBy === 'Executive Name') {
    searchValue = document.getElementById('executiveDropdown').value;
  } else {
    searchValue = document.getElementById('searchValue').value.trim();
  }
  
  if (!searchValue) {
    showMessage('Please enter a search value', 'error');
    return;
  }
  
  const session = SessionManager.getSession();
  const user = session.user;
  
  console.log('🔍 Searching:', searchBy, '=', searchValue);
  
  try {
    const response = await API.searchViewRecords(searchBy, searchValue, null, null, null, null);
    
    console.log('📊 Search results:', response.results ? response.results.length : 0);
    
    if (response.success && response.results) {
      // Filter: Remove Account Check = "Yes"
      let filteredResults = response.results.filter(function(record) {
        const accountCheck = (record.accountCheck || '').trim();
        return accountCheck !== 'Yes';
      });
      
      console.log('✅ Editable records:', filteredResults.length);
      
      if (filteredResults.length > 0) {
        displaySearchResults(filteredResults);
        showMessage('Found ' + filteredResults.length + ' editable record(s)', 'success');
      } else {
        showMessage('No editable records found', 'error');
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) resultsSection.style.display = 'none';
      }
    } else {
      showMessage('No records found', 'error');
      const resultsSection = document.getElementById('resultsSection');
      if (resultsSection) resultsSection.style.display = 'none';
    }
  } catch (error) {
    console.error('❌ Search error:', error);
    showMessage('Error searching records', 'error');
  }
}

function displaySearchResults(results) {
  const tbody = document.getElementById('resultsBody');
  const resultsSection = document.getElementById('resultsSection');
  
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  results.forEach(function(record) {
    const row = tbody.insertRow();
    row.style.cursor = 'pointer';
    row.onclick = function() { loadRecord(record); };
    
    row.innerHTML = 
      '<td>' + (record.receiptNo || '') + '</td>' +
      '<td>' + (record.customerName || '') + '</td>' +
      '<td>' + (record.mobileNo || '') + '</td>' +
      '<td>' + (record.model || '') + '</td>' +
      '<td>' + (record.bookingDate || record.date || '') + '</td>' +
      '<td>' + (record.accountCheck || 'Blank') + '</td>';
  });
  
  if (resultsSection) {
    resultsSection.style.display = 'block';
  }
}

// ==========================================
// LOAD RECORD
// ==========================================

async function loadRecord(record) {
  console.log('📝 Loading record:', record);
  
  // Try to fetch FULL record first
  let fullRecord = record;
  
  try {
    const sessionId = SessionManager.getSessionId();
    const response = await API.getRecordByReceiptNo(sessionId, record.receiptNo);
    
    if (response.success && response.record) {
      console.log('✅ Got full record from API');
      fullRecord = response.record;
    } else {
      console.log('⚠️ Using search result data (limited fields):', response.message);
    }
  } catch (error) {
    console.log('⚠️ Using search result data (API blocked)');
  }
  
  // Use fullRecord (either from API or search result)
  record = fullRecord;
  
  // ACCESS CONTROL: Sales users can only edit their own records
  // Since search results don't have executiveName, we check when saving
  
  // Store selected receipt number
  const selectedReceiptNoInput = document.getElementById('selectedReceiptNo');
  if (selectedReceiptNoInput) {
    selectedReceiptNoInput.value = record.receiptNo;
  }
  
  // Store original record
  window.currentRecord = record;
  
  // PROTECTED FIELDS
  setTextContent('protectedReceiptNo', record.receiptNo || '-');
  setTextContent('protectedExecutiveName', record.executiveName || record.executive || '-');
  setTextContent('protectedBookingDate', record.bookingDate || record.date || '-');
  setTextContent('protectedReceiptNo1', record.receiptNo1 || '-');
  setTextContent('protectedReceipt1Amount', record.receipt1Amount ? '₹' + record.receipt1Amount : '-');
  
  // EDITABLE FIELDS - From search results
  setValue('customerName', record.customerName || '');
  setValue('mobileNo', record.mobileNo || '');
  setValue('model', record.model || '');
  
  // Load variants for model
  if (record.model) {
    const variants = await loadVariantsForModel(record.model);
    updateVariantDropdown(variants);
    
    setValue('variant', record.variant || '');
    
    // Render accessories with saved values
    if (record.variant) {
      const pmDetails = await getPriceMasterDetails(record.model, record.variant);
      if (pmDetails) {
        renderAccessoriesWithSavedValues(pmDetails, record);
      }
    }
  }
  
  // Other editable fields (may be blank from search results)
  setValue('colour', record.colour || '');
  setValue('discount', record.discount || '');
  setValue('finalPrice', record.finalPrice || '');
  setValue('deliveryDate', record.deliveryDate || '');
  setValue('salesRemark', record.salesRemark || '');
  setValue('receiptNo2', record.receiptNo2 || '');
  setValue('receipt2Amount', record.receipt2Amount || '');
  setValue('receiptNo3', record.receiptNo3 || '');
  setValue('receipt3Amount', record.receipt3Amount || '');
  setValue('receiptNo4', record.receiptNo4 || '');
  setValue('receipt4Amount', record.receipt4Amount || '');
  setValue('doNumber', record.doNumber || '');
  setValue('disbursedAmount', record.disbursedAmount || '');
  
  // Store helmet value temporarily (for accessory rendering)
  window.savedHelmetValue = record.helmet || '';
  
  // Financier
  const standardFinanciers = ['Cash', 'TVS Credit', 'Shriram Finance', 'Hinduja Finance', 
                              'Janan SFB', 'TATA Capital', 'Indusind Bank', 'Berar Finance', 'IDFC'];
  
  const financierSelect = document.getElementById('financierName');
  const otherFinancierInput = document.getElementById('otherFinancierInput');
  
  if (financierSelect && record.financierName) {
    if (standardFinanciers.includes(record.financierName)) {
      financierSelect.value = record.financierName;
      if (otherFinancierInput) otherFinancierInput.style.display = 'none';
    } else {
      financierSelect.value = 'Other';
      if (otherFinancierInput) {
        otherFinancierInput.style.display = 'block';
        otherFinancierInput.value = record.financierName;
      }
    }
  }
  
  // Calculate totals
  if (typeof calculateTotals === 'function') {
    calculateTotals();
  }
  
  // Show details section
  const detailsSection = document.getElementById('detailsSection');
  if (detailsSection) {
    detailsSection.style.display = 'block';
    detailsSection.scrollIntoView({ behavior: 'smooth' });
  }
  
  console.log('✅ Record loaded');
}

// ==========================================
// MODEL/VARIANT HANDLERS
// ==========================================

async function handleModelChange() {
  const model = document.getElementById('model').value;
  
  if (model) {
    const variants = await loadVariantsForModel(model);
    updateVariantDropdown(variants);
  } else {
    updateVariantDropdown([]);
  }
  
  // Clear variant and accessories
  setValue('variant', '');
  const accessoryFields = document.getElementById('accessoryFields');
  if (accessoryFields) accessoryFields.innerHTML = '';
}

async function handleVariantChange() {
  const model = document.getElementById('model').value;
  const variant = document.getElementById('variant').value;
  
  if (model && variant) {
    const pmDetails = await getPriceMasterDetails(model, variant);
    if (pmDetails) {
      renderAccessoriesBlank(pmDetails);
    }
  }
}

function updateVariantDropdown(variants) {
  const variantSelect = document.getElementById('variant');
  if (!variantSelect) return;
  
  variantSelect.innerHTML = '<option value="">-- Select Variant --</option>';
  variants.forEach(function(variant) {
    const option = document.createElement('option');
    option.value = variant;
    option.textContent = variant;
    variantSelect.appendChild(option);
  });
}

// ==========================================
// ACCESSORY RENDERING
// ==========================================

function renderAccessoriesWithSavedValues(pmDetails, savedRecord) {
  const container = document.getElementById('accessoryFields');
  if (!container || !pmDetails) return;
  
  console.log('🎨 Rendering accessories with saved values');
  console.log('   Saved record:', savedRecord);
  console.log('   Helmet from record:', savedRecord.helmet);
  console.log('   Helmet from window:', window.savedHelmetValue);
  
  container.innerHTML = '';
  
  const accessories = [
    { id: 'guard', name: 'Guard', priceKey: 'guardPrice' },
    { id: 'gripcover', name: 'Grip Cover', priceKey: 'gripPrice' },
    { id: 'seatcover', name: 'Seat Cover', priceKey: 'seatCoverPrice' },
    { id: 'matin', name: 'Matin', priceKey: 'matinPrice' },
    { id: 'tankcover', name: 'Tank Cover', priceKey: 'tankCoverPrice' },
    { id: 'handlehook', name: 'Handle Hook', priceKey: 'handleHookPrice' }
  ];
  
  accessories.forEach(function(acc) {
    if (pmDetails[acc.priceKey]) {
      const price = parseFloat(pmDetails[acc.priceKey]) || 0;
      const savedValue = savedRecord[acc.id] || '';
      
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';
      
      const label = document.createElement('label');
      label.innerHTML = acc.name + ' (₹' + price.toLocaleString() + ')';
      
      const select = document.createElement('select');
      select.id = acc.id;
      select.className = 'editable-highlight';
      select.innerHTML = 
        '<option value="">-- Select --</option>' +
        '<option value="Yes"' + (savedValue === 'Yes' ? ' selected' : '') + '>Yes</option>' +
        '<option value="No"' + (savedValue === 'No' ? ' selected' : '') + '>No</option>';
      
      formGroup.appendChild(label);
      formGroup.appendChild(select);
      container.appendChild(formGroup);
    }
  });
  
  // Helmet
  if (pmDetails.helmetPrice) {
    const price = parseFloat(pmDetails.helmetPrice) || 0;
    const savedHelmet = savedRecord.helmet || window.savedHelmetValue || '';
    
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    const label = document.createElement('label');
    label.innerHTML = 'Helmet (₹' + price.toLocaleString() + ')';
    
    const select = document.createElement('select');
    select.id = 'helmet';
    select.className = 'editable-highlight';
    select.innerHTML = 
      '<option value="">-- Select --</option>' +
      '<option value="No"' + (savedHelmet === 'No' ? ' selected' : '') + '>No</option>' +
      '<option value="1"' + (savedHelmet === '1' ? ' selected' : '') + '>1</option>' +
      '<option value="2"' + (savedHelmet === '2' ? ' selected' : '') + '>2</option>';
    
    formGroup.appendChild(label);
    formGroup.appendChild(select);
    container.appendChild(formGroup);
  }
}

function renderAccessoriesBlank(pmDetails) {
  renderAccessoriesWithSavedValues(pmDetails, {});
}

// ==========================================
// FINANCIER HANDLER
// ==========================================

function handleFinancierChange() {
  const financierSelect = document.getElementById('financierName');
  const otherFinancierInput = document.getElementById('otherFinancierInput');
  
  if (financierSelect && otherFinancierInput) {
    if (financierSelect.value === 'Other') {
      otherFinancierInput.style.display = 'block';
    } else {
      otherFinancierInput.style.display = 'none';
    }
  }
}

// ==========================================
// CALCULATE TOTALS
// ==========================================

function calculateTotals() {
  const r1Text = (document.getElementById('protectedReceipt1Amount') || {}).textContent || '₹0';
  const r1 = parseFloat(r1Text.replace('₹', '').replace(/,/g, '').trim()) || 0;
  const r2 = parseFloat((document.getElementById('receipt2Amount') || {}).value) || 0;
  const r3 = parseFloat((document.getElementById('receipt3Amount') || {}).value) || 0;
  const r4 = parseFloat((document.getElementById('receipt4Amount') || {}).value) || 0;
  const disbursed = parseFloat((document.getElementById('disbursedAmount') || {}).value) || 0;
  
  const cashTotal = r1 + r2 + r3 + r4;
  const grandTotal = cashTotal + disbursed;
  
  console.log('💰 Totals:', {r1, r2, r3, r4, disbursed, cashTotal, grandTotal});
  
  // Update display elements (correct IDs from HTML)
  setTextContent('cashTotalDisplay', '₹' + cashTotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
  setTextContent('disbursedDisplay', '₹' + disbursed.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
  setTextContent('totalDisplay', '₹' + grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
  
  // Store in hidden fields for form submission
  if (!document.getElementById('hiddenCashTotal')) {
    const cashInput = document.createElement('input');
    cashInput.type = 'hidden';
    cashInput.id = 'hiddenCashTotal';
    document.getElementById('editForm').appendChild(cashInput);
  }
  if (!document.getElementById('hiddenGrandTotal')) {
    const grandInput = document.createElement('input');
    grandInput.type = 'hidden';
    grandInput.id = 'hiddenGrandTotal';
    document.getElementById('editForm').appendChild(grandInput);
  }
  
  document.getElementById('hiddenCashTotal').value = cashTotal.toFixed(2);
  document.getElementById('hiddenGrandTotal').value = grandTotal.toFixed(2);
  
  console.log('✅ Updated totals display');
}

// ==========================================
// UPDATE HANDLER
// ==========================================

async function handleUpdate(e) {
  e.preventDefault();
  
  const receiptNo = document.getElementById('selectedReceiptNo').value;
  if (!receiptNo) {
    alert('No record selected');
    return;
  }
  
  // Get financier
  let financierName = document.getElementById('financierName').value;
  if (financierName === 'Other') {
    financierName = document.getElementById('otherFinancierInput').value.trim();
    if (!financierName) {
      alert('Please enter financier name');
      return;
    }
  }
  
  // Collect form data
  const data = {
    receiptNo: receiptNo,
    customerName: getValue('customerName'),
    mobileNo: getValue('mobileNo'),
    model: getValue('model'),
    variant: getValue('variant'),
    colour: getValue('colour'),
    discount: getValue('discount'),
    finalPrice: getValue('finalPrice'),
    financierName: financierName,
    deliveryDate: getValue('deliveryDate'),
    salesRemark: getValue('salesRemark'),
    receiptNo2: getValue('receiptNo2'),
    receipt2Amount: getValue('receipt2Amount'),
    receiptNo3: getValue('receiptNo3'),
    receipt3Amount: getValue('receipt3Amount'),
    receiptNo4: getValue('receiptNo4'),
    receipt4Amount: getValue('receipt4Amount'),
    doNumber: getValue('doNumber'),
    disbursedAmount: getValue('disbursedAmount'),
    cashTotal: getValue('hiddenCashTotal') || '0',
    grandTotal: getValue('hiddenGrandTotal') || '0'
  };
  
  // Add accessories
  const accessoryIds = ['guard', 'gripcover', 'seatcover', 'matin', 'tankcover', 'handlehook', 'helmet'];
  accessoryIds.forEach(function(id) {
    const element = document.getElementById(id);
    if (element) {
      data[id] = element.value || '';
    }
  });
  
  console.log('💾 Updating:', data);
  
  const updateBtn = document.getElementById('updateBtn');
  if (updateBtn) {
    updateBtn.disabled = true;
    updateBtn.textContent = '⏳ Updating...';
  }
  
  try {
    const sessionId = SessionManager.getSessionId();
    const response = await API.call('updateSalesRecord', {
      sessionId: sessionId,
      data: JSON.stringify(data)
    });
    
    if (updateBtn) {
      updateBtn.disabled = false;
      updateBtn.textContent = '💾 Update Record';
    }
    
    if (response.success) {
      showMessage('✅ Updated successfully!', 'success');
    } else {
      showMessage('❌ ' + (response.message || 'Update failed'), 'error');
    }
  } catch (error) {
    console.error('❌ Update error:', error);
    showMessage('❌ Update failed', 'error');
    
    if (updateBtn) {
      updateBtn.disabled = false;
      updateBtn.textContent = '💾 Update Record';
    }
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function setTextContent(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function getValue(id) {
  const element = document.getElementById(id);
  return element ? element.value : '';
}

function showMessage(message, type) {
  // Use existing message display or alert
  console.log(type.toUpperCase() + ':', message);
  // You can implement a toast notification here
}

function logout() {
  if (confirm('Logout?')) {
    SessionManager.clearSession();
    window.location.href = 'index.html';
  }
}
