import { createContext, useContext, useState, useEffect } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "zn_token";
const USER_KEY  = "zn_user";

function loadUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(loadUser);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    else        delete api.defaults.headers.common["Authorization"];
  }, [token]);

  function setAuth(data) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY,  JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
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
    delete api.defaults.headers.common["Authorization"];
    window.dispatchEvent(new Event("zn:logout"));
  }

  return (
    <AuthContext.Provider value={{ user, token, setAuth, updateUser, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
