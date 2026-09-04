// ===== API CONFIGURATION =====
// Same-origin deployment avoids CORS entirely. A separately hosted frontend
// continues to call the Render API, which must list that site in
// FRONTEND_ORIGIN on Render.
const RENDER_API_URL = 'https://pdflover-1.onrender.com';
const isLocalBackend = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isRenderBackend = window.location.hostname.endsWith('.onrender.com');
// Any Render-hosted copy (including the Docker migration service) serves both
// the frontend and API, so it must call itself instead of the legacy service.
const API_URL = isRenderBackend || isLocalBackend
  ? window.location.origin
  : RENDER_API_URL;

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
const passwordOptions = document.getElementById('passwordOptions');
const pdfPassword = document.getElementById('pdfPassword');

// Auth Elements
const guestInfo = document.getElementById('guestInfo');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const userPlan = document.getElementById('userPlan');
const upgradeBtn = document.getElementById('upgradeBtn');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const toolsMenuButton = document.getElementById('toolsMenuButton');
const toolsMenuList = document.getElementById('toolsMenuList');
const footerToolList = document.getElementById('footerToolList');
const footerPricingBtn = document.getElementById('footerPricingBtn');
const footerAuthBtn = document.getElementById('footerAuthBtn');
const footerSocialLinks = document.getElementById('footerSocialLinks');
const footerYear = document.getElementById('footerYear');
const accountDashboard = document.getElementById('accountDashboard');
const dashboardPlan = document.getElementById('dashboardPlan');
const dashboardUsage = document.getElementById('dashboardUsage');
const subscriptionStatus = document.getElementById('subscriptionStatus');
const subscriptionStarted = document.getElementById('subscriptionStarted');
const subscriptionExpires = document.getElementById('subscriptionExpires');
const lastPayment = document.getElementById('lastPayment');
const subscriptionNotice = document.getElementById('subscriptionNotice');
const subscriptionActions = document.getElementById('subscriptionActions');
const adminDashboard = document.getElementById('adminDashboard');
const adminTotalUsers = document.getElementById('adminTotalUsers');
const adminActiveSubscriptions = document.getElementById('adminActiveSubscriptions');
const adminSuccessfulPayments = document.getElementById('adminSuccessfulPayments');
const adminRecentUsers = document.getElementById('adminRecentUsers');
const adminUserSearchForm = document.getElementById('adminUserSearchForm');
const adminUserSearch = document.getElementById('adminUserSearch');
const adminUsers = document.getElementById('adminUsers');

// Modal Elements
const authModal = document.getElementById('authModal');
const modalTitle = document.getElementById('modalTitle');
const authForm = document.getElementById('authForm');
const usernameInput = document.getElementById('username');
const usernameGroup = document.getElementById('usernameGroup');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
const emailVerifyGroup = document.getElementById('emailVerifyGroup');
const sendVerifyBtn = document.getElementById('sendVerifyBtn');
const emailVerifyCodeInput = document.getElementById('emailVerifyCode');
const humanVerificationGroup = document.getElementById('humanVerificationGroup');
const humanVerificationWidget = document.getElementById('humanVerificationWidget');
const humanVerificationMessage = document.getElementById('humanVerificationMessage');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authToggleText = document.getElementById('authToggleText');
const authToggleBtn = document.getElementById('authToggleBtn');
const closeModal = document.getElementById('closeModal');

// Upgrade Modal Elements
const upgradeModal = document.getElementById('upgradeModal');
const upgradeMessage = document.getElementById('upgradeMessage');
const plansGrid = document.getElementById('plansGrid');
const billingMessage = document.getElementById('billingMessage');
const closeUpgradeModalBtn = document.getElementById('closeUpgradeModal');

// Upgrade Nudge Modal Elements
const upgradeNudgeModal = document.getElementById('upgradeNudgeModal');
const closeNudgeModal = document.getElementById('closeNudgeModal');
const nudgeUpgradeBtn = document.getElementById('nudgeUpgradeBtn');

