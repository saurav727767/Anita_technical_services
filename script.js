// Global Error Handler for debugging
window.onerror = function (message, source, lineno, colno, error) {
  const errMsg = `${message} at ${source}:${lineno}:${colno}`;
  console.error("Global JS Error Caught:", errMsg);
  if (typeof showToast === 'function') {
    showToast(`JS Error: ${message} (Line ${lineno})`, 'error');
  } else {
    alert(`JS Error: ${errMsg}`);
  }
  return false;
};

// Mock Database Init
function initDatabase() {
  if (!localStorage.getItem('anita_projects')) {
    const defaultProjects = [
      { id: 'proj-101', client: 'client@example.com', title: 'Corporate E-Commerce Portal', progress: 75, status: 'ongoing', description: 'Developing a responsive glassmorphic checkout app.' },
      { id: 'proj-102', client: 'client@example.com', title: 'Internal Android HR App', progress: 100, status: 'completed', description: 'Custom offline-first billing app.' },
      { id: 'proj-103', client: '7277676906', title: 'Anita Tech Landing Redesign', progress: 20, status: 'pending', description: 'Upgrading branding design styles and page load speeds.' }
    ];
    localStorage.setItem('anita_projects', JSON.stringify(defaultProjects));
  }

  if (!localStorage.getItem('anita_tickets')) {
    const defaultTickets = [
      { id: 'tkt-201', client: 'client@example.com', subject: 'Integrate Stripe API Payment Gate', description: 'Need advice on setting up credit cards processing securely.', status: 'open', reply: '' },
      { id: 'tkt-202', client: '7277676906', subject: 'Domain Mapping Assistance', description: 'Configure DNS details to point towards the cloud server.', status: 'resolved', reply: 'DNS settings updated. Please verify propagation within 2-4 hours.' }
    ];
    localStorage.setItem('anita_tickets', JSON.stringify(defaultTickets));
  }

  if (!localStorage.getItem('anita_audit_logs')) {
    const defaultLogs = [
      { timestamp: new Date(Date.now() - 3600000).toISOString(), type: 'SEC_INFO', text: 'Security system initialized.' },
      { timestamp: new Date(Date.now() - 1800000).toISOString(), type: 'SEC_SUCCESS', text: 'Admin console dashboard authenticated successfully.' }
    ];
    localStorage.setItem('anita_audit_logs', JSON.stringify(defaultLogs));
  }

  // Migrate any legacy mock account data to the user's real number
  const projects = localStorage.getItem('anita_projects');
  if (projects) {
    const parsed = JSON.parse(projects);
    let updated = false;
    parsed.forEach(p => {
      if (p.client === '9876543210') {
        p.client = '7277676906';
        updated = true;
      }
    });
    if (updated) {
      localStorage.setItem('anita_projects', JSON.stringify(parsed));
    }
  }

  const tickets = localStorage.getItem('anita_tickets');
  if (tickets) {
    const parsed = JSON.parse(tickets);
    let updated = false;
    parsed.forEach(t => {
      if (t.client === '9876543210') {
        t.client = '7277676906';
        updated = true;
      }
    });
    if (updated) {
      localStorage.setItem('anita_tickets', JSON.stringify(parsed));
    }
  }
}

// Get database state
function getProjects() { return JSON.parse(localStorage.getItem('anita_projects')); }
function saveProjects(data) { localStorage.setItem('anita_projects', JSON.stringify(data)); }
function getTickets() { return JSON.parse(localStorage.getItem('anita_tickets')); }
function saveTickets(data) { localStorage.setItem('anita_tickets', JSON.stringify(data)); }
function getLogs() { return JSON.parse(localStorage.getItem('anita_audit_logs')); }
function saveLogs(data) { localStorage.setItem('anita_audit_logs', JSON.stringify(data)); }

// Audit Logger helper
function writeAuditLog(type, text) {
  const logs = getLogs();
  logs.push({
    timestamp: new Date().toISOString(),
    type: type, // SEC_INFO, SEC_SUCCESS, SEC_WARN, SEC_ERR
    text: text
  });
  saveLogs(logs);
  renderAdminLogs();
}

// Global Variables
let currentSessionUser = null;
let currentAdminLoggedIn = false;

// OTP logic states
let activeOTP = null; // { contact: '...', code: '...', expiresAt: 1234567 }
let otpInterval = null;
let failedAttemptsCount = {}; // { contact: count }
let lockoutTimer = {}; // { contact: timestamp_unlocked }

// UI View Controller
function showView(viewId) {
  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.remove('active-view');
  });

  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add('active-view');
  }

  // Adjust Navbar active state
  document.querySelectorAll('.nav-links .nav-item').forEach(item => {
    item.classList.remove('active');
  });

  if (viewId === 'landing-view') {
    document.getElementById('nav-home').classList.add('active');
  } else if (viewId === 'auth-view') {
    // default to user tab on opening auth
    switchAuthTab('user');
  }

  // Handle Cricket Live Scores Polling
  if (viewId === 'cricket-score-view') {
    fetchCricketScores();
    clearInterval(cricketPollInterval);
    cricketPollInterval = setInterval(fetchCricketScores, 30000);
  } else {
    if (cricketPollInterval) {
      clearInterval(cricketPollInterval);
      cricketPollInterval = null;
    }
  }

  // Handle Gramin Saathi Portal - Load iframe content on demand
  if (viewId === 'gramin-saathi-view') {
    const iframe = document.getElementById('gs-portal-iframe');
    const loader = document.getElementById('gs-iframe-loader');
    if (iframe && !iframe.src) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        iframe.src = 'http://localhost:3001';
      } else {
        iframe.src = 'https://gramin-saathi.vercel.app';
      }
      iframe.onload = function () {
        if (loader) {
          loader.style.opacity = '0';
          setTimeout(() => {
            loader.style.display = 'none';
          }, 500);
        }
        iframe.style.opacity = '1';
      };
    }
  }

  // Window scroll reset
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Open GraminSaathi App in standalone window
function openGraminSaathi() {
  let gsUrl = 'https://gramin-saathi.vercel.app';
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    gsUrl = 'http://localhost:3001';
  }
  const newTab = window.open(gsUrl, '_blank');
  if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
    // Popup was blocked
    showToast('Pop-up blocked! Please allow pop-ups for this site.', 'error');
  } else {
    showToast('Opening Gramin Saathi Portal...', 'success');
  }
}

// Smooth scroll to sections
function scrollToSection(sectionId) {
  showView('landing-view');
  setTimeout(() => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}

// Toast Alert System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = '<i class="fa-solid fa-circle-info toast-icon"></i>';
  if (type === 'success') icon = '<i class="fa-solid fa-circle-check toast-icon"></i>';
  if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation toast-icon"></i>';

  toast.innerHTML = `
    ${icon}
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);

  // Auto remove toast
  setTimeout(() => {
    toast.classList.add('toast-slide-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4500);
}

// Landing Contact Form Submit
function handleContactSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('contact-name').value;
  const email = document.getElementById('contact-email').value;
  const service = document.getElementById('contact-service').value;
  const msg = document.getElementById('contact-msg').value;

  writeAuditLog('SEC_INFO', `Contact inquiry from ${email} regarding service: ${service}`);
  showToast(`Thank you, ${name}! We have received your inquiry.`, 'success');
  document.getElementById('landing-contact-form').reset();
}

// Switching tabs User/Admin login
function switchAuthTab(type) {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.classList.remove('active-tab');
  });
  document.querySelectorAll('.auth-step').forEach(step => {
    step.classList.remove('active-step');
  });

  if (type === 'user') {
    document.getElementById('tab-user').classList.add('active-tab');
    document.getElementById('user-step-request').classList.add('active-step');
    goBackToAuthRequest();
  } else {
    document.getElementById('tab-admin').classList.add('active-tab');
    document.getElementById('admin-step-login').classList.add('active-step');
  }
}

// User Request OTP Form
async function handleRequestOTP(event) {
  event.preventDefault();
  const contact = document.getElementById('user-login-id').value.trim();

  if (!contact) {
    showToast('Please enter email or phone number.', 'error');
    return;
  }

  // Validate lockout time
  const now = Date.now();
  if (lockoutTimer[contact] && now < lockoutTimer[contact]) {
    const diff = Math.ceil((lockoutTimer[contact] - now) / 1000);
    showToast(`Account locked. Please try again after ${diff}s.`, 'error');
    triggerLockoutBanner(contact);
    return;
  }

  try {
    const response = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact })
    });
    const data = await response.json();

    if (!response.ok) {
      showToast(data.error || 'Failed to request OTP.', 'error');
      return;
    }

    const otpCode = data.otp_for_testing;

    // Set code session details (expires in 2 minutes)
    activeOTP = {
      contact: contact,
      code: otpCode,
      expiresAt: Date.now() + 120000
    };

    writeAuditLog('SEC_INFO', `Generated validation OTP for client identifier: ${contact}`);

    // Show verifying screen
    document.getElementById('user-step-request').classList.remove('active-step');
    document.getElementById('user-step-verify').classList.add('active-step');
    document.getElementById('user-sent-target').innerText = contact;

    // Render Simulated Deliver notification Toast
    setTimeout(() => {
      showToast(`[DEMO DEVICE SIMULATOR] Code sent to ${contact}. CODE: ${otpCode}`, 'info');
    }, 1000);

    // Clear past inputs
    document.querySelectorAll('.otp-digit').forEach(input => input.value = '');
    document.querySelector('.otp-digit[data-index="0"]').focus();

    // Reset Countdown
    startOTPCountdown();
  } catch (err) {
    showToast('Network error while requesting OTP.', 'error');
    console.error(err);
  }
}

// Verification Expiration countdown
function startOTPCountdown() {
  clearInterval(otpInterval);
  const resendBtn = document.getElementById('otp-resend-btn');
  resendBtn.classList.add('disabled');

  otpInterval = setInterval(() => {
    if (!activeOTP) {
      clearInterval(otpInterval);
      return;
    }

    const remaining = activeOTP.expiresAt - Date.now();
    if (remaining <= 0) {
      clearInterval(otpInterval);
      document.getElementById('otp-timer-val').innerText = '00:00';
      writeAuditLog('SEC_WARN', `Verification code expired for identifier: ${activeOTP.contact}`);
      showToast('OTP code has expired. Please request a new one.', 'error');
      resendBtn.classList.remove('disabled');
      activeOTP = null;
    } else {
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      document.getElementById('otp-timer-val').innerText =
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

// Resend OTP
function resendOTP() {
  const resendBtn = document.getElementById('otp-resend-btn');
  if (resendBtn.classList.contains('disabled')) return;

  const contact = document.getElementById('user-login-id').value.trim();

  // Create simulated request event
  const mockEvent = { preventDefault: () => { } };
  handleRequestOTP(mockEvent);
}

// Go Back to Request screen
function goBackToAuthRequest() {
  clearInterval(otpInterval);
  activeOTP = null;
  document.getElementById('user-step-verify').classList.remove('active-step');
  document.getElementById('user-step-request').classList.add('active-step');
}

// OTP digit input cursor flow helper
document.querySelectorAll('.otp-digit').forEach(input => {
  input.addEventListener('keyup', (e) => {
    const idx = parseInt(input.getAttribute('data-index'));
    if (e.key >= 0 && e.key <= 9) {
      const next = document.querySelector(`.otp-digit[data-index="${idx + 1}"]`);
      if (next) next.focus();
    } else if (e.key === 'Backspace') {
      const prev = document.querySelector(`.otp-digit[data-index="${idx - 1}"]`);
      if (prev) prev.focus();
    }
  });
});

// Verify OTP logic
async function handleVerifyOTP(event) {
  event.preventDefault();

  if (!activeOTP) {
    showToast('OTP not requested or expired. Try again.', 'error');
    goBackToAuthRequest();
    return;
  }

  const contact = activeOTP.contact;

  // Fetch digits
  let submittedCode = '';
  document.querySelectorAll('.otp-digit').forEach(input => {
    submittedCode += input.value;
  });

  if (submittedCode.length < 6) {
    showToast('Please enter the complete 6-digit OTP code.', 'error');
    return;
  }

  try {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact, code: submittedCode })
    });
    const data = await response.json();

    if (response.ok && data.success) {
      // Success Login
      writeAuditLog('SEC_SUCCESS', `Client successfully authenticated using OTP for identity: ${contact}`);
      showToast('Verification Successful!', 'success');

      // Store token for unified session sharing
      localStorage.setItem('gs_token', data.token);

      currentSessionUser = contact;
      activeOTP = null;
      clearInterval(otpInterval);

      // reset failed counts
      failedAttemptsCount[contact] = 0;

      // Switch to User Panel
      showView('user-dashboard-view');
      loadUserDashboard();
    } else {
      // Failed entry
      if (!failedAttemptsCount[contact]) failedAttemptsCount[contact] = 0;
      failedAttemptsCount[contact]++;

      const remaining = 3 - failedAttemptsCount[contact];
      writeAuditLog('SEC_WARN', `Client OTP validation failed for: ${contact}. Attempt #${failedAttemptsCount[contact]}`);

      // Shake animation feedback
      const otpWrapper = document.getElementById('otp-digits-wrapper');
      otpWrapper.style.animation = 'shake 0.4s ease';
      otpWrapper.addEventListener('animationend', () => otpWrapper.style.animation = '');

      if (remaining <= 0) {
        // Lockout client
        lockoutTimer[contact] = Date.now() + 30000; // 30s lockout
        writeAuditLog('SEC_ERR', `Client Account lockout activated for contact: ${contact} due to brute-force protection limit.`);
        showToast('Account locked! Too many incorrect submissions.', 'error');

        triggerLockoutBanner(contact);
        goBackToAuthRequest();
      } else {
        showToast(data.error || `Invalid Code. ${remaining} attempts remaining.`, 'error');
      }
    }
  } catch (err) {
    showToast('Network error while verifying OTP.', 'error');
    console.error(err);
  }
}

