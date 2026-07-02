import { createContext, useContext, useState, useEffect } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "zn_token";
const USER_KEY  = "zn_user";

function loadUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(loadUser);
  const [token, setToken]         = useState(() => localStorage.getItem(TOKEN_KEY));
  const [sessionExpired, setSessionExpired] = useState(false);

  // Keep the axios header in sync whenever token changes
  useEffect(() => {
    if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    else        delete api.defaults.headers.common["Authorization"];
  }, [token]);

  // Listen for the soft 401 event fired by the interceptor
  useEffect(() => {
    function onExpired() {
      setUser(null);
      setToken(null);
      setSessionExpired(true);
    }
    window.addEventListener("zn:session-expired", onExpired);
    return () => window.removeEventListener("zn:session-expired", onExpired);
  }, []);

  function setAuth(data) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY,  JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    setSessionExpired(false);
    api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
    window.dispatchEvent(new Event("zn:login"));
  }

  function updateUser(updates) {
    const next = { ...user, ...updates };
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    setUser(next);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setSessionExpired(false);
    delete api.defaults.headers.common["Authorization"];
    window.dispatchEvent(new Event("zn:logout"));
  }

  return (
    <AuthContext.Provider value={{ user, token, setAuth, updateUser, logout, isLoggedIn: !!user, sessionExpired, setSessionExpired }}>
      {sessionExpired && <SessionExpiredOverlay onSignIn={() => setSessionExpired(false)} />}
      {children}
    </AuthContext.Provider>
  );
}

function SessionExpiredOverlay({ onSignIn }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(43,33,24,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#FFF8EF", borderRadius: "20px", padding: "32px 28px", maxWidth: "360px", width: "100%", textAlign: "center", boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#F4DFA4", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D8B45C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <p style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#2B2118", marginBottom: "8px", fontWeight: "600" }}>Session Expired</p>
        <p style={{ fontSize: "13px", color: "#8A7A6A", marginBottom: "24px", lineHeight: "1.5" }}>
          Your session timed out. Sign in again to continue — your cart and wishlist are safe.
        </p>
        <a href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
          onClick={onSignIn}
          style={{ display: "block", width: "100%", padding: "12px", borderRadius: "50px", background: "#2B2118", color: "#FFF8EF", fontSize: "14px", fontWeight: "600", textDecoration: "none", marginBottom: "10px" }}>
          Sign In Again
        </a>
        <button onClick={onSignIn}
          style={{ background: "none", border: "none", fontSize: "13px", color: "#8A7A6A", cursor: "pointer", textDecoration: "underline" }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

export const useAuth = () => useContext(AuthContext);
