const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const api = {
  auth: {
    signup: (body: { username: string; email: string; password: string }) =>
      request<{ token: string; user: { id: number; username: string; email: string } }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    login: (body: { email: string; password: string }) =>
      request<{ token: string; user: { id: number; username: string; email: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    me: () => request<{ id: number; username: string; email: string }>('/auth/me'),
  },
  rooms: {
    create: (name: string) => request('/rooms', { method: 'POST', body: JSON.stringify({ name }) }),
    join: (code: string) => request('/rooms/join', { method: 'POST', body: JSON.stringify({ code }) }),
    list: () => request('/rooms'),
    get: (id: number) => request(`/rooms/${id}`),
    members: (id: number) => request(`/rooms/${id}/members`),
    updateStatus: (id: number, status: string) =>
      request(`/rooms/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    leave: (id: number) => request(`/rooms/${id}/leave`, { method: 'DELETE' }),
  },
  movies: {
    list: () => request('/movies'),
    swipe: (roomId: number, movieId: number, direction: 'like' | 'dislike') =>
      request(`/rooms/${roomId}/swipe`, { method: 'POST', body: JSON.stringify({ movieId, direction }) }),
    matches: (roomId: number) => request(`/rooms/${roomId}/matches`),
  },
};