// State
let selectedTool = null;
let selectedFiles = [];
let currentJobId = null;
let pollingInterval = null;
let currentUser = null;
let isLoginMode = true;
let emailVerified = false;
let securityConfigPromise = null;
let turnstileSiteKey = null;
let turnstileWidgetId = null;
let turnstileToken = '';

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
  'protect-pdf': '.pdf',
  'word-to-pdf': '.doc,.docx',
  'excel-to-pdf': '.xls,.xlsx',
  'powerpoint-to-pdf': '.ppt,.pptx'
};

// Replace these clearly labelled placeholder URLs with File Tools' real social profiles.
const SOCIAL_LINKS = {
  Instagram: { mark: 'instagram', url: 'https://example.com/replace-with-instagram-url' },
  X: { mark: 'x', url: 'https://example.com/replace-with-x-url' },
  Facebook: { mark: 'facebook', url: 'https://example.com/replace-with-facebook-url' },
  LinkedIn: { mark: 'linkedin', url: 'https://example.com/replace-with-linkedin-url' }
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
    // Accounts created before usernames were introduced remain usable without
    // using a long email address as the primary header identity.
    userName.textContent = currentUser.username || 'Account';
    userName.title = currentUser.username || currentUser.email || '';
    userPlan.textContent = currentUser.plan.toUpperCase();
    userPlan.classList.toggle('pro', currentUser.plan === 'pro');
    userPlan.classList.toggle('premium', currentUser.plan === 'premium');
    if (currentUser.plan === 'premium') {
      hideElement(upgradeBtn);
    } else {
      showElement(upgradeBtn);
    }
    renderSubscriptionDashboard();
    if (currentUser.role === 'admin') {
      loadAdminOverview();
    } else {
      hideElement(adminDashboard);
    }
  } else {
    showElement(guestInfo);
    hideElement(userInfo);
    currentUser = null;
    hideElement(accountDashboard);
    hideElement(adminDashboard);
  }

  if (footerAuthBtn) {
    footerAuthBtn.textContent = token && currentUser ? 'Log Out' : 'Log In';
  }
}

function escapeHtml(value) {
  const node = document.createElement('span');
  node.textContent = String(value || '');
  return node.innerHTML;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text };
  }
}

async function loadSecurityConfig() {
  if (!securityConfigPromise) {
    securityConfigPromise = fetch(`${API_URL}/api/auth/security-config`)
      .then(readJsonResponse)
      .catch(error => {
        console.error('Failed to load security config:', error);
        return { turnstile: { enabled: false } };
      });
  }
  return securityConfigPromise;
}

function resetHumanVerification() {
  turnstileToken = '';
  if (window.turnstile && turnstileWidgetId !== null) {
    window.turnstile.reset(turnstileWidgetId);
  }
}

function renderHumanVerificationWidget() {
  if (!humanVerificationWidget || !turnstileSiteKey) return;
  if (!window.turnstile) {
    humanVerificationMessage.textContent = 'Loading human verification...';
    window.setTimeout(renderHumanVerificationWidget, 300);
    return;
  }
  if (turnstileWidgetId !== null) {
    resetHumanVerification();
    return;
  }

  turnstileWidgetId = window.turnstile.render(humanVerificationWidget, {
    sitekey: turnstileSiteKey,
    callback: (token) => {
      turnstileToken = token;
      humanVerificationMessage.textContent = 'Verification complete.';
    },
    'expired-callback': () => {
      turnstileToken = '';
      humanVerificationMessage.textContent = 'Verification expired. Please complete it again.';
    },
    'error-callback': () => {
      turnstileToken = '';
      humanVerificationMessage.textContent = 'Verification could not load. Please refresh and try again.';
    }
  });
}

async function prepareHumanVerification(login) {
  hideElement(humanVerificationGroup);
  turnstileToken = '';
  if (!login || !humanVerificationGroup) return;

  const config = await loadSecurityConfig();
  if (!config.turnstile?.enabled || !config.turnstile?.siteKey) return;

  turnstileSiteKey = config.turnstile.siteKey;
  humanVerificationMessage.textContent = 'Complete the quick check to continue.';
  showElement(humanVerificationGroup);
  renderHumanVerificationWidget();
}

