import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api",
  timeout: 10000,
});

// ── Bootstrap auth header synchronously ──────────────────────────────────────
// Set it from localStorage at module-load time so the very first API calls
// (fired by React Query before useEffect runs) are already authenticated.
// Without this, queries fire before AuthContext.useEffect → 401 → logout loop.
const _t = localStorage.getItem("zn_token");
if (_t) api.defaults.headers.common["Authorization"] = `Bearer ${_t}`;

// ── 401 guardrail — soft expiry, NOT a hard redirect ─────────────────────────
// A hard window.location redirect clears React state and forces an OTP even
// when the user has a valid token that just wasn't sent on that one call.
// Instead: clear stored credentials and fire a custom event so any mounted
// UI can show a "session expired" prompt without losing the current page.
api.interceptors.response.use(
  res => res,
  err => {
    const is401 = err.response?.status === 401;
    const isAuthEndpoint = err.config?.url?.includes("/auth/");
    if (is401 && !isAuthEndpoint) {
      const hadToken = !!localStorage.getItem("zn_token");
      localStorage.removeItem("zn_token");
      localStorage.removeItem("zn_user");
      delete api.defaults.headers.common["Authorization"];
      // Only fire the event if the user was actually signed in — not on
      // anonymous 401s (e.g. browsing a protected page while logged out).
      if (hadToken) {
        window.dispatchEvent(new CustomEvent("zn:session-expired"));
      } else if (window.location.pathname !== "/login") {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
