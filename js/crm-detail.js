// ==========================================
// LEAD DETAILS PAGE LOGIC
// ==========================================

let currentLead = null;
let leadId = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async function() {
  console.log('=== LEAD DETAILS PAGE ===');
  
  // Check authentication
  const session = SessionManager.getSession();
  
  if (!session) {
    console.log('❌ No session - redirecting to login');
    window.location.href = 'index.html';
    return;
  }
  
  currentUser = session.user;
  console.log('✅ User:', currentUser.name);
  
  // Get lead ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  leadId = urlParams.get('leadId');
  
  if (!leadId) {
    showMessage('Lead ID not found', 'error');
    setTimeout(() => window.location.href = 'crm.html', 2000);
    return;
  }
  
  // Load lead details
  await loadLeadDetails();
  
  // Form submission
  document.getElementById('updateForm').addEventListener('submit', handleUpdate);
});

/**
 * Load lead details
 */
async function loadLeadDetails() {
  try {
    const response = await API.getLeadDetails(leadId);
    
    if (response.success) {
      currentLead = response.lead;
      displayLeadDetails(currentLead);
      
      // Hide loading, show content
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('tabsContainer').style.display = 'block';
    } else {
      showMessage(response.message, 'error');
      setTimeout(() => window.location.href = 'crm.html', 2000);
    }
  } catch (error) {
    console.error('Load error:', error);
    showMessage('Error loading lead details', 'error');
  }
}

/**
 * Display lead details
 */
function displayLeadDetails(lead) {
  // Header
  document.getElementById('leadName').textContent = lead.customerName;
  
  // Info tab (read-only fields)
  document.getElementById('infoMobile').textContent = lead.mobileNo || '-';
  document.getElementById('infoModel').textContent = lead.model || '-';
  document.getElementById('infoSource').textContent = lead.source || '-';
  document.getElementById('infoAssigned').textContent = lead.assignedTo || 'Unassigned';
  
  // Editable fields
  document.getElementById('status').value = lead.status || '';
  document.getElementById('expectedDate').value = lead.expectedDate ? formatDateForInput(lead.expectedDate) : '';
  document.getElementById('followUpDate').value = lead.followUpDate ? formatDateForInput(lead.followUpDate) : '';
  document.getElementById('notes').value = lead.notes || '';
  
  // Show/hide convert button based on status
  const btnConvert = document.getElementById('btnConvert');
  if (lead.status === 'Hot Lead') {
    btnConvert.style.display = 'block';
  } else {
    btnConvert.style.display = 'none';
  }
  
  // Display activity timeline
  displayActivity(lead);
}

/**
 * Display activity timeline
 */
function displayActivity(lead) {
  const timeline = document.getElementById('activityTimeline');
  const activities = [];
  
  // Lead created
  if (lead.createdDate) {
    activities.push({
      icon: '🆕',
      type: 'Lead Created',
      date: lead.createdDate,
      text: `Created by ${lead.createdBy || 'System'}`
    });
  }
  
  // Status changes (we can enhance this later to track history)
  if (lead.status && lead.assignedTo) {
    activities.push({
      icon: '👤',
      type: 'Lead Assigned',
      date: lead.lastContactDate || lead.createdDate,
      text: `Assigned to ${lead.assignedTo} with status: ${lead.status}`
    });
  }
  
  // Last contact
  if (lead.lastContactDate) {
    activities.push({
      icon: '📞',
      type: 'Last Contact',
      date: lead.lastContactDate,
      text: 'Lead was contacted'
    });
  }
  
  // Future follow-up
  if (lead.followUpDate) {
    const followUpDateObj = new Date(lead.followUpDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    followUpDateObj.setHours(0, 0, 0, 0);
    
    if (followUpDateObj >= today) {
      activities.push({
        icon: '📅',
        type: 'Follow-up Scheduled',
        date: lead.followUpDate,
        text: 'Next follow-up planned'
      });
    }
  }
  
  if (activities.length > 0) {
    timeline.innerHTML = '';
    activities.forEach(activity => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      item.innerHTML = `
        <div class="activity-icon">${activity.icon}</div>
        <div class="activity-type">${activity.type}</div>
        <div class="activity-date">${activity.date}</div>
        <div class="activity-text">${activity.text}</div>
      `;
      timeline.appendChild(item);
    });
  } else {
    timeline.innerHTML = '<div class="empty-state">No activity recorded yet</div>';
  }
}

/**
 * Handle update form submission
 */