async function loadAdminOverview() {
  try {
    const response = await fetch(`${API_URL}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || 'Unable to load admin overview.');
    adminTotalUsers.textContent = data.totalUsers;
    adminActiveSubscriptions.textContent = data.activeSubscriptions;
    adminSuccessfulPayments.textContent = data.successfulPayments;
    adminRecentUsers.innerHTML = data.recentUsers.map(user =>
      `<li>${escapeHtml(user.email)} — ${escapeHtml(user.plan)} / ${escapeHtml(user.subscriptionStatus)}</li>`
    ).join('') || '<li>No users yet.</li>';
    showElement(adminDashboard);
    loadAdminUsers();
  } catch (error) {
    console.error('Failed to load admin overview:', error);
    hideElement(adminDashboard);
  }

}

function getAvailableTools() {
  return [...document.querySelectorAll('.tool-card')].map(card => ({
    id: card.dataset.tool,
    name: card.dataset.name,
    icon: card.querySelector('[data-lucide]')?.dataset.lucide || 'file-text'
  }));
}

function closeToolsMenu() {
  if (!toolsMenuButton || !toolsMenuList) return;
  toolsMenuButton.setAttribute('aria-expanded', 'false');
  toolsMenuList.classList.remove('is-open');
}

function positionToolsMenu() {
  // Keep the desktop panel within a consistent 20px viewport gutter even
  // when the trigger sits close to the right edge of the header.
  if (window.innerWidth <= 520) {
    toolsMenuList.removeAttribute('style');
    return;
  }

  const gutter = 20;
  const trigger = toolsMenuButton.getBoundingClientRect();
  const width = Math.min(608, window.innerWidth - (gutter * 2));
  const left = Math.max(gutter, Math.min(trigger.left, window.innerWidth - width - gutter));
  toolsMenuList.style.width = `${width}px`;
  toolsMenuList.style.left = `${left}px`;
  toolsMenuList.style.top = `${trigger.bottom + 10}px`;
  toolsMenuList.style.right = 'auto';
  toolsMenuList.style.bottom = 'auto';
}

function renderSiteNavigation() {
  const tools = getAvailableTools();
  const toolItems = tools.map(tool => `<button type="button" role="menuitem" class="tool-menu-item" data-tool-launch="${tool.id}"><i data-lucide="${tool.icon}" aria-hidden="true"></i><span>${tool.name}</span></button>`).join('');
  toolsMenuList.innerHTML = toolItems;
  footerToolList.innerHTML = tools.map(tool => `<li><button type="button" class="footer-link" data-tool-launch="${tool.id}">${tool.name}</button></li>`).join('');
  footerSocialLinks.innerHTML = Object.entries(SOCIAL_LINKS).map(([name, social]) => `<a class="social-mark ${social.mark}" href="${social.url}" target="_blank" rel="noopener noreferrer" aria-label="${name} (replace placeholder URL)"><span aria-hidden="true">${social.mark === 'instagram' ? '◎' : social.mark === 'x' ? '𝕏' : social.mark === 'facebook' ? 'f' : 'in'}</span></a>`).join('');
  footerYear.textContent = new Date().getFullYear();

  document.querySelectorAll('[data-tool-launch]').forEach(button => {
    button.addEventListener('click', () => {
      const toolCard = document.querySelector(`.tool-card[data-tool="${button.dataset.toolLaunch}"]`);
      closeToolsMenu();
      if (toolCard) selectTool(toolCard);
    });
  });
}

async function loadAdminUsers(search = '') {
  try {
    adminUsers.textContent = 'Loading accounts…';
    const query = new URLSearchParams({ limit: '25' });
    if (search) query.set('search', search);
    const response = await fetch(`${API_URL}/api/admin/users?${query}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || 'Unable to load accounts.');
    adminUsers.innerHTML = data.users.map(user => `<article class="admin-user">
      <div><div class="admin-user-email">${escapeHtml(user.email)}</div><div class="admin-user-meta">${escapeHtml(user.plan)} · ${escapeHtml(user.subscriptionStatus)}</div></div>
      <div class="admin-user-actions">
        <button class="admin-grant" data-user-id="${user._id}" data-plan="pro">Grant Pro</button>
        <button class="admin-grant premium" data-user-id="${user._id}" data-plan="premium">Grant Premium</button>
      </div>
    </article>`).join('') || 'No matching accounts found.';
    adminUsers.querySelectorAll('[data-user-id]').forEach(button => {
      button.addEventListener('click', () => grantManualAccess(button.dataset.userId, button.dataset.plan));
    });
  } catch (error) {
    adminUsers.textContent = error.message || 'Unable to load accounts.';
  }
}

