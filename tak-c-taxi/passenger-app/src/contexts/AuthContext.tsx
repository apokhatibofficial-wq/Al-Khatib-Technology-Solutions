import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { setAccessToken } from "../api/client";
import {
  verifyOtp as apiVerifyOtp,
  me as apiMe,
  logout as apiLogout,
  type Me,
  type RegistrationFields,
} from "../api/auth";
import { refresh as apiRefresh } from "../api/session";

interface AuthState {
  user: Me | null;
  loading: boolean;
  restoring: boolean;
  verifyOtp: (email: string, code: string, fields: RegistrationFields) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);

  // On load, try to resume a session from the httpOnly refresh cookie
  // (server.ts) rather than forcing a fresh login on every page reload —
  // a 401 here just means "not logged in," not an error.
  useEffect(() => {
    void (async () => {
      try {
        const { accessToken } = await apiRefresh();
        setAccessToken(accessToken);
        setUser(await apiMe());
      } catch {
        setAccessToken(null);
      } finally {
        setRestoring(false);
      }
    })();
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string, fields: RegistrationFields) => {
    setLoading(true);
    try {
      const { accessToken } = await apiVerifyOtp(email, code, fields);
      setAccessToken(accessToken);
      const fullMe = await apiMe();
      setUser(fullMe);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout().catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }, []);

  // After PATCH /me (profile edits) — nothing else re-fetches /me, so the
  // updated name/phone/photo would otherwise only show up after a reload.
  const refreshMe = useCallback(async () => {
    setUser(await apiMe());
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, restoring, verifyOtp, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
