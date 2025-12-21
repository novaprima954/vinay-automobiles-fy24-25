// ==========================================
// SALES EDIT PAGE LOGIC - WITH PRICEMASTER INTEGRATION
// ==========================================

// Cache for PriceMaster data
let cachedModels = null;
let variantCache = {};
let priceMasterCache = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
  console.log('=== SALES EDIT PAGE ===');
  
  // Check authentication
  const session = SessionManager.getSession();
  if (!session) {
    console.log('❌ No session - redirecting to login');
    alert('Please login first');
    window.location.href = 'index.html';
    return;
  }
  
  const user = session.user;
  console.log('✅ Logged in as:', user.username, '(' + user.role + ')');
  
  // Load models from PriceMaster for edit form
  await loadModelsForEdit();
  
  // Setup event listeners
  setupEventListeners();
});

/**
 * Load models from PriceMaster into edit form dropdown
 */
async function loadModelsForEdit() {
  const modelSelect = document.getElementById('model');
  if (!modelSelect) return;
  
  try {
    const response = await API.getAllModels();
    
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
    } else {
      console.error('❌ Error loading models');
      modelSelect.innerHTML = '<option value="">-- Error loading models --</option>';
    }
  } catch (error) {
    console.error('❌ Load models error:', error);
  }
}

/**
 * Load variants for a model from PriceMaster
 */
async function loadVariantsForModel(model) {
  if (!model) return [];
  
  // Check cache
  if (variantCache[model]) {
    console.log('📦 Using cached variants for', model);
    return variantCache[model];
  }
  
  try {
    const response = await API.getPriceMasterVariants(model);
    
    if (response.success && response.variants) {
      variantCache[model] = response.variants;
      console.log('✅ Loaded', response.variants.length, 'variants for', model);
      return response.variants;
    }
  } catch (error) {
    console.error('❌ Load variants error:', error);
  }
  
  return [];
}

/**
 * Get PriceMaster details for model/variant
 */
