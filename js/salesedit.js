// ==========================================
// SALES EDIT PAGE - WITH PRICEMASTER INTEGRATION
// ==========================================

let lastSavedData = null;
let currentPriceMasterDetails = null;

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
  console.log('✅ Logged in as:', user.username, '(' + user.role + ')');
  
  // Display user info
  document.getElementById('userName').textContent = user.username;
  document.getElementById('userRole').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  
  // Load models from PriceMaster
  loadModels();
  
  // Setup event listeners
  setupEventListeners();
});

/**
 * Load all models from PriceMaster
 */
async function loadModels() {
  const modelSelect = document.getElementById('searchModel');
  
  if (!modelSelect) return;
  
  modelSelect.innerHTML = '<option value="">-- Loading models... --</option>';
  
  try {
    const response = await API.getAllModels();
    
    if (response.success && response.models) {
      modelSelect.innerHTML = '<option value="">-- All Models --</option>';
      
      response.models.forEach(function(model) {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
      });
      
      console.log('✅ Loaded', response.models.length, 'models from PriceMaster');
    } else {
      console.error('❌ Error loading models:', response.message);
      modelSelect.innerHTML = '<option value="">-- Error loading models --</option>';
    }
  } catch (error) {
    console.error('❌ Load models error:', error);
    modelSelect.innerHTML = '<option value="">-- Error loading models --</option>';
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search button
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', searchSales);
  }
  
  // Enter key in search field
  const searchValue = document.getElementById('searchValue');
  if (searchValue) {
    searchValue.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        searchSales();
      }
    });
  }
  
  // Model change in edit form
  const modelSelect = document.getElementById('model');
  if (modelSelect) {
    modelSelect.addEventListener('change', handleModelChange);
  }
  
  // Variant change in edit form
  const variantSelect = document.getElementById('variant');
  if (variantSelect) {
    variantSelect.addEventListener('change', handleVariantChange);
  }
  
  // Financier change
  const financierSelect = document.getElementById('financierName');
  if (financierSelect) {
    financierSelect.addEventListener('change', handleFinancierChange);
  }
  
  // Form submit
  const editForm = document.getElementById('editForm');
  if (editForm) {
    editForm.addEventListener('submit', handleUpdate);
  }
  
  // Cancel button
  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelEdit);
  }
}

// ==========================================
// SEARCH FUNCTIONALITY
// ==========================================

/**
 * Search for sales records
 */
async function searchSales() {
  const searchBy = document.getElementById('searchBy').value;
  const searchValue = document.getElementById('searchValue').value.trim();
  const searchModel = document.getElementById('searchModel').value;
  
  if (!searchValue && !searchModel) {
    alert('Please enter a search value or select a model');
    return;
  }
  
  console.log('🔍 Searching:', { searchBy, searchValue, searchModel });
  
  const resultsSection = document.getElementById('resultsSection');
  const resultsBody = document.getElementById('resultsBody');
  
  resultsSection.style.display = 'block';
  resultsBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">⏳ Searching...</td></tr>';
  
  try {
    const sessionId = SessionManager.getSessionId();
    const response = await API.searchSalesRecords(sessionId, searchBy, searchValue, searchModel);
    
    if (response.success && response.results) {
      displaySearchResults(response.results);
    } else {
      resultsBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #e74c3c;">❌ ' + (response.message || 'No records found') + '</td></tr>';
    }
  } catch (error) {
    console.error('❌ Search error:', error);
    resultsBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #e74c3c;">❌ Error searching records</td></tr>';
  }
}

/**
 * Display search results
 */
function displaySearchResults(results) {
  const resultsBody = document.getElementById('resultsBody');
  
  if (!results || results.length === 0) {
    resultsBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No records found</td></tr>';
    return;
  }
  
  resultsBody.innerHTML = '';
  
  results.forEach(function(record) {
    const row = document.createElement('tr');
    row.onclick = function() { loadRecord(record.receiptNo); };
    
    row.innerHTML = `
      <td>${record.receiptNo || '-'}</td>
      <td>${record.executiveName || '-'}</td>
      <td>${record.bookingDate || '-'}</td>
      <td>${record.customerName || '-'}</td>
      <td>${record.mobileNo || '-'}</td>
      <td>${record.model || '-'}</td>
      <td>${record.variant || '-'}</td>
      <td>${record.colour || '-'}</td>
    `;
    
    resultsBody.appendChild(row);
  });
  
  console.log('✅ Displayed', results.length, 'results');
}

