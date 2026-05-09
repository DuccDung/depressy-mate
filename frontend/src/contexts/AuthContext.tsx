import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import api, { API_ORIGIN } from '../services/api';

const FACEBOOK_LOGIN_TIMEOUT_MS = 3 * 60 * 1000;

interface User {
  id: string;
  email: string;
  role: string;
  fullName: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  requestRegistrationOtp: (email: string, password: string, fullName: string) => Promise<void>;
  verifyRegistrationOtp: (email: string, otp: string) => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Khi app khởi động, kiểm tra token đã lưu
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Failed to load auth state:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = response.data;

    await AsyncStorage.setItem('userToken', newToken);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));

    setToken(newToken);
    setUser(userData);
  };

  const requestRegistrationOtp = async (email: string, password: string, fullName: string) => {
    await api.post('/auth/register/request-otp', { email, password, fullName });
  };

  const verifyRegistrationOtp = async (email: string, otp: string) => {
    const response = await api.post('/auth/register/verify-otp', { email, otp });
    const { token: newToken, user: userData } = response.data;

    await AsyncStorage.setItem('userToken', newToken);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));

    setToken(newToken);
    setUser(userData);
  };

  const loginWithFacebook = async () => {
    const redirectUrl = 'frontend://auth/facebook';
    const loginUrl = `${API_ORIGIN}/api/auth/facebook?returnUrl=${encodeURIComponent(redirectUrl)}`;

    const callbackUrl = await new Promise<string>((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const subscription = Linking.addEventListener('url', ({ url }) => {
        if (!url.startsWith(redirectUrl)) {
          return;
        }

        cleanup();
        resolve(url);
      });

      const cleanup = () => {
        subscription.remove();
        if (timeout) {
          clearTimeout(timeout);
        }
      };

      timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Facebook login timed out. Please try again.'));
      }, FACEBOOK_LOGIN_TIMEOUT_MS);

      Linking.openURL(loginUrl).catch((error) => {
        cleanup();
        reject(error);
      });
    });

    const queryString = callbackUrl.split('?')[1] ?? '';
    const params = new URLSearchParams(queryString);
    const error = params.get('error');
    if (error) {
      throw new Error(error);
    }

    const newToken = params.get('token');
    const userJson = params.get('user');
    if (!newToken || !userJson) {
      throw new Error('Facebook login response is invalid.');
    }

    const userData = JSON.parse(userJson);
    await AsyncStorage.setItem('userToken', newToken);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));

    setToken(newToken);
    setUser(userData);
  };

  const register = requestRegistrationOtp;

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
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
        register,
        requestRegistrationOtp,
        verifyRegistrationOtp,
        loginWithFacebook,
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
