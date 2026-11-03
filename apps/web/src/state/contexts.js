import { createContext, useContext } from 'react';
// Shared contexts keep providers and lazy-loaded screens on the same React instance.
export const AuthContext = createContext(null);
export const CartContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export const useCart = () => useContext(CartContext);
