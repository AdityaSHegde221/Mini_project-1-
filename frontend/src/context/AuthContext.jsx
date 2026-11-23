import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('procurement_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on refresh
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('procurement_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          setProfile(res.data.profile);
        } catch (err) {
          console.warn('Session expired or invalid, logging out.');
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, portalRole) => {
    const res = await api.post('/auth/login', { email, password, portalRole });
    const { token: receivedToken, user: receivedUser, profile: receivedProfile } = res.data;

    localStorage.setItem('procurement_token', receivedToken);
    localStorage.setItem('procurement_user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);
    setProfile(receivedProfile);

    return receivedUser;
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    const { token: receivedToken, user: receivedUser } = res.data;

    localStorage.setItem('procurement_token', receivedToken);
    localStorage.setItem('procurement_user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);

    return receivedUser;
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('procurement_token');
      localStorage.removeItem('procurement_user');
      setToken(null);
      setUser(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, token, role: user?.role, loading, login, register, logout, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
