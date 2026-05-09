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
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  GoogleLogin: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

type RegisterErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  otp?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const THEME_COLORS = {
  background: '#F3F0FF',
  primary: '#7B61FF',
  text: '#191C1E',
  secondaryText: '#494454',
  divider: '#E0E0E0',
  cardBg: '#FFFFFF',
  danger: '#D92D20',
  mutedBg: '#F9F9FF',
  border: '#E8E8FF',
};

const getApiErrorMessage = (error: any, fallback: string) => {
  return error?.response?.data?.error || error?.message || fallback;
};

export default function RegisterScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [loading, setLoading] = useState(false);
  const { requestRegistrationOtp, verifyRegistrationOtp } = useAuth();

  const clearFieldError = (field: keyof RegisterErrors) => {
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const validateRegistrationForm = () => {
    const nextErrors: RegisterErrors = {};
    const normalizedEmail = email.trim();
    const normalizedFullName = fullName.trim();

    if (!normalizedFullName) {
      nextErrors.fullName = 'Vui lòng nhập họ và tên.';
    } else if (normalizedFullName.length < 2) {
      nextErrors.fullName = 'Họ và tên phải có ít nhất 2 ký tự.';
    }

    if (!normalizedEmail) {
      nextErrors.email = 'Vui lòng nhập email.';
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      nextErrors.email = 'Email không hợp lệ.';
    }

    if (!password) {
      nextErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (password.length < 6) {
      nextErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateOtp = () => {
    const normalizedOtp = otp.trim();
    const nextErrors: RegisterErrors = {};

    if (!normalizedOtp) {
      nextErrors.otp = 'Vui lòng nhập mã OTP.';
    } else if (!/^\d{6}$/.test(normalizedOtp)) {
      nextErrors.otp = 'Mã OTP gồm 6 chữ số.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRequestOtp = async () => {
    if (!validateRegistrationForm()) {
      Alert.alert('Thông tin chưa hợp lệ', 'Vui lòng kiểm tra lại thông tin đăng ký.');
      return;
    }

    setLoading(true);
    try {
      await requestRegistrationOtp(email.trim().toLowerCase(), password, fullName.trim());
      setOtp('');
      setOtpSent(true);
      setErrors({});
      Alert.alert('Đã gửi mã OTP', 'Vui lòng kiểm tra email và nhập mã OTP để hoàn tất đăng ký.');
    } catch (error: any) {
      Alert.alert(
        'Không thể gửi OTP',
        getApiErrorMessage(error, 'Không thể gửi mã OTP. Vui lòng thử lại.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!validateOtp()) {
      Alert.alert('OTP chưa hợp lệ', 'Vui lòng nhập mã OTP gồm 6 chữ số.');
      return;
    }

    setLoading(true);
    try {
      await verifyRegistrationOtp(email.trim().toLowerCase(), otp.trim());
    } catch (error: any) {
      Alert.alert(
        'Xác thực OTP thất bại',
        getApiErrorMessage(error, 'Mã OTP không đúng hoặc đã hết hạn. Vui lòng thử lại.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditEmail = () => {
    setOtp('');
    setOtpSent(false);
    setErrors({});
  };

  const handleGoogleRegister = () => {
    navigation.navigate('GoogleLogin');
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.brandContainer}>
              <Image
                source={require('../../assets/images/brand_logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.appName}>Depressy Mate</Text>
            </View>
            <Text style={styles.slogan}>Bắt đầu hành trình chăm sóc cảm xúc của bạn</Text>
          </View>

          <View style={[styles.card, Shadows.ambient]}>
            <Text style={styles.cardTitle}>Tạo tài khoản</Text>
            <Text style={styles.cardSubtitle}>
              {otpSent ? 'Nhập mã xác thực để hoàn tất.' : 'Xác thực email trước khi đăng ký.'}
            </Text>

            <View style={[styles.inputWrapper, errors.fullName && styles.inputError]}>
              <Ionicons name="person-outline" size={20} color={THEME_COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Họ và tên"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={(value) => {
                  setFullName(value);
                  clearFieldError('fullName');
                }}
                autoComplete="name"
                editable={!otpSent && !loading}
              />
            </View>
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color={THEME_COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  clearFieldError('email');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!otpSent && !loading}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={THEME_COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  clearFieldError('password');
                }}
                secureTextEntry={!showPassword}
                editable={!otpSent && !loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((current) => !current)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={THEME_COLORS.secondaryText}
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={THEME_COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  clearFieldError('confirmPassword');
                }}
                secureTextEntry={!showConfirmPassword}
                editable={!otpSent && !loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((current) => !current)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={THEME_COLORS.secondaryText}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

            {otpSent && (
              <>
                <Text style={styles.otpDescription}>
                  Mã OTP đã được gửi tới {email.trim()}. Mã có hiệu lực trong 10 phút.
                </Text>

                <View style={[styles.inputWrapper, errors.otp && styles.inputError]}>
                  <Ionicons name="key-outline" size={20} color={THEME_COLORS.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mã OTP"
                    placeholderTextColor="#9CA3AF"
                    value={otp}
                    onChangeText={(value) => {
                      setOtp(value.replace(/\D/g, ''));
                      clearFieldError('otp');
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                  />
                </View>
                {errors.otp && <Text style={styles.errorText}>{errors.otp}</Text>}

                <View style={styles.otpActions}>
                  <TouchableOpacity onPress={handleRequestOtp} disabled={loading}>
                    <Text style={styles.otpActionText}>Gửi lại OTP</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleEditEmail} disabled={loading}>
                    <Text style={styles.otpActionText}>Đổi email</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={otpSent ? handleVerifyOtp : handleRequestOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {otpSent ? 'Xác nhận OTP' : 'Gửi mã OTP'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleRegister} disabled={loading}>
                <Ionicons name="logo-google" size={20} color={THEME_COLORS.primary} />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

            </View>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
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
    marginBottom: 32,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.light.primary,
    fontFamily: 'Manrope',
    includeFontPadding: false,
  },
  slogan: {
    fontSize: 15,
    color: THEME_COLORS.secondaryText,
    fontFamily: 'Manrope',
    textAlign: 'center',
  },
  card: {
    backgroundColor: THEME_COLORS.cardBg,
    borderRadius: 28,
    padding: Spacing.lg,
    width: '100%',
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME_COLORS.text,
    textAlign: 'center',
    fontFamily: 'Manrope',
  },
  cardSubtitle: {
    color: THEME_COLORS.secondaryText,
    fontSize: 14,
    marginTop: 6,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    fontFamily: 'Manrope',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME_COLORS.mutedBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    marginTop: Spacing.sm,
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: THEME_COLORS.danger,
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
  errorText: {
    color: THEME_COLORS.danger,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontFamily: 'Manrope',
  },
  otpDescription: {
    color: THEME_COLORS.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.md,
    textAlign: 'center',
    fontFamily: 'Manrope',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  otpActionText: {
    color: THEME_COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Manrope',
  },
  primaryButton: {
    backgroundColor: THEME_COLORS.primary,
    borderRadius: BorderRadius.full,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
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
    color: '#8F8A99',
    fontSize: 14,
    fontFamily: 'Manrope',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
  },
  socialButtonText: {
    color: THEME_COLORS.text,
    fontWeight: '700',
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
    fontWeight: '800',
  },
});