// Lockout Banner Handler
function triggerLockoutBanner(contact) {
  const alertBox = document.getElementById('user-lockout-alert');
  const timerSpan = document.getElementById('lockout-timer-sec');

  alertBox.classList.add('active-lock');

  const interval = setInterval(() => {
    const remaining = Math.ceil((lockoutTimer[contact] - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(interval);
      alertBox.classList.remove('active-lock');
    } else {
      timerSpan.innerText = remaining;
    }
  }, 1000);
}

// ADMIN LOGIN logic
function handleAdminLogin(event) {
  event.preventDefault();
  const user = document.getElementById('admin-username').value;
  const pass = document.getElementById('admin-password').value;

  if (user === 'admin' && pass === 'admin') {
    writeAuditLog('SEC_SUCCESS', 'Admin authorized login from manager terminal.');
    showToast('Welcome, Administrator!', 'success');
    currentAdminLoggedIn = true;

    // Clear credentials fields
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';

    showView('admin-dashboard-view');
    loadAdminDashboard();
  } else {
    writeAuditLog('SEC_ERR', `Admin login authorization failed for username identifier: ${user}`);
    showToast('Invalid admin credentials.', 'error');
  }
}

// LOGOUT functions
function logoutUser() {
  writeAuditLog('SEC_INFO', `Client ${currentSessionUser} logged out.`);
  currentSessionUser = null;
  localStorage.removeItem('gs_token');
  showToast('Logged out successfully.', 'info');
  showView('landing-view');
}

function logoutAdmin() {
  writeAuditLog('SEC_INFO', 'Administrator logged out.');
  currentAdminLoggedIn = false;
  localStorage.removeItem('gs_token');
  showToast('Logged out successfully.', 'info');
  showView('landing-view');
}

// Load and render user panel
function loadUserDashboard() {
  // Update Profile Name
  document.getElementById('user-profile-sub').innerText = currentSessionUser;
  document.getElementById('user-avatar-tag').innerText = currentSessionUser[0].toUpperCase();

  // Set tab
  switchDashboardTab('user', 'projects');
}

function renderUserProjects() {
  const projects = getProjects();
  const userProjects = projects.filter(p => p.client === currentSessionUser);
  const container = document.getElementById('user-projects-list');

  // Update overview stats
  document.getElementById('user-stat-total-projects').innerText = userProjects.length;
  document.getElementById('user-stat-active-projects').innerText = userProjects.filter(p => p.status === 'ongoing').length;
  document.getElementById('user-stat-completed-projects').innerText = userProjects.filter(p => p.status === 'completed').length;

  if (userProjects.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin: 2rem 0;">No active projects registered for your profile.</p>';
    return;
  }

  container.innerHTML = '';
  userProjects.forEach(proj => {
    let colorClass = 'purple';
    if (proj.status === 'ongoing') colorClass = 'cyan';
    if (proj.status === 'completed') colorClass = 'emerald';

    container.innerHTML += `
      <div class="project-item">
        <div class="project-meta">
          <span class="project-title">${proj.title}</span>
          <span class="project-badge ${proj.status}">${proj.status}</span>
        </div>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.75rem;">${proj.description}</p>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${colorClass}" style="width: ${proj.progress}%;"></div>
        </div>
        <div class="project-percentage">${proj.progress}% Completed</div>
      </div>
    `;
  });
}

function renderUserTickets() {
  const tickets = getTickets();
  const userTickets = tickets.filter(t => t.client === currentSessionUser);
  const container = document.getElementById('user-tickets-list');

  if (userTickets.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin: 2rem 0;">No support tickets created yet.</p>';
    return;
  }

  container.innerHTML = '';
  userTickets.forEach(tkt => {
    let replyMarkup = '';
    if (tkt.reply) {
      replyMarkup = `<div class="ticket-reply-text"><i class="fa-solid fa-reply"></i> Admin Response: ${tkt.reply}</div>`;
    }

    container.innerHTML += `
      <div class="ticket-item">
        <div class="ticket-header">
          <span class="ticket-subj">${tkt.subject}</span>
          <span class="ticket-status ${tkt.status}">${tkt.status}</span>
        </div>
        <div class="ticket-body">${tkt.description}</div>
        ${replyMarkup}
      </div>
    `;
  });
}

// Create new User ticket
function handleCreateTicket(event) {
  event.preventDefault();
  const subject = document.getElementById('ticket-subject').value.trim();
  const desc = document.getElementById('ticket-desc').value.trim();

  const tickets = getTickets();
  const newId = `tkt-${Math.floor(200 + Math.random() * 800)}`;

  const newTicket = {
    id: newId,
    client: currentSessionUser,
    subject: subject,
    description: desc,
    status: 'open',
    reply: ''
  };

  tickets.push(newTicket);
  saveTickets(tickets);

  writeAuditLog('SEC_INFO', `Client filed new support ticket ID: ${newId} with subject: ${subject}`);
  showToast('Support Ticket submitted successfully!', 'success');

  document.getElementById('user-ticket-form').reset();
  renderUserTickets();
}

// Load and render Admin dashboard
function loadAdminDashboard() {
  switchDashboardTab('admin', 'projects');
}

function renderAdminProjects() {
  const projects = getProjects();
  const container = document.getElementById('admin-projects-list');
  const selectDropdown = document.getElementById('admin-select-proj');

  // Overview stats
  const uniqueClients = [...new Set(projects.map(p => p.client))].length;
  document.getElementById('admin-stat-clients').innerText = uniqueClients;
  document.getElementById('admin-stat-total-projects').innerText = projects.length;

  container.innerHTML = '';
  selectDropdown.innerHTML = '';

  projects.forEach((proj, idx) => {
    // populate selector dropdown
    const option = document.createElement('option');
    option.value = proj.id;
    option.text = `[${proj.client}] ${proj.title}`;
    selectDropdown.appendChild(option);

    // populate view lists
    let colorClass = 'purple';
    if (proj.status === 'ongoing') colorClass = 'cyan';
    if (proj.status === 'completed') colorClass = 'emerald';

    container.innerHTML += `
      <div class="project-item">
        <div class="project-meta">
          <div>
            <span class="project-title" style="display: block;">${proj.title}</span>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">Client: ${proj.client}</span>
          </div>
          <span class="project-badge ${proj.status}">${proj.status}</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${colorClass}" style="width: ${proj.progress}%;"></div>
        </div>
        <div class="project-percentage">${proj.progress}% Completed</div>
      </div>
    `;
  });

  populateProjectProgressValue();
}

function populateProjectProgressValue() {
  const projects = getProjects();
  const selectedId = document.getElementById('admin-select-proj').value;
  const selectedProj = projects.find(p => p.id === selectedId);

  if (selectedProj) {
    document.getElementById('admin-proj-progress').value = selectedProj.progress;
    document.getElementById('admin-proj-status').value = selectedProj.status;
  }
}

// Update project status (Admin action)
function handleUpdateProject(event) {
  event.preventDefault();
  const selectedId = document.getElementById('admin-select-proj').value;
  const progressVal = parseInt(document.getElementById('admin-proj-progress').value);
  const statusVal = document.getElementById('admin-proj-status').value;

  const projects = getProjects();
  const pIndex = projects.findIndex(p => p.id === selectedId);

  if (pIndex !== -1) {
    projects[pIndex].progress = progressVal;
    projects[pIndex].status = statusVal;
    saveProjects(projects);

    writeAuditLog('SEC_INFO', `Admin updated project state for ${selectedId} to progress: ${progressVal}%, status: ${statusVal}`);
    showToast('Project progress updated!', 'success');
    renderAdminProjects();
  }
}

function renderAdminTickets() {
  const tickets = getTickets();
  const openTickets = tickets.filter(t => t.status === 'open');
  const container = document.getElementById('admin-tickets-list');
  const dropdown = document.getElementById('admin-select-ticket');

  document.getElementById('admin-stat-pending-tickets').innerText = openTickets.length;

  container.innerHTML = '';
  dropdown.innerHTML = '';

  if (tickets.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin: 2rem 0;">No client tickets created.</p>';
    dropdown.innerHTML = '<option value="">No pending tickets</option>';
    document.getElementById('admin-ticket-query-text').innerText = 'Select a ticket to review query...';
    return;
  }

  // Populate dropdown with open tickets
  if (openTickets.length === 0) {
    dropdown.innerHTML = '<option value="">No pending tickets</option>';
    document.getElementById('admin-ticket-query-text').innerText = 'All tickets resolved!';
  } else {
    openTickets.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.text = `[${t.client}] ${t.subject}`;
      dropdown.appendChild(opt);
    });
  }

  // Populate all tickets list
  tickets.forEach(t => {
    let replyMarkup = '';
    if (t.reply) {
      replyMarkup = `<div class="ticket-reply-text"><i class="fa-solid fa-reply"></i> Admin Resolution: ${t.reply}</div>`;
    }

    container.innerHTML += `
      <div class="ticket-item">
        <div class="ticket-header">
          <div>
            <span class="ticket-subj" style="display:block;">${t.subject}</span>
            <span style="font-size:0.75rem; color: var(--text-secondary);">Client: ${t.client}</span>
          </div>
          <span class="ticket-status ${t.status}">${t.status}</span>
        </div>
        <div class="ticket-body" style="margin-top: 0.5rem;">${t.description}</div>
        ${replyMarkup}
      </div>
    `;
  });

  populateTicketDetail();
}

function populateTicketDetail() {
  const selectedId = document.getElementById('admin-select-ticket').value;
  const tickets = getTickets();
  const tkt = tickets.find(t => t.id === selectedId);

  if (tkt) {
    document.getElementById('admin-ticket-query-text').innerText = tkt.description;
  } else {
    document.getElementById('admin-ticket-query-text').innerText = 'Select a ticket to review query...';
  }
}