// ==========================================
// LOAD AND POPULATE RECORD
// ==========================================

/**
 * Load record by receipt number
 */
async function loadRecord(receiptNo) {
  console.log('📄 Loading record:', receiptNo);
  
  const detailsSection = document.getElementById('detailsSection');
  detailsSection.style.display = 'block';
  
  // Scroll to details
  detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  try {
    const sessionId = SessionManager.getSessionId();
    const response = await API.getRecordByReceiptNo(sessionId, receiptNo);
    
    if (response.success && response.record) {
      lastSavedData = response.record;
      await populateForm(response.record);
    } else {
      alert('Error loading record: ' + (response.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('❌ Load record error:', error);
    alert('Error loading record');
  }
}

/**
 * Populate form with record data
 */
async function populateForm(record) {
  console.log('📝 Populating form with:', record);
  
  // Protected fields (read-only display)
  document.getElementById('protectedReceiptNo').textContent = record.receiptNo || '-';
  document.getElementById('protectedExecutiveName').textContent = record.executiveName || '-';
  document.getElementById('protectedBookingDate').textContent = record.bookingDate || '-';
  document.getElementById('protectedCustomerName').textContent = record.customerName || '-';
  document.getElementById('protectedMobileNo').textContent = record.mobileNo || '-';
  document.getElementById('protectedReceiptNo1').textContent = record.receiptNo1 || '-';
  document.getElementById('protectedReceipt1Amount').textContent = record.receipt1Amount ? '₹' + record.receipt1Amount : '-';
  
  // Load models first
  await loadModelsForEdit();
  
  // Set model
  const modelSelect = document.getElementById('model');
  if (modelSelect && record.model) {
    modelSelect.value = record.model;
  }
  
  // Load variants for this model
  if (record.model) {
    await loadVariantsForEdit(record.model);
  }
  
  // Set variant
  const variantSelect = document.getElementById('variant');
  if (variantSelect && record.variant) {
    variantSelect.value = record.variant;
  }
  
  // Render accessories for this model/variant with saved values
  if (record.model && record.variant) {
    await renderAccessories(record.model, record.variant, record);
  }
  
  // Editable fields
  document.getElementById('colour').value = record.colour || '';
  document.getElementById('discount').value = record.discount || '';
  document.getElementById('finalPrice').value = record.finalPrice || '';
  document.getElementById('deliveryDate').value = record.deliveryDate || '';
  document.getElementById('salesRemark').value = record.salesRemark || '';
  
  // Financier
  const standardFinanciers = ['Cash', 'TVS Credit', 'Shriram Finance', 'Hinduja Finance', 
                              'Janan SFB', 'TATA Capital', 'Indusind Bank', 'Berar Finance', 'IDFC'];
  
  const financierSelect = document.getElementById('financierName');
  const otherFinancierInput = document.getElementById('otherFinancierInput');
  
  if (standardFinanciers.includes(record.financierName)) {
    financierSelect.value = record.financierName;
    otherFinancierInput.style.display = 'none';
  } else if (record.financierName) {
    financierSelect.value = 'Other';
    otherFinancierInput.style.display = 'block';
    otherFinancierInput.value = record.financierName;
  }
  
  console.log('✅ Form populated');
}

/**
 * Load models for edit form
 */
async function loadModelsForEdit() {
  const modelSelect = document.getElementById('model');
  
  if (!modelSelect) return;
  
  modelSelect.innerHTML = '<option value="">-- Loading models... --</option>';
  
  try {
    const response = await API.getAllModels();
    
    if (response.success && response.models) {
      modelSelect.innerHTML = '<option value="">-- Select Model --</option>';
      
      response.models.forEach(function(model) {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
      });
      
      console.log('✅ Loaded models for edit form');
    } else {
      modelSelect.innerHTML = '<option value="">-- Error loading models --</option>';
    }
  } catch (error) {
    console.error('❌ Load models error:', error);
    modelSelect.innerHTML = '<option value="">-- Error loading models --</option>';
  }
}

/**
 * Load variants for selected model
 */
async function loadVariantsForEdit(model) {
  const variantSelect = document.getElementById('variant');
  
  if (!variantSelect || !model) {
    if (variantSelect) {
      variantSelect.innerHTML = '<option value="">-- Select Model First --</option>';
    }
    return;
  }
  
  variantSelect.innerHTML = '<option value="">-- Loading variants... --</option>';
  
  try {
    const response = await API.getPriceMasterVariants(model);
    
    if (response.success && response.variants) {
      variantSelect.innerHTML = '<option value="">-- Select Variant --</option>';
      
      response.variants.forEach(function(variant) {
        const option = document.createElement('option');
        option.value = variant;
        option.textContent = variant;
        variantSelect.appendChild(option);
      });
      
      console.log('✅ Loaded', response.variants.length, 'variants for', model);
    } else {
      variantSelect.innerHTML = '<option value="">-- Error loading variants --</option>';
    }
  } catch (error) {
    console.error('❌ Load variants error:', error);
    variantSelect.innerHTML = '<option value="">-- Error loading variants --</option>';
  }
}

/**
 * Render accessories based on PriceMaster + pre-fill saved values
 */
async function renderAccessories(model, variant, savedData) {
  const container = document.getElementById('accessoryFields');
  
  if (!container) return;
  
  // Clear existing accessories
  container.innerHTML = '<div style="text-align: center; padding: 10px; color: #999;">⏳ Loading accessories...</div>';
  
  try {
    // Get PriceMaster details for this model/variant
    const response = await API.getPriceMasterDetails(model, variant);
    
    if (!response.success) {
      container.innerHTML = '<div style="text-align: center; padding: 10px; color: #e74c3c;">❌ Could not load accessories</div>';
      return;
    }
    
    currentPriceMasterDetails = response.details;
    const pm = response.details;
    
    container.innerHTML = '';
    
    // Render accessories that have prices in PriceMaster
    const accessories = [
      { id: 'guard', name: 'Guard', priceKey: 'guardPrice', savedKey: 'guard' },
      { id: 'gripcover', name: 'Grip Cover', priceKey: 'gripPrice', savedKey: 'gripcover' },
      { id: 'seatcover', name: 'Seat Cover', priceKey: 'seatCoverPrice', savedKey: 'seatcover' },
      { id: 'matin', name: 'Matin', priceKey: 'matinPrice', savedKey: 'matin' },
      { id: 'tankcover', name: 'Tank Cover', priceKey: 'tankCoverPrice', savedKey: 'tankcover' },
      { id: 'handlehook', name: 'Handle Hook', priceKey: 'handleHookPrice', savedKey: 'handlehook' }
    ];
    
    accessories.forEach(function(acc) {
      if (pm[acc.priceKey]) {
        const price = parseFloat(pm[acc.priceKey]) || 0;
        const savedValue = savedData ? (savedData[acc.savedKey] || '') : '';
        
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
          <label>${acc.name} (₹${price.toLocaleString()})</label>
          <select id="${acc.id}">
            <option value="">-- Select --</option>
            <option value="Yes" ${savedValue === 'Yes' ? 'selected' : ''}>Yes</option>
            <option value="No" ${savedValue === 'No' ? 'selected' : ''}>No</option>
          </select>
        `;
        container.appendChild(div);
      }
    });
    
    // Helmet - special case (quantity)
    if (pm.helmetPrice) {
      const price = parseFloat(pm.helmetPrice) || 0;
      const savedHelmet = savedData ? (savedData.helmet || '') : '';
      
      const div = document.createElement('div');
      div.className = 'form-group';
      div.innerHTML = `
        <label>Helmet (₹${price.toLocaleString()})</label>
        <select id="helmet">
          <option value="">-- Select --</option>
          <option value="No" ${savedHelmet === 'No' ? 'selected' : ''}>No</option>
          <option value="1" ${savedHelmet === '1' ? 'selected' : ''}>1</option>
          <option value="2" ${savedHelmet === '2' ? 'selected' : ''}>2</option>
        </select>
      `;
      container.appendChild(div);
    }
    
    console.log('✅ Rendered accessories for', model, variant);
    
  } catch (error) {
    console.error('❌ Render accessories error:', error);
    container.innerHTML = '<div style="text-align: center; padding: 10px; color: #e74c3c;">❌ Error loading accessories</div>';
  }
}

// ==========================================
// EVENT HANDLERS
// ==========================================

/**
 * Handle model change - reload variants and accessories
 */
async function handleModelChange() {
  const modelSelect = document.getElementById('model');
  const model = modelSelect ? modelSelect.value : '';
  
  console.log('📦 Model changed to:', model);
  
  if (model) {
    // Load variants for new model
    await loadVariantsForEdit(model);
    
    // Clear accessories (will re-render when variant is selected)
    const container = document.getElementById('accessoryFields');
    if (container) {
      container.innerHTML = '<div style="text-align: center; padding: 10px; color: #999;">Please select a variant first</div>';
    }
  } else {
    // Clear variants and accessories
    const variantSelect = document.getElementById('variant');
    if (variantSelect) {
      variantSelect.innerHTML = '<option value="">-- Select Model First --</option>';
    }
    
    const container = document.getElementById('accessoryFields');
    if (container) {
      container.innerHTML = '';
    }
  }
}

/**
 * Handle variant change - re-render accessories (RESET to blank)
 */
async function handleVariantChange() {
  const modelSelect = document.getElementById('model');
  const variantSelect = document.getElementById('variant');
  
  const model = modelSelect ? modelSelect.value : '';
  const variant = variantSelect ? variantSelect.value : '';
  
  console.log('🎨 Variant changed to:', variant);
  
  if (model && variant) {
    // Re-render accessories with NO saved data (reset to blank)
    await renderAccessories(model, variant, null);
  } else {
    const container = document.getElementById('accessoryFields');
    if (container) {
      container.innerHTML = '';
    }
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

// ==========================================
// UPDATE FUNCTIONALITY
// ==========================================

/**
 * Handle form submission
 */
async function handleUpdate(e) {
  e.preventDefault();
  
  if (!lastSavedData) {
    alert('No record loaded');
    return;
  }
  
  console.log('💾 Updating sale...');
  
  // Get financier value
  let financierValue = document.getElementById('financierName').value;
  if (financierValue === 'Other') {
    const otherInput = document.getElementById('otherFinancierInput');
    if (otherInput && otherInput.value.trim()) {
      financierValue = otherInput.value.trim();
    } else {
      alert('Please enter financier name');
      return;
    }
  }
  
  // Collect accessory values
  const accessories = getAccessoryValues();
  
  // Build update data
  const data = {
    receiptNo: lastSavedData.receiptNo,
    model: document.getElementById('model').value,
    variant: document.getElementById('variant').value,
    colour: document.getElementById('colour').value,
    discount: document.getElementById('discount').value,
    finalPrice: document.getElementById('finalPrice').value,
    financierName: financierValue,
    deliveryDate: document.getElementById('deliveryDate').value,
    salesRemark: document.getElementById('salesRemark').value,
    ...accessories
  };
  
  console.log('📤 Update data:', data);
  
  try {
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) {
      updateBtn.disabled = true;
      updateBtn.textContent = '💾 Updating...';
    }
    
    const sessionId = SessionManager.getSessionId();
    const response = await API.updateSalesRecord(sessionId, data);
    
    if (updateBtn) {
      updateBtn.disabled = false;
      updateBtn.textContent = '💾 Update Sale';
    }
    
    if (response.success) {
      alert('✅ Sale updated successfully!');
      
      // Reload the record to show updated data
      await loadRecord(lastSavedData.receiptNo);
      
      // Optionally refresh search results
      // searchSales();
    } else {
      alert('❌ Update failed: ' + (response.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('❌ Update error:', error);
    alert('❌ Error updating sale');
    
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) {
      updateBtn.disabled = false;
      updateBtn.textContent = '💾 Update Sale';
    }
  }
}

/**
 * Get accessory values from form
 */
function getAccessoryValues() {
  const values = {
    guard: '',
    gripcover: '',
    seatcover: '',
    matin: '',
    tankcover: '',
    handlehook: '',
    helmet: ''
  };
  
  // Get values from rendered accessories
  ['guard', 'gripcover', 'seatcover', 'matin', 'tankcover', 'handlehook', 'helmet'].forEach(function(id) {
    const element = document.getElementById(id);
    if (element) {
      values[id] = element.value || '';
    }
  });
  
  return values;
}

/**
 * Cancel edit and hide details
 */
function cancelEdit() {
  const detailsSection = document.getElementById('detailsSection');
  if (detailsSection) {
    detailsSection.style.display = 'none';
  }
  
  lastSavedData = null;
  currentPriceMasterDetails = null;
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Logout
 */
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    SessionManager.clearSession();
    window.location.href = 'index.html';
  }
}
