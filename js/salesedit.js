// ==========================================
// SALES EDIT PAGE LOGIC - COMPLETE
// ==========================================

// Model-Variant-Accessory Configuration (same as sales.js)
const MODEL_VARIANTS = {
  'Jupiter 110': {
    variants: ['JUPITER- DISC SXC', 'JUPITER- DRUM ALLOY SXC', 'JUPITER - DRUM ALLOY', 'JUPITER - SMW'],
    accessories: ['Guard', 'Grip Cover', 'Seat Cover', 'Matin', 'Helmet']
  },
  'Jupiter 125': {
    variants: ['JUPITER 125 - DISC SPLG BLACK', 'JUPITER 125- DISC DT SXC', 'JUPITER 125- DISC SXC N.GREEN', 'JUPITER 125- ALLOY DISC', 'JUPITER 125- DISC SX HT', 'JUPITER 125- ALLOY DRUM'],
    accessories: ['Guard', 'Grip Cover', 'Seat Cover', 'Matin', 'Helmet']
  },
  'Ntorq': {
    variants: ['NTORQ125 RACE XP- DISC'],
    accessories: ['Guard', 'Grip Cover', 'Seat Cover', 'Matin', 'Helmet']
  },
  'Zest': {
    variants: ['ZEST - MATTE'],
    accessories: ['Guard', 'Grip Cover', 'Seat Cover', 'Matin', 'Helmet']
  },
  'Radeon': {
    variants: ['RADEON - DRUM BLACK EDI', 'RADEON - DRUM', 'RADEON - DRUM DIGI'],
    accessories: ['Helmet']
  },
  'Raider': {
    variants: ['RAIDER - DISC IGO', 'RAIDER - DISC IGO SEDMA', 'RAIDER - DISC SS ES+KS', 'RAIDER - DRUM SS ES+KS'],
    accessories: ['Helmet']
  },
  'Ronin': {
    variants: ['RONIN - MID', 'RONIN - BASE LIGHTNING BLACK', 'RONIN - TOP'],
    accessories: ['Helmet']
  },
  'Apache': {
    variants: ['Apache 160', 'Apache 200'],
    accessories: ['Helmet']
  },
  'Sport': {
    variants: ['SPORT - ES+ MWL STICKER', 'SPORT - ES MWL'],
    accessories: ['Helmet']
  },
  'Star': {
    variants: ['STAR CITY+ - DRUM REF'],
    accessories: ['Helmet']
  },
  'XL 100': {
    variants: ['XL100 HEAVY DUTY- KS', 'XL100COMFORT I-TOUCHSTART', 'XL100HD I-TOUCH START', 'XL100HD I-TOUCH START- SE'],
    accessories: ['Grip Cover', 'Seat Cover', 'Tank Cover', 'Handle Hook', 'Helmet']
  },
  'iQube': {
    variants: ['iQube Electric S PB MERCURY GREY', 'iQUBE ELECTRIC SMARTXONNECT 11 T GR', 'iQUBE ELECTRIC SMARTXONNECT PB PW'],
    accessories: ['Guard', 'Grip Cover', 'Seat Cover', 'Matin', 'Helmet']
  },
  'Orbiter': {
    variants: ['ORBITER V2 - LUNAR GREY'],
    accessories: ['Guard', 'Grip Cover', 'Seat Cover', 'Matin', 'Helmet']
  }
};

let lastSavedData = null;

// ==========================================
// PAGE INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
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
  
  // Check role access
  if (user.role !== 'admin' && user.role !== 'sales') {
    console.log('❌ Access denied for role:', user.role);
    alert('Access denied. Only admin and sales can access this page.');
    window.location.href = 'home.html';
    return;
  }
  
  console.log('✅ Access granted:', user.name, '/', user.role);
  
  // Initialize page
  initializeSalesEditPage(user);
  
  // Setup event listeners
  setupEventListeners();
});

/**
 * Initialize sales edit page
 */
