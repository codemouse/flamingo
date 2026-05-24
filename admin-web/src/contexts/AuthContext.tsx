import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AuthUser } from '../types/user';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('admin_access_token'),
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('admin_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });

  const signIn = (t: string, u: AuthUser) => {
    localStorage.setItem('admin_access_token', t);
    localStorage.setItem('admin_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const signOut = () => {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, signIn, signOut, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
