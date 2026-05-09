import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { AccessToken, LoginManager, Settings } from 'react-native-fbsdk-next';
import api from '../services/api';

const FACEBOOK_READ_PERMISSIONS = ['public_profile', 'email'];
const FACEBOOK_SDK_UNAVAILABLE_MESSAGE =
  'Facebook SDK chỉ hoạt động trong development build/native build. Expo Go không hỗ trợ module này.';

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

const isFacebookSdkAvailable = () => {
  return Boolean(
    NativeModules.FBSettings &&
      NativeModules.FBLoginManager &&
      NativeModules.FBAccessToken
  );
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isFacebookSdkAvailable()) {
      return;
    }

    try {
      Settings.initializeSDK();
    } catch {
    }
  }, []);

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
      } catch {
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

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

  const loginWithFacebook = async () => {
    if (!isFacebookSdkAvailable()) {
      throw new Error(FACEBOOK_SDK_UNAVAILABLE_MESSAGE);
    }

    LoginManager.logOut();

    const loginResult = await LoginManager.logInWithPermissions(FACEBOOK_READ_PERMISSIONS);
    if (loginResult.isCancelled) {
      throw new Error('Bạn đã hủy đăng nhập Facebook.');
    }

    const facebookToken = await AccessToken.getCurrentAccessToken();
    if (!facebookToken?.accessToken) {
      throw new Error('Facebook không trả về access token hợp lệ.');
    }

    const response = await api.post('/auth/facebook', {
      accessToken: facebookToken.accessToken,
    });
    const { token: newToken, user: userData } = response.data;

    await persistAuthSession(newToken, userData);
  };

  const persistAuthSession = async (newToken: string, userData: User) => {
    await AsyncStorage.setItem('userToken', newToken);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));

    setToken(newToken);
    setUser(userData);
  };

  const register = requestRegistrationOtp;

  const logout = async () => {
    if (isFacebookSdkAvailable()) {
      LoginManager.logOut();
    }
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
