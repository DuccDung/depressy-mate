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
import { Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { getFacebookAccessToken } from '../services/facebookAuth';
import { getGoogleIdToken } from '../services/googleAuth';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
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
  background: '#FAF8F2',
  primary: '#1D6B63',
  primarySoft: '#E3F1EE',
  text: '#111817',
  secondaryText: '#65736F',
  divider: '#DDE7E4',
  cardBg: '#FFFFFF',
  danger: '#A33A3A',
  mutedBg: '#F7FAF8',
  border: '#DCE7E4',
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
  const {
    requestRegistrationOtp,
    verifyRegistrationOtp,
    loginWithFacebookAccessToken,
    loginWithGoogleIdToken,
  } = useAuth();

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

  const handleGoogleRegister = async () => {
    setLoading(true);
    try {
      const googleIdToken = await getGoogleIdToken();
      if (!googleIdToken) {
        return;
      }

      await loginWithGoogleIdToken(googleIdToken);
    } catch (error: any) {
      Alert.alert(
        'Dang nhap Google that bai',
        getApiErrorMessage(error, 'Khong the dang nhap bang Google. Vui long thu lai.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookRegister = async () => {
    setLoading(true);
    try {
      const facebookAccessToken = await getFacebookAccessToken();
      if (!facebookAccessToken) {
        return;
      }

      await loginWithFacebookAccessToken(facebookAccessToken);
    } catch (error: any) {
      Alert.alert(
        'Đăng nhập Facebook thất bại',
        getApiErrorMessage(error, 'Không thể đăng nhập bằng Facebook. Vui lòng thử lại.')
      );
    } finally {
      setLoading(false);
    }
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
          <View style={[styles.card, Shadows.ambient]}>
            <AuthBrandHeader />

            <View style={styles.stepRow}>
              <View style={[styles.stepPill, !otpSent && styles.stepPillActive]}>
                <Text style={[styles.stepText, !otpSent && styles.stepTextActive]}>1. Thông tin</Text>
              </View>
              <View style={[styles.stepPill, otpSent && styles.stepPillActive]}>
                <Text style={[styles.stepText, otpSent && styles.stepTextActive]}>2. Xác thực</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Họ và tên</Text>
            <View style={[styles.inputWrapper, errors.fullName && styles.inputError]}>
              <Ionicons name="person-outline" size={20} color={THEME_COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Họ và tên"
                placeholderTextColor="#8B9693"
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

            <Text style={styles.fieldLabel}>Email</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color={THEME_COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="ban@example.com"
                placeholderTextColor="#8B9693"
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

            <Text style={styles.fieldLabel}>Mật khẩu</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={THEME_COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                placeholderTextColor="#8B9693"
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

            <Text style={styles.fieldLabel}>Xác nhận mật khẩu</Text>
            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={THEME_COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor="#8B9693"
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
                    placeholderTextColor="#8B9693"
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
              <Text style={styles.dividerText}>Hoặc tiếp tục với</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleRegister} disabled={loading}>
                <Ionicons name="logo-google" size={20} color={THEME_COLORS.primary} />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton} onPress={handleFacebookRegister} disabled={loading}>
                <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                <Text style={styles.socialButtonText}>Facebook</Text>
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

function AuthBrandHeader() {
  return (
    <View style={styles.authBrand}>
      <View style={styles.logoBadge}>
        <Image
          source={require('../../assets/images/brand_logo.png')}
          style={styles.logo}
          resizeMode="cover"
        />
      </View>
      <View style={styles.brandTextBlock}>
        <Text style={styles.appName}>Depressy Mate</Text>
        <Text style={styles.brandCaption}>Bắt đầu nhẹ nhàng, theo dõi rõ ràng</Text>
      </View>
    </View>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  authBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F7FAF8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(29,107,99,0.16)',
    overflow: 'hidden',
  },
  logo: {
    width: 64,
    height: 64,
  },
  brandTextBlock: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  appName: {
    fontSize: 27,
    fontWeight: '900',
    color: THEME_COLORS.primary,
    fontFamily: 'Manrope',
    includeFontPadding: false,
    lineHeight: 34,
  },
  brandCaption: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME_COLORS.secondaryText,
    fontFamily: 'Manrope',
    marginTop: 2,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  stepPill: {
    flex: 1,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(29,107,99,0.14)',
  },
  stepPillActive: {
    backgroundColor: THEME_COLORS.primary,
    borderColor: THEME_COLORS.primary,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME_COLORS.secondaryText,
    fontFamily: 'Manrope',
  },
  stepTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: THEME_COLORS.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.12)',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#394541',
    marginTop: Spacing.sm,
    marginBottom: 7,
    fontFamily: 'Manrope',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME_COLORS.mutedBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
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
    fontFamily: 'Manrope',
    backgroundColor: THEME_COLORS.primarySoft,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
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
    color: '#73807C',
    fontSize: 12,
    fontWeight: '800',
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
    minHeight: 48,
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