// Resolve ticket (Admin action)
function handleResolveTicket(event) {
  event.preventDefault();
  const ticketId = document.getElementById('admin-select-ticket').value;
  const replyText = document.getElementById('admin-reply-msg').value.trim();

  if (!ticketId) {
    showToast('No active ticket selected.', 'error');
    return;
  }

  const tickets = getTickets();
  const tIndex = tickets.findIndex(t => t.id === ticketId);

  if (tIndex !== -1) {
    tickets[tIndex].status = 'resolved';
    tickets[tIndex].reply = replyText;
    saveTickets(tickets);

    writeAuditLog('SEC_SUCCESS', `Admin resolved support query ticket ID: ${ticketId}`);
    showToast('Resolution reply dispatched to client portal.', 'success');

    document.getElementById('admin-reply-form').reset();
    renderAdminTickets();
  }
}

function renderAdminLogs() {
  const logs = getLogs();
  const consoleEl = document.getElementById('admin-logs-console');
  if (!consoleEl) return;

  consoleEl.innerHTML = '';
  logs.slice().reverse().forEach(log => {
    let typeClass = 'log-info';
    if (log.type === 'SEC_SUCCESS') typeClass = 'log-success';
    if (log.type === 'SEC_WARN') typeClass = 'log-warning';
    if (log.type === 'SEC_ERR') typeClass = 'log-error';

    const time = new Date(log.timestamp).toLocaleTimeString();

    consoleEl.innerHTML += `
      <div class="log-line">
        <span class="log-time">[${time}]</span>
        <span class="${typeClass}">[${log.type.replace('SEC_', '')}]</span>
        <span style="color:#d1d5db;">${log.text}</span>
      </div>
    `;
  });
}

function clearLogs() {
  localStorage.setItem('anita_audit_logs', JSON.stringify([]));
  writeAuditLog('SEC_INFO', 'Audit log cache cleared by administrator.');
  showToast('Terminal logs cleared.', 'info');
}

// Menu Tab Switcher inside Dashboards
function switchDashboardTab(role, tab) {
  // Reset all tabs
  document.querySelectorAll(`.sidebar-item`).forEach(el => {
    el.classList.remove('active-item');
  });
  document.querySelectorAll(`.dashboard-tab-content`).forEach(el => {
    el.style.display = 'none';
  });

  // Activate item
  document.getElementById(`${role}-menu-${tab}`).classList.add('active-item');
  document.getElementById(`${role}-pane-${tab}`).style.display = 'block';

  // Load appropriate data
  if (role === 'user') {
    if (tab === 'projects') renderUserProjects();
    if (tab === 'tickets') renderUserTickets();
  } else if (role === 'admin') {
    if (tab === 'projects') renderAdminProjects();
    if (tab === 'tickets') renderAdminTickets();
    if (tab === 'logs') renderAdminLogs();
  }
}

// SECURITY HUB MODAL DIALOGS
function openSecurityHub() {
  document.getElementById('security-hub-modal').classList.add('active-modal');
  switchSecTab('flow');
  writeAuditLog('SEC_INFO', 'Security Hub specifications modal accessed.');
}

function closeSecurityHub() {
  document.getElementById('security-hub-modal').classList.remove('active-modal');
}

function switchSecTab(tabId) {
  document.querySelectorAll('.sec-tab-btn').forEach(btn => {
    btn.classList.remove('active-sec-tab');
  });
  document.querySelectorAll('.sec-pane').forEach(pane => {
    pane.classList.remove('active-pane');
  });

  document.getElementById(`sec-tab-${tabId}`).classList.add('active-sec-tab');
  document.getElementById(`sec-pane-${tabId}`).classList.add('active-pane');
}

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
  initDatabase();

  // Detect if running in popout mode
  if (window.location.search.includes('popout=true')) {
    document.body.classList.add('popout-mode');
    setTimeout(() => {
      openCalculatorModal();
    }, 100);
  }
});

// ==========================================================================
// C++ Scientific Calculator Frontend Logic
// ==========================================================================