async function getPriceMasterDetails(model, variant) {
  if (!model || !variant) return null;
  
  const cacheKey = model + '|' + variant;
  
  // Check cache
  if (priceMasterCache[cacheKey]) {
    console.log('📦 Using cached PriceMaster for', model, variant);
    return priceMasterCache[cacheKey];
  }
  
  try {
    const response = await API.getPriceMasterDetails(model, variant);
    
    if (response.success && response.details) {
      priceMasterCache[cacheKey] = response.details;
      console.log('✅ Loaded PriceMaster details for', model, variant);
      return response.details;
    }
  } catch (error) {
    console.error('❌ Load PriceMaster error:', error);
  }
  
  return null;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search button
  document.getElementById('searchBtn').addEventListener('click', searchRecords);
  
  // Enter key in search
  document.getElementById('searchValue').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchRecords();
  });
  
  // Model change in edit form
  document.getElementById('model').addEventListener('change', handleModelChange);
  
  // Variant change in edit form
  document.getElementById('variant').addEventListener('change', handleVariantChange);
  
  // Financier dropdown
  document.getElementById('financierName').addEventListener('change', handleFinancierChange);
  
  // Calculate totals on amount changes
  ['receipt2Amount', 'receipt3Amount', 'receipt4Amount', 'disbursedAmount', 'finalPrice'].forEach(function(id) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', calculateTotals);
    }
  });
  
  // Form submit
  document.getElementById('editForm').addEventListener('submit', handleUpdate);
  
  // Cancel button
  document.getElementById('cancelBtn').addEventListener('click', function() {
    document.getElementById('detailsSection').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ==========================================
// EVENT HANDLERS FOR MODEL/VARIANT CHANGES
// ==========================================

/**
 * Handle model change - reload variants and clear accessories
 */
async function handleModelChange() {
  console.log('📦 Model changed');
  await updateVariants();
  // Clear accessories (will be populated when variant is selected)
  document.getElementById('accessoryFields').innerHTML = '';
}

/**
 * Handle variant change - render accessories (RESET to blank)
 */
async function handleVariantChange() {
  console.log('🎨 Variant changed');
  await updateAccessoryFields();
}

// ==========================================
// SEARCH FUNCTIONALITY
// ==========================================

/**
 * Handle search by dropdown change
 */
function handleSearchByChange() {
  const searchBy = document.getElementById('searchBy').value;
  const searchValueInput = document.getElementById('searchValue');
  const executiveDropdown = document.getElementById('executiveDropdown');
  
  if (searchBy === 'Executive Name') {
    searchValueInput.style.display = 'none';
    executiveDropdown.style.display = 'block';
  } else {
    searchValueInput.style.display = 'block';
    executiveDropdown.style.display = 'none';
  }
}

/**
 * Search records
 */
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
  
  const sessionId = SessionManager.getSessionId();
  const user = SessionManager.getCurrentUser();
  
  console.log('Searching:', searchBy, '=', searchValue);
  
  try {
    const response = await API.call('searchRecordsForEdit', {
      sessionId: sessionId,
      searchBy: searchBy,
      searchValue: searchValue,
      userRole: user.role,
      userName: user.name
    });
    
    if (response.success) {
      displaySearchResults(response.results);
      showMessage('Found ' + response.results.length + ' editable record(s)', 'success');
    } else {
      showMessage(response.message, 'error');
      document.getElementById('resultsSection').style.display = 'none';
    }
  } catch (error) {
    console.error('Search error:', error);
    showMessage('Search failed. Please try again.', 'error');
  }
}

/**
 * Display search results
 */
function displaySearchResults(results) {
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = '';
  
  if (results.length === 0) {
    document.getElementById('resultsSection').style.display = 'none';
    return;
  }
  
  results.forEach(function(record) {
    const row = tbody.insertRow();
    row.onclick = function() { loadRecord(record); };
    row.innerHTML = 
      '<td>' + (record.receiptNo || '') + '</td>' +
      '<td>' + (record.customerName || '') + '</td>' +
      '<td>' + (record.mobileNo || '') + '</td>' +
      '<td>' + (record.model || '') + '</td>' +
      '<td>' + (record.bookingDate || '') + '</td>' +
      '<td>' + (record.accountCheck || 'Blank') + '</td>';
  });
  
  document.getElementById('resultsSection').style.display = 'block';
}

/**
 * Load selected record
 */
async function loadRecord(record) {
  console.log('📝 Loading record:', record);
  
  // Store receipt no for update and full record
  document.getElementById('selectedReceiptNo').value = record.receiptNo;
  window.currentRecord = record;
  
  // Protected fields
  document.getElementById('protectedReceiptNo').textContent = record.receiptNo || '-';
  document.getElementById('protectedExecutiveName').textContent = record.executiveName || '-';
  document.getElementById('protectedBookingDate').textContent = record.bookingDate || '-';
  document.getElementById('protectedCustomerName').textContent = record.customerName || '-';
  document.getElementById('protectedMobileNo').textContent = record.mobileNo || '-';
  document.getElementById('protectedReceiptNo1').textContent = record.receiptNo1 || '-';
  document.getElementById('protectedReceipt1Amount').textContent = record.receipt1Amount ? '₹' + record.receipt1Amount : '-';
  
  // Editable fields - Model
  document.getElementById('model').value = record.model || '';
  
  // Load variants for this model
  if (record.model) {
    await updateVariants();
    document.getElementById('variant').value = record.variant || '';
    
    // Render accessories WITH saved values for this model/variant
    if (record.variant) {
      await renderAccessoriesWithSavedValues(record.model, record.variant, record);
    }
  }
  
  document.getElementById('colour').value = record.colour || '';
  document.getElementById('discount').value = record.discount || '';
  document.getElementById('finalPrice').value = record.finalPrice || '';
  
  // Financier
  const standardFinanciers = ['Cash', 'TVS Credit', 'Shriram Finance', 'Hinduja Finance', 
                              'Janan SFB', 'TATA Capital', 'Indusind Bank', 'Berar Finance', 'IDFC'];
  
  if (standardFinanciers.includes(record.financierName)) {
    document.getElementById('financierName').value = record.financierName;
  } else if (record.financierName) {
    document.getElementById('financierName').value = 'Other';
    document.getElementById('otherFinancierInput').style.display = 'block';
    document.getElementById('otherFinancierInput').value = record.financierName;
  }
  
  document.getElementById('deliveryDate').value = record.deliveryDate || '';
  document.getElementById('salesRemark').value = record.salesRemark || '';
  document.getElementById('receiptNo2').value = record.receiptNo2 || '';
  document.getElementById('receipt2Amount').value = record.receipt2Amount || '';
  document.getElementById('receiptNo3').value = record.receiptNo3 || '';
  document.getElementById('receipt3Amount').value = record.receipt3Amount || '';
  document.getElementById('receiptNo4').value = record.receiptNo4 || '';
  document.getElementById('receipt4Amount').value = record.receipt4Amount || '';
  document.getElementById('doNumber').value = record.doNumber || '';
  document.getElementById('disbursedAmount').value = record.disbursedAmount || '';
  
  calculateTotals();
  
  document.getElementById('detailsSection').style.display = 'block';
  document.getElementById('detailsSection').scrollIntoView({ behavior: 'smooth' });
  
  console.log('✅ Record loaded with saved accessory values');
}

/**
 * Render accessories WITH saved values from record (for editing)
 */
async function renderAccessoriesWithSavedValues(model, variant, savedRecord) {
  const accessoryContainer = document.getElementById('accessoryFields');
  
  accessoryContainer.innerHTML = '<div style="text-align: center; padding: 10px; color: #999;">⏳ Loading accessories...</div>';
  
  const pmDetails = await getPriceMasterDetails(model, variant);
  
  if (!pmDetails) {
    accessoryContainer.innerHTML = '<div style="text-align: center; padding: 10px; color: #e74c3c;">❌ Could not load accessories</div>';
    return;
  }
  
  accessoryContainer.innerHTML = '';
  
  // Define accessories with their property names
  const accessories = [
    { id: 'guard', name: 'Guard', priceKey: 'guardPrice' },
    { id: 'gripcover', name: 'Grip Cover', priceKey: 'gripPrice' },
    { id: 'seatcover', name: 'Seat Cover', priceKey: 'seatCoverPrice' },
    { id: 'matin', name: 'Matin', priceKey: 'matinPrice' },
    { id: 'tankcover', name: 'Tank Cover', priceKey: 'tankCoverPrice' },
    { id: 'handlehook', name: 'Handle Hook', priceKey: 'handleHookPrice' }
  ];
  
  // Render accessories with saved values
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
      select.innerHTML = `
        <option value="">-- Select --</option>
        <option value="Yes" ${savedValue === 'Yes' ? 'selected' : ''}>Yes</option>
        <option value="No" ${savedValue === 'No' ? 'selected' : ''}>No</option>
      `;
      
      formGroup.appendChild(label);
      formGroup.appendChild(select);
      accessoryContainer.appendChild(formGroup);
    }
  });
  
  // Helmet - special case with saved value
  if (pmDetails.helmetPrice) {
    const price = parseFloat(pmDetails.helmetPrice) || 0;
    const savedHelmet = savedRecord.helmet || '';
    
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    const label = document.createElement('label');
    label.innerHTML = 'Helmet (₹' + price.toLocaleString() + ')';
    
    const select = document.createElement('select');
    select.id = 'helmet';
    select.className = 'editable-highlight';
    select.innerHTML = `
      <option value="">-- Select --</option>
      <option value="No" ${savedHelmet === 'No' ? 'selected' : ''}>No</option>
      <option value="1" ${savedHelmet === '1' ? 'selected' : ''}>1</option>
      <option value="2" ${savedHelmet === '2' ? 'selected' : ''}>2</option>
    `;
    
    formGroup.appendChild(label);
    formGroup.appendChild(select);
    accessoryContainer.appendChild(formGroup);
  }
  
  console.log('✅ Rendered accessories WITH saved values');
}

