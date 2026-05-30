const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function downloadUrl(path) {
  if (!path) return '#';
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
}

export async function apiRequest(path, { token, ...options } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(body?.message || body?.error || 'Request failed');
  }

  return body;
}
