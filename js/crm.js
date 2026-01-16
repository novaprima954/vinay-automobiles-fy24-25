// ==========================================
// CRM PAGE LOGIC
// ==========================================

let currentUser = null;
let dashboardData = null;
let myLeadsCache = []; // Cache my leads for filtering
let availableLeadsCache = []; // Cache available leads

document.addEventListener('DOMContentLoaded', async function() {
  console.log('=== CRM PAGE ===');
  
  // Check authentication
  const session = SessionManager.getSession();
  
  if (!session) {
    console.log('❌ No session - redirecting to login');
    window.location.href = 'index.html';
    return;
  }
  
  currentUser = session.user;
  console.log('✅ User:', currentUser.name, '| Role:', currentUser.role);
  
  // Display current user
  document.getElementById('currentUser').textContent = currentUser.name;
  
  // Load dashboard
  await loadDashboard();
});

/**
 * Load dashboard data
 */
async function loadDashboard() {
  try {
    const response = await API.getCRMDashboard();
    
    if (response.success) {
      dashboardData = response.dashboard;
      displayDashboard(dashboardData);
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    showMessage('Error loading dashboard', 'error');
  }
}

/**
 * Display dashboard data
 */
function displayDashboard(data) {
  // Update counts
  document.getElementById('todayFollowUpCount').textContent = data.todayFollowUps || 0;
  document.getElementById('myLeadsCount').textContent = data.totalLeads || 0;
  document.getElementById('availableCount').textContent = data.available || 0;
  document.getElementById('convertedCount').textContent = data.converted || 0;
  
  // Display urgent follow-ups
  if (data.urgentFollowUps && data.urgentFollowUps.length > 0) {
    document.getElementById('urgentSection').style.display = 'block';
    const urgentList = document.getElementById('urgentList');
    urgentList.innerHTML = '';
    
    data.urgentFollowUps.forEach(lead => {
      const item = document.createElement('div');
      item.className = 'urgent-item';
      item.innerHTML = `
        <div class="urgent-info">
          <div class="urgent-name">${lead.name}</div>
          <div class="urgent-details">${lead.model} • ${lead.mobile}</div>
        </div>
        <button class="btn-call" onclick="viewLeadDetails('${lead.leadId}')">✏️ OPEN</button>
      `;
      urgentList.appendChild(item);
    });
  } else {
    document.getElementById('urgentSection').style.display = 'none';
  }
}

/**
 * Switch tabs
 */
function switchTab(tab) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  // Show selected tab
  if (tab === 'dashboard') {
    document.getElementById('dashboardTab').classList.add('active');
    document.getElementById('navDashboard').classList.add('active');
  } else if (tab === 'available') {
    document.getElementById('availableTab').classList.add('active');
    document.getElementById('navAvailable').classList.add('active');
    loadAvailableLeads();
  } else if (tab === 'myLeads') {
    document.getElementById('myLeadsTab').classList.add('active');
    document.getElementById('navMyLeads').classList.add('active');
    loadMyLeads();
  }
}

/**
 * Load available leads (with caching for speed)
 */
async function loadAvailableLeads() {
  const container = document.getElementById('availableLeads');
  const loading = document.getElementById('availableLoading');
  
  // Show loading only if cache is empty
  if (availableLeadsCache.length === 0) {
    loading.style.display = 'block';
  }
  container.innerHTML = '';
  
  try {
    const response = await API.getAvailableLeads();
    
    loading.style.display = 'none';
    
    if (response.success && response.leads.length > 0) {
      availableLeadsCache = response.leads; // Cache the data
      
      response.leads.forEach(lead => {
        const card = createAvailableLeadCard(lead);
        container.appendChild(card);
      });
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <div>No available leads</div>
          <div style="font-size: 13px; margin-top: 5px;">All leads are assigned</div>
        </div>
      `;
    }
  } catch (error) {
    loading.style.display = 'none';
    showMessage('Error loading available leads', 'error');
  }
}

/**
 * Create available lead card
 */
function createAvailableLeadCard(lead) {
  const card = document.createElement('div');
  card.className = 'lead-card available';
  card.innerHTML = `
    <div class="lead-header">
      <div class="lead-name">${lead.customerName}</div>
      <div class="lead-status status-available">📦 AVAILABLE</div>
    </div>
    <div class="lead-details">
      🏍️ ${lead.model}<br>
      📱 ${lead.mobileNo}<br>
      📅 Added: ${lead.createdDate} ${lead.createdBy ? 'by ' + lead.createdBy : ''}
    </div>
    <div class="lead-actions">
      <button class="btn-action btn-primary-action" onclick="callAndClaimLead('${lead.leadId}', '${lead.mobileNo}')">📞 CALL</button>
    </div>
  `;
  return card;
}

/**
 * Load my leads (with caching for speed)
 */
async function loadMyLeads() {
  const container = document.getElementById('myLeads');
  const loading = document.getElementById('myLeadsLoading');
  
  // Show loading only if cache is empty
  if (myLeadsCache.length === 0) {
    loading.style.display = 'block';
  }
  container.innerHTML = '';
  
  try {
    const response = await API.getMyLeads();
    
    loading.style.display = 'none';
    
    if (response.success && response.leads.length > 0) {
      myLeadsCache = response.leads; // Cache the data
      filterMyLeads(); // Display with filter
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div>No leads assigned to you</div>
          <div style="font-size: 13px; margin-top: 5px;">Claim available leads to get started</div>
        </div>
      `;
    }
  } catch (error) {
    loading.style.display = 'none';
    showMessage('Error loading your leads', 'error');
  }
}

