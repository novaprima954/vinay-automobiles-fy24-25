// ==========================================
// VEHICLE SCANNER PAGE LOGIC
// ==========================================

let currentStream = null;
let currentReceiptNo = null;
let currentRecord = null;

// ==========================================
// PAGE INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('=== VEHICLE SCANNER PAGE ===');
  
  // Check authentication
  const session = SessionManager.getSession();
  
  if (!session) {
    console.log('❌ No session - redirecting to login');
    alert('Please login first');
    window.location.href = 'index.html';
    return;
  }
  
  const user = session.user;
  
  // Check role access (only sales and admin)
  if (user.role !== 'admin' && user.role !== 'sales') {
    console.log('❌ Access denied for role:', user.role);
    alert('Access denied. Only sales executives can access this page.');
    window.location.href = 'home.html';
    return;
  }
  
  console.log('✅ Access granted:', user.name, '/', user.role');
  
  // Load pending records
  loadPendingRecords();
});

/**
 * Load records that need vehicle number scanning
 */
async function loadPendingRecords() {
  const sessionId = SessionManager.getSessionId();
  const user = SessionManager.getCurrentUser();
  
  console.log('Loading pending vehicle records for:', user.name);
  
  try {
    const response = await API.call('getPendingVehicleRecords', {
      sessionId: sessionId
    });
    
    if (response.success) {
      displayRecords(response.records);
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Error loading records:', error);
    showMessage('Failed to load records', 'error');
  }
}

/**
 * Display records in list
 */
function displayRecords(records) {
  const listContainer = document.getElementById('recordsList');
  const emptyState = document.getElementById('emptyState');
  
  if (!records || records.length === 0) {
    listContainer.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  listContainer.style.display = 'block';
  emptyState.style.display = 'none';
  
  let html = '';
  
  records.forEach(function(record) {
    html += '<div class="record-item" onclick="openScanner(\'' + record.receiptNo + '\')">';
    html += '  <div style="display: flex; gap: 15px; align-items: center;">';
    html += '    <div class="scan-icon">📷</div>';
    html += '    <div style="flex: 1;">';
    html += '      <div class="record-header">';
    html += '        <div class="record-receipt">' + record.receiptNo + '</div>';
    html += '        <div class="record-date">' + record.bookingDate + '</div>';
    html += '      </div>';
    html += '      <div class="record-customer">' + record.customerName + '</div>';
    html += '      <div class="record-mobile">📱 ' + record.mobileNo + '</div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
  });
  
  listContainer.innerHTML = html;
}

/**
 * Open scanner modal for a record
 */
async function openScanner(receiptNo) {
  currentReceiptNo = receiptNo;
  
  const sessionId = SessionManager.getSessionId();
  
  try {
    // Get full record details
    const response = await API.call('getRecordByReceiptNo', {
      sessionId: sessionId,
      receiptNo: receiptNo
    });
    
    if (response.success) {
      currentRecord = response.record;
      
      // Populate modal
      document.getElementById('modalReceiptNo').textContent = currentRecord.receiptNo;
      document.getElementById('modalCustomer').textContent = currentRecord.customerName;
      document.getElementById('modalMobile').textContent = currentRecord.mobileNo;
      
      // Pre-fill if already exists
      document.getElementById('engineNumber').value = currentRecord.engineNumber || '';
      document.getElementById('frameNumber').value = currentRecord.frameNumber || '';
      
      // Show modal
      document.getElementById('scannerModal').classList.add('active');
      
      // Reset camera state
      resetCameraState();
      
    } else {
      showMessage(response.message, 'error');
    }
  } catch (error) {
    console.error('Error loading record:', error);
    showMessage('Failed to load record details', 'error');
  }
}

/**
 * Close scanner modal
 */
function closeScanner() {
  // Stop camera if running
  stopCamera();
  
  // Hide modal
  document.getElementById('scannerModal').classList.remove('active');
  
  // Clear current record
  currentReceiptNo = null;
  currentRecord = null;
}

/**
 * Reset camera state
 */
function resetCameraState() {
  const video = document.getElementById('videoElement');
  const image = document.getElementById('capturedImage');
  const startBtn = document.getElementById('startCameraBtn');
  const captureBtn = document.getElementById('captureBtn');
  const retakeBtn = document.getElementById('retakeBtn');
  const ocrStatus = document.getElementById('ocrStatus');
  
  video.style.display = 'block';
  image.style.display = 'none';
  
  startBtn.style.display = 'block';
  captureBtn.style.display = 'none';
  retakeBtn.style.display = 'none';
  
  ocrStatus.style.display = 'none';
  
  stopCamera();
}

/**
 * Start camera
 */
async function startCamera() {
  const video = document.getElementById('videoElement');
  const startBtn = document.getElementById('startCameraBtn');
  const captureBtn = document.getElementById('captureBtn');
  
  try {
    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment' // Use back camera on mobile
      }
    });
    
    currentStream = stream;
    video.srcObject = stream;
    
    // Update buttons
    startBtn.style.display = 'none';
    captureBtn.style.display = 'block';
    
    console.log('✅ Camera started');
    
  } catch (error) {
    console.error('Camera error:', error);
    alert('Failed to access camera. Please ensure camera permissions are granted.');
  }
}

/**
 * Stop camera
 */
function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(function(track) {
      track.stop();
    });
    currentStream = null;
  }
}

