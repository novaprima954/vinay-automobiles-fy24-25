// ==========================================
// SALES EDIT - COMPLETELY FRESH START
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('=== SALES EDIT PAGE ===');
  
  // Check auth
  const session = SessionManager.getSession();
  if (!session) {
    alert('Please login first');
    window.location.href = 'index.html';
    return;
  }
  
  console.log('✅ Logged in as:', session.user.username);
  
  // Event listeners
  document.getElementById('searchBtn').addEventListener('click', doSearch);
  document.getElementById('searchValue').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') doSearch();
  });
  
  // Form submit
  document.getElementById('editForm').addEventListener('submit', doUpdate);
  
  // Cancel
  document.getElementById('cancelBtn').addEventListener('click', function() {
    document.getElementById('detailsSection').style.display = 'none';
  });
  
  // Financier dropdown
  document.getElementById('financierName').addEventListener('change', function() {
    const other = document.getElementById('otherFinancierInput');
    other.style.display = this.value === 'Other' ? 'block' : 'none';
  });
});

// ==========================================
// SEARCH
// ==========================================

async function doSearch() {
  const searchBy = document.getElementById('searchBy').value;
  const searchValue = document.getElementById('searchValue').value.trim();
  
  if (!searchValue) {
    alert('Please enter search value');
    return;
  }
  
  console.log('🔍 Searching:', searchBy, '=', searchValue);
  
  const tbody = document.getElementById('resultsBody');
  const section = document.getElementById('resultsSection');
  
  section.style.display = 'block';
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">⏳ Searching...</td></tr>';
  
  try {
    const response = await API.searchViewRecords(searchBy, searchValue, null, null, null, null);
    
    console.log('📊 Search response:', response);
    
    if (response.success && response.results && response.results.length > 0) {
      // Filter editable
      const editable = response.results.filter(r => {
        const ac = (r.accountCheck || '').trim();
        return ac !== 'Yes';
      });
      
      console.log('Found:', response.results.length, 'total,', editable.length, 'editable');
      
      if (editable.length > 0) {
        showResults(editable);
      } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#ffc107">⚠️ No editable records</td></tr>';
      }
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No records found</td></tr>';
    }
  } catch (err) {
    console.error('❌ Search error:', err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:red">Error: ' + err.message + '</td></tr>';
  }
}

function showResults(results) {
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = '';
  
  results.forEach(rec => {
    const row = tbody.insertRow();
    row.style.cursor = 'pointer';
    row.onclick = () => loadFullRecord(rec.receiptNo);
    
    row.innerHTML = `
      <td>${rec.receiptNo || ''}</td>
      <td>${rec.customerName || ''}</td>
      <td>${rec.mobileNo || ''}</td>
      <td>${rec.model || ''}</td>
      <td>${rec.bookingDate || ''}</td>
      <td>${rec.accountCheck || 'Blank'}</td>
    `;
  });
  
  console.log('✅ Displayed', results.length, 'results');
}

// ==========================================
// LOAD FULL RECORD
// ==========================================

