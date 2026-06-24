import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

const WishlistContext = createContext(null);
const STORAGE_KEY = "zn_wishlist";
const TOKEN_KEY   = "zn_token";

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(loadLocal);

  // Keep localStorage in sync (guest fallback + offline)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const syncFromBackend = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    try {
      const res = await api.get("/wishlist");
      if (Array.isArray(res.data)) setItems(res.data);
    } catch { /* keep local items */ }
  }, []);

  // Hydrate from backend on mount (if already logged in)
  useEffect(() => { syncFromBackend(); }, [syncFromBackend]);

  // React to login / logout events fired by AuthContext
  useEffect(() => {
    const onLogin  = () => syncFromBackend();
    const onLogout = () => { setItems([]); localStorage.removeItem(STORAGE_KEY); };
    window.addEventListener("zn:login",  onLogin);
    window.addEventListener("zn:logout", onLogout);
    return () => {
      window.removeEventListener("zn:login",  onLogin);
      window.removeEventListener("zn:logout", onLogout);
    };
  }, [syncFromBackend]);

  const isWishlisted = (id) => items.some((i) => i.id === id);

  const toggle = async (item) => {
    // Optimistic update first
    setItems((prev) =>
      prev.some((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );

    if (!localStorage.getItem(TOKEN_KEY)) return; // guest: localStorage only

    try {
      await api.post(`/wishlist/toggle/${item.id}`, { product: item });
    } catch {
      await syncFromBackend(); // revert on failure
    }
  };

  // Call on logout so next user doesn't see previous user's wishlist
  const clearWishlist = () => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <WishlistContext.Provider value={{ items, isWishlisted, toggle, clearWishlist, syncFromBackend }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