function initializeSalesEditPage(user) {
  document.getElementById('currentUser').textContent = user.name + ' (' + user.role + ')';
  console.log('✅ Sales Edit page initialized for:', user.name);
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Search By change
  document.getElementById('searchBy').addEventListener('change', handleSearchByChange);
  
  // Model change
  document.getElementById('model').addEventListener('change', updateVariants);
  
  // Variant change
  document.getElementById('variant').addEventListener('change', updateAccessoryFields);
  
  // Financier change
  document.getElementById('financierName').addEventListener('change', handleFinancierChange);
  
  // Calculate totals on amount changes
  ['receipt2Amount', 'receipt3Amount', 'receipt4Amount', 'disbursedAmount', 'finalPrice'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', calculateTotals);
  });
  
  // Mobile number validation
  document.getElementById('mobileNo').addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '');
  });
  
  // Form submission
  document.getElementById('editForm').addEventListener('submit', handleUpdate);
}

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
function loadRecord(record) {
  console.log('Loading record:', record);
  
  // Store receipt no for update
  document.getElementById('selectedReceiptNo').value = record.receiptNo;
  
  // Protected fields
  document.getElementById('protectedReceiptNo').textContent = record.receiptNo || '-';
  document.getElementById('protectedExecutiveName').textContent = record.executiveName || '-';
  document.getElementById('protectedReceiptNo1').textContent = record.receiptNo1 || '-';
  document.getElementById('protectedReceipt1Amount').textContent = record.receipt1Amount ? '₹' + record.receipt1Amount : '₹0';
  
  // Editable fields
  document.getElementById('bookingDate').value = record.bookingDate || '';
  document.getElementById('customerName').value = record.customerName || '';
  document.getElementById('mobileNo').value = record.mobileNo || '';
  document.getElementById('model').value = record.model || '';
  
  updateVariants();
  document.getElementById('variant').value = record.variant || '';
  updateAccessoryFields();
  
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
  
  // Load accessories
  if (record.model && MODEL_VARIANTS[record.model]) {
    const accessories = MODEL_VARIANTS[record.model].accessories;
    accessories.forEach(function(accessory) {
      const fieldId = accessory.toLowerCase().replace(/ /g, '');
      const element = document.getElementById(fieldId);
      if (element && record[fieldId]) {
        element.value = record[fieldId];
      }
    });
  }
  
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
}

/**
 * Update variants based on model
 */
function updateVariants() {
  const model = document.getElementById('model').value;
  const variantSelect = document.getElementById('variant');
  
  variantSelect.innerHTML = '<option value="">-- Select --</option>';
  
  if (model && MODEL_VARIANTS[model]) {
    MODEL_VARIANTS[model].variants.forEach(function(variant) {
      const option = document.createElement('option');
      option.value = variant;
      option.textContent = variant;
      variantSelect.appendChild(option);
    });
  }
  
  document.getElementById('accessoryFields').innerHTML = '';
}

/**
 * Update accessory fields based on model
 */
function updateAccessoryFields() {
  const model = document.getElementById('model').value;
  const accessoryContainer = document.getElementById('accessoryFields');
  
  accessoryContainer.innerHTML = '';
  
  if (model && MODEL_VARIANTS[model]) {
    const accessories = MODEL_VARIANTS[model].accessories;
    
    accessories.forEach(function(accessory) {
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';
      
      const label = document.createElement('label');
      label.innerHTML = accessory + ' <span class="required">*</span>';
      
      const select = document.createElement('select');
      select.id = accessory.toLowerCase().replace(/ /g, '');
      select.required = true;
      select.className = 'editable-highlight';
      
      if (accessory === 'Helmet') {
        select.innerHTML = '<option value="">-- Select --</option><option>1</option><option>2</option><option>No</option>';
      } else {
        select.innerHTML = '<option value="">-- Select --</option><option>Yes</option><option>No</option>';
      }
      
      formGroup.appendChild(label);
      formGroup.appendChild(select);
      accessoryContainer.appendChild(formGroup);
    });
  }
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
    executiveName: document.getElementById('protectedExecutiveName').textContent,
    bookingDate: document.getElementById('bookingDate').value,
    customerName: document.getElementById('customerName').value,
    mobileNo: document.getElementById('mobileNo').value,
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
  
  // Add accessories
  if (MODEL_VARIANTS[model]) {
    const accessories = MODEL_VARIANTS[model].accessories;
    accessories.forEach(function(accessory) {
      const fieldId = accessory.toLowerCase().replace(/ /g, '');
      const element = document.getElementById(fieldId);
      if (element) {
        formData[fieldId] = element.value;
      }
    });
  }
  
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

  const model = data.model;
  if (MODEL_VARIANTS[model]) {
    const accessories = MODEL_VARIANTS[model].accessories;
    accessories.forEach(function(accessory) {
      const fieldId = accessory.toLowerCase().replace(/ /g, '');
      const value = data[fieldId] || 'No';
      message += accessory + ' - ' + value + '\n';
    });
  }

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
