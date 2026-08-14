const BASE_URL = '/v1/admin';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    ...options,
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message ?? 'Request failed');
  }
  return data.data;
}

// --- Auth ---
export async function loginAdmin(phone: string, code: string) {
  const res = await fetch('/v1/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  const data = await res.json();
  if (data.success && data.data.user.role === 'admin') {
    localStorage.setItem('admin_token', data.data.token);
    return data.data;
  }
  throw new Error('Akses ditolak. Hanya admin yang bisa login.');
}

export function logoutAdmin() {
  localStorage.removeItem('admin_token');
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem('admin_token');
}

// --- Workers ---
export function fetchPendingWorkers() {
  return request<any[]>('/workers/pending');
}

export function fetchAllWorkers() {
  return request<any[]>('/workers/all');
}

export function verifyWorker(userId: string) {
  return request(`/workers/${userId}/verify`, { method: 'POST' });
}

export function suspendWorker(userId: string) {
  return request(`/workers/${userId}/suspend`, { method: 'POST' });
}

export function reactivateWorker(userId: string) {
  return request(`/workers/${userId}/reactivate`, { method: 'POST' });
}

// --- Orders ---
export function fetchOrders(status?: string) {
  const query = status ? `?status=${status}` : '';
  return request<any[]>(`/orders${query}`);
}

export function forceTransition(orderId: string, toStatus: string, note?: string) {
  return request(`/orders/${orderId}/force-transition`, {
    method: 'POST',
    body: JSON.stringify({ to_status: toStatus, note }),
  });
}

export function resolveDispute(orderId: string, resolution: string, refund: boolean) {
  return request(`/orders/${orderId}/dispute-resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolution, refund }),
  });
}

// --- Reports ---
export function fetchReportSummary() {
  return request<any>('/reports/summary');
}
