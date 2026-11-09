import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolves the backend URL.
 *
 * Priority:
 *  1. EXPO_PUBLIC_API_URL (set this for production or a deployed backend)
 *  2. The Expo dev-server host (so a real phone on the same Wi-Fi can reach
 *     the laptop running the API)
 *  3. localhost (web / simulator)
 */
function resolveBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const host = String(hostUri).split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:4000`;
    }
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:4000`;
  }

  return `http://localhost:4000`;
}

export const API_BASE_URL = resolveBaseUrl();

const TOKEN_KEY = '@solace_auth_token';
let memoryToken = null;

export async function getToken() {
  if (memoryToken) return memoryToken;
  memoryToken = await AsyncStorage.getItem(TOKEN_KEY);
  return memoryToken;
}

export async function setToken(token) {
  memoryToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

const REQUEST_TIMEOUT = 60000;

async function request(path, { method = 'GET', body, auth = true, timeout = REQUEST_TIMEOUT } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller?.signal,
    });
  } catch (error) {
    const aborted = error?.name === 'AbortError';
    const wrapped = new Error(
      aborted
        ? "Solace's server is taking a while to wake up. Try once more in a moment."
        : `Can't reach Solace's server at ${API_BASE_URL}. Check your connection and try again.`
    );
    wrapped.offline = true;
    throw wrapped;
  } finally {
    if (timer) clearTimeout(timer);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const authApi = {
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload, auth: false }),
  guest: (name) => request('/api/auth/guest', { method: 'POST', body: { name }, auth: false }),
  me: () => request('/api/auth/me'),
  updateName: (name) => request('/api/auth/me', { method: 'PATCH', body: { name } }),
};

/** Returns the logged-in user, creating a guest session if needed. */
export async function ensureSession(name) {
  const existing = await getToken();

  if (existing) {
    try {
      const { user } = await authApi.me();
      return user;
    } catch (error) {
      if (error.status !== 401) throw error;
      await setToken(null);
    }
  }

  const session = await authApi.guest(name);
  await setToken(session.token);
  return session.user;
}

export const chatApi = {
  send: (payload) => request('/api/chat', { method: 'POST', body: payload }),
};

export const conversationsApi = {
  list: () => request('/api/conversations'),
  get: (id) => request(`/api/conversations/${id}`),
  create: (title) => request('/api/conversations', { method: 'POST', body: { title } }),
  rename: (id, title) => request(`/api/conversations/${id}`, { method: 'PATCH', body: { title } }),
  remove: (id) => request(`/api/conversations/${id}`, { method: 'DELETE' }),
};

export const moodsApi = {
  save: (mood, note) => request('/api/moods', { method: 'POST', body: { mood, note } }),
  list: (limit = 30) => request(`/api/moods?limit=${limit}`),
  today: () => request('/api/moods/today'),
};

export const insightsApi = {
  get: () => request('/api/insights'),
};

/** Formats a SQLite UTC timestamp for display in the user's local time. */
export function formatServerTime(value) {
  if (!value) return '';
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
