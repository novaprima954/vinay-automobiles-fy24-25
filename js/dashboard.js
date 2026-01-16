// ==========================================
// DASHBOARD PAGE LOGIC
// ==========================================

let currentUser = null;
let currentFilter = 'month'; // Default to 'This Month'
let dashboardData = null;

document.addEventListener('DOMContentLoaded', async function() {
  console.log('=== DASHBOARD PAGE ===');
  
  // Check authentication
  const session = SessionManager.getSession();
  
  if (!session) {
    console.log('❌ No session - redirecting to login');
    window.location.href = 'index.html';
    return;
  }
  
  currentUser = session.user;
  console.log('✅ User:', currentUser.name, '| Role:', currentUser.role);
  
  // Load dashboard
  await loadDashboard();
});

/**
 * Load dashboard based on user role
 */
async function loadDashboard() {
  showLoading(true);
  
  try {
    let response;
    
    if (currentUser.role === 'sales') {
      response = await API.getSalesDashboard(currentFilter);
      if (response.success) {
        renderSalesDashboard(response.dashboard);
      }
    } else if (currentUser.role === 'accounts') {
      response = await API.getAccountsDashboard(currentFilter);
      if (response.success) {
        renderAccountsDashboard(response.dashboard);
      }
    } else if (currentUser.role === 'accessories') {
      response = await API.getAccessoriesDashboard(currentFilter);
      if (response.success) {
        renderAccessoriesDashboard(response.dashboard);
      }
    } else if (currentUser.role === 'admin') {
      response = await API.getAdminDashboard(currentFilter);
      if (response.success) {
        renderAdminDashboard(response.dashboard);
      }
    } else {
      showMessage('Dashboard not available for your role', 'error');
    }
    
    if (!response || !response.success) {
      showMessage(response?.message || 'Error loading dashboard', 'error');
    }
    
    showLoading(false);
    
  } catch (error) {
    console.error('Dashboard error:', error);
    showMessage('Error loading dashboard', 'error');
    showLoading(false);
  }
}

/**
 * Render Sales Dashboard
 */
function renderSalesDashboard(data) {
  dashboardData = data;
  document.getElementById('dashboardTitle').textContent = '📊 My Performance';
  
  const content = document.getElementById('dashboardContent');
  content.innerHTML = `
    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card blue">
        <div class="stat-icon">🛒</div>
        <div class="stat-label">My Sales</div>
        <div class="stat-value">${data.mySales}</div>
      </div>
      
      <div class="stat-card green">
        <div class="stat-icon">✅</div>
        <div class="stat-label">Completed</div>
        <div class="stat-value">${data.myCompletedSales}</div>
      </div>
      
      <div class="stat-card purple">
        <div class="stat-icon">🏆</div>
        <div class="stat-label">My Rank</div>
        <div class="stat-value">#${data.myRank}/${data.totalExecutives}</div>
      </div>
    </div>

    <!-- Target Progress -->
    <div class="section">
      <div class="section-header">🎯 Target Progress</div>
      <div class="progress-container">
        <div class="progress-label">
          <span>Target: ${data.target} sales</span>
          <span>${data.targetProgress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${data.targetProgress}%"></div>
        </div>
        <div style="margin-top: 8px; font-size: 13px; color: #666;">
          ${data.target - data.mySales > 0 ? (data.target - data.mySales) + ' more sales needed' : 'Target achieved! 🎉'}
        </div>
      </div>
    </div>

    <!-- Pending Tasks -->
    <div class="section">
      <div class="section-header">⚠️ Pending Tasks</div>
      ${data.accessoriesPending > 0 ? `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">Accessories Pending Fitting</div>
            <div class="list-item-subtitle">${data.accessoriesPending} of your sales need accessories</div>
          </div>
          <span class="badge">${data.accessoriesPending}</span>
        </div>
      ` : '<div class="empty-state">No pending tasks ✅</div>'}
    </div>

    <!-- My Accessories -->
    <div class="section">
      <div class="section-header">🔩 My Accessories Count</div>
      <div class="accessories-grid">
        <div class="accessory-item">
          <div class="accessory-name">Guard</div>
          <div class="accessory-count">${data.myAccessories.guard}</div>
        </div>
        <div class="accessory-item">
          <div class="accessory-name">Grip Cover</div>
          <div class="accessory-count">${data.myAccessories.grip}</div>
        </div>
        <div class="accessory-item">
          <div class="accessory-name">Helmet</div>
          <div class="accessory-count">${data.myAccessories.helmet}</div>
        </div>
        <div class="accessory-item">
          <div class="accessory-name">Seat Cover</div>
          <div class="accessory-count">${data.myAccessories.seatCover}</div>
        </div>
        <div class="accessory-item">
          <div class="accessory-name">Matin</div>
          <div class="accessory-count">${data.myAccessories.matin}</div>
        </div>
        <div class="accessory-item">
          <div class="accessory-name">Tank Cover</div>
          <div class="accessory-count">${data.myAccessories.tankCover}</div>
        </div>
        <div class="accessory-item">
          <div class="accessory-name">Handle Hook</div>
          <div class="accessory-count">${data.myAccessories.handleHook}</div>
        </div>
      </div>
    </div>

    <!-- Team Comparison -->
    <div class="section">
      <div class="section-header">📊 Executive Comparison (Completed Sales)</div>
      ${data.teamComparison.map((exec, index) => `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">
              ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
              ${exec.executive}
              ${exec.executive === currentUser.name ? ' (You)' : ''}
            </div>
            <div class="list-item-subtitle">Total: ${exec.totalSales} sales</div>
          </div>
          <div class="list-item-value">${exec.completedSales}</div>
        </div>
      `).join('')}
    </div>
  `;
  
  content.style.display = 'block';
}

