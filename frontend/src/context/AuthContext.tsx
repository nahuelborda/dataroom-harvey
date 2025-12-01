import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../types';
import { authApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  googleConnected: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setUser(null);
        setGoogleConnected(false);
        return;
      }

      const data = await authApi.getMe();
      setUser(data.user);
      setGoogleConnected(data.google_connected);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      setGoogleConnected(false);
      localStorage.removeItem('authToken');
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await refreshUser();
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = (token: string) => {
    localStorage.setItem('authToken', token);
    refreshUser();
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('authToken');
    setUser(null);
    setGoogleConnected(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        googleConnected,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

