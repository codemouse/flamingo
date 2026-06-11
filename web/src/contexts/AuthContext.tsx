import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  logout as apiLogout,
  me as apiMe,
  refresh as apiRefresh,
  type AuthUser,
} from "../api/auth";
import { setAccessToken, setUnauthenticatedHandler } from "../api/client";

interface AuthContextValue {
  user: AuthUser | null;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isHydrating: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  const signIn = useCallback((token: string, nextUser: AuthUser) => {
    setAccessToken(token);
    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // best-effort
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthenticatedHandler(() => setUser(null));

    let cancelled = false;
    (async () => {
      try {
        const tokens = await apiRefresh();
        if (cancelled) return;
        setAccessToken(tokens.accessToken);
        const profile = tokens.user ?? (await apiMe());
        if (!cancelled) setUser(profile);
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signOut,
        isAuthenticated: !!user,
        isHydrating,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
