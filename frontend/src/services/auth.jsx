/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('extensio_token'));
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem('extensio_token');
    setToken(null);
    setUser(null);
    setSubscription(null);
  }, []);

  useEffect(() => {
    if (!token) return;
    apiRequest('/api/auth/me', { token })
      .then(data => {
        setUser(data.user);
        setSubscription(data.subscription);
      })
      .catch(() => logout());
  }, [logout, token]);

  const saveSession = useCallback((data) => {
    localStorage.setItem('extensio_token', data.token);
    setToken(data.token);
    setUser(data.user);
    if (data.subscription !== undefined) setSubscription(data.subscription);
  }, []);

  const login = useCallback(async (email, password) => {
    saveSession(await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }));
  }, [saveSession]);

  const register = useCallback(async (name, email, password) => {
    saveSession(await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }));
  }, [saveSession]);

  const acceptOAuthToken = useCallback(async (oauthToken) => {
    const data = await apiRequest('/api/auth/me', { token: oauthToken });
    saveSession({ token: oauthToken, user: data.user, subscription: data.subscription });
  }, [saveSession]);

  const updateProfile = useCallback(async (profile) => {
    const data = await apiRequest('/api/auth/me', {
      token,
      method: 'PATCH',
      body: JSON.stringify(profile),
    });
    saveSession({ token: data.token, user: data.user });
  }, [saveSession, token]);

  const value = useMemo(() => ({
    token,
    user,
    subscription,
    setSubscription,
    login,
    register,
    acceptOAuthToken,
    updateProfile,
    logout,
  }), [acceptOAuthToken, login, logout, register, subscription, token, updateProfile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