async function grantManualAccess(userId, planCode) {
  const amount = window.prompt(`Cash amount received for ${planCode.toUpperCase()} (leave blank for the plan price):`, '');
  if (amount === null) return;
  const notes = window.prompt('Optional payment note or receipt reference:', '') ?? '';
  if (!window.confirm(`Grant ${planCode.toUpperCase()} access for 30 days?`)) return;
  try {
    const response = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(userId)}/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ planCode, ...(amount.trim() ? { amount } : {}), notes })
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || 'Unable to grant access.');
    alert(`${data.user.email} now has ${data.user.plan.toUpperCase()} access.`);
    await loadAdminOverview();
  } catch (error) {
    alert(`Manual grant failed: ${error.message || 'Unable to grant access.'}`);
  }
}

function formatDate(value) {
  if (!value) return 'Not applicable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function renderSubscriptionDashboard() {
  if (!currentUser) return;
  accountDashboardTitle.textContent = `Welcome, ${currentUser.username || 'there'}`;
  const plan = currentUser.planDetails;
  const subscription = currentUser.subscription || {};
  const planCode = currentUser.plan || 'free';
  showElement(accountDashboard);
  dashboardPlan.textContent = planCode.toUpperCase();
  dashboardUsage.textContent = plan?.dailyConversionLimit === -1
    ? 'Unlimited conversions'
    : `${currentUser.dailyUsageCount || 0} / ${plan?.dailyConversionLimit ?? 10} conversions used today`;
  subscriptionStatus.textContent = String(subscription.status || 'inactive').replace('_', ' ');
  subscriptionStatus.className = `subscription-status status-${subscription.status || 'inactive'}`;
  subscriptionStarted.textContent = formatDate(subscription.startedAt);
  subscriptionExpires.textContent = formatDate(subscription.expiresAt);
  lastPayment.textContent = subscription.lastPayment
    ? `${subscription.lastPayment.currency} ${subscription.lastPayment.amount} (${subscription.lastPayment.status}) on ${formatDate(subscription.lastPayment.paidAt || subscription.lastPayment.createdAt)}`
    : 'Not available';

  subscriptionNotice.textContent = '';
  hideElement(subscriptionNotice);
  if (['expired', 'cancelled', 'past_due'].includes(subscription.status)
      || ['failed', 'cancelled'].includes(subscription.lastPayment?.status)) {
    subscriptionNotice.textContent = 'Your subscription is not active. Choose a paid plan to restore higher conversion limits.';
    showElement(subscriptionNotice);
  }

  const actions = [];
  if (planCode === 'free') {
    actions.push('<button class="dashboard-action" data-dashboard-plan="pro">Upgrade to Pro</button>');
    actions.push('<button class="dashboard-action secondary" data-dashboard-plan="premium">Upgrade to Premium</button>');
  } else if (planCode === 'pro') {
    actions.push('<button class="dashboard-action" data-dashboard-plan="premium">Upgrade to Premium</button>');
  } else {
    actions.push('<button class="dashboard-action current" disabled>Current Plan</button>');
  }
  subscriptionActions.innerHTML = actions.join('');
  subscriptionActions.querySelectorAll('[data-dashboard-plan]').forEach(button => {
    button.addEventListener('click', () => openUpgradeModal('Plans & access'));
  });
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

async function handlePaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('payment')) return;

  await loadUserProfile();
  const paymentState = params.get('payment');
  if (paymentState === 'pending-verification') {
    const reference = params.get('reference');
    let verified = false;
    if (reference && getAuthToken()) {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const response = await fetch(`${API_URL}/api/billing/status/${encodeURIComponent(reference)}`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        const data = await response.json();
        if (data.status === 'successful') {
          await loadUserProfile();
          verified = true;
          break;
        }
        if (['failed', 'cancelled', 'refunded'].includes(data.status)) break;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    alert(verified ? `Your ${currentUser.plan.toUpperCase()} plan is now active.` : 'Payment received. Your plan will update after Flutterwave verification.');
  } else if (paymentState !== 'successful') {
    alert(`Payment ${paymentState}. No plan change was made.`);
  }
  window.history.replaceState({}, document.title, window.location.pathname);
}

function logout() {
  removeAuthToken();
  currentUser = null;
  updateAuthUI();
  // Stay within current site base (works for GitHub Pages subpaths)
  window.location.href = './';
}

// Modal Functions
function openAuthModal(login = true) {
  isLoginMode = login;
  modalTitle.textContent = login ? 'Login' : 'Sign Up';
  authSubmitBtn.textContent = login ? 'Login' : 'Sign Up';
  authToggleText.textContent = login ? "Don't have an account? " : 'Already have an account? ';
  authToggleBtn.textContent = login ? 'Sign Up' : 'Login';

  hideElement(confirmPasswordGroup);
  hideElement(usernameGroup);
  hideElement(emailVerifyGroup);
  usernameInput.required = !login;
  emailVerified = false;
  if (!login) {
    showElement(usernameGroup);
    showElement(confirmPasswordGroup);
    showElement(emailVerifyGroup);
  }

  authForm.reset();
  showElement(authModal);
  prepareHumanVerification(login);
}

function closeAuthModal() {
  hideElement(authModal);
  resetHumanVerification();
}

async function openUpgradeModal(title = 'Plans & access', message = 'Pick the level that matches how you work. Your current plan is marked below.') {
  if (!currentUser || !getAuthToken()) {
    openAuthModal(true);
    return;
  }

  upgradeMessage.textContent = message;
  billingMessage.textContent = '';
  plansGrid.innerHTML = '<p class="plans-loading">Loading plans...</p>';
  showElement(upgradeModal);
  await loadPlans();
}

function closeUpgradeModal() {
  hideElement(upgradeModal);
}

function formatPlanPrice(plan) {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: plan.currency, maximumFractionDigits: 0
    }).format(plan.price);
  } catch (error) {
    return `${plan.currency} ${plan.price}`;
  }
}

