// MINIMAL WORKING SALESEDIT - START FRESH

document.addEventListener('DOMContentLoaded', async function() {
  console.log('=== SALES EDIT PAGE ===');
  
  const session = SessionManager.getSession();
  if (!session) {
    alert('Please login first');
    window.location.href = 'index.html';
    return;
  }
  
  console.log('✅ Logged in as:', session.user.username);
  
  // Setup event listeners
  document.getElementById('searchBtn').addEventListener('click', searchRecords);
  document.getElementById('searchValue').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchRecords();
  });
});

// Search records
async function searchRecords() {
  const searchBy = document.getElementById('searchBy').value;
  const searchValue = document.getElementById('searchValue').value.trim();
  
  if (!searchValue) {
    alert('Please enter a search value');
    return;
  }
  
  console.log('🔍 Searching:', searchBy, '=', searchValue);
  
  const resultsBody = document.getElementById('resultsBody');
  const resultsSection = document.getElementById('resultsSection');
  
  resultsSection.style.display = 'block';
  resultsBody.innerHTML = '<tr><td colspan="6" style="text-align:center">⏳ Searching...</td></tr>';
  
  try {
    const response = await API.searchViewRecords(searchBy, searchValue, null, null, null, null);
    
    console.log('API Response:', response);
    
    if (response.success && response.results && response.results.length > 0) {
      // Filter: only editable (Account Check != "Yes")
      const editable = response.results.filter(r => {
        const ac = (r.accountCheck || '').trim();
        return ac !== 'Yes';
      });
      
      console.log('Found', response.results.length, 'total,', editable.length, 'editable');
      
      if (editable.length > 0) {
        displayResults(editable);
      } else {
        resultsBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#ffc107">⚠️ No editable records</td></tr>';
      }
    } else {
      resultsBody.innerHTML = '<tr><td colspan="6" style="text-align:center">No records found</td></tr>';
    }
  } catch (error) {
    console.error('Search error:', error);
    resultsBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:red">Error: ' + error.message + '</td></tr>';
  }
}

// Display search results
function displayResults(results) {
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = '';
  
  results.forEach(record => {
    const row = tbody.insertRow();
    row.style.cursor = 'pointer';
    row.onclick = () => loadRecord(record);
    
    row.innerHTML = `
      <td>${record.receiptNo || ''}</td>
      <td>${record.customerName || ''}</td>
      <td>${record.mobileNo || ''}</td>
      <td>${record.model || ''}</td>
      <td>${record.bookingDate || ''}</td>
      <td>${record.accountCheck || 'Blank'}</td>
    `;
  });
  
  console.log('✅ Displayed', results.length, 'results');
}

// Load record into form
async function loadRecord(record) {
  console.log('📝 Loading record:', record.receiptNo);
  
  document.getElementById('detailsSection').style.display = 'block';
  document.getElementById('detailsSection').scrollIntoView({ behavior: 'smooth' });
  
  // Protected fields
  document.getElementById('protectedReceiptNo').textContent = record.receiptNo || '-';
  document.getElementById('protectedExecutiveName').textContent = record.executiveName || '-';
  document.getElementById('protectedBookingDate').textContent = record.bookingDate || '-';
  document.getElementById('protectedCustomerName').textContent = record.customerName || '-';
  document.getElementById('protectedMobileNo').textContent = record.mobileNo || '-';
  document.getElementById('protectedReceiptNo1').textContent = record.receiptNo1 || '-';
  document.getElementById('protectedReceipt1Amount').textContent = record.receipt1Amount ? '₹' + record.receipt1Amount : '-';
  
  // Editable fields
  document.getElementById('model').value = record.model || '';
  document.getElementById('variant').value = record.variant || '';
  document.getElementById('colour').value = record.colour || '';
  document.getElementById('discount').value = record.discount || '';
  document.getElementById('finalPrice').value = record.finalPrice || '';
  document.getElementById('deliveryDate').value = record.deliveryDate || '';
  document.getElementById('salesRemark').value = record.salesRemark || '';
  
  // Financier
  const financier = record.financierName || '';
  const standardFinanciers = ['Cash', 'TVS Credit', 'Shriram Finance', 'Hinduja Finance', 
                              'Janan SFB', 'TATA Capital', 'Indusind Bank', 'Berar Finance', 'IDFC'];
  
  if (standardFinanciers.includes(financier)) {
    document.getElementById('financierName').value = financier;
  } else if (financier) {
    document.getElementById('financierName').value = 'Other';
    document.getElementById('otherFinancierInput').style.display = 'block';
    document.getElementById('otherFinancierInput').value = financier;
  }
  
  // Store for update
  window.currentRecord = record;
  
  console.log('✅ Record loaded');
}

// Handle update
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('editForm');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      if (!window.currentRecord) {
        alert('No record loaded');
        return;
      }
      
      const data = {
        receiptNo: window.currentRecord.receiptNo,
        model: document.getElementById('model').value,
        variant: document.getElementById('variant').value,
        colour: document.getElementById('colour').value,
        discount: document.getElementById('discount').value,
        finalPrice: document.getElementById('finalPrice').value,
        financierName: document.getElementById('financierName').value === 'Other' 
          ? document.getElementById('otherFinancierInput').value 
          : document.getElementById('financierName').value,
        deliveryDate: document.getElementById('deliveryDate').value,
        salesRemark: document.getElementById('salesRemark').value
      };
      
      console.log('💾 Updating:', data);
      
      try {
        const sessionId = SessionManager.getSessionId();
        const response = await API.updateSalesRecord(sessionId, data);
        
        if (response.success) {
          alert('✅ Updated successfully!');
        } else {
          alert('❌ Error: ' + (response.message || 'Unknown error'));
        }
      } catch (error) {
        console.error('Update error:', error);
        alert('❌ Error updating record');
      }
    });
  }
  
  // Cancel button
  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      document.getElementById('detailsSection').style.display = 'none';
    });
  }
  
  // Financier change
  const financierSelect = document.getElementById('financierName');
  if (financierSelect) {
    financierSelect.addEventListener('change', function() {
      const otherInput = document.getElementById('otherFinancierInput');
      if (this.value === 'Other') {
        otherInput.style.display = 'block';
      } else {
        otherInput.style.display = 'none';
      }
    });
  }
});

function logout() {
  if (confirm('Logout?')) {
    SessionManager.clearSession();
    window.location.href = 'index.html';
  }
}