/**
 * Update variants based on model
 */
async function updateVariants() {
  const model = document.getElementById('model').value;
  const variantSelect = document.getElementById('variant');
  
  variantSelect.innerHTML = '<option value="">-- Loading variants... --</option>';
  
  if (model) {
    const variants = await loadVariantsForModel(model);
    
    variantSelect.innerHTML = '<option value="">-- Select Variant --</option>';
    variants.forEach(function(variant) {
      const option = document.createElement('option');
      option.value = variant;
      option.textContent = variant;
      variantSelect.appendChild(option);
    });
  } else {
    variantSelect.innerHTML = '<option value="">-- Select Model First --</option>';
  }
  
  // Clear accessories when model changes
  document.getElementById('accessoryFields').innerHTML = '';
}

/**
 * Update accessory fields based on model and variant - with PriceMaster prices
 * RESETS to blank when model/variant changes
 */
async function updateAccessoryFields() {
  const model = document.getElementById('model').value;
  const variant = document.getElementById('variant').value;
  const accessoryContainer = document.getElementById('accessoryFields');
  
  accessoryContainer.innerHTML = '';
  
  if (!model || !variant) {
    return;
  }
  
  accessoryContainer.innerHTML = '<div style="text-align: center; padding: 10px; color: #999;">⏳ Loading accessories...</div>';
  
  const pmDetails = await getPriceMasterDetails(model, variant);
  
  if (!pmDetails) {
    accessoryContainer.innerHTML = '<div style="text-align: center; padding: 10px; color: #e74c3c;">❌ Could not load accessories</div>';
    return;
  }
  
  accessoryContainer.innerHTML = '';
  
  // Define accessories with their PriceMaster property names
  const accessories = [
    { id: 'guard', name: 'Guard', priceKey: 'guardPrice' },
    { id: 'gripcover', name: 'Grip Cover', priceKey: 'gripPrice' },
    { id: 'seatcover', name: 'Seat Cover', priceKey: 'seatCoverPrice' },
    { id: 'matin', name: 'Matin', priceKey: 'matinPrice' },
    { id: 'tankcover', name: 'Tank Cover', priceKey: 'tankCoverPrice' },
    { id: 'handlehook', name: 'Handle Hook', priceKey: 'handleHookPrice' }
  ];
  
  // Render accessories that have prices in PriceMaster - RESET TO BLANK
  accessories.forEach(function(acc) {
    if (pmDetails[acc.priceKey]) {
      const price = parseFloat(pmDetails[acc.priceKey]) || 0;
      
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';
      
      const label = document.createElement('label');
      label.innerHTML = acc.name + ' (₹' + price.toLocaleString() + ')';
      
      const select = document.createElement('select');
      select.id = acc.id;
      select.className = 'editable-highlight';
      select.innerHTML = '<option value="">-- Select --</option><option value="Yes">Yes</option><option value="No">No</option>';
      
      formGroup.appendChild(label);
      formGroup.appendChild(select);
      accessoryContainer.appendChild(formGroup);
    }
  });
  
  // Helmet - special case (quantity)
  if (pmDetails.helmetPrice) {
    const price = parseFloat(pmDetails.helmetPrice) || 0;
    
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    const label = document.createElement('label');
    label.innerHTML = 'Helmet (₹' + price.toLocaleString() + ')';
    
    const select = document.createElement('select');
    select.id = 'helmet';
    select.className = 'editable-highlight';
    select.innerHTML = '<option value="">-- Select --</option><option value="No">No</option><option value="1">1</option><option value="2">2</option>';
    
    formGroup.appendChild(label);
    formGroup.appendChild(select);
    accessoryContainer.appendChild(formGroup);
  }
  
  console.log('✅ Rendered accessories for', model, variant, '- RESET TO BLANK');
}