// Drag and drop helper for floating calculator
function makeDraggable(el, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  handle.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    if (e.button !== 0) return; // Left click only
    if (document.body.classList.contains('popout-mode')) return;

    e.preventDefault();

    // Position fixed coordinates transition
    const rect = el.getBoundingClientRect();
    el.style.top = rect.top + 'px';
    el.style.left = rect.left + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';

    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    let newTop = el.offsetTop - pos2;
    let newLeft = el.offsetLeft - pos1;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rect = el.getBoundingClientRect();

    // Bounds check
    newTop = Math.max(0, Math.min(newTop, viewportHeight - 50));
    newLeft = Math.max(-rect.width + 50, Math.min(newLeft, viewportWidth - 50));

    el.style.top = newTop + "px";
    el.style.left = newLeft + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Popout popup launcher
function popoutCalculator() {
  closeCalculatorModal();
  const width = 430;
  const height = 630;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const popoutUrl = `${window.location.origin}${window.location.pathname}?popout=true`;

  window.open(
    popoutUrl,
    'ScientificCalculatorPopout',
    `width=${width},height=${height},left=${left},top=${top},menubar=no,status=no,toolbar=no,location=no,resizable=yes`
  );
}

// Calculator State Variables
let calcExpression = '';
let calcMode = 'deg'; // default is degrees
let calcIsDone = false; // flag to clear screen on next digit input after an evaluation
let calcIsPowerOn = true; // flag for power state

function toggleCalculatorPower() {
  calcIsPowerOn = !calcIsPowerOn;
  const powerBtn = document.getElementById('calc-power-btn');
  const screenDisplay = document.getElementById('calc-screen-display');
  const exprDisplay = document.getElementById('calc-expr-display');
  const statusText = document.getElementById('calc-status-text');

  if (calcIsPowerOn) {
    screenDisplay.classList.remove('power-off');
    exprDisplay.classList.remove('power-off');
    updateCalculatorDisplay();
    powerBtn.innerHTML = '<i class="fa-solid fa-power-off"></i> OFF';
    powerBtn.style.background = 'rgba(239, 68, 68, 0.1)';
    powerBtn.style.color = 'var(--accent-pink)';
    powerBtn.style.borderColor = 'rgba(239, 68, 68, 0.2)';
    statusText.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i> Powered by C++ calculation backend.';
  } else {
    screenDisplay.classList.add('power-off');
    exprDisplay.classList.add('power-off');
    powerBtn.innerHTML = '<i class="fa-solid fa-power-off"></i> ON';
    powerBtn.style.background = 'rgba(16, 185, 129, 0.1)';
    powerBtn.style.color = 'var(--accent-emerald)';
    powerBtn.style.borderColor = 'rgba(16, 185, 129, 0.2)';
    statusText.innerHTML = '<i class="fa-solid fa-power-off" style="color: var(--text-muted);"></i> Calculator is turned OFF.';
  }
}

function openCalculatorModal() {
  const modal = document.getElementById('calculator-modal');
  modal.classList.add('active-modal');

  // Drag-and-drop initialization
  if (!modal.dataset.draggableInitialized) {
    const handle = modal.querySelector('.modal-header');
    makeDraggable(modal, handle);
    modal.dataset.draggableInitialized = 'true';
  }

  writeAuditLog('SEC_INFO', 'Scientific Calculator modal interface accessed.');
  clearCalculator();
  // Register keyboard listener
  window.addEventListener('keydown', handleCalculatorKeyboard);
}

function closeCalculatorModal() {
  document.getElementById('calculator-modal').classList.remove('active-modal');
  // Unregister keyboard listener
  window.removeEventListener('keydown', handleCalculatorKeyboard);
}

function setCalculatorMode(mode) {
  if (!calcIsPowerOn) return;
  calcMode = mode;
  document.getElementById('calc-mode-deg').classList.toggle('active-mode', mode === 'deg');
  document.getElementById('calc-mode-rad').classList.toggle('active-mode', mode === 'rad');
}

function inputCalcVal(val) {
  if (!calcIsPowerOn) return;
  if (calcIsDone) {
    const isOperator = ['+', '-', '*', '/', '^'].includes(val);
    if (!isOperator) {
      calcExpression = '';
    }
    calcIsDone = false;
  }

  // Prevent multiple operators consecutively
  if (['+', '-', '*', '/', '^'].includes(val)) {
    const lastChar = calcExpression.trim().slice(-1);
    if (['+', '-', '*', '/', '^'].includes(lastChar)) {
      calcExpression = calcExpression.trim().slice(0, -1) + val;
      updateCalculatorDisplay();
      return;
    }
  }

  if (val === 'pi') {
    calcExpression += 'pi';
  } else if (val === 'e') {
    calcExpression += 'e';
  } else {
    calcExpression += val;
  }

  updateCalculatorDisplay();
}

function inputCalcFunc(funcName) {
  if (!calcIsPowerOn) return;
  if (calcIsDone) {
    calcExpression = '';
    calcIsDone = false;
  }

  calcExpression += funcName + '(';
  updateCalculatorDisplay();
}

function updateCalculatorDisplay() {
  const exprDisplay = document.getElementById('calc-expr-display');
  const screenDisplay = document.getElementById('calc-screen-display');

  let visualExpr = calcExpression
    .replace(/\*/g, ' \u00D7 ')
    .replace(/\//g, ' \u00F7 ')
    .replace(/pi/g, '\u03C0')
    .replace(/\^/g, ' ^ ');

  exprDisplay.innerText = visualExpr || '\u00A0';
  screenDisplay.innerText = visualExpr || '0';
}

function clearCalculator() {
  if (!calcIsPowerOn) return;
  calcExpression = '';
  calcIsDone = false;
  updateCalculatorDisplay();
}

function backspaceCalculator() {
  if (!calcIsPowerOn) return;
  if (calcIsDone) {
    clearCalculator();
    return;
  }

  const functions = ['asin(', 'acos(', 'atan(', 'sinh(', 'cosh(', 'tanh(', 'fact(', 'sqrt(', 'exp(', 'abs(', 'sin(', 'cos(', 'tan(', 'log(', 'ln('];
  let deleted = false;
  for (const fn of functions) {
    if (calcExpression.endsWith(fn)) {
      calcExpression = calcExpression.substring(0, calcExpression.length - fn.length);
      deleted = true;
      break;
    }
  }

  if (!deleted && calcExpression.length > 0) {
    calcExpression = calcExpression.substring(0, calcExpression.length - 1);
  }

  updateCalculatorDisplay();
}

// Local C++ emulation engine fallback
class LocalCalculator {
  constructor(expressionStr, deg) {
    this.src = expressionStr;
    this.pos = 0;
    this.degMode = deg;
    this.PI = 3.14159265358979323846;
    this.E = 2.71828182845904523536;
  }

  peek() {
    if (this.pos >= this.src.length) return '\0';
    return this.src[this.pos];
  }

  get() {
    if (this.pos >= this.src.length) return '\0';
    return this.src[this.pos++];
  }

  skipWhitespace() {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) {
      this.pos++;
    }
  }

  match(expected) {
    this.skipWhitespace();
    if (this.peek() === expected) {
      this.pos++;
      return true;
    }
    return false;
  }

  expression() {
    let result = this.term();
    while (true) {
      if (this.match('+')) {
        result += this.term();
      } else if (this.match('-')) {
        result -= this.term();
      } else {
        break;
      }
    }
    return result;
  }

  term() {
    let result = this.factor();
    while (true) {
      if (this.match('*')) {
        result *= this.factor();
      } else if (this.match('/')) {
        let denom = this.factor();
        if (denom === 0) {
          throw new Error("Division by zero");
        }
        result /= denom;
      } else {
        break;
      }
    }
    return result;
  }

  factor() {
    let result = this.power();
    if (this.match('^')) {
      let exponent = this.factor();
      result = Math.pow(result, exponent);
    }
    return result;
  }

  power() {
    this.skipWhitespace();
    if (this.match('+')) {
      return this.power();
    }
    if (this.match('-')) {
      return -this.power();
    }
    return this.primary();
  }

  primary() {
    this.skipWhitespace();
    let c = this.peek();

    if (c === '\0') {
      throw new Error("Unexpected end of expression");
    }

    // Parentheses
    if (this.match('(')) {
      let result = this.expression();
      if (!this.match(')')) {
        throw new Error("Missing closing parenthesis ')'");
      }
      return result;
    }

    // Number
    if (/[0-9.]/.test(c)) {
      let numStr = '';
      let dotSeen = false;
      while (true) {
        let current = this.peek();
        if (/[0-9]/.test(current)) {
          numStr += this.get();
        } else if (current === '.') {
          if (dotSeen) {
            throw new Error("Invalid decimal number: multiple decimal points");
          }
          dotSeen = true;
          numStr += this.get();
        } else {
          break;
        }
      }

      // Scientific notation
      if (this.peek() === 'e' || this.peek() === 'E') {
        let nextChar = this.src[this.pos + 1];
        if (nextChar && /[0-9\-+]/.test(nextChar)) {
          numStr += this.get(); // get 'e' or 'E'
          if (this.peek() === '+' || this.peek() === '-') {
            numStr += this.get();
          }
          if (!/[0-9]/.test(this.peek())) {
            throw new Error("Invalid scientific notation: missing exponent digits");
          }
          while (/[0-9]/.test(this.peek())) {
            numStr += this.get();
          }
        }
      }

      return parseFloat(numStr);
    }

    // Alphabetical identifier (functions, constants)
    if (/[a-zA-Z]/.test(c)) {
      let name = '';
      while (/[a-zA-Z0-9]/.test(this.peek())) {
        name += this.get();
      }

      // Check constants
      if (name === "pi" || name === "PI") {
        return this.PI;
      }
      if (name === "e" || name === "E") {
        return this.E;
      }

      // Functions must be followed by '('
      this.skipWhitespace();
      if (!this.match('(')) {
        throw new Error(`Function ${name} must be followed by '('`);
      }

      let arg = this.expression();
      if (!this.match(')')) {
        throw new Error(`Missing closing parenthesis ')' after function ${name} argument`);
      }

      const toRadians = (val) => this.degMode ? (val * this.PI / 180.0) : val;
      const toDegrees = (val) => this.degMode ? (val * 180.0 / this.PI) : val;

      if (name === "sin") return Math.sin(toRadians(arg));
      if (name === "cos") return Math.cos(toRadians(arg));
      if (name === "tan") return Math.tan(toRadians(arg));
      if (name === "asin") return toDegrees(Math.asin(arg));
      if (name === "acos") return toDegrees(Math.acos(arg));
      if (name === "atan") return toDegrees(Math.atan(arg));
      if (name === "sinh") return Math.sinh(arg);
      if (name === "cosh") return Math.cosh(arg);
      if (name === "tanh") return Math.tanh(arg);

      if (name === "sqrt") {
        if (arg < 0) throw new Error("Square root of a negative number is undefined");
        return Math.sqrt(arg);
      }
      if (name === "log") {
        if (arg <= 0) throw new Error("Logarithm base 10 of non-positive number is undefined");
        return Math.log10(arg);
      }
      if (name === "ln") {
        if (arg <= 0) throw new Error("Natural logarithm of non-positive number is undefined");
        return Math.log(arg);
      }
      if (name === "exp") return Math.exp(arg);
      if (name === "abs") return Math.abs(arg);
      if (name === "fact") {
        if (arg < 0) throw new Error("Factorial of negative number is undefined");
        if (Math.floor(arg) !== arg) throw new Error("Factorial is only defined for integers");
        let res = 1;
        for (let i = 1; i <= arg; ++i) {
          res *= i;
        }
        return res;
      }

      throw new Error(`Unknown function: ${name}`);
    }

    throw new Error(`Unexpected character: '${c}'`);
  }

  evaluate() {
    this.skipWhitespace();
    if (!this.src || this.src.trim() === '') {
      throw new Error("Empty expression");
    }
    let result = this.expression();
    this.skipWhitespace();
    if (this.pos < this.src.length) {
      throw new Error(`Unexpected character at position ${this.pos}: '${this.src[this.pos]}'`);
    }
    return result;
  }
}

function evaluateLocal(expression, mode) {
  try {
    const deg = mode === 'deg';
    const calc = new LocalCalculator(expression, deg);
    const result = calc.evaluate();
    if (isNaN(result)) {
      return { status: 'error', message: 'Result is NaN (not a number)' };
    }
    if (!isFinite(result)) {
      return { status: 'error', message: 'Result is infinite (overflow)' };
    }

    // C++ backend precision formatting (precision 15)
    let formattedResult = result;
    if (typeof result === 'number') {
      const str = result.toPrecision(15);
      formattedResult = parseFloat(str);
    }
    return { status: 'success', result: formattedResult };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function evaluateCalculator() {
  if (!calcIsPowerOn) return;
  if (!calcExpression) return;

  const screenDisplay = document.getElementById('calc-screen-display');
  const statusText = document.getElementById('calc-status-text');

  screenDisplay.innerText = 'Calculating...';
  statusText.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color: var(--accent-cyan);"></i> Processing calculation on C++ backend...';

  try {
    const apiBase = (window.location.port !== '3000') ? 'http://localhost:3000' : '';
    const response = await fetch(`${apiBase}/api/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expression: calcExpression,
        mode: calcMode
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'success') {
      const result = data.result;

      document.getElementById('calc-expr-display').innerText = calcExpression + ' =';
      screenDisplay.innerText = result;

      writeAuditLog('SEC_SUCCESS', `Calculator evaluation successful: ${calcExpression} = ${result} (${calcMode.toUpperCase()} mode)`);

      calcExpression = result.toString();
      calcIsDone = true;

      statusText.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i> Powered by C++ backend server.';
    } else {
      screenDisplay.innerText = 'Error';
      showToast(`Calculator: ${data.message}`, 'error');
      writeAuditLog('SEC_WARN', `Calculator evaluation failed: ${calcExpression}. Error: ${data.message}`);

      statusText.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color: var(--accent-pink);"></i> Error: ${data.message}`;
      calcIsDone = true;
    }
  } catch (error) {
    console.warn('Calculation fetch error, falling back to local evaluation:', error);

    // Evaluate locally
    const data = evaluateLocal(calcExpression, calcMode);

    if (data.status === 'success') {
      const result = data.result;

      document.getElementById('calc-expr-display').innerText = calcExpression + ' =';
      screenDisplay.innerText = result;

      writeAuditLog('SEC_SUCCESS', `Calculator evaluation successful (local fallback): ${calcExpression} = ${result} (${calcMode.toUpperCase()} mode)`);

      calcExpression = result.toString();
      calcIsDone = true;

      statusText.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i> Evaluated locally (C++ offline fallback).';
    } else {
      screenDisplay.innerText = 'Error';
      showToast(`Calculator (Local): ${data.message}`, 'error');
      writeAuditLog('SEC_WARN', `Calculator evaluation failed (local fallback): ${calcExpression}. Error: ${data.message}`);

      statusText.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color: var(--accent-pink);"></i> Local Error: ${data.message}`;
      calcIsDone = true;
    }
  }
}

function handleCalculatorKeyboard(e) {
  if (!calcIsPowerOn) return;
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT') {
    return;
  }

  const key = e.key;

  if (key >= '0' && key <= '9') {
    inputCalcVal(key);
    e.preventDefault();
  } else if (key === '.') {
    inputCalcVal('.');
    e.preventDefault();
  } else if (key === '+' || key === '-' || key === '*' || key === '/' || key === '^') {
    inputCalcVal(key);
    e.preventDefault();
  } else if (key === '(' || key === ')') {
    inputCalcVal(key);
    e.preventDefault();
  } else if (key === 'Enter') {
    evaluateCalculator();
    e.preventDefault();
  } else if (key === 'Backspace') {
    backspaceCalculator();
    e.preventDefault();
  } else if (key === 'Escape') {
    clearCalculator();
    e.preventDefault();
  }
}

// ==========================================================================
// Tic-Tac-Toe Game Logic (Games Arcade)
// ==========================================================================

let tttBoard = Array(9).fill('');
let tttCurrentPlayer = 'X';
let tttGameActive = true;
let tttPlayMode = 'ai'; // 'ai' or 'pvp'
let tttScores = { player: 0, opponent: 0, ties: 0 };

const tttWinConditions = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6]             // diagonals
];

function handleTTTCellClick(index) {
  if (!tttGameActive || tttBoard[index] !== '') return;
  if (tttPlayMode === 'ai' && tttCurrentPlayer === 'O') return; // block clicks during AI turn

  executeTTTMove(index, tttCurrentPlayer);

  if (checkTTTGameState()) return;

  if (tttPlayMode === 'ai') {
    tttCurrentPlayer = 'O';
    document.getElementById('ttt-status-text').innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color: var(--accent-cyan);"></i> Computer is thinking...';
    setTimeout(triggerTTTAIMove, 600);
  } else {
    tttCurrentPlayer = tttCurrentPlayer === 'X' ? 'O' : 'X';
    const color = tttCurrentPlayer === 'X' ? 'var(--accent-cyan)' : 'var(--accent-pink)';
    document.getElementById('ttt-status-text').innerHTML = `<i class="fa-solid fa-circle-user" style="color: ${color};"></i> Player ${tttCurrentPlayer}'s Turn`;
  }
}

function executeTTTMove(index, symbol) {
  tttBoard[index] = symbol;
  const cell = document.querySelector(`.ttt-cell[data-index="${index}"]`);
  cell.innerText = symbol;
  cell.classList.add(symbol === 'X' ? 'x-val' : 'o-val');
}

