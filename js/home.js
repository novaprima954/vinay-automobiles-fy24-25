// ==========================================
// ADD THIS TO YOUR home.js FILE
// Update the ROLE_CARDS object to include the scanner card
// ==========================================

// Find the ROLE_CARDS object in your home.js and add this card for 'sales' role:

const ROLE_CARDS = {
  admin: [
    // ... existing admin cards ...
  ],
  sales: [
    {
      title: 'Add New Sale',
      icon: '➕',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      link: 'sales.html',
      description: 'Create new sales entry'
    },
    {
      title: 'Edit Sales',
      icon: '✏️',
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      link: 'salesedit.html',
      description: 'Modify existing sales'
    },
    {
      title: 'Vehicle Scanner',  // NEW CARD - ADD THIS
      icon: '📷',
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      link: 'scanner.html',
      description: 'Scan vehicle stickers'
    },
    {
      title: 'CRM',
      icon: '👥',
      color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      link: 'crm.html',
      description: 'Manage customer leads'
    },
    {
      title: 'Dashboard',
      icon: '📊',
      color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      link: 'dashboard.html',
      description: 'View your performance'
    }
  ],
  // ... other roles ...
};

// ==========================================
// COMPLETE EXAMPLE with the scanner card added
// ==========================================

const ROLE_CARDS = {
  admin: [
    { title: 'Dashboard', icon: '📊', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', link: 'dashboard.html', description: 'Overview & analytics' },
    { title: 'Add New Sale', icon: '➕', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', link: 'sales.html', description: 'Create new sales entry' },
    { title: 'Edit Sales', icon: '✏️', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', link: 'salesedit.html', description: 'Modify existing sales' },
    { title: 'Accounts', icon: '💰', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', link: 'accounts.html', description: 'Financial records' },
    { title: 'Accessories', icon: '🔧', color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', link: 'accessories.html', description: 'Accessory management' },
    { title: 'CRM', icon: '👥', color: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', link: 'crm.html', description: 'Customer relationship' },
    { title: 'Operator', icon: '🚗', color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', link: 'operator.html', description: 'Vehicle operations' },
    { title: 'View Records', icon: '📋', color: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', link: 'view.html', description: 'View all records' }
  ],
  sales: [
    { title: 'Dashboard', icon: '📊', color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', link: 'dashboard.html', description: 'View your performance' },
    { title: 'Add New Sale', icon: '➕', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', link: 'sales.html', description: 'Create new sales entry' },
    { title: 'Edit Sales', icon: '✏️', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', link: 'salesedit.html', description: 'Modify existing sales' },
    { title: 'Vehicle Scanner', icon: '📷', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', link: 'scanner.html', description: 'Scan vehicle stickers' },  // NEW CARD
    { title: 'CRM', icon: '👥', color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', link: 'crm.html', description: 'Manage customer leads' }
  ],
  accounts: [
    { title: 'Dashboard', icon: '📊', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', link: 'dashboard.html', description: 'Financial overview' },
    { title: 'Accounts', icon: '💰', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', link: 'accounts.html', description: 'Manage accounts' },
    { title: 'View Records', icon: '📋', color: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', link: 'view.html', description: 'View all records' }
  ],
  accessories: [
    { title: 'Accessories', icon: '🔧', color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', link: 'accessories.html', description: 'Manage accessories' },
    { title: 'View Records', icon: '📋', color: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', link: 'view.html', description: 'View all records' }
  ],
  operator: [
    { title: 'Operator', icon: '🚗', color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', link: 'operator.html', description: 'Vehicle operations' },
    { title: 'View Records', icon: '📋', color: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', link: 'view.html', description: 'View all records' }
  ]
};
