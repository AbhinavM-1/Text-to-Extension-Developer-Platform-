import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('extensio_token'));
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (!token) return;
    apiRequest('/api/auth/me', { token })
      .then(data => {
        setUser(data.user);
        setSubscription(data.subscription);
      })
      .catch(() => logout());
  }, [token]);

  function saveSession(data) {
    localStorage.setItem('extensio_token', data.token);
    setToken(data.token);
    setUser(data.user);
    if (data.subscription !== undefined) setSubscription(data.subscription);
  }

  async function login(email, password) {
    saveSession(await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }));
  }

  async function register(name, email, password) {
    saveSession(await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }));
  }

  async function acceptOAuthToken(oauthToken) {
    const data = await apiRequest('/api/auth/me', { token: oauthToken });
    saveSession({ token: oauthToken, user: data.user, subscription: data.subscription });
  }

  function logout() {
    localStorage.removeItem('extensio_token');
    setToken(null);
    setUser(null);
    setSubscription(null);
  }

  const value = useMemo(() => ({
    token,
    user,
    subscription,
    setSubscription,
    login,
    register,
    acceptOAuthToken,
    logout,
  }), [token, user, subscription]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