function triggerTTTAIMove() {
  if (!tttGameActive) return;

  // AI Logic:
  // 1. Can AI win on this turn?
  let move = findWinningMove('O');

  // 2. Can player win on next turn? Block it.
  if (move === -1) {
    move = findWinningMove('X');
  }

  // 3. Prefer Center (index 4)
  if (move === -1 && tttBoard[4] === '') {
    move = 4;
  }

  // 4. Prefer Corners
  if (move === -1) {
    const corners = [0, 2, 6, 8];
    const emptyCorners = corners.filter(i => tttBoard[i] === '');
    if (emptyCorners.length > 0) {
      move = emptyCorners[Math.floor(Math.random() * emptyCorners.length)];
    }
  }

  // 5. Select random remaining
  if (move === -1) {
    const emptyCells = tttBoard.map((val, idx) => val === '' ? idx : null).filter(val => val !== null);
    if (emptyCells.length > 0) {
      move = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
  }

  if (move !== -1) {
    executeTTTMove(move, 'O');
    if (checkTTTGameState()) return;

    tttCurrentPlayer = 'X';
    document.getElementById('ttt-status-text').innerHTML = '<i class="fa-solid fa-circle-user" style="color: var(--accent-cyan);"></i> Your Turn';
  }
}

function findWinningMove(symbol) {
  for (let condition of tttWinConditions) {
    const [a, b, c] = condition;
    if (tttBoard[a] === symbol && tttBoard[b] === symbol && tttBoard[c] === '') return c;
    if (tttBoard[a] === symbol && tttBoard[c] === symbol && tttBoard[b] === '') return b;
    if (tttBoard[b] === symbol && tttBoard[c] === symbol && tttBoard[a] === '') return a;
  }
  return -1;
}

function checkTTTGameState() {
  let roundWon = false;

  for (let condition of tttWinConditions) {
    const [a, b, c] = condition;
    if (tttBoard[a] !== '' && tttBoard[a] === tttBoard[b] && tttBoard[a] === tttBoard[c]) {
      roundWon = true;
      break;
    }
  }

  if (roundWon) {
    const winner = tttCurrentPlayer;
    tttGameActive = false;

    if (winner === 'X') {
      tttScores.player++;
      document.getElementById('ttt-score-player').innerText = tttScores.player;
      document.getElementById('ttt-status-text').innerHTML = '<i class="fa-solid fa-crown" style="color: #f59e0b;"></i> Player X Won!';
      showToast('Tic-Tac-Toe: Player X Wins!', 'success');
    } else {
      tttScores.opponent++;
      document.getElementById('ttt-score-opponent').innerText = tttScores.opponent;
      const oppName = tttPlayMode === 'ai' ? 'Computer' : 'Player O';
      document.getElementById('ttt-status-text').innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color: var(--accent-pink);"></i> ${oppName} Won!`;
      showToast(`Tic-Tac-Toe: ${oppName} Wins!`, 'info');
    }
    return true;
  }

  // Draw check
  if (!tttBoard.includes('')) {
    tttGameActive = false;
    tttScores.ties++;
    document.getElementById('ttt-score-ties').innerText = tttScores.ties;
    document.getElementById('ttt-status-text').innerHTML = '<i class="fa-solid fa-handshake" style="color: var(--text-muted);"></i> Match Draw!';
    showToast('Tic-Tac-Toe: Match Draw!', 'info');
    return true;
  }

  return false;
}

function changeTTTMode(mode) {
  tttPlayMode = mode;
  const oppLabel = document.getElementById('ttt-score-opp-label');
  if (oppLabel) {
    oppLabel.innerText = mode === 'ai' ? 'AI (O)' : 'Player (O)';
  }
  // reset scores when mode changes
  tttScores = { player: 0, opponent: 0, ties: 0 };
  document.getElementById('ttt-score-player').innerText = '0';
  document.getElementById('ttt-score-opponent').innerText = '0';
  document.getElementById('ttt-score-ties').innerText = '0';

  resetTTTGame();
}

function resetTTTGame() {
  tttBoard.fill('');
  tttGameActive = true;
  tttCurrentPlayer = 'X';

  document.querySelectorAll('.ttt-cell').forEach(cell => {
    cell.innerText = '';
    cell.classList.remove('x-val', 'o-val');
  });

  document.getElementById('ttt-status-text').innerHTML = '<i class="fa-solid fa-star" style="color: #f59e0b;"></i> Start playing!';
}

// Cricbuzz Live Cricket Score States
let cricketMatchesData = [];
let cricketSearchQuery = '';
let cricketStatusFilter = 'all';
let cricketPollInterval = null;

// Retrieve the current API key from localStorage or fallback to default
// Retrieve keys list from localStorage or fallback to default
function getCricketApiKeys() {
  const stored = localStorage.getItem('cricket_api_keys');
  if (stored) {
    try {
      const keys = JSON.parse(stored);
      // Auto-migration: check if keys contain any variant with typo and replace it with Combo 5 (valid key)
      let migrated = false;
      keys.forEach(k => {
        if (k.key === 'WZsjhIupG2UBj2c6nb0qqB8CEDtApYtAthG4cbICzM7ypqCpIz' || k.key === 'WZsjhlupG2UBj2c6nb0qqB8CEDtApYtAthG4cblCzM7YpqCpIz') {
          k.key = 'WZsjhIupG2UBj2c6nb0qqB8CEDtApYtAthG4cbICzM7YpqCpIz';
          migrated = true;
        }
      });
      if (migrated) {
        localStorage.setItem('cricket_api_keys', JSON.stringify(keys));
        console.log("Auto-migrated old AllThingsDev key to correct Combo 5 key.");
      }
      return keys;
    } catch (e) {
      console.warn("Failed to parse stored cricket api keys, reverting to defaults.", e);
    }
  }

  // Default keys list pre-populated with RapidAPI and the user's correct AllThingsDev key (Combo 5)!
  const defaultKeys = [
    {
      id: 'key-' + Math.random().toString(36).substring(2, 9),
      provider: 'rapidapi',
      key: '3f9fbec4fbmsh2fddfb691da4723p190bcbjsn027c5bd11a22',
      host: 'cricbuzz-cricket.p.rapidapi.com',
      endpoint: '',
      label: 'Default RapidAPI Key'
    },
    {
      id: 'key-' + Math.random().toString(36).substring(2, 9),
      provider: 'allthingsdev',
      key: 'WZsjhIupG2UBj2c6nb0qqB8CEDtApYtAthG4cbICzM7YpqCpIz',
      host: 'Cricbuzz-Official-Cricket-API.allthingsdev.co',
      endpoint: '95df5edd-bd8b-4881-a12b-1a40e519b693',
      label: 'User AllThingsDev Key'
    }
  ];
  localStorage.setItem('cricket_api_keys', JSON.stringify(defaultKeys));
  return defaultKeys;
}

// Save keys list
function saveCricketApiKeys(keys) {
  localStorage.setItem('cricket_api_keys', JSON.stringify(keys));
}

// Toggle settings panel
function toggleCricketSettings() {
  const panel = document.getElementById('cricket-settings-panel');
  if (panel) {
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      renderCricketKeysTable();
      // Reset form
      document.getElementById('cricket-key-input').value = '';
      document.getElementById('cricket-label-input').value = '';
      document.getElementById('cricket-provider-select').value = 'rapidapi';
      handleCricketProviderChange('rapidapi');
    }
  }
}

// Handle provider dropdown change to show/hide advanced fields
function handleCricketProviderChange(val) {
  const advFields = document.getElementById('cricket-adv-fields');
  if (advFields) {
    advFields.style.display = val === 'allthingsdev' ? 'grid' : 'none';
    if (val === 'allthingsdev') {
      document.getElementById('cricket-host-input').value = 'Cricbuzz-Official-Cricket-API.allthingsdev.co';
      document.getElementById('cricket-endpoint-input').value = '95df5edd-bd8b-4881-a12b-1a40e519b693';
    }
  }
}

// Render the keys table inside settings
function renderCricketKeysTable() {
  const tbody = document.getElementById('cricket-keys-table-body');
  if (!tbody) return;

  const keys = getCricketApiKeys();
  if (keys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No API keys configured. Please add one below.</td></tr>';
    return;
  }

  let html = '';
  keys.forEach((k, idx) => {
    const displayKey = k.key.length > 12 ? (k.key.substring(0, 8) + '...' + k.key.substring(k.key.length - 4)) : k.key;
    const providerBadge = k.provider === 'allthingsdev' ? '<span class="project-badge ongoing" style="padding:0.15rem 0.4rem; font-size:0.75rem;">AllThingsDev</span>' : '<span class="project-badge pending" style="padding:0.15rem 0.4rem; font-size:0.75rem;">RapidAPI</span>';

    html += `
      <tr>
        <td style="font-weight:600; color:#fff;">
          ${k.label || 'API Key ' + (idx + 1)}<br/>
          ${providerBadge}
        </td>
        <td style="font-family:monospace; color:var(--accent-cyan);">${displayKey}</td>
        <td style="font-size:0.8rem; color:var(--text-muted); max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${k.host}">${k.host}</td>
        <td style="text-align:center;">
          <button class="btn btn-danger" onclick="deleteCricketKey('${k.id}')" style="padding:0.3rem 0.6rem; font-size:0.75rem; border-radius:6px; cursor:pointer;" title="Delete key">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// Add new key
function addNewCricketKey() {
  const provider = document.getElementById('cricket-provider-select').value;
  const key = document.getElementById('cricket-key-input').value.trim();
  const label = document.getElementById('cricket-label-input').value.trim();

  if (!key) {
    showToast("Please enter the API key.", "error");
    return;
  }

  const keys = getCricketApiKeys();
  let newKey = {
    id: 'key-' + Math.random().toString(36).substring(2, 9),
    provider: provider,
    key: key,
    label: label || (provider === 'allthingsdev' ? 'AllThingsDev Key' : 'RapidAPI Key')
  };

  if (provider === 'allthingsdev') {
    newKey.host = document.getElementById('cricket-host-input').value.trim() || 'Cricbuzz-Official-Cricket-API.allthingsdev.co';
    newKey.endpoint = document.getElementById('cricket-endpoint-input').value.trim() || '95df5edd-bd8b-4881-a12b-1a40e519b693';
  } else {
    newKey.host = 'cricbuzz-cricket.p.rapidapi.com';
    newKey.endpoint = '';
  }

  keys.push(newKey);
  saveCricketApiKeys(keys);
  showToast("New API key added to rotation successfully!", "success");

  renderCricketKeysTable();
  // Clear inputs
  document.getElementById('cricket-key-input').value = '';
  document.getElementById('cricket-label-input').value = '';

  fetchCricketScores();
}

// Delete key
function deleteCricketKey(id) {
  let keys = getCricketApiKeys();
  keys = keys.filter(k => k.id !== id);
  saveCricketApiKeys(keys);
  showToast("API key removed from rotation.", "info");
  renderCricketKeysTable();
  fetchCricketScores();
}

// Restore defaults
function restoreDefaultKeys() {
  localStorage.removeItem('cricket_api_keys');
  showToast("API keys reset to default list.", "success");
  renderCricketKeysTable();
  fetchCricketScores();
}

// Fetch helper that rotates keys on failure
async function fetchWithKeyFallback(path) {
  const keys = getCricketApiKeys();
  if (keys.length === 0) {
    throw new Error("No API keys configured. Please add an API key in settings.");
  }

  let lastError = null;

  for (let i = 0; i < keys.length; i++) {
    const keyConfig = keys[i];
    let url = '';
    let headers = {};

    if (keyConfig.provider === 'allthingsdev') {
      const targetPath = path.replace('/v1', '');
      url = `https://Cricbuzz-Official-Cricket-API.proxy-production.allthingsdev.co${targetPath}`;
      headers = {
        'x-apihub-key': keyConfig.key,
        'x-apihub-host': keyConfig.host || 'Cricbuzz-Official-Cricket-API.allthingsdev.co',
        'x-apihub-endpoint': keyConfig.endpoint || '95df5edd-bd8b-4881-a12b-1a40e519b693'
      };
    } else {
      // Default to rapidapi
      url = `https://cricbuzz-cricket.p.rapidapi.com${path}`;
      headers = {
        'x-rapidapi-key': keyConfig.key,
        'x-rapidapi-host': keyConfig.host || 'cricbuzz-cricket.p.rapidapi.com'
      };
    }

    console.log(`Attempting fetch on: ${url} using key: ${keyConfig.label || keyConfig.provider} (Index ${i + 1}/${keys.length})`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Fetch succeeded using key: ${keyConfig.label || keyConfig.provider}`);
        return data;
      } else {
        const errText = `API status ${response.status} (${response.statusText || 'Error'}) using key: ${keyConfig.label}`;
        console.warn(`Key #${i + 1} (${keyConfig.label}) failed: ${errText}`);
        lastError = new Error(errText);
      }
    } catch (e) {
      const errText = `Connection failed: ${e.message} using key: ${keyConfig.label}`;
      console.warn(`Key #${i + 1} (${keyConfig.label}) failed: ${errText}`);
      lastError = new Error(errText);
    }

    // If we have more keys in rotation, show a warnings toast about rotation
    if (i < keys.length - 1) {
      if (typeof showToast === 'function') {
        showToast(`Key #${i + 1} (${keyConfig.provider}) failed. Rotating to fallback key...`, 'warning');
      }
    }
  }

  throw lastError || new Error("All API keys in rotation failed.");
}

