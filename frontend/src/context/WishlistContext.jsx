import { createContext, useContext, useState, useEffect } from "react";

const WishlistContext = createContext(null);
const STORAGE_KEY = "zn_wishlist";

function loadWishlist() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(loadWishlist);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToWishlist = (item) =>
    setItems((prev) =>
      prev.find((i) => i.id === item.id) ? prev : [...prev, item]
    );

  const removeFromWishlist = (id) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const isWishlisted = (id) => items.some((i) => i.id === id);

  const toggle = (item) =>
    isWishlisted(item.id) ? removeFromWishlist(item.id) : addToWishlist(item);

  return (
    <WishlistContext.Provider
      value={{ items, addToWishlist, removeFromWishlist, isWishlisted, toggle }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
