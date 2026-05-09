import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';
import { AuthService } from '../services/authService';

WebBrowser.maybeCompleteAuthSession();

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

// Custom Lavender Theme Colors based on user request
const THEME_COLORS = {
  background: '#F3F0FF',
  primary: '#7B61FF',
  text: '#191C1E',
  secondaryText: '#494454',
  divider: '#E0E0E0',
  cardBg: '#FFFFFF',
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Google Auth Request
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    androidClientId: 'YOUR_GOOGLE_ANDROID_CLIENT_ID',
    iosClientId: 'YOUR_GOOGLE_IOS_CLIENT_ID',
    webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID',
  });

  // Facebook Auth Request
  const [fbRequest, fbResponse, promptFacebookAsync] = Facebook.useAuthRequest({
    clientId: 'YOUR_FACEBOOK_APP_ID',
    scopes: ['public_profile', 'email'],
  });

  // Handle Google Response
  React.useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { authentication } = googleResponse;
      if (authentication?.accessToken) {
        handleSocialLoginSuccess('google', authentication.accessToken);
      }
    }
  }, [googleResponse]);

  // Handle Facebook Response
  React.useEffect(() => {
    if (fbResponse?.type === 'success') {
      const { authentication } = fbResponse;
      if (authentication?.accessToken) {
        handleSocialLoginSuccess('facebook', authentication.accessToken);
      }
    }
  }, [fbResponse]);

  const handleSocialLoginSuccess = async (provider: 'google' | 'facebook', token: string) => {
    setLoading(true);
    let socialUser = null;

    if (provider === 'google') {
      socialUser = await AuthService.fetchGoogleUserInfo(token);
    } else {
      socialUser = await AuthService.fetchFacebookUserInfo(token);
    }

    setLoading(false);
    if (socialUser) {
      AuthService.showWelcomeMessage(socialUser);
      // Here you would typically send this data to your backend to create/login user
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Đăng nhập thất bại. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    promptGoogleAsync();
  };

  const handleFacebookLogin = () => {
    promptFacebookAsync();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandContainer}>
              <Image
                source={require('../../assets/images/brand_logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.appName}>Depressy Mate</Text>
            </View>
            <Text style={styles.slogan}>Lắng nghe tâm trí, thấu hiểu chính mình</Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, Shadows.ambient]}>
            <Text style={styles.cardTitle}>Đăng nhập</Text>

            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={THEME_COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email của bạn"
                placeholderTextColor="#A0A0A0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={THEME_COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                placeholderTextColor="#A0A0A0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
                <Ionicons name="logo-google" size={20} color={THEME_COLORS.primary} />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton} onPress={handleFacebookLogin}>
                <Ionicons name="logo-facebook" size={20} color={THEME_COLORS.primary} />
                <Text style={styles.socialButtonText}>Facebook</Text>
              </TouchableOpacity>
            </View>

            {/* Navigation Link */}
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.linkText}>
                Chưa có tài khoản? <Text style={styles.linkBold}>Đăng ký ngay</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME_COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 52,
    height: 52,
    marginRight: 12,
  },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.light.primary,
    fontFamily: 'Manrope',
    includeFontPadding: false,
  },
  slogan: {
    fontSize: 16,
    fontStyle: 'italic',
    color: THEME_COLORS.text,
    opacity: 0.7,
    fontFamily: 'Manrope',
    textAlign: 'center',
  },
  card: {
    backgroundColor: THEME_COLORS.cardBg,
    borderRadius: 32,
    padding: Spacing.lg,
    width: '100%',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME_COLORS.text,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    fontFamily: 'Manrope',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9FF',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E8E8FF',
    marginBottom: Spacing.md,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: THEME_COLORS.text,
    fontFamily: 'Manrope',
  },
  primaryButton: {
    backgroundColor: THEME_COLORS.primary,
    borderRadius: BorderRadius.full,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME_COLORS.divider,
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#A0A0A0',
    fontSize: 14,
    fontFamily: 'Manrope',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME_COLORS.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    width: '48%',
  },
  socialButtonText: {
    color: THEME_COLORS.primary,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'Manrope',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: THEME_COLORS.secondaryText,
    fontSize: 14,
    fontFamily: 'Manrope',
  },
  linkBold: {
    color: THEME_COLORS.primary,
    fontWeight: 'bold',
  },
});