/**
 * Capture image from camera
 */
function captureImage() {
  const video = document.getElementById('videoElement');
  const image = document.getElementById('capturedImage');
  const captureBtn = document.getElementById('captureBtn');
  const retakeBtn = document.getElementById('retakeBtn');
  
  // Create canvas to capture frame
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  
  // Convert to image
  const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
  image.src = imageDataUrl;
  
  // Update UI
  video.style.display = 'none';
  image.style.display = 'block';
  captureBtn.style.display = 'none';
  retakeBtn.style.display = 'block';
  
  // Stop camera
  stopCamera();
  
  console.log('📸 Image captured');
  
  // Process with OCR
  processImageWithOCR(imageDataUrl);
}

/**
 * Retake image
 */
function retakeImage() {
  const video = document.getElementById('videoElement');
  const image = document.getElementById('capturedImage');
  const captureBtn = document.getElementById('captureBtn');
  const retakeBtn = document.getElementById('retakeBtn');
  const ocrStatus = document.getElementById('ocrStatus');
  
  // Reset UI
  video.style.display = 'block';
  image.style.display = 'none';
  retakeBtn.style.display = 'none';
  ocrStatus.style.display = 'none';
  
  // Restart camera
  startCamera();
}

/**
 * Process captured image with OCR
 */
async function processImageWithOCR(imageDataUrl) {
  const ocrStatus = document.getElementById('ocrStatus');
  const engineInput = document.getElementById('engineNumber');
  const frameInput = document.getElementById('frameNumber');
  const engineBadge = document.getElementById('engineExtractedBadge');
  const frameBadge = document.getElementById('frameExtractedBadge');
  
  // Show processing status
  ocrStatus.style.display = 'block';
  
  try {
    console.log('🔍 Starting OCR processing...');
    
    // Use Tesseract.js to extract text
    const result = await Tesseract.recognize(
      imageDataUrl,
      'eng',
      {
        logger: function(m) {
          if (m.status === 'recognizing text') {
            console.log('OCR Progress:', Math.round(m.progress * 100) + '%');
          }
        }
      }
    );
    
    const text = result.data.text;
    console.log('OCR Result:', text);
    
    // Extract Engine Number (E:)
    const engineMatch = text.match(/E[:\s]*([A-Z0-9]+)/i);
    if (engineMatch && engineMatch[1]) {
      const engineNumber = engineMatch[1].trim();
      engineInput.value = engineNumber;
      engineBadge.style.display = 'inline-block';
      console.log('✅ Engine Number extracted:', engineNumber);
    }
    
    // Extract Frame Number (F:)
    const frameMatch = text.match(/F[:\s]*([A-Z0-9]+)/i);
    if (frameMatch && frameMatch[1]) {
      const frameNumber = frameMatch[1].trim();
      frameInput.value = frameNumber;
      frameBadge.style.display = 'inline-block';
      console.log('✅ Frame Number extracted:', frameNumber);
    }
    
    // Hide processing status
    ocrStatus.style.display = 'none';
    
    if (engineMatch || frameMatch) {
      showMessage('✅ Numbers extracted! Please verify and edit if needed.', 'success');
    } else {
      showMessage('⚠️ Could not extract numbers automatically. Please enter manually.', 'error');
    }
    
  } catch (error) {
    console.error('OCR Error:', error);
    ocrStatus.style.display = 'none';
    showMessage('OCR failed. Please enter numbers manually.', 'error');
  }
}

/**
 * Save vehicle numbers
 */
async function saveVehicleNumbers() {
  const engineNumber = document.getElementById('engineNumber').value.trim();
  const frameNumber = document.getElementById('frameNumber').value.trim();
  const saveBtn = document.getElementById('saveBtn');
  
  // Validate
  if (!engineNumber) {
    alert('⚠️ Please enter Engine Number');
    document.getElementById('engineNumber').focus();
    return;
  }
  
  if (!frameNumber) {
    alert('⚠️ Please enter Frame Number');
    document.getElementById('frameNumber').focus();
    return;
  }
  
  const sessionId = SessionManager.getSessionId();
  
  saveBtn.disabled = true;
  saveBtn.textContent = '⏳ Saving...';
  
  try {
    const response = await API.call('saveVehicleNumbers', {
      sessionId: sessionId,
      receiptNo: currentReceiptNo,
      engineNumber: engineNumber,
      frameNumber: frameNumber
    });
    
    if (response.success) {
      showMessage('✅ Vehicle numbers saved successfully!', 'success');
      
      // Close modal after 1 second
      setTimeout(function() {
        closeScanner();
        // Reload records list
        loadPendingRecords();
      }, 1000);
      
    } else {
      showMessage('❌ ' + response.message, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Save Vehicle Numbers';
    }
    
  } catch (error) {
    console.error('Save error:', error);
    showMessage('❌ Failed to save. Please try again.', 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save Vehicle Numbers';
  }
}

/**
 * Show message
 */
function showMessage(text, type) {
  const msg = document.getElementById('statusMessage');
  if (!msg) return;
  
  msg.textContent = text;
  msg.className = 'message ' + type;
  msg.classList.remove('hidden');
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  if (type === 'success') {
    setTimeout(function() {
      msg.classList.add('hidden');
    }, 3000);
  }
}

/**
 * Go back to home
 */
function goBack() {
  window.location.href = 'home.html';
}