async function loadFullRecord(receiptNo) {
  console.log('📄 Loading full record:', receiptNo);
  
  document.getElementById('detailsSection').style.display = 'block';
  document.getElementById('detailsSection').scrollIntoView({ behavior: 'smooth' });
  
  try {
    const sessionId = SessionManager.getSessionId();
    const response = await API.getRecordByReceiptNo(sessionId, receiptNo);
    
    console.log('📦 Full record response:', response);
    
    if (response.success && response.record) {
      populateForm(response.record);
    } else {
      alert('Error loading record: ' + (response.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('❌ Load error:', err);
    alert('Error loading record: ' + err.message);
  }
}

function populateForm(rec) {
  console.log('📝 Populating form:', rec);
  
  // Store for update
  window.currentRecord = rec;
  
  // Protected fields
  document.getElementById('protectedReceiptNo').textContent = rec.receiptNo || '-';
  document.getElementById('protectedExecutiveName').textContent = rec.executiveName || '-';
  document.getElementById('protectedBookingDate').textContent = rec.bookingDate || '-';
  document.getElementById('protectedCustomerName').textContent = rec.customerName || '-';
  document.getElementById('protectedMobileNo').textContent = rec.mobileNo || '-';
  document.getElementById('protectedReceiptNo1').textContent = rec.receiptNo1 || '-';
  document.getElementById('protectedReceipt1Amount').textContent = rec.receipt1Amount ? '₹' + rec.receipt1Amount : '-';
  
  // Editable fields
  document.getElementById('model').value = rec.model || '';
  document.getElementById('variant').value = rec.variant || '';
  document.getElementById('colour').value = rec.colour || '';
  document.getElementById('discount').value = rec.discount || '';
  document.getElementById('finalPrice').value = rec.finalPrice || '';
  document.getElementById('deliveryDate').value = rec.deliveryDate || '';
  document.getElementById('salesRemark').value = rec.salesRemark || '';
  
  // Additional receipts
  document.getElementById('receiptNo2').value = rec.receiptNo2 || '';
  document.getElementById('receipt2Amount').value = rec.receipt2Amount || '';
  document.getElementById('receiptNo3').value = rec.receiptNo3 || '';
  document.getElementById('receipt3Amount').value = rec.receipt3Amount || '';
  document.getElementById('receiptNo4').value = rec.receiptNo4 || '';
  document.getElementById('receipt4Amount').value = rec.receipt4Amount || '';
  document.getElementById('doNumber').value = rec.doNumber || '';
  document.getElementById('disbursedAmount').value = rec.disbursedAmount || '';
  
  // Financier
  const standardFinanciers = ['Cash', 'TVS Credit', 'Shriram Finance', 'Hinduja Finance', 
                              'Janan SFB', 'TATA Capital', 'Indusind Bank', 'Berar Finance', 'IDFC'];
  
  const financier = rec.financierName || '';
  if (standardFinanciers.includes(financier)) {
    document.getElementById('financierName').value = financier;
    document.getElementById('otherFinancierInput').style.display = 'none';
  } else if (financier) {
    document.getElementById('financierName').value = 'Other';
    document.getElementById('otherFinancierInput').style.display = 'block';
    document.getElementById('otherFinancierInput').value = financier;
  }
  
  console.log('✅ Form populated successfully');
}

// ==========================================
// UPDATE
// ==========================================

async function doUpdate(e) {
  e.preventDefault();
  
  if (!window.currentRecord) {
    alert('No record loaded');
    return;
  }
  
  // Get financier
  let financier = document.getElementById('financierName').value;
  if (financier === 'Other') {
    financier = document.getElementById('otherFinancierInput').value.trim();
    if (!financier) {
      alert('Please enter financier name');
      return;
    }
  }
  
  const data = {
    receiptNo: window.currentRecord.receiptNo,
    model: document.getElementById('model').value,
    variant: document.getElementById('variant').value,
    colour: document.getElementById('colour').value,
    discount: document.getElementById('discount').value,
    finalPrice: document.getElementById('finalPrice').value,
    financierName: financier,
    deliveryDate: document.getElementById('deliveryDate').value,
    salesRemark: document.getElementById('salesRemark').value,
    receiptNo2: document.getElementById('receiptNo2').value,
    receipt2Amount: document.getElementById('receipt2Amount').value,
    receiptNo3: document.getElementById('receiptNo3').value,
    receipt3Amount: document.getElementById('receipt3Amount').value,
    receiptNo4: document.getElementById('receiptNo4').value,
    receipt4Amount: document.getElementById('receipt4Amount').value,
    doNumber: document.getElementById('doNumber').value,
    disbursedAmount: document.getElementById('disbursedAmount').value
  };
  
  console.log('💾 Updating:', data);
  
  const btn = document.getElementById('updateBtn');
  btn.disabled = true;
  btn.textContent = '💾 Updating...';
  
  try {
    const sessionId = SessionManager.getSessionId();
    const response = await API.updateSalesRecord(sessionId, data);
    
    btn.disabled = false;
    btn.textContent = '💾 Update Record';
    
    if (response.success) {
      alert('✅ Updated successfully!');
      // Reload record
      await loadFullRecord(data.receiptNo);
    } else {
      alert('❌ Update failed: ' + (response.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('❌ Update error:', err);
    alert('❌ Error: ' + err.message);
    
    btn.disabled = false;
    btn.textContent = '💾 Update Record';
  }
}

function logout() {
  if (confirm('Logout?')) {
    SessionManager.clearSession();
    window.location.href = 'index.html';
  }
}
