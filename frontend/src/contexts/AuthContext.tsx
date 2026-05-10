import React, { createContext, useState, useEffect, useContext, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import socketService from '../services/socket';

export interface User {
  id: string;
  email: string;
  role: string;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  authProvider?: string | null;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  requestRegistrationOtp: (email: string, password: string, fullName: string) => Promise<void>;
  verifyRegistrationOtp: (email: string, otp: string) => Promise<void>;
  completeOAuthLogin: (newToken: string, userData: User) => Promise<void>;
  loginWithFacebookAccessToken: (accessToken: string) => Promise<void>;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUser = await AsyncStorage.getItem('userData');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {
        await AsyncStorage.multiRemove(['userToken', 'userData']);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  const persistAuthSession = async (newToken: string, userData: User) => {
    if (token && token !== newToken) {
      await socketService.disconnect();
    }

    await AsyncStorage.setItem('userToken', newToken);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));

    setToken(newToken);
    setUser(userData);
  };

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = response.data;

    await persistAuthSession(newToken, userData);
  };

  const requestRegistrationOtp = async (email: string, password: string, fullName: string) => {
    await api.post('/auth/register/request-otp', { email, password, fullName });
  };

  const verifyRegistrationOtp = async (email: string, otp: string) => {
    const response = await api.post('/auth/register/verify-otp', { email, otp });
    const { token: newToken, user: userData } = response.data;

    await persistAuthSession(newToken, userData);
  };

  const completeOAuthLogin = async (newToken: string, userData: User) => {
    await persistAuthSession(newToken, userData);
  };

  const loginWithFacebookAccessToken = async (accessToken: string) => {
    const response = await api.post('/auth/facebook', { accessToken });
    const { token: newToken, user: userData } = response.data;

    await persistAuthSession(newToken, userData);
  };

  const loginWithGoogleIdToken = async (idToken: string) => {
    const response = await api.post('/auth/google', { idToken });
    const { token: newToken, user: userData } = response.data;

    await persistAuthSession(newToken, userData);
  };

  const updateUser = useCallback(async (userData: Partial<User>) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      const nextUser = { ...currentUser, ...userData };
      AsyncStorage.setItem('userData', JSON.stringify(nextUser));
      return nextUser;
    });
  }, []);

  const logout = async () => {
    await socketService.disconnect();
    await AsyncStorage.multiRemove(['userToken', 'userData']);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register: requestRegistrationOtp,
        requestRegistrationOtp,
        verifyRegistrationOtp,
        completeOAuthLogin,
        loginWithFacebookAccessToken,
        loginWithGoogleIdToken,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
