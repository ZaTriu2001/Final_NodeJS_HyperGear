import { createContext, useContext } from 'react';
export const AuthContext = createContext(null);
export const CartContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export const useCart = () => useContext(CartContext);
