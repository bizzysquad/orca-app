import { createContext, useContext, ReactNode } from 'react';

export interface User {
  name: string;
  email: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: { name: '', email: '', isAdmin: false },
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);
