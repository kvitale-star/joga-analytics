import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginCredentials, Session, SetupWizardData } from '../types/auth';
import {
  login as authLogin,
  getSession,
  deleteSession,
  hasUsers,
  createInitialAdmin,
} from '../services/authService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isSetupRequired: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  setupAdmin: (data: SetupWizardData) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupRequired, setIsSetupRequired] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      const USE_BACKEND_API = import.meta.env.VITE_USE_BACKEND_API === 'true';
      
      // Only run migrations in browser mode (API mode uses backend database)
      if (!USE_BACKEND_API) {
        // Initialize database and run migrations FIRST
        try {
          const { runMigrations } = await import('../db/migrate');
          await runMigrations();
          console.log('Migrations completed successfully');
        } catch (migrationError: any) {
          // If it's a sql.js import error, the database won't work
          if (migrationError?.message?.includes('sql.js') || migrationError?.message?.includes('Cannot initialize SQL.js')) {
            console.error('SQL.js initialization failed. Database features will not work:', migrationError);
            // Set setup required so user can see the error
            setIsSetupRequired(true);
            setIsLoading(false);
            return;
          }
          // Migration errors are critical - don't continue if migrations fail
          console.error('Migration error:', migrationError);
          console.error('Migration error details:', {
            message: migrationError?.message,
            stack: migrationError?.stack,
            error: migrationError
          });
          // If migrations fail, we can't use the database
          setIsSetupRequired(true);
          setIsLoading(false);
          return;
        }
      }
      
      // Check for users (works in both browser and API mode)
      try {
        const usersExist = await hasUsers();
        if (!usersExist) {
          setIsSetupRequired(true);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error checking for users:', error);
        // If we can't check, assume setup is needed
        setIsSetupRequired(true);
        setIsLoading(false);
        return;
      }

      // Check for existing session via /auth/me (cookies are sent automatically)
      // In API mode, session is managed via HttpOnly cookies
      if (USE_BACKEND_API) {
        try {
          const { getUserById } = await import('../services/authService');
          const userData = await getUserById(0); // ID doesn't matter, /auth/me returns current user
          if (userData) {
            setUser(userData);
            // Create a session object (ID is in cookie, not needed in state)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
            setSession({
              id: 'cookie-based', // Placeholder - actual ID is in HttpOnly cookie
              userId: userData.id,
              expiresAt,
              lastActivityAt: new Date(),
              createdAt: new Date(),
            });
            setIsSetupRequired(false);
          }
        } catch (error) {
          // No valid session - user needs to login
          setUser(null);
          setSession(null);
        }
      } else {
        // Browser mode - check localStorage for backward compatibility
        const SESSION_STORAGE_KEY = 'joga_session_id';
        const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
        if (sessionId) {
          try {
            const activeSession = await getSession(sessionId);
            if (activeSession) {
              setSession(activeSession);
              const { getUserById } = await import('../services/authService');
              const userData = await getUserById(activeSession.userId);
              if (userData) {
                setUser(userData);
                setIsSetupRequired(false);
              } else {
                localStorage.removeItem(SESSION_STORAGE_KEY);
              }
            } else {
              localStorage.removeItem(SESSION_STORAGE_KEY);
            }
          } catch (sessionError) {
            console.error('Session check error:', sessionError);
            localStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsSetupRequired(true);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const result = await authLogin(credentials);
      if (result) {
        setUser(result.user);
        // Session ID is in HttpOnly cookie, create session object for state
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
        setSession({
          id: 'cookie-based', // Placeholder - actual ID is in HttpOnly cookie
          userId: result.user.id,
          expiresAt,
          lastActivityAt: new Date(),
          createdAt: new Date(),
        });
        setIsSetupRequired(false);
      } else {
        throw new Error('Invalid email or password');
      }
    } catch (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await deleteSession(''); // ID not needed - backend reads from cookie
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    setSession(null);
    setIsSetupRequired(false);
  }, []);

  const setupAdmin = useCallback(async (data: SetupWizardData) => {
    const admin = await createInitialAdmin(data);
    setUser(admin);
    // Auto-login after setup - session cookie is set by backend
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    setSession({
      id: 'cookie-based',
      userId: admin.id,
      expiresAt,
      lastActivityAt: new Date(),
      createdAt: new Date(),
    });
    setIsSetupRequired(false);
  }, []);

  const refreshSession = useCallback(async () => {
    const USE_BACKEND_API = import.meta.env.VITE_USE_BACKEND_API === 'true';
    if (USE_BACKEND_API) {
      // Check session via /auth/me (cookies sent automatically)
      try {
        const { getUserById } = await import('../services/authService');
        const userData = await getUserById(0);
        if (userData) {
          setUser(userData);
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          setSession({
            id: 'cookie-based',
            userId: userData.id,
            expiresAt,
            lastActivityAt: new Date(),
            createdAt: new Date(),
          });
        } else {
          await logout();
        }
      } catch (error) {
        await logout();
      }
    } else {
      // Browser mode - use localStorage
      const SESSION_STORAGE_KEY = 'joga_session_id';
      const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionId) {
        const activeSession = await getSession(sessionId);
        if (activeSession) {
          setSession(activeSession);
        } else {
          await logout();
        }
      }
    }
  }, [logout]);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isSetupRequired,
    login,
    logout,
    setupAdmin,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

