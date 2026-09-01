const API_BASE = import.meta.env.VITE_API_URL || '';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: { id: number; username: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, email: string, password: string) =>
    request<{ token: string; user: { id: number; username: string } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  me: () => request<{ user: { id: number; username: string } }>('/api/auth/me'),

  saveScore: (data: {
    difficulty: string;
    score: number;
    timeMs: number;
    attemptsLeft: number;
    won: boolean;
    mode: string;
  }) =>
    request('/api/scores', { method: 'POST', body: JSON.stringify(data) }),

  getLeaderboard: (difficulty?: string) =>
    request<{ scores: LeaderboardEntry[] }>(
      `/api/scores/leaderboard${difficulty ? `?difficulty=${difficulty}` : ''}`,
    ),

  getMyScores: () => request<{ scores: ScoreEntry[] }>('/api/scores/my'),
};

export interface LeaderboardEntry {
  id: number;
  username: string;
  difficulty: string;
  score: number;
  time_ms: number;
  attempts_left: number;
  mode: string;
  created_at: string;
}

export interface ScoreEntry {
  id: number;
  difficulty: string;
  score: number;
  time_ms: number;
  attempts_left: number;
  won: boolean;
  mode: string;
  created_at: string;
}