async function fetchCricketScores() {
  const refreshIcon = document.getElementById('cricket-refresh-icon');
  if (refreshIcon) refreshIcon.classList.add('fa-spin');

  try {
    const data = await fetchWithKeyFallback("/matches/v1/live");
    let allMatches = [];

    if (data && data.typeMatches) {
      data.typeMatches.forEach(tm => {
        const matchType = tm.matchType;
        if (tm.seriesMatches) {
          tm.seriesMatches.forEach(sm => {
            if (sm.seriesAdWrapper && sm.seriesAdWrapper.matches) {
              sm.seriesAdWrapper.matches.forEach(m => {
                allMatches.push({
                  type: matchType,
                  seriesName: sm.seriesAdWrapper.seriesName,
                  info: m.matchInfo,
                  score: m.matchScore
                });
              });
            }
          });
        }
      });
    }

    cricketMatchesData = allMatches;
    renderCricketScores();

    const lastUpdatedLabel = document.getElementById('cricket-last-updated');
    if (lastUpdatedLabel) {
      lastUpdatedLabel.innerText = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
  } catch (error) {
    console.error("Failed to fetch cricket scores:", error);
    showToast(`Cricket API connection failed: ${error.message}`, "error");
    const container = document.getElementById('cricket-matches-list');
    if (container && (!cricketMatchesData || cricketMatchesData.length === 0)) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem; color: var(--text-secondary);">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--accent-pink);"></i>
          <p style="font-weight:700; font-size:1.15rem; margin-bottom:0.5rem; color:#fff;">Connection Failed</p>
          <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1.5rem;">
            ${error.message}. <br/>
            This is usually caused by an expired/exhausted RapidAPI key or CORS limitations.
          </p>
          <div style="display:flex; gap:1rem; justify-content:center;">
            <button class="btn btn-secondary" onclick="toggleCricketSettings()" style="font-family: var(--font-body); cursor: pointer;"><i class="fa-solid fa-gear"></i> Change API Key Settings</button>
            <button class="btn btn-secondary" onclick="fetchCricketScores()" style="font-family: var(--font-body); cursor: pointer;"><i class="fa-solid fa-sync"></i> Retry Connection</button>
          </div>
        </div>
      `;
    }
  } finally {
    if (refreshIcon) refreshIcon.classList.remove('fa-spin');
  }
}

function handleCricketSearch(val) {
  cricketSearchQuery = val.trim().toLowerCase();
  renderCricketScores();
}

function handleCricketFilter(val) {
  cricketStatusFilter = val;
  renderCricketScores();
}

function renderCricketScores() {
  const container = document.getElementById('cricket-matches-list');
  if (!container) return;

  // Filter matches
  let filtered = cricketMatchesData.filter(m => {
    const info = m.info || {};
    const textToSearch = [
      m.seriesName,
      info.team1 ? info.team1.teamName : '',
      info.team2 ? info.team2.teamName : '',
      info.status || '',
      info.matchDesc || ''
    ].join(' ').toLowerCase();

    // 1. Search Query Filter
    if (cricketSearchQuery && !textToSearch.includes(cricketSearchQuery)) {
      return false;
    }

    // 2. Status Category Filter
    const state = (info.state || '').toLowerCase();
    if (cricketStatusFilter === 'live') {
      return state === 'in progress' || state.includes('live');
    } else if (cricketStatusFilter === 'complete') {
      return state === 'complete' || state.includes('won') || state.includes('drawn') || state.includes('loss');
    } else if (cricketStatusFilter === 'preview') {
      return state === 'preview' || state.includes('upcoming') || state.includes('preview');
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-muted); background: rgba(17, 22, 39, 0.4); border: 1px dashed var(--border-color); border-radius: 16px;">
        <i class="fa-solid fa-baseball-bat-ball" style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.3;"></i>
        <p>No matches found matching the current filters.</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(m => {
    const info = m.info || {};
    const score = m.score || {};

    const t1Name = info.team1 ? info.team1.teamName : 'Team 1';
    const t2Name = info.team2 ? info.team2.teamName : 'Team 2';
    const t1SName = info.team1 && info.team1.teamSName ? info.team1.teamSName : t1Name.substring(0, 3).toUpperCase();
    const t2SName = info.team2 && info.team2.teamSName ? info.team2.teamSName : t2Name.substring(0, 3).toUpperCase();

    // Check innings scores
    const formatScoreText = (teamScore) => {
      if (!teamScore || (!teamScore.inngs1 && !teamScore.inngs2)) {
        return '<span class="cricket-score-val inactive">Yet to bat</span>';
      }
      const inn = teamScore.inngs1 || {};
      const runs = inn.runs !== undefined ? inn.runs : 0;
      const wickets = inn.wickets !== undefined ? inn.wickets : 0;
      const overs = inn.overs !== undefined ? inn.overs : 0;

      let txt = `${runs}/${wickets} <span style="font-size:0.8rem; font-weight:500; color:var(--text-secondary); text-shadow:none;">(${overs} ov)</span>`;

      if (teamScore.inngs2) {
        const inn2 = teamScore.inngs2;
        const runs2 = inn2.runs !== undefined ? inn2.runs : 0;
        const wickets2 = inn2.wickets !== undefined ? inn2.wickets : 0;
        txt += ` & ${runs2}/${wickets2}`;
      }
      return `<span class="cricket-score-val">${txt}</span>`;
    };

    const isLive = (info.state || '').toLowerCase() === 'in progress' || (info.state || '').toLowerCase().includes('live');
    const isComplete = (info.state || '').toLowerCase() === 'complete' || (info.state || '').toLowerCase().includes('won') || (info.state || '').toLowerCase().includes('drawn');

    const stateClass = isLive ? 'live' : (isComplete ? 'complete' : 'preview');
    const stateText = isLive ? 'LIVE' : (isComplete ? 'COMPLETED' : 'UPCOMING');

    const t1BattingClass = (score.team1Score && score.team1Score.isBatting) ? 'batting' : '';
    const t2BattingClass = (score.team2Score && score.team2Score.isBatting) ? 'batting' : '';

    html += `
      <div class="cricket-card" onclick="openCricketMatchModal('${info.matchId || ''}')" style="cursor: pointer;">
        <div class="cricket-card-header">
          <span class="cricket-series" title="${m.seriesName}">${m.seriesName}</span>
          <span class="cricket-format-badge">${info.matchFormat || 'MATCH'}</span>
        </div>

        <div class="cricket-teams-section">
          <!-- Team 1 -->
          <div class="cricket-team-row ${t1BattingClass}">
            <div class="cricket-team-info">
              <div class="cricket-team-flag-placeholder">${t1SName.substring(0, 2)}</div>
              <span class="cricket-team-name">${t1Name}</span>
              ${t1BattingClass ? '<i class="fa-solid fa-circle-dot" style="font-size:0.6rem; color:var(--accent-pink); margin-left:0.25rem;"></i>' : ''}
            </div>
            ${formatScoreText(score.team1Score)}
          </div>
          
          <!-- Team 2 -->
          <div class="cricket-team-row ${t2BattingClass}">
            <div class="cricket-team-info">
              <div class="cricket-team-flag-placeholder">${t2SName.substring(0, 2)}</div>
              <span class="cricket-team-name">${t2Name}</span>
              ${t2BattingClass ? '<i class="fa-solid fa-circle-dot" style="font-size:0.6rem; color:var(--accent-pink); margin-left:0.25rem;"></i>' : ''}
            </div>
            ${formatScoreText(score.team2Score)}
          </div>
        </div>

        <div class="cricket-card-footer">
          <span class="cricket-status-text">
            <i class="fa-solid fa-circle-info" style="color: var(--accent-cyan);"></i> 
            <span title="${info.status || 'Match scheduled'}">${info.status || 'Match scheduled'}</span>
          </span>
          <span class="cricket-state-badge ${stateClass}">${stateText}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Cricbuzz-Style Match Details Modal States
let activeCricketMatchId = null;
let activeCricketTab = 'scorecard';
let activeCricketInnings = 1;
let cricketDetailPollInterval = null;
let cricketMatchDetailsData = null;

function openCricketMatchModal(matchId) {
  console.log("openCricketMatchModal called for matchId:", matchId);
  if (typeof showToast === 'function') {
    showToast("Opening Match Details... (ID: " + matchId + ")", "info");
  }

  if (!matchId) {
    if (typeof showToast === 'function') showToast("Error: No Match ID provided", "error");
    return;
  }

  activeCricketMatchId = matchId;
  activeCricketTab = 'scorecard';
  activeCricketInnings = 1;
  cricketMatchDetailsData = null;

  const modal = document.getElementById('cricket-match-modal');
  if (!modal) {
    console.error("Element #cricket-match-modal not found in document");
    if (typeof showToast === 'function') showToast("Internal Error: Modal element not found", "error");
    return;
  }
  modal.classList.add('active-modal');

  // Set loading state in panels safely
  const summaryEl = document.getElementById('cricket-modal-summary');
  if (summaryEl) summaryEl.innerHTML = '<div style="text-align:center; padding:1rem;"><i class="fa-solid fa-spinner fa-spin fa-lg" style="color:var(--accent-purple);"></i> Loading live scorecards...</div>';

  const scorecardEl = document.getElementById('cricket-scorecard-tables');
  if (scorecardEl) scorecardEl.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">Fetching batting & bowling lists...</div>';

  const commEl = document.getElementById('cricket-commentary-timeline');
  if (commEl) commEl.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">Fetching ball-by-ball commentary...</div>';

  const infoEl = document.getElementById('cricket-info-details');
  if (infoEl) infoEl.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">Fetching match summaries...</div>';

  switchCricketDetailTab('scorecard');

  // Initial fetch
  fetchCricketMatchDetails(matchId);

  // Poll details every 15 seconds while modal is open
  clearInterval(cricketDetailPollInterval);
  cricketDetailPollInterval = setInterval(() => {
    fetchCricketMatchDetails(matchId);
  }, 15000);
}

function closeCricketMatchModal() {
  activeCricketMatchId = null;
  clearInterval(cricketDetailPollInterval);
  cricketDetailPollInterval = null;

  const modal = document.getElementById('cricket-match-modal');
  if (modal) modal.classList.remove('active-modal');
}

async function fetchCricketMatchDetails(matchId) {
  console.log("fetchCricketMatchDetails fetching for matchId:", matchId);
  try {
    const [scorecard, commentary] = await Promise.all([
      fetchWithKeyFallback(`/mcenter/v1/${matchId}/scard`),
      fetchWithKeyFallback(`/mcenter/v1/${matchId}/hcomm`)
    ]);

    cricketMatchDetailsData = { scorecard, commentary };
    renderCricketMatchDetails();
  } catch (error) {
    console.error("Error fetching Cricbuzz details:", error);
    if (typeof showToast === 'function') {
      showToast("Failed to fetch match details: " + error.message, "error");
    }

    // Display error message in the summary pane
    const summaryEl = document.getElementById('cricket-modal-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div style="text-align:center; padding:1.5rem; color:var(--accent-pink);">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
          <p style="font-weight:600; margin:0.25rem 0;">Error Fetching Match Details</p>
          <p style="font-size:0.85rem; opacity:0.8;">${error.message}</p>
        </div>
      `;
    }
  }
}

function switchCricketDetailTab(tab) {
  activeCricketTab = tab;

  // Update tabs indicators
  document.querySelectorAll('#cricket-match-modal .sec-tab-btn').forEach(btn => {
    btn.classList.remove('active-sec-tab');
  });
  const activeBtn = document.getElementById(`cricket-tab-${tab}`);
  if (activeBtn) activeBtn.classList.add('active-sec-tab');

  // Toggle panes visibility
  document.querySelectorAll('#cricket-match-modal .sec-pane').forEach(pane => {
    pane.classList.remove('active-pane');
  });
  const activePane = document.getElementById(`cricket-pane-${tab}`);
  if (activePane) activePane.classList.add('active-pane');

  renderCricketMatchDetails();
}

function switchCricketInnings(inningsNum) {
  activeCricketInnings = inningsNum;
  renderCricketMatchDetails();
}

function renderCricketMatchDetails() {
  if (!cricketMatchDetailsData) return;

  try {
    const { scorecard, commentary } = cricketMatchDetailsData;

    // 1. Render Summary Header
    const headerData = (scorecard && scorecard.matchHeader) || {};
    const team1 = headerData.team1 || {};
    const team2 = headerData.team2 || {};
    const stateText = headerData.state || 'Live';
    const statusText = headerData.status || '';
    const matchDesc = headerData.matchDescription || 'Match';

    // Modal title update
    const titleEl = document.getElementById('cricket-modal-title');
    if (titleEl) {
      const t1Name = team1.name || 'Team 1';
      const t2Name = team2.name || 'Team 2';
      titleEl.innerHTML = `<i class="fa-solid fa-trophy" style="color:var(--accent-purple);"></i> ${t1Name} vs ${t2Name} - ${matchDesc}`;
    }

    // Scores summary helper
    const getSummaryScore = (teamId) => {
      let txt = '';
      if (scorecard && scorecard.inningsData) {
        scorecard.inningsData.forEach(inn => {
          if (inn.batTeamId === teamId) {
            const runs = inn.runs || 0;
            const wickets = inn.wickets || 0;
            const overs = inn.overs || 0;
            if (txt) txt += ' & ';
            txt += `${runs}/${wickets} (${overs} ov)`;
          }
        });
      }
      return txt || 'Yet to bat';
    };

    const team1SummaryScore = team1.id ? getSummaryScore(team1.id) : 'Yet to bat';
    const team2SummaryScore = team2.id ? getSummaryScore(team2.id) : 'Yet to bat';

    const summaryEl = document.getElementById('cricket-modal-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.5rem;">
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            <div style="display:flex; align-items:center; gap:0.55rem;">
              <span style="font-weight:700; font-size:1.15rem; color:#fff;">${team1.name || 'Team 1'}</span>
              <span style="font-size:1.1rem; font-weight:700; color:var(--accent-cyan); margin-left:1rem;">${team1SummaryScore}</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.55rem;">
              <span style="font-weight:700; font-size:1.15rem; color:#fff;">${team2.name || 'Team 2'}</span>
              <span style="font-size:1.1rem; font-weight:700; color:var(--accent-cyan); margin-left:1rem;">${team2SummaryScore}</span>
            </div>
          </div>
          <div style="text-align:right;">
            <span class="cricket-state-badge ${(stateText || '').toLowerCase() === 'in progress' ? 'live' : 'complete'}" style="margin-bottom:0.5rem; display:inline-block;">${stateText}</span>
            <div style="font-size:0.9rem; font-weight:600; color:#f59e0b;">${statusText}</div>
          </div>
        </div>
      `;
    }

    // 2. Render Scorecard Pane
    const scListContainer = document.getElementById('cricket-scorecard-tables');
    const scInningsTabs = document.getElementById('cricket-innings-tabs-container');

    if (scorecard && scorecard.inningsData && scorecard.inningsData.length > 0) {
      // Render Innings selector tabs
      let tabsHtml = '';
      scorecard.inningsData.forEach((inn, idx) => {
        const innNum = idx + 1;
        const isBat1 = inn.batTeamId === team1.id;
        const batTeamName = isBat1 ? team1.shortName || team1.name || 'Team 1' : team2.shortName || team2.name || 'Team 2';
        tabsHtml += `
          <button class="cricket-innings-btn ${activeCricketInnings === innNum ? 'active-innings' : ''}" onclick="switchCricketInnings(${innNum})">
            ${batTeamName} Innings ${inn.inningsNum > 1 ? inn.inningsNum : ''}
          </button>
        `;
      });
      if (scInningsTabs) scInningsTabs.innerHTML = tabsHtml;

      // Render selected innings tables
      const inn = scorecard.inningsData[activeCricketInnings - 1];
      if (inn) {
        let tablesHtml = '';

        // Batting Table
        tablesHtml += `
          <div>
            <h4 style="font-size:1.1rem; margin-bottom:0.75rem; color:var(--accent-cyan);"><i class="fa-solid fa-baseball-bat-ball"></i> Batting Card</h4>
            <div class="cricket-table-wrapper">
              <table class="cricket-table">
                <thead>
                  <tr>
                    <th>Batsman</th>
                    <th>Dismissal</th>
                    <th style="text-align:center;">R</th>
                    <th style="text-align:center;">B</th>
                    <th style="text-align:center;">4s</th>
                    <th style="text-align:center;">6s</th>
                    <th style="text-align:center;">SR</th>
                  </tr>
                </thead>
                <tbody>
        `;

        const batList = inn.batsmanData ? Object.values(inn.batsmanData) : [];
        if (batList.length > 0) {
          batList.forEach(bat => {
            tablesHtml += `
              <tr>
                <td class="commentary-bold">${bat.batName || 'Batsman'}</td>
                <td style="font-size:0.85rem; color:var(--text-muted);">${bat.outDec || 'Not out'}</td>
                <td style="text-align:center; font-weight:700; color:#fff;">${bat.runs || 0}</td>
                <td style="text-align:center;">${bat.balls || 0}</td>
                <td style="text-align:center;">${bat.fours || 0}</td>
                <td style="text-align:center;">${bat.sixes || 0}</td>
                <td style="text-align:center; color:var(--accent-purple); font-weight:600;">${bat.strikeRate || '0.00'}</td>
              </tr>
            `;
          });
        } else {
          tablesHtml += `<tr><td colspan="7" style="text-align:center;">No batting statistics recorded.</td></tr>`;
        }

        tablesHtml += `
                </tbody>
              </table>
            </div>
          </div>
        `;

        // Bowling Table
        tablesHtml += `
          <div>
            <h4 style="font-size:1.1rem; margin-bottom:0.75rem; color:var(--accent-pink);"><i class="fa-solid fa-bullseye"></i> Bowling Card</h4>
            <div class="cricket-table-wrapper">
              <table class="cricket-table">
                <thead>
                  <tr>
                    <th>Bowler</th>
                    <th style="text-align:center;">O</th>
                    <th style="text-align:center;">M</th>
                    <th style="text-align:center;">R</th>
                    <th style="text-align:center;">W</th>
                    <th style="text-align:center;">ECO</th>
                  </tr>
                </thead>
                <tbody>
        `;

        const bowlList = inn.bowlerData ? Object.values(inn.bowlerData) : [];
        if (bowlList.length > 0) {
          bowlList.forEach(bowl => {
            tablesHtml += `
              <tr>
                <td class="commentary-bold">${bowl.bowlName || 'Bowler'}</td>
                <td style="text-align:center; font-weight:700; color:#fff;">${bowl.overs || 0}</td>
                <td style="text-align:center;">${bowl.maidens || 0}</td>
                <td style="text-align:center;">${bowl.runs || 0}</td>
                <td style="text-align:center; font-weight:700; color:var(--accent-cyan);">${bowl.wickets || 0}</td>
                <td style="text-align:center; color:var(--accent-pink); font-weight:600;">${bowl.economy || '0.00'}</td>
              </tr>
            `;
          });
        } else {
          tablesHtml += `<tr><td colspan="6" style="text-align:center;">No bowling statistics recorded.</td></tr>`;
        }

        tablesHtml += `
                </tbody>
              </table>
            </div>
          </div>
        `;

        if (scListContainer) scListContainer.innerHTML = tablesHtml;
      }
    } else {
      if (scInningsTabs) scInningsTabs.innerHTML = '';
      if (scListContainer) scListContainer.innerHTML = '<div style="text-align:center; padding:3rem; color:var(--text-muted);">Detailed scorecard statistics are not available for this match yet.</div>';
    }

    // 3. Render Commentary Pane
    const commTimeline = document.getElementById('cricket-commentary-timeline');
    const commList = (commentary && commentary.commentaryList) || [];

    if (commList.length > 0) {
      let commHtml = '';
      commList.forEach(comm => {
        const hasOver = comm.overNumber !== undefined;
        let overText = '';
        if (hasOver) {
          overText = `<span class="commentary-over-badge">${comm.overNumber}${comm.ballNumber !== undefined ? '.' + comm.ballNumber : ''}</span>`;
        }

        const txt = comm.commText || '';
        let badgeText = '';
        if (txt.includes('WICKET') || txt.includes('OUT')) {
          badgeText = '<span class="comm-event-badge wicket">Wicket</span>';
        } else if (txt.includes('FOUR') || txt.includes('4 runs')) {
          badgeText = '<span class="comm-event-badge four">Four</span>';
        } else if (txt.includes('SIX') || txt.includes('6 runs')) {
          badgeText = '<span class="comm-event-badge six">Six</span>';
        }

        let formattedText = txt;
        const firstComma = txt.indexOf(',');
        if (firstComma > 0 && firstComma < 25) {
          const boldPrefix = txt.substring(0, firstComma);
          const restText = txt.substring(firstComma);
          formattedText = `<span class="commentary-bold">${boldPrefix}</span>${restText}`;
        }

        commHtml += `
          <div class="commentary-item">
            ${overText}
            <div class="commentary-content">
              ${badgeText}
              ${formattedText}
            </div>
          </div>
        `;
      });
      if (commTimeline) commTimeline.innerHTML = commHtml;
    } else {
      if (commTimeline) commTimeline.innerHTML = '<div style="text-align:center; padding:3rem; color:var(--text-muted);">No commentaries available for this match.</div>';
    }

    // 4. Render Info Pane
    const infoContainer = document.getElementById('cricket-info-details');
    const mInfo = (scorecard && scorecard.matchHeader) || {};

    if (infoContainer) {
      infoContainer.innerHTML = `
        <div class="cricket-info-row">
          <div class="cricket-info-label">Match Description</div>
          <div class="cricket-info-value">${mInfo.matchDescription || matchDesc}</div>
        </div>
        <div class="cricket-info-row">
          <div class="cricket-info-label">Series Name</div>
          <div class="cricket-info-value">${headerData.seriesName || 'ICC Tournaments'}</div>
        </div>
        <div class="cricket-info-row">
          <div class="cricket-info-label">Venue / Location</div>
          <div class="cricket-info-value">${mInfo.venue ? (mInfo.venue.name + ', ' + mInfo.venue.city) : 'TBD'}</div>
        </div>
        <div class="cricket-info-row">
          <div class="cricket-info-label">Toss Decision</div>
          <div class="cricket-info-value">${mInfo.tossResults ? (mInfo.tossResults.tossWinnerName + ' chose to ' + mInfo.tossResults.decision) : 'Yet to occur'}</div>
        </div>
        <div class="cricket-info-row">
          <div class="cricket-info-label">Umpires / Referee</div>
          <div class="cricket-info-value">
            Umpires: ${mInfo.umpire1 ? mInfo.umpire1.name : 'TBD'}, ${mInfo.umpire2 ? mInfo.umpire2.name : 'TBD'}<br/>
            Referee: ${mInfo.referee ? mInfo.referee.name : 'TBD'}
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error("Error inside renderCricketMatchDetails:", err);
    if (typeof showToast === 'function') {
      showToast("Render details failed: " + err.message, "error");
    }
  }
}

// ==========================================================================
// Gramin Saathi Portal Logic
// ==========================================================================

// Mandi rates mock database (Bihar)
const gsMandiRatesDatabase = {
  patna: [
    { crop: 'Wheat (गेहूं)', variety: 'Lokwan', min: 2150, max: 2320, trend: 'up' },
    { crop: 'Paddy (धान)', variety: 'Basmati Sharbati', min: 1850, max: 2050, trend: 'stable' },
    { crop: 'Potato (आलू)', variety: 'Jyoti / Red', min: 1200, max: 1450, trend: 'down' },
    { crop: 'Mustard (सरसों)', variety: 'Local Black', min: 4800, max: 5200, trend: 'up' },
    { crop: 'Onion (प्याज)', variety: 'Nashik Red', min: 1500, max: 1780, trend: 'stable' }
  ],
  gaya: [
    { crop: 'Wheat (गेहूं)', variety: 'Sonalika', min: 2120, max: 2280, trend: 'stable' },
    { crop: 'Paddy (धान)', variety: 'Common Raw', min: 1800, max: 1980, trend: 'up' },
    { crop: 'Potato (आलू)', variety: 'Desi White', min: 1150, max: 1380, trend: 'down' },
    { crop: 'Mustard (सरसों)', variety: 'Yellow Bold', min: 4900, max: 5350, trend: 'up' },
    { crop: 'Maize (मक्का)', variety: 'Kharif Feed', min: 1650, max: 1850, trend: 'up' }
  ],
  muzaffarpur: [
    { crop: 'Wheat (गेहूं)', variety: 'Lokwan', min: 2160, max: 2340, trend: 'up' },
    { crop: 'Paddy (धान)', variety: 'Sarna Rice', min: 1820, max: 2020, trend: 'stable' },
    { crop: 'Garlic (लहसुन)', variety: 'Desi', min: 8000, max: 9500, trend: 'up' },
    { crop: 'Mustard (सरसों)', variety: 'Local Black', min: 4750, max: 5100, trend: 'down' },
    { crop: 'Potato (आलू)', variety: 'Jyoti', min: 1250, max: 1500, trend: 'up' }
  ]
};

// Welfare schemes database
const gsWelfareSchemesDatabase = [
  {
    name: 'PM Kisan Samman Nidhi (पीएम-किसान)',
    category: 'agri',
    desc: 'Provides direct financial support of ₹6,000 per year in three equal installments to small and landholding farmer families across Bihar.',
    eligibility: 'Landholding farmer families with cultivable land in their name.',
    benefit: '₹2,000 every 4 months (Total ₹6,000/yr)'
  },
  {
    name: 'Bihar Student Credit Card (बिहार स्टूडेंट क्रेडिट कार्ड)',
    category: 'edu',
    desc: 'Education loan scheme providing financial assistance of up to ₹4 Lakhs to 12th pass students for pursuing higher education.',
    eligibility: '12th standard pass-outs from recognized institutions in Bihar, aged under 25.',
    benefit: 'Up to ₹4,00,000 education loan at highly subsidized interest rates (1% for girls/disabled, 4% for others).'
  },
  {
    name: 'Mukhyamantri Vriddhajan Pension Yojana (वृद्धजन पेंशन)',
    category: 'pension',
    desc: 'Social security pension scheme for elder citizens in Bihar, ensuring monthly assistance directly in their bank accounts.',
    eligibility: 'Residents of Bihar aged 60 or above, who are not receiving any other government pension.',
    benefit: '₹400/month (Ages 60-79) or ₹500/month (Ages 80+)'
  },
  {
    name: 'Pradhan Mantri Awas Yojana - Gramin (पीएम आवास ग्रामीण)',
    category: 'housing',
    desc: 'Assistance for construction of a pucca house with basic amenities to all houseless householders and those living in dilapidated houses.',
    eligibility: 'Families listed in SECC 2011 list or meeting designated deprivation criteria.',
    benefit: 'Financial aid of ₹1.2 Lakhs in plains and ₹1.3 Lakhs in hilly areas, plus MGNREGS wage support.'
  },
  {
    name: 'Kharif/Rabi Diesel Anudan Yojana (डीजल अनुदान)',
    category: 'agri',
    desc: 'Subsidy on diesel purchases for irrigation of standing crops during drought or dry spells in Bihar.',
    eligibility: 'Registered farmers of Bihar cultivating crops during declared seasons.',
    benefit: 'Subsidy of ₹75 per liter (Up to ₹750/acre per irrigation cycle).'
  },
  {
    name: 'Bihar Post Matric Scholarship (उत्तर-मैट्रिक छात्रवृत्ति)',
    category: 'edu',
    desc: 'Scholarship assistance for students from SC, ST, EBC, and BC categories pursuing post-matric courses in recognized colleges.',
    eligibility: 'Registered students of Bihar from SC/ST/BC/EBC categories with annual family income below ₹3 Lakhs.',
    benefit: 'Coverage of tuition fees and academic maintenance allowance depending on course tier.'
  }
];

function initGraminSaathiPortal() {
  console.log("Initializing Gramin Saathi Portal...");

  // Set default mandi rate selections
  const mandiSelect = document.getElementById('gs-mandi-select');
  if (mandiSelect) {
    mandiSelect.value = 'patna';
    updateMandiRates('patna');
  }

  // Reset schemes checker search & categories
  const searchInput = document.getElementById('gs-scheme-search');
  if (searchInput) searchInput.value = '';

  const categorySelect = document.getElementById('gs-scheme-category');
  if (categorySelect) categorySelect.value = 'all';

  filterWelfareSchemes();
}

function updateMandiRates(mandiId) {
  const tbody = document.getElementById('gs-mandi-table-body');
  if (!tbody) return;

  const crops = gsMandiRatesDatabase[mandiId] || [];
  if (crops.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No mandi rates listed.</td></tr>';
    return;
  }

  let html = '';
  crops.forEach(c => {
    let trendIcon = '<i class="fa-solid fa-arrow-right" style="color: var(--text-muted);" title="Stable"></i>';
    if (c.trend === 'up') {
      trendIcon = '<i class="fa-solid fa-arrow-trend-up mandi-trend-up" title="Rising"></i>';
    } else if (c.trend === 'down') {
      trendIcon = '<i class="fa-solid fa-arrow-trend-down mandi-trend-down" title="Falling"></i>';
    }

    html += `
      <tr>
        <td style="font-weight:600; color:#fff;">${c.crop}</td>
        <td style="color:var(--text-secondary);">${c.variety}</td>
        <td style="text-align:center; font-weight:700; color:#fff;">₹${c.min}</td>
        <td style="text-align:center; font-weight:700; color:var(--accent-emerald);">₹${c.max}</td>
        <td style="text-align:center; font-size:1.15rem;">${trendIcon}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function filterWelfareSchemes() {
  const listContainer = document.getElementById('gs-schemes-list');
  if (!listContainer) return;

  const query = document.getElementById('gs-scheme-search').value.toLowerCase().trim();
  const category = document.getElementById('gs-scheme-category').value;

  const filtered = gsWelfareSchemesDatabase.filter(s => {
    // Category check
    if (category !== 'all' && s.category !== category) {
      return false;
    }
    // Search query check
    if (query) {
      const matchText = (s.name + ' ' + s.desc + ' ' + s.eligibility).toLowerCase();
      if (!matchText.includes(query)) {
        return false;
      }
    }
    return true;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align:center; padding:2rem; color:var(--text-muted);">
        <i class="fa-solid fa-folder-open" style="font-size:2rem; margin-bottom:0.5rem; opacity:0.5;"></i>
        <p>No welfare schemes found matching the criteria.</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(s => {
    let catClass = s.category;
    let catName = 'Agriculture';
    if (s.category === 'edu') catName = 'Education';
    if (s.category === 'pension') catName = 'Pension';
    if (s.category === 'housing') catName = 'Housing & Power';

    html += `
      <div class="scheme-card-item">
        <div class="scheme-card-header">
          <span class="scheme-title">${s.name}</span>
          <span class="scheme-category-badge ${catClass}">${catName}</span>
        </div>
        <p class="scheme-desc">${s.desc}</p>
        <div style="font-size:0.8rem; margin-bottom:0.5rem; color:#fff;">
          <strong>Eligibility:</strong> <span style="color:var(--text-secondary);">${s.eligibility}</span>
        </div>
        <div class="scheme-footer">
          <span class="scheme-eligibility"><i class="fa-solid fa-gift" style="color: var(--accent-emerald);"></i> Benefit: ${s.benefit}</span>
          <span class="scheme-apply-link" onclick="applySchemeSimulate('${s.name}')">Apply Now <i class="fa-solid fa-arrow-right"></i></span>
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html;
}

function applySchemeSimulate(schemeName) {
  if (typeof showToast === 'function') {
    showToast(`Simulation: Navigating to Bihar Welfare Portal for "${schemeName}"...`, 'success');
  }
}

// ==========================================
// ATS CREATIVE SUITE DOWNLOAD ACTIONS
// ==========================================
let activeDownloadSuite = 'office';

function openATSDownloadModal(suiteType) {
  activeDownloadSuite = suiteType;
  const modal = document.getElementById('ats-download-modal');
  const title = document.getElementById('ats-modal-header-title');
  const desc = document.getElementById('ats-modal-desc');
  const winFile = document.getElementById('ats-modal-windows-filename');
  const winSize = document.getElementById('ats-modal-windows-size');
  const andFile = document.getElementById('ats-modal-android-filename');
  const andSize = document.getElementById('ats-modal-android-size');

  if (suiteType === 'office') {
    title.innerHTML = '<i class="fa-solid fa-cloud-arrow-down" style="color: var(--accent-emerald);"></i> Download ATS Office Suite';
    desc.innerText = 'Get the standalone offline office suite for your PC or Mobile devices. Includes Word Document, Spreadsheet, Presentation, and Canvas Paint.';
    winFile.innerText = 'ATS_Office_Windows.zip';
    winSize.innerText = '3.8 MB';
    andFile.innerText = 'ATS_Office_Mobile.zip';
    andSize.innerText = '3.8 MB';
  } else {
    title.innerHTML = '<i class="fa-solid fa-cloud-arrow-down" style="color: var(--accent-purple);"></i> Download ATS Video Editor';
    desc.innerText = 'Get the standalone offline multi-track Video Editor. Trim, merge, add audio/text, and render movies offline.';
    winFile.innerText = 'ATS_Video_Editor_Windows.zip';
    winSize.innerText = '4.2 MB';
    andFile.innerText = 'ATS_Video_Editor_Mobile.zip';
    andSize.innerText = '4.2 MB';
  }

  modal.classList.add('active-modal');
  document.getElementById('ats-download-selector').style.display = 'block';
  document.getElementById('ats-download-progress-container').style.display = 'none';
}

function closeATSDownloadModal() {
  document.getElementById('ats-download-modal').classList.remove('active-modal');
}

function startATSDownloadSim(type) {
  document.getElementById('ats-download-selector').style.display = 'none';
  document.getElementById('ats-download-progress-container').style.display = 'block';
  
  const title = document.getElementById('ats-download-title');
  const status = document.getElementById('ats-download-status');
  const bar = document.getElementById('ats-download-progress-bar');
  const pct = document.getElementById('ats-download-pct');
  const size = document.getElementById('ats-download-size');

  let totalSize = 0;
  let fileName = '';

  if (activeDownloadSuite === 'office') {
    totalSize = 3.8;
    fileName = type === 'exe' ? 'ATS_Office_Windows.zip' : 'ATS_Office_Mobile.zip';
  } else {
    totalSize = 4.2;
    fileName = type === 'exe' ? 'ATS_Video_Editor_Windows.zip' : 'ATS_Video_Editor_Mobile.zip';
  }
  
  title.innerText = `Downloading ${type === 'exe' ? 'Windows Package' : 'Mobile Package'}...`;
  status.innerText = "Securing cloud server handshake...";
  bar.style.width = '0%';
  pct.innerText = "Progress: 0%";
  size.innerText = `0 / ${totalSize} MB`;

  let progress = 0;
  const interval = setInterval(() => {
    progress += 4;
    if (progress > 100) progress = 100;
    
    bar.style.width = `${progress}%`;
    pct.innerText = `Progress: ${progress}%`;
    size.innerText = `${((progress/100) * totalSize).toFixed(1)} / ${totalSize} MB`;
    
    if (progress >= 20 && progress < 50) {
      status.innerText = "Downloading editor components and runtimes...";
    } else if (progress >= 50 && progress < 80) {
      status.innerText = "Packing assets and stylesheet guides...";
    } else if (progress >= 80 && progress < 100) {
      status.innerText = "Verifying installer package checksum...";
    }
    
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        closeATSDownloadModal();
        if (typeof showToast === 'function') {
          showToast(`${fileName} downloaded successfully!`, 'success');
        }
        
        // Trigger simulated or real file download
        const element = document.createElement('a');
        const fileUrl = (window.location.protocol === 'file:')
          ? 'data:application/zip;base64,UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==' // Valid empty zip file
          : `/downloads/${fileName}`;
        
        element.setAttribute('href', fileUrl);
        element.setAttribute('download', fileName);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }, 500);
    }
  }, 100);
}
