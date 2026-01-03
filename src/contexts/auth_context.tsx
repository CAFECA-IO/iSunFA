'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { request } from '@/lib/api/request';

interface IUser {
  address: string;
  name: string | null;
  role: string | null;
}

interface IAuthContextType {
  user: IUser | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<IAuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    const token = localStorage.getItem('dewt');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await request<{ payload: IUser }>('/api/v1/auth/me', {
        method: 'GET',
      });
      if (response && response.payload) {
        setUser(response.payload);
      } else {
        setUser(null);
        localStorage.removeItem('dewt');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      localStorage.removeItem('dewt');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem('dewt');
    setUser(null);
    window.location.reload();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshAuth,
      logout,
    }),
    [user, loading, refreshAuth, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