/**
 * Handle financier change
 */
function handleFinancierChange() {
  const financierSelect = document.getElementById('financierName');
  const otherInput = document.getElementById('otherFinancierInput');
  
  if (financierSelect.value === 'Other') {
    otherInput.style.display = 'block';
    otherInput.required = true;
  } else {
    otherInput.style.display = 'none';
    otherInput.required = false;
    otherInput.value = '';
  }
}

/**
 * Calculate payment totals
 */
function calculateTotals() {
  const r1Text = document.getElementById('protectedReceipt1Amount').textContent.replace('₹', '').trim();
  const r1 = parseFloat(r1Text) || 0;
  const r2 = parseFloat(document.getElementById('receipt2Amount').value) || 0;
  const r3 = parseFloat(document.getElementById('receipt3Amount').value) || 0;
  const r4 = parseFloat(document.getElementById('receipt4Amount').value) || 0;
  const disbursed = parseFloat(document.getElementById('disbursedAmount').value) || 0;
  
  const cashTotal = r1 + r2 + r3 + r4;
  const grandTotal = cashTotal + disbursed;
  
  document.getElementById('cashTotalDisplay').textContent = '₹' + cashTotal.toFixed(2);
  document.getElementById('disbursedDisplay').textContent = '₹' + disbursed.toFixed(2);
  document.getElementById('totalDisplay').textContent = '₹' + grandTotal.toFixed(2);
  
  const finalPrice = parseFloat(document.getElementById('finalPrice').value) || 0;
  const warning = document.getElementById('priceMismatchWarning');
  
  if (Math.abs(grandTotal - finalPrice) > 0.01 && grandTotal > 0) {
    warning.style.display = 'block';
    document.getElementById('totalInWarning').textContent = grandTotal.toFixed(2);
    document.getElementById('finalPriceInWarning').textContent = finalPrice.toFixed(2);
  } else {
    warning.style.display = 'none';
  }
}

