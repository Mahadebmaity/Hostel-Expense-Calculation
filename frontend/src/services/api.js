const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const getFallbackApiUrl = () => {
  if (isLocal) {
    return 'http://127.0.0.1:8000/api/v1';
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin.replace(/\/+$/, '')}/api/v1`;
  }
  return 'https://hostel-expense-calculation-manager.onrender.com/api/v1';
};

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api/v1`
  : getFallbackApiUrl();

// Retries up to 12 attempts (12 x 3s = 36s) to allow Render free instances to wake up from sleep mode
async function request(endpoint, options = {}, retries = 12, delay = 3000) {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
      // If server returns 502/503/504 (Render waking up / starting container), retry
      if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt < retries) {
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      break; // Success or standard HTTP response
    } catch (networkError) {
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      throw new Error(
        'Unable to reach backend server. If running locally, ensure your FastAPI backend is running. If on cloud (Render), please wait 20-30 seconds for the free backend instance to wake up from sleep mode and try again.'
      );
    }
  }

  if (response.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    window.dispatchEvent(new Event('auth-logout'));
  }

  if (!response.ok) {
    let errorMessage = 'An unexpected server error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch (_) {
      const text = await response.text().catch(() => '');
      if (text) {
        errorMessage = `Server Error (${response.status}): ${text.slice(0, 150)}`;
      }
    }
    throw new Error(errorMessage);
  }

  // Handle binary PDF downloads
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/pdf')) {
    return response.blob();
  }

  // Handle accidental HTML response (e.g., static server fallback when backend URL is missing)
  if (contentType.includes('text/html')) {
    throw new Error(
      'Received HTML instead of JSON from API. Ensure your backend FastAPI service is running and VITE_API_URL is properly configured.'
    );
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),

  // Groups
  getGroups: () => request('/groups/'),
  getGroup: (id) => request(`/groups/${id}`),
  createGroup: (data) => request('/groups/', { method: 'POST', body: JSON.stringify(data) }),
  updateGroup: (id, data) => request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGroup: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
  addMember: (groupId, data) => request(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  removeMember: (groupId, identifier) => request(`/groups/${groupId}/members/${identifier}`, { method: 'DELETE' }),
  updateDeposit: (groupId, data) => request(`/groups/${groupId}/deposit`, { method: 'POST', body: JSON.stringify(data) }),
  getGroupBalances: (groupId, startDate, endDate) => {
    let url = `/groups/${groupId}/balances`;
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length) url += `?${params.join('&')}`;
    return request(url);
  },
  saveScoreboard: (groupId, data) => request(`/groups/${groupId}/scoreboards`, { method: 'POST', body: JSON.stringify(data) }),
  getScoreboards: (groupId) => request(`/groups/${groupId}/scoreboards`),
  deleteScoreboard: (groupId, sbId) => request(`/groups/${groupId}/scoreboards/${sbId}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: (groupId, category) => request(`/expenses/${groupId}${category ? `?category=${category}` : ''}`),
  createExpense: (groupId, data) => request(`/expenses/?group_id=${groupId}`, { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  getExpenseAnalytics: (groupId) => request(`/expenses/${groupId}/analytics`),

  // Meals
  getMealMatrix: (groupId) => request(`/meals/${groupId}/matrix`),
  recordSingleMeal: (groupId, data) => request(`/meals/${groupId}/single`, { method: 'POST', body: JSON.stringify(data) }),
  recordBulkMeals: (groupId, data) => request(`/meals/${groupId}/bulk`, { method: 'POST', body: JSON.stringify(data) }),
  recordMonthlySummaryMeals: (groupId, data) => request(`/meals/${groupId}/monthly-summary`, { method: 'POST', body: JSON.stringify(data) }),

  // Settlements
  getSettlements: (groupId) => request(`/settlements/${groupId}`),
  recordSettlement: (groupId, data) => request(`/settlements/?group_id=${groupId}`, { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  downloadPDF: async (groupId, groupName) => {
    const blob = await request(`/reports/${groupId}/pdf`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${groupName.replace(/\s+/g, '_')}_ScoreBoard_Audit_Report.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Admin
  getAdminStats: () => request('/admin/stats'),
  getAdminUsers: () => request('/admin/users'),
  toggleAdminRole: (userId) => request(`/admin/users/${userId}/toggle-admin`, { method: 'POST' }),

  // Health / Warmup
  warmup: () => fetch(`${API_BASE_URL}/health`).catch(() => {})
};

// Non-blocking warmup ping on initial frontend load
try {
  api.warmup();
} catch (_) {}