/**
 * Render Accounts Dashboard
 */
function renderAccountsDashboard(data) {
  dashboardData = data;
  document.getElementById('dashboardTitle').textContent = '💰 Accounts Dashboard';
  
  const content = document.getElementById('dashboardContent');
  content.innerHTML = `
    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card green">
        <div class="stat-icon">✅</div>
        <div class="stat-label">Checked: Yes</div>
        <div class="stat-value">${data.accountCheckYes}</div>
      </div>
      
      <div class="stat-card red">
        <div class="stat-icon">❌</div>
        <div class="stat-label">Checked: No</div>
        <div class="stat-value">${data.accountCheckNo}</div>
      </div>
      
      <div class="stat-card orange">
        <div class="stat-icon">⚪</div>
        <div class="stat-label">Blank</div>
        <div class="stat-value">${data.accountCheckBlank}</div>
      </div>
    </div>

    <!-- Today's Work -->
    ${data.todaysWork.length > 0 ? `
    <div class="section">
      <div class="section-header">📅 Today's Work (${data.todaysWork.length})</div>
      ${data.todaysWork.map(record => `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">${record.customerName}</div>
            <div class="list-item-subtitle">Receipt: ${record.receiptNo} • ${record.mobileNo}</div>
          </div>
          <span class="badge">NEW</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Pending Reviews -->
    <div class="section">
      <div class="section-header">⏳ Pending Reviews (${data.pendingReviews.length})</div>
      ${data.pendingReviews.length > 0 ? data.pendingReviews.map(record => `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">${record.customerName}</div>
            <div class="list-item-subtitle">Receipt: ${record.receiptNo} • ${record.mobileNo}</div>
          </div>
          <span class="badge">${record.daysAgo}d ago</span>
        </div>
      `).join('') : '<div class="empty-state">All caught up! ✅</div>'}
    </div>
  `;
  
  content.style.display = 'block';
}

/**
 * Render Accessories Dashboard
 */
function renderAccessoriesDashboard(data) {
  dashboardData = data;
  document.getElementById('dashboardTitle').textContent = '🔧 Accessories Dashboard';
  
  const content = document.getElementById('dashboardContent');
  content.innerHTML = `
    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card green">
        <div class="stat-icon">✅</div>
        <div class="stat-label">Fitted</div>
        <div class="stat-value">${data.fitted}</div>
      </div>
      
      <div class="stat-card orange">
        <div class="stat-icon">⏳</div>
        <div class="stat-label">Pending</div>
        <div class="stat-value">${data.pending}</div>
      </div>
      
      <div class="stat-card red">
        <div class="stat-icon">🔧</div>
        <div class="stat-label">Issues</div>
        <div class="stat-value">${data.issues}</div>
      </div>
    </div>

    <!-- Average Fitting Time -->
    <div class="section">
      <div class="section-header">⏱️ Average Fitting Time</div>
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px; font-weight: 700; color: #667eea;">${data.avgFittingTime}</div>
        <div style="font-size: 14px; color: #666; margin-top: 5px;">days average</div>
        <div style="margin-top: 10px; font-size: 13px; color: ${data.avgFittingTime <= 2 ? '#4CAF50' : '#FF9800'};">
          Target: < 2 days ${data.avgFittingTime <= 2 ? '✅' : '⚠️'}
        </div>
      </div>
    </div>

    <!-- Overdue Fittings -->
    ${data.overdueList.length > 0 ? `
    <div class="section">
      <div class="section-header">⚠️ Overdue Fittings (${data.overdueList.length})</div>
      ${data.overdueList.map(record => `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">${record.customerName}</div>
            <div class="list-item-subtitle">Receipt: ${record.receiptNo}</div>
          </div>
          <span class="badge">${record.daysAgo}d</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Pending Deliveries -->
    <div class="section">
      <div class="section-header">📦 Pending Deliveries (${data.pendingList.length})</div>
      ${data.pendingList.length > 0 ? data.pendingList.map(record => `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">${record.customerName}</div>
            <div class="list-item-subtitle">
              ${record.model} • ${record.accessories}<br>
              Receipt: ${record.receiptNo}
            </div>
          </div>
          <span class="badge">${record.daysAgo}d</span>
        </div>
      `).join('') : '<div class="empty-state">All fitted! ✅</div>'}
    </div>
  `;
  
  content.style.display = 'block';
}

/**
 * Render Admin Dashboard
 */
function renderAdminDashboard(data) {
  dashboardData = data;
  document.getElementById('dashboardTitle').textContent = '📈 Admin Dashboard';
  
  const content = document.getElementById('dashboardContent');
  content.innerHTML = `
    <!-- Sales Overview -->
    <div class="section">
      <div class="section-header">📊 Sales Overview</div>
      <div class="stats-grid">
        <div class="stat-card blue">
          <div class="stat-icon">🛒</div>
          <div class="stat-label">Total Sales</div>
          <div class="stat-value">${data.totalSales}</div>
        </div>
      </div>
    </div>

    <!-- Executive Comparison -->
    <div class="section">
      <div class="section-header">👥 By Executive (Completed Sales)</div>
      ${data.executiveList.map((exec, index) => `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">
              ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
              ${exec.executive}
            </div>
            <div class="list-item-subtitle">Total: ${exec.totalSales} sales</div>
          </div>
          <div class="list-item-value">${exec.completedSales}</div>
        </div>
      `).join('')}
    </div>

    <!-- Accounts Status -->
    <div class="section">
      <div class="section-header">💰 Accounts Status</div>
      <div class="stats-grid">
        <div class="stat-card green">
          <div class="stat-icon">✅</div>
          <div class="stat-label">Done</div>
          <div class="stat-value">${data.accountsYes}</div>
        </div>
        
        <div class="stat-card orange">
          <div class="stat-icon">⏳</div>
          <div class="stat-label">Pending</div>
          <div class="stat-value">${data.accountsPending}</div>
        </div>
        
        <div class="stat-card red">
          <div class="stat-icon">❌</div>
          <div class="stat-label">Issues</div>
          <div class="stat-value">${data.accountsIssues}</div>
        </div>
      </div>
    </div>

    <!-- Accessories Status -->
    <div class="section">
      <div class="section-header">🔩 Accessories Status</div>
      <div class="stats-grid">
        <div class="stat-card green">
          <div class="stat-icon">✅</div>
          <div class="stat-label">Fitted</div>
          <div class="stat-value">${data.accessoriesFitted}</div>
        </div>
        
        <div class="stat-card orange">
          <div class="stat-icon">⏳</div>
          <div class="stat-label">Pending</div>
          <div class="stat-value">${data.accessoriesPending}</div>
        </div>
        
        <div class="stat-card red">
          <div class="stat-icon">🔧</div>
          <div class="stat-label">Issues</div>
          <div class="stat-value">${data.accessoriesIssues}</div>
        </div>
      </div>
    </div>

    <!-- Accessories Breakdown -->
    <div class="section">
      <div class="section-header">🔩 Accessories Breakdown (Click for model details)</div>
      <div class="accessories-grid">
        <div class="accessory-item" onclick="showAccessoryBreakdown('guard', 'Guard')">
          <div class="accessory-name">Guard</div>
          <div class="accessory-count">${data.accessories.guard}</div>
        </div>
        <div class="accessory-item" onclick="showAccessoryBreakdown('grip', 'Grip Cover')">
          <div class="accessory-name">Grip Cover</div>
          <div class="accessory-count">${data.accessories.grip}</div>
        </div>
        <div class="accessory-item" onclick="showAccessoryBreakdown('helmet', 'Helmet')">
          <div class="accessory-name">Helmet</div>
          <div class="accessory-count">${data.accessories.helmet}</div>
        </div>
        <div class="accessory-item" onclick="showAccessoryBreakdown('seatCover', 'Seat Cover')">
          <div class="accessory-name">Seat Cover</div>
          <div class="accessory-count">${data.accessories.seatCover}</div>
        </div>
        <div class="accessory-item" onclick="showAccessoryBreakdown('matin', 'Matin')">
          <div class="accessory-name">Matin</div>
          <div class="accessory-count">${data.accessories.matin}</div>
        </div>
        <div class="accessory-item" onclick="showAccessoryBreakdown('tankCover', 'Tank Cover')">
          <div class="accessory-name">Tank Cover</div>
          <div class="accessory-count">${data.accessories.tankCover}</div>
        </div>
        <div class="accessory-item" onclick="showAccessoryBreakdown('handleHook', 'Handle Hook')">
          <div class="accessory-name">Handle Hook</div>
          <div class="accessory-count">${data.accessories.handleHook}</div>
        </div>
      </div>
    </div>

    <!-- CRM Overview -->
    <div class="section">
      <div class="section-header">👥 CRM Overview</div>
      <div class="stats-grid">
        <div class="stat-card blue">
          <div class="stat-icon">📦</div>
          <div class="stat-label">New Leads</div>
          <div class="stat-value">${data.crmNewLeads}</div>
        </div>
        
        <div class="stat-card red">
          <div class="stat-icon">🔥</div>
          <div class="stat-label">Hot Leads</div>
          <div class="stat-value">${data.crmHotLeads}</div>
        </div>
        
        <div class="stat-card green">
          <div class="stat-icon">✅</div>
          <div class="stat-label">Conversion Rate</div>
          <div class="stat-value">${data.crmConversionRate}%</div>
        </div>
      </div>
    </div>
  `;
  
  content.style.display = 'block';
}

/**
 * Show accessory breakdown by model
 */
async function showAccessoryBreakdown(type, name) {
  try {
    const response = await API.getAccessoryBreakdown(type, currentFilter);
    
    if (response.success && response.breakdown.length > 0) {
      document.getElementById('modalTitle').textContent = name + ' Breakdown';
      
      const modalContent = document.getElementById('modalContent');
      modalContent.innerHTML = response.breakdown.map(item => `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">${item.model}</div>
          </div>
          <div class="list-item-value">${item.count}</div>
        </div>
      `).join('');
      
      document.getElementById('accessoryModal').classList.add('active');
    } else {
      showMessage('No data available', 'error');
    }
  } catch (error) {
    console.error('Breakdown error:', error);
    showMessage('Error loading breakdown', 'error');
  }
}

/**
 * Close modal
 */
function closeModal() {
  document.getElementById('accessoryModal').classList.remove('active');
}

/**
 * Change date filter
 */
function changeFilter(filter) {
  currentFilter = filter;
  
  // Update active button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-filter') === filter) {
      btn.classList.add('active');
    }
  });
  
  // Reload dashboard
  loadDashboard();
}

/**
 * Show/hide loading state
 */
function showLoading(show) {
  document.getElementById('loadingState').style.display = show ? 'block' : 'none';
  document.getElementById('dashboardContent').style.display = show ? 'none' : 'block';
}

/**
 * Show message
 */
function showMessage(text, type) {
  const msgDiv = document.getElementById('statusMessage');
  msgDiv.textContent = text;
  msgDiv.className = 'message ' + type;
  msgDiv.style.display = 'block';
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
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