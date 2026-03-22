'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, AuthState } from './types';
import * as api from './api';
import { clearStudentSession } from './student-report';
import { clearInstructorBasic } from './api';
import { STORAGE_AUTH_TOKEN_KEY } from './config';

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loginWithToken: (token: string) => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    token: null,
  });
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_AUTH_TOKEN_KEY);
    if (token) {
      api.validateToken(token)
        .then((user) => {
          if (user) {
            setState({ user, isAuthenticated: true, isLoading: false, token });
          } else {
            localStorage.removeItem(STORAGE_AUTH_TOKEN_KEY);
            setState((s) => ({ ...s, isLoading: false }));
          }
        })
        .catch(() => {
          localStorage.removeItem(STORAGE_AUTH_TOKEN_KEY);
          setState((s) => ({ ...s, isLoading: false }));
        });
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const { user, token } = await api.login(email, password);
      localStorage.setItem(STORAGE_AUTH_TOKEN_KEY, token);
      setState({ user, isAuthenticated: true, isLoading: false, token });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const loginWithToken = useCallback(async (token: string) => {
    setError(null);
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const result = await api.validateStudentToken(token);
      if (result) {
        const user: User = { id: result.id, name: result.name, email: result.email, role: result.role };
        localStorage.setItem(STORAGE_AUTH_TOKEN_KEY, `student_token_${token}`);
        setState({ user, isAuthenticated: true, isLoading: false, token: `student_token_${token}` });
      } else {
        setError('Invalid or expired access link');
        setState((s) => ({ ...s, isLoading: false }));
      }
    } catch {
      setError('Failed to validate access link');
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_AUTH_TOKEN_KEY);
    clearStudentSession();
    clearInstructorBasic();
    setState({ user: null, isAuthenticated: false, isLoading: false, token: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, loginWithToken, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
