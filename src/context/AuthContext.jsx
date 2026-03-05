import { createContext, useContext, useState, useCallback } from 'react';
import { getUserByCredentials } from '../lib/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('kpi_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((userId, password) => {
    const found = getUserByCredentials(userId, password);
    if (found) {
      setUser(found);
      sessionStorage.setItem('kpi_current_user', JSON.stringify(found));
      return { success: true };
    }
    return { success: false, error: 'Invalid User ID or Password' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('kpi_current_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