function planLimitText(plan) {
  return plan.dailyConversionLimit === -1
    ? 'Unlimited PDF conversions per day'
    : `Up to ${plan.dailyConversionLimit} PDF conversions per day`;
}

async function loadPlans() {
  try {
    const response = await fetch(`${API_URL}/api/plans`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load plans.');
    plansGrid.innerHTML = data.plans.map(plan => {
      const isCurrent = currentUser.plan === plan.code;
      const isRecommended = plan.code === 'premium';
      const action = plan.code === 'free' ? 'Continue Free' : `Upgrade to ${plan.name}`;
      return `<article class="plan-card ${isRecommended ? 'recommended' : ''} ${isCurrent ? 'current' : ''}">
        ${isRecommended ? '<span class="plan-ribbon">Recommended</span>' : ''}
        <div class="plan-card-top"><span class="plan-kicker">${plan.code}</span>${isCurrent ? '<span class="current-label">Current Plan</span>' : ''}</div>
        <h3>${plan.name}</h3>
        <div class="plan-price">${formatPlanPrice(plan)}<span>/30 days</span></div>
        <p>${planLimitText(plan)}</p>
        <button class="plan-action ${isCurrent ? 'is-current' : ''}" data-plan-code="${plan.code}" ${isCurrent ? 'disabled' : ''}>${isCurrent ? 'Current Plan' : action}</button>
      </article>`;
    }).join('');
    plansGrid.querySelectorAll('[data-plan-code]').forEach(button => {
      button.addEventListener('click', () => beginCheckout(button.dataset.planCode));
    });
  } catch (error) {
    plansGrid.innerHTML = '<p class="plans-error">Plans could not be loaded. Please try again.</p>';
  }
}

async function beginCheckout(planCode) {
  if (planCode === 'free') {
    closeUpgradeModal();
    return;
  }

  billingMessage.textContent = 'Preparing secure checkout...';
  try {
    const response = await fetch(`${API_URL}/api/billing/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ planCode })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to initialize payment.');
    if (!data.checkoutUrl) throw new Error('Flutterwave did not return a checkout URL.');
    window.location.assign(data.checkoutUrl);
  } catch (error) {
    billingMessage.textContent = error.message || 'Unable to start checkout. Please try again.';
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const username = usernameInput.value.trim();

  if (isLoginMode && humanVerificationGroup && !humanVerificationGroup.classList.contains('hidden') && !turnstileToken) {
    alert('Please complete human verification.');
    return;
  }

  if (!isLoginMode) {
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(username)) {
      alert('Username must be 3–30 characters and use only letters, numbers, underscores, or hyphens.');
      return;
    }
    const confirmPassword = confirmPasswordInput.value;
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (!emailVerified) {
      alert('Please verify your email before signing up.');
      return;
    }
  }

  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = 'Please wait...';

  try {
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    const body = isLoginMode
      ? { email, password, turnstileToken }
      : { username, email, password };
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (response.ok) {
      setAuthToken(data.token);
      await loadUserProfile();
      closeAuthModal();
      alert(`Welcome${!isLoginMode ? ', your account has been created' : ''}!`);
    } else {
      alert(data.message || 'Authentication failed');
      if (isLoginMode) resetHumanVerification();
    }
  } catch (error) {
    alert('Network error. Please try again.');
    if (isLoginMode) resetHumanVerification();
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
  }
}

async function requestEmailVerification() {
  const email = emailInput.value.trim();
  if (!email) {
    alert('Enter your email first.');
    return;
  }

  sendVerifyBtn.disabled = true;
  sendVerifyBtn.textContent = 'Sending...';

  try {
    const response = await fetch(`${API_URL}/api/auth/send-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send verification code.');
    }
    if (data.code) {
      alert(`Verification code (dev mode): ${data.code}`);
    } else {
      alert('Verification code sent to your email.');
    }
  } catch (error) {
    alert(error.message || 'Failed to send verification code.');
  } finally {
    sendVerifyBtn.disabled = false;
    sendVerifyBtn.textContent = 'Send Code';
  }
}

async function verifyEmailCode() {
  const email = emailInput.value.trim();
  const code = emailVerifyCodeInput.value.trim();
  if (!email || !code) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, code })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Verification failed.');
    }
    emailVerified = true;
    alert('Email verified. You can now sign up.');
  } catch (error) {
    emailVerified = false;
    alert(error.message || 'Verification failed.');
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
    const hasAccess = currentUser && ['pro', 'premium'].includes(currentUser.plan);
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
  const needsPassword = tool === 'unlock-pdf' || tool === 'protect-pdf';
  passwordOptions.classList.toggle('hidden', !needsPassword);
  pdfPassword.value = '';

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
  if (selectedTool.tool === 'unlock-pdf' || selectedTool.tool === 'protect-pdf') {
    formData.append('password', pdfPassword.value);
  }
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
    if (xhr.status === 200 || xhr.status === 202) {
      const response = JSON.parse(xhr.responseText);
      if (response.success) {
        if (response.jobId) {
          startJobPolling(response.jobId, response.jobToken);
        } else {
          progressText.textContent = 'Processing completed!';
          hideElement(progressContainer);
          showDownload(response.output);
        }
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
      let message = 'Upload failed. Please try again.';
      try {
        const response = JSON.parse(xhr.responseText);
        message = response.message || message;
      } catch (error) {
        // Keep the generic message when the server did not return JSON.
      }
      alert(message);
      resetUI();
    }
  });

  xhr.addEventListener('error', () => {
    alert(`Upload request could not reach the conversion server (${API_URL}). Please wait a moment for the service to wake up, then try again.`);
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

function startJobPolling(jobId, jobToken) {
  hideElement(progressContainer);
  showElement(statusContainer);
  statusText.textContent = 'Processing your files...';

  pollingInterval = setInterval(async () => {
    try {
      const response = await fetch(`${API_URL}/api/tools/job-status/${jobId}?token=${encodeURIComponent(jobToken)}`);
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

  downloadBtn.href = downloadUrl.startsWith('http')
    ? downloadUrl
    : `${API_URL}${downloadUrl.startsWith('/api/') ? downloadUrl : `/api/tools/download/${encodeURIComponent(downloadUrl.split('/').pop())}`}`;
  downloadBtn.removeAttribute('target');
  downloadBtn.setAttribute('download', '');
  downloadBtn.textContent = downloadUrl.split('?')[0].endsWith('.zip') ? 'Download ZIP' : 'Download File';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  renderSiteNavigation();
  if (window.lucide) {
    window.lucide.createIcons();
  }
  setupPdfWorker();
  handlePaymentReturn();
  document.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? 'Hide' : 'Show';
    });
  });
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
  upgradeBtn.addEventListener('click', () => openUpgradeModal('Upgrade to Pro', 'Unlock bigger files, higher limits, and priority processing.'));
  toolsMenuButton.addEventListener('click', () => {
    const isOpen = toolsMenuButton.getAttribute('aria-expanded') === 'true';
    if (!isOpen) positionToolsMenu();
    toolsMenuButton.setAttribute('aria-expanded', String(!isOpen));
    toolsMenuList.classList.toggle('is-open', !isOpen);
  });
  document.querySelector('.tools-menu').addEventListener('pointerenter', positionToolsMenu);
  window.addEventListener('resize', () => {
    if (toolsMenuList.classList.contains('is-open')) positionToolsMenu();
  });
  footerPricingBtn.addEventListener('click', () => openUpgradeModal('Plans & access'));
  footerAuthBtn.addEventListener('click', () => {
    if (getAuthToken() && currentUser) {
      logout();
    } else {
      openAuthModal(true);
    }
  });

  // Auth modal
  closeModal.addEventListener('click', closeAuthModal);
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeAuthModal();
  });
  authForm.addEventListener('submit', handleAuthSubmit);
  authToggleBtn.addEventListener('click', () => openAuthModal(!isLoginMode));
  if (sendVerifyBtn) {
    sendVerifyBtn.addEventListener('click', requestEmailVerification);
  }
  if (emailVerifyCodeInput) {
    emailVerifyCodeInput.addEventListener('change', verifyEmailCode);
  }

  // Upgrade modal
  closeUpgradeModalBtn.addEventListener('click', closeUpgradeModal);
  upgradeModal.addEventListener('click', (e) => {
    if (e.target === upgradeModal) closeUpgradeModal();
  });

  // Upgrade nudge modal
  if (closeNudgeModal) {
    closeNudgeModal.addEventListener('click', () => hideElement(upgradeNudgeModal));
  }
  if (upgradeNudgeModal) {
    upgradeNudgeModal.addEventListener('click', (e) => {
      if (e.target === upgradeNudgeModal) hideElement(upgradeNudgeModal);
    });
  }
  if (nudgeUpgradeBtn) {
    nudgeUpgradeBtn.addEventListener('click', () => {
      hideElement(upgradeNudgeModal);
      openUpgradeModal('Upgrade to Pro', 'Unlock bigger files, higher limits, and priority processing.');
    });
  }

  if (adminUserSearchForm) {
    adminUserSearchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      loadAdminUsers(adminUserSearch.value.trim());
    });
  }

  uploadBackdrop.addEventListener('click', closeUploadPanel);
  uploadSection.addEventListener('click', (e) => {
    if (e.target === uploadSection) {
      closeUploadPanel();
      resetUI();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeToolsMenu();
    if (e.key === 'Escape' && uploadSection.classList.contains('is-open')) {
      closeUploadPanel();
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.tools-menu')) closeToolsMenu();
  });

  // Initialize
  loadUserProfile();
  markPremiumTools();

  setTimeout(() => {
    if (currentUser && ['pro', 'premium'].includes(currentUser.plan)) {
      return;
    }
    if (!sessionStorage.getItem('upgradeNudgeShown')) {
      sessionStorage.setItem('upgradeNudgeShown', 'true');
      showElement(upgradeNudgeModal);
    }
  }, 30000);

  console.log('File Tools frontend loaded successfully');
  console.log(`Backend API URL: ${API_URL}`);
});