/**
 * Filter my leads by status
 */
function filterMyLeads() {
  const container = document.getElementById('myLeads');
  const filterValue = document.getElementById('statusFilter').value;
  
  container.innerHTML = '';
  
  let filteredLeads = myLeadsCache;
  if (filterValue !== 'all') {
    filteredLeads = myLeadsCache.filter(lead => lead.status === filterValue);
  }
  
  if (filteredLeads.length > 0) {
    filteredLeads.forEach(lead => {
      const card = createMyLeadCard(lead);
      container.appendChild(card);
    });
  } else {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div>No leads with status: ${filterValue}</div>
        <div style="font-size: 13px; margin-top: 5px;">Try selecting a different filter</div>
      </div>
    `;
  }
}

/**
 * Create my lead card
 */
function createMyLeadCard(lead) {
  const card = document.createElement('div');
  let statusClass = '';
  let statusEmoji = '';
  let statusText = lead.status;
  
  if (lead.status === 'Hot Lead') {
    statusClass = 'hot';
    statusEmoji = '🔥';
  } else if (lead.status === 'New') {
    statusClass = 'new';
    statusEmoji = '🆕';
  } else {
    statusEmoji = '📊';
  }
  
  card.className = `lead-card ${statusClass}`;
  card.innerHTML = `
    <div class="lead-header">
      <div class="lead-name">${lead.customerName}</div>
      <div class="lead-status status-${statusClass}">${statusEmoji} ${statusText}</div>
    </div>
    <div class="lead-details">
      🏍️ ${lead.model}<br>
      📱 ${lead.mobileNo}<br>
      ${lead.followUpDate ? '📅 Follow-up: ' + lead.followUpDate : ''}
    </div>
    <div class="lead-actions">
      <button class="btn-action btn-primary-action" onclick="callLead('${lead.mobileNo}')">📞 CALL</button>
      <button class="btn-action btn-secondary-action" onclick="viewLeadDetails('${lead.leadId}')">✏️ EDIT</button>
    </div>
  `;
  return card;
}

/**
 * Call lead (open phone dialer)
 */
function callLead(mobileNo) {
  window.location.href = `tel:${mobileNo}`;
}

/**
 * Call and automatically claim lead, then redirect to detail page
 */
async function callAndClaimLead(leadId, mobileNo) {
  try {
    showMessage('Claiming lead...', 'success');
    
    // Claim the lead with "Contacted" status
    const response = await API.claimLead(leadId, 'Contacted');
    
    if (response.success) {
      // Open phone dialer
      window.location.href = `tel:${mobileNo}`;
      
      // Redirect to detail page after short delay
      setTimeout(() => {
        window.location.href = `crm-detail.html?leadId=${leadId}`;
      }, 500);
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Call and claim error:', error);
    showMessage('Error claiming lead', 'error');
  }
}

/**
 * Claim lead
 */
async function claimLead(leadId) {
  const status = prompt('Set initial status:\n1. New\n2. Contacted\n3. Interested\n\nEnter number (1-3):');
  
  const statusMap = {
    '1': 'New',
    '2': 'Contacted',
    '3': 'Interested'
  };
  
  const initialStatus = statusMap[status];
  
  if (!initialStatus) {
    showMessage('Invalid status selected', 'error');
    return;
  }
  
  try {
    const response = await API.claimLead(leadId, initialStatus);
    
    if (response.success) {
      showMessage('✅ Lead claimed successfully!', 'success');
      // Reload dashboard and available leads
      await loadDashboard();
      await loadAvailableLeads();
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Claim error:', error);
    showMessage('Error claiming lead', 'error');
  }
}

/**
 * View lead details (redirect to detail page)
 */
function viewLeadDetails(leadId) {
  window.location.href = `crm-detail.html?leadId=${leadId}`;
}

/**
 * Add new lead (redirect to add page)
 */
function addNewLead() {
  window.location.href = 'crm-add.html';
}

/**
 * Show message
 */
function showMessage(text, type) {
  const msgDiv = document.getElementById('statusMessage');
  msgDiv.textContent = text;
  msgDiv.className = 'message ' + type;
  msgDiv.style.display = 'block';
  
  if (type === 'success') {
    setTimeout(() => {
      msgDiv.style.display = 'none';
    }, 3000);
  }
}

/**
 * Go back to home
 */
function goBack() {
  window.location.href = 'home.html';
}
