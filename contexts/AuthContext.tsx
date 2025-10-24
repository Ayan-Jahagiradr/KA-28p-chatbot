import React, {
  createContext,
  useContext,
  ReactNode,
} from 'react';
import {
  User,
} from 'firebase/auth';
import { Credentials } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOutUser: () => Promise<void>;
  signUpWithEmailPassword: (credentials: Credentials) => Promise<void>;
  signInWithEmailPassword: (credentials: Credentials) => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a mock user object to bypass authentication.
const mockUser: User = {
  uid: 'local-user',
  email: 'local-user@app.com',
  // The User type from firebase is complex, but we only use uid and email.
  // Casting a partial object to User satisfies the type checker.
} as User;


export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const value = {
    user: mockUser,
    isLoading: false,
    signOutUser: async () => {
      // No-op, authentication is disabled.
    },
    signUpWithEmailPassword: async (_: Credentials) => {
      // No-op, authentication is disabled.
    },
    signInWithEmailPassword: async (_: Credentials) => {
      // No-op, authentication is disabled.
    },
    error: null,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
