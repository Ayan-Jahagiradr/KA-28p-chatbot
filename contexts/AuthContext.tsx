import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  User,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../firebase/config';
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthError = (err: unknown) => {
    const authError = err as { code: string; message: string };
    console.error('Firebase Auth Error:', authError.code, authError.message);
    setError(authError.message);
    setIsLoading(false);
    // Re-throw the error so the calling component can handle it
    throw err;
  };

  const signUpWithEmailPassword = async ({ email, password }: Credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      handleAuthError(err);
    }
  };

  const signInWithEmailPassword = async ({ email, password }: Credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      handleAuthError(err);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      handleAuthError(err);
    }
  };

  const value = {
    user,
    isLoading,
    signOutUser,
    signUpWithEmailPassword,
    signInWithEmailPassword,
    error,
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
