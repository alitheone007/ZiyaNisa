import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api",
  timeout: 10000,
});

// Set the auth header synchronously from localStorage so the very first
// API calls on page load (fired by useQuery before useEffect runs) are
// authenticated. Without this, React renders + fires queries before
// AuthContext's useEffect has a chance to set the header → 401 → logout.
const _t = localStorage.getItem("zn_token");
if (_t) api.defaults.headers.common["Authorization"] = `Bearer ${_t}`;

// On 401 (expired/invalid token), clear auth state and send to login.
// Skip if we're already on an auth endpoint to avoid redirect loops.
api.interceptors.response.use(
  res => res,
  err => {
    const is401 = err.response?.status === 401;
    const isAuthEndpoint = err.config?.url?.includes("/auth/");
    if (is401 && !isAuthEndpoint) {
      localStorage.removeItem("zn_token");
      localStorage.removeItem("zn_user");
      delete api.defaults.headers.common["Authorization"];
      if (window.location.pathname !== "/login") {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
