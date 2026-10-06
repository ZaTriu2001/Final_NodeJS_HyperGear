import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);

function readStoredCart() {
  try {
    return JSON.parse(localStorage.getItem('hypergear-cart')) ?? [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart);

  useEffect(() => {
    localStorage.setItem('hypergear-cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product, variant) => {
    const key = `${product.id}:${variant.sku}`;
    setItems((current) => {
      const found = current.find((item) => item.key === key);
      if (found) {
        return current.map((item) =>
          item.key === key
            ? { ...item, quantity: Math.min(item.quantity + 1, variant.stock) }
            : item,
        );
      }
      return [...current, { key, product, variant, quantity: 1 }];
    });
  };

  const updateQuantity = (key, quantity) => {
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.variant.stock)) }
          : item,
      ),
    );
  };

  const removeItem = (key) => setItems((current) => current.filter((item) => item.key !== key));
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);

  const value = { items, addItem, updateQuantity, removeItem, count, subtotal };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
