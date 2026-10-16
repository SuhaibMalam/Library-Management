import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const saveSession = ({ token, user }) => {
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const value = {
    user,
    loading,
    isStaff: user?.role === 'admin' || user?.role === 'librarian',
    login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }).then(saveSession),
    register: (form) => api('/auth/register', { method: 'POST', body: form }).then(saveSession),
    logout: () => {
      localStorage.removeItem('token');
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
