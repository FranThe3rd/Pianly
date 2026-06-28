import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  authApi,
  clearToken,
  getToken,
  isTokenExpired,
  parseJwt,
  setToken,
} from "../api/client";

const AuthContext = createContext(null);

function emailFromToken(token) {
  return parseJwt(token)?.sub ?? null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const applyToken = useCallback(async (token) => {
    if (!token || isTokenExpired(token)) {
      logout();
      return false;
    }

    setToken(token);
    const valid = await authApi.validateSession();
    if (!valid) {
      logout();
      return false;
    }

    setUser({ email: emailFromToken(token) });
    return true;
  }, [logout]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    applyToken(token).finally(() => setLoading(false));
  }, [applyToken]);

  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login(email, password);
      await applyToken(data.access_token);
    },
    [applyToken]
  );

  const register = useCallback(
    async (form) => {
      const data = await authApi.register(form);
      await applyToken(data.access_token);
    },
    [applyToken]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
