const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api/v1`
  : '/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    window.dispatchEvent(new Event('auth-logout'));
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Network request failed' }));
    throw new Error(errorData.detail || 'An unexpected error occurred');
  }

  // Handle binary PDF downloads
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    return response.blob();
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
  addMember: (groupId, data) => request(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  removeMember: (groupId, userId) => request(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
  updateDeposit: (groupId, data) => request(`/groups/${groupId}/deposit`, { method: 'POST', body: JSON.stringify(data) }),
  getGroupBalances: (groupId) => request(`/groups/${groupId}/balances`),

  // Expenses
  getExpenses: (groupId, category) => request(`/expenses/${groupId}${category ? `?category=${category}` : ''}`),
  createExpense: (groupId, data) => request(`/expenses/?group_id=${groupId}`, { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  getExpenseAnalytics: (groupId) => request(`/expenses/${groupId}/analytics`),

  // Meals
  getMealMatrix: (groupId) => request(`/meals/${groupId}/matrix`),
  recordSingleMeal: (groupId, data) => request(`/meals/${groupId}/single`, { method: 'POST', body: JSON.stringify(data) }),
  recordBulkMeals: (groupId, data) => request(`/meals/${groupId}/bulk`, { method: 'POST', body: JSON.stringify(data) }),

  // Settlements
  getSettlements: (groupId) => request(`/settlements/${groupId}`),
  recordSettlement: (groupId, data) => request(`/settlements/?group_id=${groupId}`, { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  downloadPDF: async (groupId, groupName) => {
    const blob = await request(`/reports/${groupId}/pdf`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${groupName.replace(/\s+/g, '_')}_Audit_Report.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Admin
  getAdminStats: () => request('/admin/stats'),
  getAdminUsers: () => request('/admin/users'),
  toggleAdminRole: (userId) => request(`/admin/users/${userId}/toggle-admin`, { method: 'POST' })
};
