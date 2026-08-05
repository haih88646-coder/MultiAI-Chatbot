// API Base URL
const API_BASE = '';

// State
let token = localStorage.getItem('adminToken');
let currentPage = 'overview';
let usersPage = 1;
let currentUserId = null;

// On page load
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    checkAuth();
  }

  // Login form
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  // Sidebar navigation
  document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.target.closest('a').dataset.page;
      navigateTo(page);
    });
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    handleLogout();
  });
});

// API Helper
async function apiCall(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(API_BASE + url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    localStorage.removeItem('adminToken');
    token = null;
    showLogin();
    throw new Error('Unauthorized');
  }

  return response.json();
}

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Login
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');

  try {
    const data = await apiCall('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (data.success) {
      token = data.token;
      localStorage.setItem('adminToken', token);
      errorEl.style.display = 'none';
      showDashboard();
      showToast('Login successful!');
    } else {
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.style.display = 'block';
  }
}

// Logout
async function handleLogout() {
  await apiCall('/api/logout', { method: 'POST' });
  localStorage.removeItem('adminToken');
  token = null;
  showLogin();
}

// Check auth
async function checkAuth() {
  try {
    const data = await apiCall('/api/auth-status');
    if (data.authenticated) {
      showDashboard();
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('dashboardPage').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('dashboardPage').style.display = 'flex';
  refreshStats();
  loadUsers();
}

// Navigation
function navigateTo(page) {
  currentPage = page;

  // Update sidebar active
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  document.querySelector(`.sidebar-nav a[data-page="${page}"]`)?.classList.add('active');

  // Show/hide pages
  document.getElementById('overviewPage').style.display = page === 'overview' ? 'block' : 'none';
  document.getElementById('usersPage').style.display = page === 'users' ? 'block' : 'none';
  document.getElementById('settingsPage').style.display = page === 'settings' ? 'block' : 'none';

  if (page === 'overview') refreshStats();
  if (page === 'users') loadUsers();
  if (page === 'settings') loadSettings();
}

// Stats
async function refreshStats() {
  try {
    const data = await apiCall('/api/stats');
    document.getElementById('statTotalUsers').textContent = data.totalUsers || 0;
    document.getElementById('statApproved').textContent = data.approvedUsers || 0;
    document.getElementById('statPending').textContent = data.pendingRequests || 0;
    document.getElementById('statRejected').textContent = data.rejectedRequests || 0;
    document.getElementById('statConversations').textContent = data.totalConversations || 0;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// Users
async function loadUsers(page = 1) {
  usersPage = page;
  const search = document.getElementById('userSearch')?.value || '';
  const status = document.getElementById('statusFilter')?.value || '';

  try {
    const params = new URLSearchParams({ page, limit: 20 });
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const data = await apiCall(`/api/users?${params}`);
    renderUsersTable(data.users);
    renderPagination(data);
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

function searchUsers() {
  loadUsers(1);
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');

  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => {
    let statusBadge = '';
    if (user.isOwner) statusBadge = '<span class="badge badge-owner">Owner</span>';
    else if (user.isApproved) statusBadge = '<span class="badge badge-approved">Approved</span>';
    else if (user.requestStatus === 'pending') statusBadge = '<span class="badge badge-pending">Pending</span>';
    else if (user.requestStatus === 'rejected') statusBadge = '<span class="badge badge-rejected">Rejected</span>';
    else statusBadge = '<span class="badge">New</span>';

    const modelName = user.selectedModel === 'default' ? 'Default' : user.selectedModel;

    let actions = '';
    if (!user.isOwner) {
      if (user.requestStatus === 'pending') {
        actions += `<button class="btn btn-sm btn-success" onclick="approveUser(${user.telegramId})" style="margin-right:4px;">✅</button>`;
        actions += `<button class="btn btn-sm btn-danger" onclick="rejectUser(${user.telegramId})" style="margin-right:4px;">❌</button>`;
      }
      if (user.isApproved) {
        actions += `<button class="btn btn-sm btn-warning" onclick="rejectUser(${user.telegramId})" style="margin-right:4px;">🚫</button>`;
      }
      if (user.requestStatus === 'rejected') {
        actions += `<button class="btn btn-sm btn-success" onclick="approveUser(${user.telegramId})" style="margin-right:4px;">✅</button>`;
      }
      actions += `<button class="btn btn-sm btn-primary" onclick="viewConversation(${user.telegramId})">💬</button>`;
      actions += `<button class="btn btn-sm btn-danger" onclick="deleteUser(${user.telegramId})" style="margin-left:4px;">🗑</button>`;
    }

    const date = new Date(user.createdAt).toLocaleDateString();

    return `
      <tr>
        <td>${user.firstName} ${user.lastName}</td>
        <td>@${user.username || 'N/A'}</td>
        <td><code>${user.telegramId}</code></td>
        <td>${statusBadge}</td>
        <td>${modelName}</td>
        <td>${date}</td>
        <td>${actions}</td>
      </tr>
    `;
  }).join('');
}

function renderPagination(data) {
  const pagination = document.getElementById('usersPagination');
  if (data.totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = '';
  html += `<button ${data.page <= 1 ? 'disabled' : ''} onclick="loadUsers(${data.page - 1})">← Prev</button>`;
  html += `<span class="page-info">Page ${data.page} of ${data.totalPages}</span>`;
  html += `<button ${data.page >= data.totalPages ? 'disabled' : ''} onclick="loadUsers(${data.page + 1})">Next →</button>`;

  pagination.innerHTML = html;
}

// User actions
async function approveUser(telegramId) {
  try {
    await apiCall(`/api/users/${telegramId}/approve`, { method: 'POST' });
    showToast('User approved!');
    loadUsers(usersPage);
    refreshStats();
  } catch (err) {
    showToast('Failed to approve user', 'error');
  }
}

async function rejectUser(telegramId) {
  try {
    await apiCall(`/api/users/${telegramId}/reject`, { method: 'POST' });
    showToast('User rejected');
    loadUsers(usersPage);
    refreshStats();
  } catch (err) {
    showToast('Failed to reject user', 'error');
  }
}

async function deleteUser(telegramId) {
  if (!confirm('Are you sure you want to delete this user and all their conversations?')) return;
  try {
    await apiCall(`/api/users/${telegramId}`, { method: 'DELETE' });
    showToast('User deleted');
    loadUsers(usersPage);
    refreshStats();
  } catch (err) {
    showToast('Failed to delete user', 'error');
  }
}

// Conversation modal
async function viewConversation(userId) {
  currentUserId = userId;
  try {
    const data = await apiCall(`/api/conversations/${userId}`);
    const content = document.getElementById('conversationContent');

    if (!data.messages || data.messages.length === 0) {
      content.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No conversation history</p>';
    } else {
      content.innerHTML = data.messages.map(msg => {
        const bg = msg.role === 'user' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)';
        const color = msg.role === 'user' ? '#60a5fa' : '#4ade80';
        const label = msg.role === 'user' ? 'User' : 'AI';
        const time = new Date(msg.timestamp).toLocaleString();
        return `
          <div style="background:${bg};padding:12px;border-radius:8px;margin-bottom:8px;border-left:3px solid ${color};">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <strong style="color:${color};">${label}</strong>
              <small style="color:#64748b;">${time}</small>
            </div>
            <div style="color:#e2e8f0;white-space:pre-wrap;">${escapeHtml(msg.content)}</div>
            ${msg.model ? `<small style="color:#64748b;">Model: ${msg.model}</small>` : ''}
          </div>
        `;
      }).join('');
    }

    document.getElementById('conversationModal').style.display = 'flex';
  } catch (err) {
    showToast('Failed to load conversation', 'error');
  }
}

async function clearConversation() {
  if (!currentUserId) return;
  if (!confirm('Clear all conversation history for this user?')) return;
  try {
    await apiCall(`/api/conversations/${currentUserId}`, { method: 'DELETE' });
    showToast('Conversation cleared');
    closeModal();
  } catch (err) {
    showToast('Failed to clear conversation', 'error');
  }
}

function closeModal() {
  document.getElementById('conversationModal').style.display = 'none';
  currentUserId = null;
}

// Settings
async function loadSettings() {
  try {
    const data = await apiCall('/api/settings');
    document.getElementById('modelGemini').checked = data.enabledModels?.gemini !== false;
    document.getElementById('modelOpenRouter').checked = data.enabledModels?.openrouter !== false;
    document.getElementById('modelNvidia').checked = data.enabledModels?.nvidia !== false;
    document.getElementById('defaultModel').value = data.defaultModel || 'gemini';
    document.getElementById('maxHistory').value = data.maxConversationHistory || 20;
    document.getElementById('welcomeMessage').value = data.welcomeMessage || '';
    document.getElementById('approvedMessage').value = data.approvedMessage || '';
    document.getElementById('rejectedMessage').value = data.rejectedMessage || '';
  } catch (err) {
    showToast('Failed to load settings', 'error');
  }
}

async function saveSettings() {
  const settings = {
    enabledModels: {
      gemini: document.getElementById('modelGemini').checked,
      openrouter: document.getElementById('modelOpenRouter').checked,
      nvidia: document.getElementById('modelNvidia').checked,
    },
    defaultModel: document.getElementById('defaultModel').value,
    maxConversationHistory: parseInt(document.getElementById('maxHistory').value) || 20,
    welcomeMessage: document.getElementById('welcomeMessage').value,
    approvedMessage: document.getElementById('approvedMessage').value,
    rejectedMessage: document.getElementById('rejectedMessage').value,
  };

  try {
    await apiCall('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    showToast('Settings saved successfully!');
  } catch (err) {
    showToast('Failed to save settings', 'error');
  }
}

// Utility
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.id === 'conversationModal') {
    closeModal();
  }
});