async function handleUpdate(e) {
  e.preventDefault();
  
  const data = {
    status: document.getElementById('status').value,
    expectedDate: document.getElementById('expectedDate').value,
    followUpDate: document.getElementById('followUpDate').value,
    notes: document.getElementById('notes').value
  };
  
  console.log('Updating lead:', data);
  
  try {
    const response = await API.updateLead(leadId, data);
    
    if (response.success) {
      showMessage('✅ Lead updated successfully!', 'success');
      
      // Reload lead details
      await loadLeadDetails();
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Update error:', error);
    showMessage('Error updating lead', 'error');
  }
}

/**
 * Add note
 */
async function addNote() {
  const noteText = document.getElementById('newNote').value.trim();
  
  if (!noteText) {
    showMessage('Please enter a note', 'error');
    return;
  }
  
  try {
    const response = await API.addLeadNote(leadId, noteText);
    
    if (response.success) {
      showMessage('✅ Note added!', 'success');
      
      // Clear input
      document.getElementById('newNote').value = '';
      
      // Reload to show new note
      await loadLeadDetails();
      
      // Switch to notes tab to show the new note
      switchTab('notes');
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Add note error:', error);
    showMessage('Error adding note', 'error');
  }
}

/**
 * Switch tabs
 */
function switchTab(tabName) {
  // Remove active class from all tabs
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  // Add active class to selected tab
  if (tabName === 'info') {
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.getElementById('infoTab').classList.add('active');
  } else if (tabName === 'activity') {
    document.querySelectorAll('.tab')[1].classList.add('active');
    document.getElementById('activityTab').classList.add('active');
  } else if (tabName === 'notes') {
    document.querySelectorAll('.tab')[2].classList.add('active');
    document.getElementById('notesTab').classList.add('active');
    displayNotes();
  }
}

/**
 * Display notes
 */
function displayNotes() {
  const notesList = document.getElementById('notesList');
  
  if (currentLead && currentLead.notes) {
    // Parse notes (assuming they're newline-separated with timestamp)
    const notes = currentLead.notes.split('\n').filter(n => n.trim());
    
    if (notes.length > 0) {
      notesList.innerHTML = '';
      notes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item';
        
        // Try to parse timestamp and content
        const parts = note.split(': ');
        if (parts.length >= 2) {
          const timestamp = parts[0];
          const content = parts.slice(1).join(': ');
          
          item.innerHTML = `
            <div class="note-header">
              <span>${timestamp}</span>
            </div>
            <div class="note-text">${content}</div>
          `;
        } else {
          item.innerHTML = `<div class="note-text">${note}</div>`;
        }
        
        notesList.appendChild(item);
      });
    } else {
      notesList.innerHTML = '<div class="empty-state">No notes yet</div>';
    }
  } else {
    notesList.innerHTML = '<div class="empty-state">No notes yet</div>';
  }
}

/**
 * Call lead
 */
function callLead() {
  if (currentLead && currentLead.mobileNo) {
    window.location.href = `tel:${currentLead.mobileNo}`;
  }
}

/**
 * Convert lead to sale
 */
async function convertToSale() {
  if (!confirm('Convert this lead to a sale? This will mark the lead as "Converted" and redirect you to the Sales Entry page.')) {
    return;
  }
  
  try {
    const response = await API.convertLeadToSale(leadId);
    
    if (response.success) {
      showMessage('✅ Lead converted! Redirecting to Sales Entry...', 'success');
      
      // Redirect to sales entry with pre-filled data
      setTimeout(() => {
        const params = new URLSearchParams({
          customerName: response.leadData.customerName,
          mobileNo: response.leadData.mobileNo,
          model: response.leadData.model
        });
        window.location.href = `sales.html?${params.toString()}`;
      }, 1500);
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Convert error:', error);
    showMessage('Error converting lead', 'error');
  }
}

/**
 * Format date for input field (YYYY-MM-DD)
 */
function formatDateForInput(dateStr) {
  if (!dateStr || dateStr === '-') return '';
  
  // Handle different date formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Show message
 */
function showMessage(text, type) {
  const msgDiv = document.getElementById('statusMessage');
  msgDiv.textContent = text;
  msgDiv.className = 'message ' + type;
  msgDiv.style.display = 'block';
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  if (type === 'success') {
    setTimeout(() => {
      msgDiv.style.display = 'none';
    }, 3000);
  }
}

/**
 * Go back to CRM
 */
function goBack() {
  window.location.href = 'crm.html';
}
