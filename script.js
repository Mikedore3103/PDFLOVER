// ===== API CONFIGURATION =====
// CHANGE THIS to your Render.com backend URL after deployment
// const API_URL = 'https://file-tools-app-backend.onrender.com';
// For LOCAL TESTING, use: const API_URL = 'http://localhost:3001';
const API_URL = 'https://pdflover-f8a3.onrender.com';

// DOM Elements
const toolSection = document.getElementById('toolSection');
const uploadSection = document.getElementById('uploadSection');
const uploadBackdrop = document.getElementById('uploadBackdrop');
const toolTitle = document.getElementById('toolTitle');
const toolDesc = document.getElementById('toolDesc');
const backBtn = document.getElementById('backBtn');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const fileList = document.getElementById('fileList');
const processBtn = document.getElementById('processBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const statusContainer = document.getElementById('statusContainer');
const statusText = document.getElementById('statusText');
const downloadContainer = document.getElementById('downloadContainer');
const downloadBtn = document.getElementById('downloadBtn');

// Auth Elements
const guestInfo = document.getElementById('guestInfo');
const userInfo = document.getElementById('userInfo');
const userEmail = document.getElementById('userEmail');
const userPlan = document.getElementById('userPlan');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Modal Elements
const authModal = document.getElementById('authModal');
const modalTitle = document.getElementById('modalTitle');
const authForm = document.getElementById('authForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authToggleText = document.getElementById('authToggleText');
const authToggleBtn = document.getElementById('authToggleBtn');
const closeModal = document.getElementById('closeModal');

// Upgrade Modal Elements
const upgradeModal = document.getElementById('upgradeModal');
const upgradeTitle = document.getElementById('upgradeTitle');
const upgradeMessage = document.getElementById('upgradeMessage');
const upgradeLoginBtn = document.getElementById('upgradeLoginBtn');
const upgradeRegisterBtn = document.getElementById('upgradeRegisterBtn');
const upgradeProBtn = document.getElementById('upgradeProBtn');
const closeUpgradeModalBtn = document.getElementById('closeUpgradeModal');

// State
let selectedTool = null;
let selectedFiles = [];
let currentJobId = null;
let pollingInterval = null;
let currentUser = null;
let isLoginMode = true;

// Premium tools
const PREMIUM_TOOLS = ['compress-pdf', 'ocr-pdf', 'batch-convert'];

// File picker accept rules per tool
const TOOL_ACCEPT = {
  'merge-pdf': '.pdf',
  'split-pdf': '.pdf',
  'compress-pdf': '.pdf',
  'pdf-to-jpg': '.pdf',
  'jpg-to-pdf': '.jpg,.jpeg,.png',
  'pdf-to-word': '.pdf',
  'pdf-to-excel': '.pdf',
  'pdf-to-powerpoint': '.pdf',
  'unlock-pdf': '.pdf',
  'protect-pdf': '.pdf'
};

// Utility Functions
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const iconMap = {
    pdf: '📄',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    ppt: '📽️',
    pptx: '📽️',
  };
  return iconMap[ext] || '📄';
}

function showElement(element) {
  element.classList.remove('hidden');
}

function hideElement(element) {
  element.classList.add('hidden');
}

function setupPdfWorker() {
  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

function openUploadPanel() {
  uploadSection.classList.add('is-open');
  uploadBackdrop.classList.add('is-active');
  document.body.classList.add('panel-open');
  toolSection.classList.add('is-dimmed');
}

function closeUploadPanel() {
  uploadSection.classList.remove('is-open');
  uploadBackdrop.classList.remove('is-active');
  document.body.classList.remove('panel-open');
  toolSection.classList.remove('is-dimmed');
}

// Authentication Functions
function getAuthToken() {
  return localStorage.getItem('authToken');
}

function setAuthToken(token) {
  localStorage.setItem('authToken', token);
}

function removeAuthToken() {
  localStorage.removeItem('authToken');
}

function updateAuthUI() {
  const token = getAuthToken();

  if (token && currentUser) {
    hideElement(guestInfo);
    showElement(userInfo);
    userEmail.textContent = currentUser.email;
    userPlan.textContent = currentUser.plan.toUpperCase();
    userPlan.classList.toggle('pro', currentUser.plan === 'pro');
  } else {
    showElement(guestInfo);
    hideElement(userInfo);
    currentUser = null;
  }
}

async function loadUserProfile() {
  const token = getAuthToken();
  if (!token) return;

  try {
    const response = await fetch(`${API_URL}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
    } else {
      // Token invalid, remove it
      removeAuthToken();
    }
  } catch (error) {
    console.error('Failed to load user profile:', error);
    removeAuthToken();
  }

  updateAuthUI();
}

function logout() {
  removeAuthToken();
  currentUser = null;
  updateAuthUI();
  // Redirect to home if needed
  if (window.location.pathname !== '/') {
    window.location.href = '/';
  }
}

// Modal Functions
function openAuthModal(login = true) {
  isLoginMode = login;
  modalTitle.textContent = login ? 'Login' : 'Sign Up';
  authSubmitBtn.textContent = login ? 'Login' : 'Sign Up';
  authToggleText.textContent = login ? "Don't have an account? " : 'Already have an account? ';
  authToggleBtn.textContent = login ? 'Sign Up' : 'Login';

  hideElement(confirmPasswordGroup);
  if (!login) {
    showElement(confirmPasswordGroup);
  }

  authForm.reset();
  showElement(authModal);
}

function closeAuthModal() {
  hideElement(authModal);
}

function openUpgradeModal(title = 'Free Usage Limit Reached', message = 'Create a free account for higher limits or upgrade to Pro for unlimited access.') {
  upgradeTitle.textContent = title;
  upgradeMessage.textContent = message;
  showElement(upgradeModal);
}

function closeUpgradeModal() {
  hideElement(upgradeModal);
}

async function handleAuthSubmit(e) {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!isLoginMode) {
    const confirmPassword = confirmPasswordInput.value;
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
  }

  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = 'Please wait...';

  try {
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      setAuthToken(data.token);
      currentUser = data.user;
      updateAuthUI();
      closeAuthModal();
      alert(`Welcome${!isLoginMode ? ', your account has been created' : ''}!`);
    } else {
      alert(data.message || 'Authentication failed');
    }
  } catch (error) {
    alert('Network error. Please try again.');
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
  }
}

function resetUI() {
  selectedFiles = [];
  currentJobId = null;
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  hideElement(fileList);
  hideElement(processBtn);
  hideElement(progressContainer);
  hideElement(statusContainer);
  hideElement(downloadContainer);
  renderFileList();
}

// Tool Selection
function selectTool(toolElement) {
  const tool = toolElement.dataset.tool;

  // Check if premium tool and user doesn't have access
  if (PREMIUM_TOOLS.includes(tool)) {
    const hasAccess = currentUser && currentUser.plan === 'pro';
    if (!hasAccess) {
      openUpgradeModal(
        'Premium Tool',
        'This tool requires a Pro subscription. Upgrade now for unlimited access to all features.'
      );
      return;
    }
  }

  selectedTool = {
    name: toolElement.dataset.name,
    tool: tool,
    desc: toolElement.dataset.desc,
  };

  toolTitle.textContent = selectedTool.name;
  toolDesc.textContent = selectedTool.desc;
  fileInput.accept = TOOL_ACCEPT[tool] || '';

  openUploadPanel();
  resetUI();
}

// Mark premium tools
function markPremiumTools() {
  document.querySelectorAll('.tool-card').forEach(card => {
    const tool = card.dataset.tool;
    if (PREMIUM_TOOLS.includes(tool)) {
      card.classList.add('premium');
    }
  });
}

// File Handling
function handleFileSelection(files) {
  const fileArray = Array.from(files);
  const acceptList = (TOOL_ACCEPT[selectedTool?.tool] || '')
    .split(',')
    .map(ext => ext.trim().toLowerCase())
    .filter(Boolean);

  const allowedFiles = acceptList.length === 0
    ? fileArray
    : fileArray.filter(file => {
        const extension = `.${file.name.split('.').pop().toLowerCase()}`;
        return acceptList.includes(extension);
      });

  if (allowedFiles.length !== fileArray.length) {
    alert(`Only ${acceptList.join(', ')} files are allowed for ${selectedTool?.name || 'this tool'}.`);
  }

  // Add new files to existing ones
  selectedFiles = [...selectedFiles, ...allowedFiles];

  renderFileList();

  if (selectedFiles.length > 0) {
    showElement(processBtn);
  }
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFileList();

  if (selectedFiles.length === 0) {
    hideElement(processBtn);
  }
}

function renderFileList() {
  if (selectedFiles.length === 0) {
    hideElement(fileList);
    return;
  }

  fileList.innerHTML = '';
  showElement(fileList);

  selectedFiles.forEach((file, index) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.setAttribute('draggable', 'true');
    fileItem.dataset.index = index.toString();

    fileItem.innerHTML = `
      <div class="file-preview" data-preview-index="${index}">
        <div class="preview-placeholder">Loading preview...</div>
      </div>
      <div class="file-info">
        <div class="file-details">
          <h4 title="${file.name}">${file.name}</h4>
          <span class="file-size">${formatFileSize(file.size)}</span>
        </div>
      </div>
      <div class="file-actions">
        <button class="drag-handle" type="button" title="Drag to reorder">Reorder</button>
        <button class="remove-btn" type="button" data-remove-index="${index}">Remove</button>
      </div>
    `;

    fileList.appendChild(fileItem);
  });

  attachFileListHandlers();
  renderPreviews();
}

function attachFileListHandlers() {
  fileList.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.removeIndex);
      if (Number.isInteger(index)) {
        removeFile(index);
      }
    });
  });

  let dragIndex = null;
  fileList.querySelectorAll('.file-item').forEach((item) => {
    item.addEventListener('dragstart', () => {
      dragIndex = Number(item.dataset.index);
      item.style.opacity = '0.6';
    });

    item.addEventListener('dragend', () => {
      item.style.opacity = '1';
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const dropIndex = Number(item.dataset.index);
      if (!Number.isInteger(dragIndex) || !Number.isInteger(dropIndex) || dragIndex === dropIndex) {
        return;
      }

      const updated = [...selectedFiles];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, moved);
      selectedFiles = updated;
      renderFileList();
    });
  });
}

function renderPreviews() {
  selectedFiles.forEach((file, index) => {
    const container = fileList.querySelector(`[data-preview-index="${index}"]`);
    if (!container) return;

    container.innerHTML = '';

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      renderPdfPreview(file, container);
      return;
    }

    if (['jpg', 'jpeg', 'png'].includes(extension)) {
      const img = document.createElement('img');
      img.alt = file.name;
      img.src = URL.createObjectURL(file);
      img.onload = () => URL.revokeObjectURL(img.src);
      container.appendChild(img);
      return;
    }

    const placeholder = document.createElement('div');
    placeholder.className = 'preview-placeholder';
    placeholder.textContent = 'Preview not available';
    container.appendChild(placeholder);
  });
}

async function renderPdfPreview(file, container) {
  if (!window.pdfjsLib) {
    const placeholder = document.createElement('div');
    placeholder.className = 'preview-placeholder';
    placeholder.textContent = 'PDF preview unavailable';
    container.appendChild(placeholder);
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const pdf = await window.pdfjsLib.getDocument({ data: reader.result }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.6 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport }).promise;
      container.appendChild(canvas);
    } catch (error) {
      const placeholder = document.createElement('div');
      placeholder.className = 'preview-placeholder';
      placeholder.textContent = 'Preview failed';
      container.appendChild(placeholder);
    }
  };
  reader.readAsArrayBuffer(file);
}

// Upload and Processing
function uploadFiles() {
  if (selectedFiles.length === 0) return;

  const formData = new FormData();
  formData.append('tool', selectedTool.tool);
  selectedFiles.forEach(file => {
    formData.append('files', file);
  });

  // Show progress
  showElement(progressContainer);
  hideElement(processBtn);
  progressFill.style.width = '0%';
  progressText.textContent = 'Uploading and processing...';

  const xhr = new XMLHttpRequest();

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percentComplete = (e.loaded / e.total) * 100;
      progressFill.style.width = percentComplete + '%';
      progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
    }
  });

  xhr.addEventListener('load', () => {
    if (xhr.status === 200) {
      const response = JSON.parse(xhr.responseText);
      if (response.success) {
        // Synchronous processing - directly show download
        progressText.textContent = 'Processing completed!';
        setTimeout(() => {
          hideElement(progressContainer);
          showDownload(response.output);
        }, 1000);
      } else {
        // Handle limit reached or other errors
        if (xhr.status === 429) {
          openUpgradeModal();
        } else if (xhr.status === 403) {
          openUpgradeModal('Premium Tool Required', response.message);
        } else {
          alert('Upload failed: ' + response.message);
        }
        resetUI();
      }
    } else if (xhr.status === 429) {
      // Rate limit exceeded
      openUpgradeModal();
      resetUI();
    } else if (xhr.status === 403) {
      // Premium tool access denied
      const response = JSON.parse(xhr.responseText);
      openUpgradeModal('Premium Tool Required', response.message);
      resetUI();
    } else {
      alert('Upload failed. Please try again.');
      resetUI();
    }
  });

  xhr.addEventListener('error', () => {
    alert('Upload failed. Please check your connection and try again.');
    resetUI();
  });

  xhr.open('POST', `${API_URL}/api/tools/upload`);

  // Add auth header if user is logged in
  const token = getAuthToken();
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  }

  xhr.send(formData);
}

function startJobPolling(jobId) {
  hideElement(progressContainer);
  showElement(statusContainer);
  statusText.textContent = 'Processing your files...';

  pollingInterval = setInterval(async () => {
    try {
      const response = await fetch(`${API_URL}/api/tools/job-status/${jobId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to check status');
      }

      const { status, output, error } = data;

      if (status === 'completed') {
        clearInterval(pollingInterval);
        pollingInterval = null;
        hideElement(statusContainer);
        showDownload(output);
      } else if (status === 'failed') {
        clearInterval(pollingInterval);
        pollingInterval = null;
        hideElement(statusContainer);
        alert(`Processing failed: ${error}`);
        resetUI();
      } else if (status === 'waiting') {
        statusText.textContent = 'Queued for processing...';
      } else if (status === 'active') {
        statusText.textContent = 'Processing your files...';
      }
    } catch (err) {
      console.error('Polling error:', err);
      clearInterval(pollingInterval);
      pollingInterval = null;
      hideElement(statusContainer);
      alert('Failed to check processing status. Please try again.');
      resetUI();
    }
  }, 2000); // Poll every 2 seconds
}

function showDownload(output) {
  showElement(downloadContainer);

  // Handle single file or multiple files
  const outputUrls = Array.isArray(output) ? output : [output];
  const downloadUrl = outputUrls[0]; // Use first file for download

  downloadBtn.href = downloadUrl.startsWith('http') ? downloadUrl : `${API_URL}${downloadUrl}`;
  downloadBtn.textContent = 'Download File';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  setupPdfWorker();
  // Tool selection
  document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => selectTool(card));
  });

  // Back button
  backBtn.addEventListener('click', () => {
    closeUploadPanel();
    resetUI();
  });

  // File selection
  selectBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    handleFileSelection(e.target.files);
    fileInput.value = ''; // Reset input
  });

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFileSelection(e.dataTransfer.files);
  });

  // Process button
  processBtn.addEventListener('click', uploadFiles);

  // Authentication
  loginBtn.addEventListener('click', () => openAuthModal(true));
  registerBtn.addEventListener('click', () => openAuthModal(false));
  logoutBtn.addEventListener('click', logout);

  // Auth modal
  closeModal.addEventListener('click', closeAuthModal);
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeAuthModal();
  });
  authForm.addEventListener('submit', handleAuthSubmit);
  authToggleBtn.addEventListener('click', () => openAuthModal(!isLoginMode));

  // Upgrade modal
  closeUpgradeModalBtn.addEventListener('click', closeUpgradeModal);
  upgradeModal.addEventListener('click', (e) => {
    if (e.target === upgradeModal) closeUpgradeModal();
  });
  upgradeLoginBtn.addEventListener('click', () => {
    closeUpgradeModal();
    openAuthModal(true);
  });
  upgradeRegisterBtn.addEventListener('click', () => {
    closeUpgradeModal();
    openAuthModal(false);
  });
  upgradeProBtn.addEventListener('click', () => {
    closeUpgradeModal();
    alert('Pro upgrade coming soon! Contact support for early access.');
  });

  uploadBackdrop.addEventListener('click', closeUploadPanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && uploadSection.classList.contains('is-open')) {
      closeUploadPanel();
    }
  });

  // Initialize
  loadUserProfile();
  markPremiumTools();

  console.log('File Tools frontend loaded successfully');
  console.log(`Backend API URL: ${API_URL}`);
});
