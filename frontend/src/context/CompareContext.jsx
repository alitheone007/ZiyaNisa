import { createContext, useContext, useState, useCallback } from "react";

const MAX = 3;
const KEY = "zn_compare";

function load() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "[]"); } catch { return []; }
}

const CompareContext = createContext(null);

export function CompareProvider({ children }) {
  const [items, setItems] = useState(load);

  const add = useCallback((product) => {
    setItems(prev => {
      if (prev.find(p => p.id === product.id)) return prev;
      if (prev.length >= MAX) return prev;
      const next = [...prev, product];
      sessionStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const remove = useCallback((id) => {
    setItems(prev => {
      const next = prev.filter(p => p.id !== id);
      sessionStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggle = useCallback((product) => {
    setItems(prev => {
      const exists = prev.find(p => p.id === product.id);
      let next;
      if (exists) {
        next = prev.filter(p => p.id !== product.id);
      } else {
        if (prev.length >= MAX) return prev;
        next = [...prev, product];
      }
      sessionStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    sessionStorage.removeItem(KEY);
  }, []);

  const isComparing = useCallback((id) => items.some(p => p.id === id), [items]);

  return (
    <CompareContext.Provider value={{ items, add, remove, toggle, clear, isComparing, isFull: items.length >= MAX }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used inside CompareProvider");
  return ctx;
}
