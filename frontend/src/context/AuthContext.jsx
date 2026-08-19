import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  // Fast instant boot: if no token or cached user exists, don't block the UI
  const [loading, setLoading] = useState(() => {
    const savedToken = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('current_user');
    return Boolean(savedToken && !savedUser);
  });

  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      if (token) {
        try {
          const profile = await api.getProfile();
          if (isMounted) {
            setUser(profile);
            localStorage.setItem('current_user', JSON.stringify(profile));
          }
        } catch (err) {
          // If explicitly unauthorized, log out; otherwise keep cached session
          if (err.message && err.message.includes('401')) {
            logout();
          }
        }
      }
      if (isMounted) setLoading(false);
    }
    loadUser();

    const handleLogout = () => logout();
    window.addEventListener('auth-logout', handleLogout);
    return () => {
      isMounted = false;
      window.removeEventListener('auth-logout', handleLogout);
    };
  }, [token]);

  const login = (authData) => {
    localStorage.setItem('access_token', authData.access_token);
    localStorage.setItem('current_user', JSON.stringify(authData.user));
    setToken(authData.access_token);
    setUser(authData.user);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    setToken(null);
    setUser(null);
  };

  const updateProfileState = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('current_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateProfileState }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
