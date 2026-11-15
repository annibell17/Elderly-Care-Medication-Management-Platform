const API_BASE = '/api/v1';

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('carecircle_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is FormData, don't set Content-Type header (browser will set it with boundary)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Authentication & Demo Switch
  auth: {
    login: (data: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: any) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => apiRequest('/auth/me'),
    demoSwitch: (role: string) => apiRequest(`/auth/demo-switch?role=${role}`, { method: 'POST' }),
  },

  // Medications
  medications: {
    list: (includeDiscontinued = false) => apiRequest(`/medications?include_discontinued=${includeDiscontinued}`),
    create: (data: any) => apiRequest('/medications', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiRequest(`/medications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    discontinue: (id: string, reason: string) => apiRequest(`/medications/${id}/discontinue`, { method: 'POST', body: JSON.stringify({ reason }) }),
    today: () => apiRequest('/medications/today'),
    confirmDose: (doseId: string, data: { status: string; confirmation_method: string; notes?: string }) =>
      apiRequest(`/medications/doses/${doseId}/confirm`, { method: 'POST', body: JSON.stringify(data) }),
  },

  // Appointments
  appointments: {
    list: () => apiRequest('/appointments'),
    create: (data: any) => apiRequest('/appointments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiRequest(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    cancel: (id: string) => apiRequest(`/appointments/${id}`, { method: 'DELETE' }),
    doctors: () => apiRequest('/appointments/doctors'),
    createDoctor: (data: any) => apiRequest('/appointments/doctors', { method: 'POST', body: JSON.stringify(data) }),
    preBriefing: (id: string) => apiRequest(`/appointments/${id}/pre-briefing`),
    toggleShareBriefing: (id: string, share: boolean) => apiRequest(`/appointments/${id}/toggle-share?share=${share}`, { method: 'POST' }),
  },

  // Care Network
  careNetwork: {
    members: () => apiRequest('/care-network/members'),
    invite: (data: any) => apiRequest('/care-network/invite', { method: 'POST', body: JSON.stringify(data) }),
    acceptInvite: (invite_code: string) => apiRequest('/care-network/accept-invite', { method: 'POST', body: JSON.stringify({ invite_code }) }),
    updatePermissions: (networkId: string, perms: any) => apiRequest(`/care-network/permissions/${networkId}`, { method: 'PUT', body: JSON.stringify(perms) }),
    revoke: (networkId: string) => apiRequest(`/care-network/members/${networkId}`, { method: 'DELETE' }),
    handoverLogs: () => apiRequest('/care-network/handover-logs'),
    createHandoverLog: (data: any) => apiRequest('/care-network/handover-logs', { method: 'POST', body: JSON.stringify(data) }),
    observations: () => apiRequest('/care-network/observations'),
    createObservation: (data: any) => apiRequest('/care-network/observations', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Care Intelligence Engine
  intelligence: {
    analytics: (days = 30) => apiRequest(`/intelligence/analytics?days=${days}`),
    escalations: () => apiRequest('/intelligence/escalations'),
    acknowledgeEscalation: (id: string, notes?: string) => apiRequest(`/intelligence/escalations/${id}/acknowledge`, { method: 'POST', body: JSON.stringify({ notes }) }),
    resolveEscalation: (id: string, data: any) => apiRequest(`/intelligence/escalations/${id}/resolve`, { method: 'POST', body: JSON.stringify(data) }),
    triggerLoopCycle: () => apiRequest('/intelligence/trigger-loop-cycle', { method: 'POST' }),
  },

  // Prescription OCR
  ocr: {
    upload: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest('/ocr/upload-prescription', { method: 'POST', body: formData });
    },
    activateDraft: (medication: any) => apiRequest('/ocr/activate-draft', { method: 'POST', body: JSON.stringify({ medication }) }),
  },

  // Notifications & Demo Mailbox
  notifications: {
    list: (limit = 20) => apiRequest(`/notifications?limit=${limit}`),
    mailbox: (limit = 20) => apiRequest(`/notifications/mailbox?limit=${limit}`),
    markRead: (id: string) => apiRequest(`/notifications/mark-read/${id}`, { method: 'POST' }),
    testSend: (data: any) => apiRequest('/notifications/test-send', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Health Continuity
  health: {
    profile: () => apiRequest('/health/profile'),
    updateProfile: (data: any) => apiRequest('/health/profile', { method: 'PUT', body: JSON.stringify(data) }),
    timeline: (limit = 40) => apiRequest(`/health/timeline?limit=${limit}`),
    summaryReport: (days = 30) => apiRequest(`/health/summary-report?days=${days}`),
    documents: () => apiRequest('/health/documents'),
  }
};
