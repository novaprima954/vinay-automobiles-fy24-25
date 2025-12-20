// ==========================================
// HOME PAGE LOGIC
// ==========================================

document.addEventListener('DOMContentLoaded', async function() {
  console.log('=== HOME PAGE ===');
  
  // Check authentication
  const session = SessionManager.getSession();
  
  if (!session) {
    console.log('❌ No session - redirecting to login');
    window.location.href = 'index.html';
    return;
  }
  
  const user = session.user;
  console.log('✅ User:', user.name, '| Role:', user.role);
  
  // Display user info
  displayUserInfo(user);
  
  // Create cards based on role
  createCards(user);
  
  // Hide loading, show content
  document.getElementById('loadingScreen').classList.add('hidden');
  document.getElementById('mainContent').classList.remove('hidden');
});

/**
 * Display user information
 */
function displayUserInfo(user) {
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = user.role;
  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('welcomeTitle').textContent = 'Welcome back, ' + user.name + '!';
}

/**
 * Create role-based cards
 */
function createCards(user) {
  const allowedPages = CONFIG.ROLE_ACCESS[user.role] || [];
  const container = document.getElementById('cardsContainer');
  container.innerHTML = '';
  
  allowedPages.forEach(pageKey => {
    const pageConfig = CONFIG.PAGES[pageKey];
    
    if (pageConfig) {
      const card = createCard(pageKey, pageConfig);
      container.appendChild(card);
    }
  });
  
  console.log('✅ Created', allowedPages.length, 'cards');
}

/**
 * Create a single card
 */
function createCard(pageKey, config) {
  const card = document.createElement('div');
  card.className = 'card ' + config.class;
  
  card.onclick = function() {
    navigateToPage(pageKey);
  };
  
  card.innerHTML = `
    <div class="card-icon">${config.icon}</div>
    <div class="card-title">${config.title}</div>
    <div class="card-description">${config.description}</div>
  `;
  
  return card;
}

/**
 * Navigate to a page
 */
function navigateToPage(page) {
  console.log('Navigating to:', page);
  
  // Map page keys to HTML files
  const pageMap = {
    'sales': 'sales.html',
    'salesedit': 'salesedit.html',
    'accounts': 'accounts.html',
    'accessory': 'accessories.html',  // Fixed: was accessory.html, should be accessories.html
    'view': 'view.html',
    'operator-update': 'operator-update.html',
    'crm': 'crm.html',
    'dashboard': 'dashboard.html',
    'users': 'users.html'
  };
  
  const htmlFile = pageMap[page];
  
  if (htmlFile) {
    window.location.href = htmlFile;
  } else {
    alert('Page not yet implemented: ' + page);
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    await SessionManager.logout();
  }
}
