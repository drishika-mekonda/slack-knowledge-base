import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserLogin, UserRegister } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: UserLogin) => Promise<void>;
  register: (userDetails: UserRegister) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      setLoading(true);
      const currentUser = await authApi.getMe();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to fetch user profiles:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (credentials: UserLogin) => {
    setLoading(true);
    try {
      const response = await authApi.login(credentials);
      localStorage.setItem('token', response.access_token);
      setToken(response.access_token);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (userDetails: UserRegister) => {
    setLoading(true);
    try {
      await authApi.register(userDetails);
      // Automatically log in after registration
      await login({ username: userDetails.username, password: userDetails.password });
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    loading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
