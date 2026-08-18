import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { BACKEND_URL } from "../config.js";

const TOKEN_KEY = "vastu360_auth_token";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistToken = useCallback((newToken) => {
    setToken(newToken);
    try {
      if (newToken) localStorage.setItem(TOKEN_KEY, newToken);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // localStorage unavailable (private browsing) — session just won't persist across reloads
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      if (!token) { setLoading(false); return; }
      try {
        const response = await fetch(`${BACKEND_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("session expired");
        const result = await response.json();
        if (!cancelled) setUser(result.user);
      } catch {
        if (!cancelled) persistToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMe();
    return () => { cancelled = true; };
  }, [token, persistToken]);

  async function signup({ name, email, password }) {
    const response = await fetch(`${BACKEND_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Could not create account.");
    persistToken(result.token);
    setUser(result.user);
    return result.user;
  }

  async function login({ email, password }) {
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Could not log in.");
    persistToken(result.token);
    setUser(result.user);
    return result.user;
  }

  async function logout() {
    if (token) {
      fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    persistToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