/**
 * Handle form update
 */
async function handleUpdate(event) {
  event.preventDefault();
  
  const receiptNo = document.getElementById('selectedReceiptNo').value;
  
  console.log('=== UPDATE DEBUG ===');
  console.log('Receipt No from hidden field:', receiptNo);
  console.log('Receipt No type:', typeof receiptNo);
  
  if (!receiptNo) {
    showMessage('Please select a record first', 'error');
    return;
  }
  
  // Get totals
  const r1Text = document.getElementById('protectedReceipt1Amount').textContent.replace('₹', '').trim();
  const r1 = parseFloat(r1Text) || 0;
  const r2 = parseFloat(document.getElementById('receipt2Amount').value) || 0;
  const r3 = parseFloat(document.getElementById('receipt3Amount').value) || 0;
  const r4 = parseFloat(document.getElementById('receipt4Amount').value) || 0;
  const disbursed = parseFloat(document.getElementById('disbursedAmount').value) || 0;
  const cashTotal = r1 + r2 + r3 + r4;
  const grandTotal = cashTotal + disbursed;
  const finalPrice = parseFloat(document.getElementById('finalPrice').value) || 0;
  
  console.log('Totals - R1:', r1, 'R2:', r2, 'R3:', r3, 'R4:', r4);
  console.log('Cash Total:', cashTotal, 'Disbursed:', disbursed, 'Grand Total:', grandTotal);
  
  // Price mismatch warning
  if (Math.abs(grandTotal - finalPrice) > 0.01 && grandTotal > 0) {
    const confirmed = confirm('⚠️ WARNING: Grand Total (₹' + grandTotal.toFixed(2) + ') does not match Final Price (₹' + finalPrice.toFixed(2) + ').\n\nAre you sure you want to update this record?');
    
    if (!confirmed) {
      return;
    }
  }
  
  // Get form data
  const formData = getFormData();
  formData.receiptNo = receiptNo;
  formData.receipt1Amount = r1;
  formData.cashTotal = cashTotal;
  formData.grandTotal = grandTotal;
  
  console.log('Form data being sent:', formData);
  console.log('Receipt No in form data:', formData.receiptNo);
  
  const sessionId = SessionManager.getSessionId();
  
  const updateBtn = document.getElementById('updateBtn');
  updateBtn.disabled = true;
  updateBtn.textContent = '⏳ Updating...';
  
  try {
    const response = await API.call('updateSalesRecord', {
      sessionId: sessionId,
      data: JSON.stringify(formData)
    });
    
    console.log('Server response:', response);
    
    if (response.success) {
      showMessage('✅ ' + response.message, 'success');
      showWhatsAppModal(formData);
    } else {
      showMessage('❌ ' + response.message, 'error');
    }
  } catch (error) {
    console.error('Update error:', error);
    showMessage('❌ Update failed. Please try again.', 'error');
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = '💾 Update Record';
  }
}

/**
 * Get form data
 */
function getFormData() {
  const model = document.getElementById('model').value;
  const financierSelect = document.getElementById('financierName').value;
  const otherFinancier = document.getElementById('otherFinancierInput').value;
  
  let financierName = financierSelect;
  if (financierSelect === 'Other' && otherFinancier) {
    financierName = otherFinancier;
  }
  
  const formData = {
    executiveName: window.currentRecord ? window.currentRecord.executiveName : '',
    bookingDate: window.currentRecord ? window.currentRecord.bookingDate : '',
    customerName: window.currentRecord ? window.currentRecord.customerName : '',
    mobileNo: window.currentRecord ? window.currentRecord.mobileNo : '',
    model: model,
    variant: document.getElementById('variant').value,
    colour: document.getElementById('colour').value,
    discount: document.getElementById('discount').value,
    finalPrice: document.getElementById('finalPrice').value,
    financierName: financierName,
    deliveryDate: document.getElementById('deliveryDate').value,
    salesRemark: document.getElementById('salesRemark').value,
    receiptNo2: document.getElementById('receiptNo2').value || '',
    receipt2Amount: document.getElementById('receipt2Amount').value || '0',
    receiptNo3: document.getElementById('receiptNo3').value || '',
    receipt3Amount: document.getElementById('receipt3Amount').value || '0',
    receiptNo4: document.getElementById('receiptNo4').value || '',
    receipt4Amount: document.getElementById('receipt4Amount').value || '0',
    doNumber: document.getElementById('doNumber').value || '',
    disbursedAmount: document.getElementById('disbursedAmount').value || '0'
  };
  
  // Add accessories - collect from rendered form elements
  const accessoryIds = ['guard', 'gripcover', 'seatcover', 'matin', 'tankcover', 'handlehook', 'helmet'];
  accessoryIds.forEach(function(id) {
    const element = document.getElementById(id);
    if (element) {
      formData[id] = element.value || '';
    }
  });
  
  return formData;
}

