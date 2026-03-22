'use client';

import React, { createContext, useContext } from 'react';

interface AuthContextValue {
  user: { id: string; name: string; email: string; role: 'instructor' | 'student' };
  isAuthenticated: true;
  isLoading: false;
  token: null;
  logout: () => void;
}

const defaultUser = {
  id: 'instructor',
  name: 'Instructor',
  email: '',
  role: 'instructor' as const,
};

const AuthContext = createContext<AuthContextValue>({
  user: defaultUser,
  isAuthenticated: true,
  isLoading: false,
  token: null,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: defaultUser,
        isAuthenticated: true,
        isLoading: false,
        token: null,
        logout: () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
