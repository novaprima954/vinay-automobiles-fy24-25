// ==========================================
// AUTHENTICATION MODULE
// ==========================================

// Password visibility toggle
function togglePassword() {
  const passwordInput = document.getElementById('password');
  const toggleIcon = document.querySelector('.toggle-password');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.textContent = '🔒';
  } else {
    passwordInput.type = 'password';
    toggleIcon.textContent = '👁️';
  }
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Check if already logged in
  const session = SessionManager.getSession();
  if (session && window.location.pathname.includes('index.html')) {
    window.location.href = 'home.html';
  }
});

async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  
  if (!username || !password) {
    showMessage('Please enter both username and password', 'error');
    return;
  }
  
  hideMessage();
  setLoading(true);
  
  try {
    const response = await API.login(username, password);
    
    if (response.success) {
      console.log('✅ Login successful');
      
      // Save session
      SessionManager.setSession(response.sessionId, response.user);
      
      showMessage('Login successful! Redirecting...', 'success');
      
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 1000);
      
    } else {
      console.log('❌ Login failed:', response.message);
      showMessage(response.message || 'Invalid username or password', 'error');
      document.getElementById('password').value = '';
      document.getElementById('password').focus();
    }
    
  } catch (error) {
    console.error('Login error:', error);
    showMessage('Login failed. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
}

function setLoading(loading) {
  const loginBtn = document.getElementById('loginBtn');
  const loadingDiv = document.getElementById('loading');
  
  if (loading) {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    loadingDiv.classList.remove('hidden');
  } else {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
    loadingDiv.classList.add('hidden');
  }
}

function showMessage(text, type) {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.className = 'message ' + type;
  msg.classList.remove('hidden');
}

function hideMessage() {
  document.getElementById('message').classList.add('hidden');
}

// ==========================================
// SESSION MANAGER
// ==========================================

const SessionManager = {
  
  /**
   * Save session to localStorage
   */
  setSession(sessionId, user) {
    const sessionData = {
      sessionId: sessionId,
      user: user,
      expires: new Date().getTime() + CONFIG.SESSION_DURATION
    };
    
    localStorage.setItem('vinay_session', JSON.stringify(sessionData));
    console.log('✅ Session saved');
  },
  
  /**
   * Get session from localStorage
   */
  getSession() {
    try {
      const sessionStr = localStorage.getItem('vinay_session');
      if (!sessionStr) return null;
      
      const session = JSON.parse(sessionStr);
      
      // Check if expired
      if (new Date().getTime() > session.expires) {
        this.clearSession();
        return null;
      }
      
      return session;
      
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },
  
  /**
   * Clear session
   */
  clearSession() {
    localStorage.removeItem('vinay_session');
    console.log('✅ Session cleared');
  },
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.getSession() !== null;
  },
  
  /**
   * Get current user
   */
  getCurrentUser() {
    const session = this.getSession();
    return session ? session.user : null;
  },
  
  /**
   * Get session ID
   */
  getSessionId() {
    const session = this.getSession();
    return session ? session.sessionId : null;
  },
  
  /**
   * Logout
   */
  async logout() {
    const sessionId = this.getSessionId();
    
    if (sessionId) {
      await API.logout(sessionId);
    }
    
    this.clearSession();
    window.location.href = 'index.html';
  }
};