/**
 * Show WhatsApp modal
 */
function showWhatsAppModal(data) {
  lastSavedData = data;
  
  const r1 = parseFloat(data.receipt1Amount) || 0;
  const r2 = parseFloat(data.receipt2Amount) || 0;
  const r3 = parseFloat(data.receipt3Amount) || 0;
  const r4 = parseFloat(data.receipt4Amount) || 0;
  const cashCollected = r1 + r2 + r3 + r4;
  
  let message = '*Customer Name* - ' + data.customerName + '\n';
  message += '*Variant* - ' + data.variant + '\n';
  message += '*Colour* - ' + data.colour + '\n';
  message += '*Finance* - ' + data.financierName + '\n';
  message += '*Passing Date* - ' + data.bookingDate + '\n';
  message += '*Cash Collected* - Rs.' + cashCollected.toFixed(2) + '\n';
  message += '*Final price after discount* - Rs.' + data.finalPrice + '\n';
  message += '*Discount* - ' + data.discount + '\n';
  message += '*Accessories* -\n';

  const accessoryNames = {
    guard: 'Guard',
    gripcover: 'Grip Cover',
    seatcover: 'Seat Cover',
    matin: 'Matin',
    tankcover: 'Tank Cover',
    handlehook: 'Handle Hook',
    helmet: 'Helmet'
  };
  
  Object.keys(accessoryNames).forEach(function(id) {
    if (data[id]) {
      message += accessoryNames[id] + ' - ' + data[id] + '\n';
    }
  });

  document.getElementById('whatsappMessage').textContent = message;
  document.getElementById('whatsappModal').classList.add('show');
}

/**
 * Share on WhatsApp
 */
function shareOnWhatsApp() {
  if (!lastSavedData) return;
  
  const r1 = parseFloat(lastSavedData.receipt1Amount) || 0;
  const r2 = parseFloat(lastSavedData.receipt2Amount) || 0;
  const r3 = parseFloat(lastSavedData.receipt3Amount) || 0;
  const r4 = parseFloat(lastSavedData.receipt4Amount) || 0;
  const cashCollected = r1 + r2 + r3 + r4;
  
  let message = '*Customer Name* - ' + lastSavedData.customerName + '\n';
  message += '*Variant* - ' + lastSavedData.variant + '\n';
  message += '*Colour* - ' + lastSavedData.colour + '\n';
  message += '*Finance* - ' + lastSavedData.financierName + '\n';
  message += '*Passing Date* - ' + lastSavedData.bookingDate + '\n';
  message += '*Cash Collected* - Rs.' + cashCollected.toFixed(2) + '\n';
  message += '*Final price after discount* - Rs.' + lastSavedData.finalPrice + '\n';
  message += '*Discount* - ' + lastSavedData.discount + '\n';
  message += '*Accessories* -\n';

  const model = lastSavedData.model;
  if (MODEL_VARIANTS[model]) {
    const accessories = MODEL_VARIANTS[model].accessories;
    accessories.forEach(function(accessory) {
      const fieldId = accessory.toLowerCase().replace(/ /g, '');
      const value = lastSavedData[fieldId] || 'No';
      message += accessory + ' - ' + value + '\n';
    });
  }

  const whatsappUrl = 'https://wa.me/?text=' + encodeURIComponent(message);
  window.open(whatsappUrl, '_blank');
  closeWhatsAppModal();
}

/**
 * Close WhatsApp modal
 */
function closeWhatsAppModal() {
  document.getElementById('whatsappModal').classList.remove('show');
  lastSavedData = null;
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
}
