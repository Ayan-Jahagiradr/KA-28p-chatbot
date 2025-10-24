import React, {
  createContext,
  useContext,
  ReactNode,
} from 'react';

// Local User type to avoid Firebase dependency
interface User {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOutUser: () => Promise<void>;
  signUpWithEmailPassword: (credentials: any) => Promise<void>;
  signInWithEmailPassword: (credentials: any) => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a mock user object to bypass authentication.
const mockUser: User = {
  uid: 'local-user',
  email: 'local-user@app.com',
};


export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const value = {
    user: mockUser,
    isLoading: false,
    signOutUser: async () => {
      // No-op, authentication is disabled.
    },
    signUpWithEmailPassword: async (_: any) => {
      // No-op, authentication is disabled.
    },
    signInWithEmailPassword: async (_: any) => {
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
