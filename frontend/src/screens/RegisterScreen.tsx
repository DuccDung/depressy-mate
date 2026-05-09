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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
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

export default function RegisterScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, fullName.trim());
    } catch (err: any) {
      const message = err.response?.data?.error || 'Đăng ký thất bại. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log('Google Sign Up pressed');
  };

  const handleFacebookLogin = () => {
    console.log('Facebook Sign Up pressed');
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
            <Text style={styles.appName}>Depressy Mate</Text>
            <Text style={styles.slogan}>Lắng nghe tâm trí, thấu hiểu chính mình</Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, Shadows.ambient]}>
            <Text style={styles.cardTitle}>Đăng ký tài khoản</Text>

            {/* Full Name Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={THEME_COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Họ và tên"
                placeholderTextColor="#A0A0A0"
                value={fullName}
                onChangeText={setFullName}
                autoComplete="name"
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={THEME_COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
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

            {/* Confirm Password Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="shield-checkmark-outline" size={20} color={THEME_COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor="#A0A0A0"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Đăng ký</Text>
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
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.linkText}>
                Đã có tài khoản? <Text style={styles.linkBold}>Đăng nhập</Text>
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
    paddingVertical: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.light.primary,
    fontFamily: 'Manrope',
    marginBottom: 4,
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

