import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { fullName: string; phone: string; shopName?: string; pin: string }) => Promise<{ success: boolean; error?: string }>;
  quickDemoLogin: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePin: (oldPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: { fullName: string; shopName: string; phone: string }) => Promise<{ success: boolean; error?: string }>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY_TOKEN = 'carnet_auth_token_v1';
const STORAGE_KEY_USER = 'carnet_auth_user_v1';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_TOKEN) || null;
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Authenticated fetch wrapper
  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(init.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await fetch(input, {
        ...init,
        headers,
      });

      if (response.status === 401) {
        // Token expired or invalidated
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_USER);
        setToken(null);
        setUser(null);
      }

      return response;
    },
    [token]
  );

  // Verify token on mount
  useEffect(() => {
    let isMounted = true;

    async function verifyInitialSession() {
      const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setUser(data.user);
            setToken(storedToken);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
          }
        } else {
          // Token is no longer valid
          localStorage.removeItem(STORAGE_KEY_TOKEN);
          localStorage.removeItem(STORAGE_KEY_USER);
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('Erreur vérification session en ligne, conservation du mode hors ligne:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    verifyInitialSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (phone: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Identifiants invalides.' };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Impossible de joindre le serveur. Vérifiez votre connexion.' };
    }
  };

  const register = async (formData: {
    fullName: string;
    phone: string;
    shopName?: string;
    pin: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erreur lors de la création du compte.' };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Impossible de joindre le serveur. Réessayez.' };
    }
  };

  const quickDemoLogin = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/quick-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erreur accès démo.' };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Impossible de joindre le serveur.' };
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    setToken(null);
    setUser(null);
  };

  const changePin = async (oldPin: string, newPin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authFetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPin, newPin }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erreur lors du changement de PIN.' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Erreur de connexion.' };
    }
  };

  const updateProfile = async (data: {
    fullName: string;
    shopName: string;
    phone: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authFetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Erreur lors de la mise à jour du profil.' };
      }

      if (resData.user) {
        setUser(resData.user);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(resData.user));
      }
      if (resData.token) {
        setToken(resData.token);
        localStorage.setItem(STORAGE_KEY_TOKEN, resData.token);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Erreur de connexion au serveur.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        register,
        quickDemoLogin,
        logout,
        changePin,
        updateProfile,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
