import { createContext, useContext, useReducer } from "react";

const CartContext = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const existing = state.find((i) => i.id === action.item.id);
      if (existing) {
        return state.map((i) =>
          i.id === action.item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...state, { ...action.item, qty: 1 }];
    }
    case "REMOVE":
      return state.filter((i) => i.id !== action.id);
    case "UPDATE_QTY":
      return state.map((i) =>
        i.id === action.id ? { ...i, qty: action.qty } : i
      );
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, []);

  const addToCart = (item) => dispatch({ type: "ADD", item });
  const removeFromCart = (id) => dispatch({ type: "REMOVE", id });
  const updateQty = (id, qty) => {
    if (qty < 1) dispatch({ type: "REMOVE", id });
    else dispatch({ type: "UPDATE_QTY", id, qty });
  };
  const clearCart = () => dispatch({ type: "CLEAR" });

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQty, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
