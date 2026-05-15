import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BorderRadius, Shadows, Spacing } from "../../constants/theme";
import { useAuth } from "../contexts/AuthContext";
import { getFacebookAccessToken } from "../services/facebookAuth";
import { getGoogleIdToken } from "../services/googleAuth";

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Login">;
};

type LoginErrors = {
  email?: string;
  password?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const THEME_COLORS = {
  background: "#FAF8F2",
  primary: "#1D6B63",
  text: "#111817",
  secondaryText: "#65736F",
  divider: "#DDE7E4",
  cardBg: "#FFFFFF",
  danger: "#A33A3A",
  mutedBg: "#F7FAF8",
  border: "#DCE7E4",
};

const getApiErrorMessage = (error: any, fallback: string) => {
  return error?.response?.data?.error || error?.message || fallback;
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, loginWithFacebookAccessToken, loginWithGoogleIdToken } =
    useAuth();

  const validateForm = () => {
    const nextErrors: LoginErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      nextErrors.email = "Email không hợp lệ.";
    }

    if (!password.trim()) {
      nextErrors.password = "Vui lòng nhập mật khẩu.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      Alert.alert(
        "Thông tin chưa hợp lệ",
        "Vui lòng kiểm tra lại email và mật khẩu.",
      );
      return;
    }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (error: any) {
      Alert.alert(
        "Đăng nhập thất bại",
        getApiErrorMessage(
          error,
          "Email hoặc mật khẩu không đúng. Vui lòng thử lại.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const googleIdToken = await getGoogleIdToken();
      if (!googleIdToken) {
        return;
      }

      await loginWithGoogleIdToken(googleIdToken);
    } catch (error: any) {
      Alert.alert(
        "Dang nhap Google that bai",
        getApiErrorMessage(
          error,
          "Khong the dang nhap bang Google. Vui long thu lai.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    try {
      const facebookAccessToken = await getFacebookAccessToken();
      if (!facebookAccessToken) {
        return;
      }

      await loginWithFacebookAccessToken(facebookAccessToken);
    } catch (error: any) {
      Alert.alert(
        "Đăng nhập Facebook thất bại",
        getApiErrorMessage(
          error,
          "Không thể đăng nhập bằng Facebook. Vui lòng thử lại.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, Shadows.ambient]}>
            <AuthBrandHeader />

            <Text style={styles.fieldLabel}>Email</Text>
            <View
              style={[styles.inputWrapper, errors.email && styles.inputError]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={THEME_COLORS.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="ban@example.com"
                placeholderTextColor="#8B9693"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (errors.email) {
                    setErrors((current) => ({ ...current, email: undefined }));
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!loading}
              />
            </View>
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}

            <Text style={styles.fieldLabel}>Mật khẩu</Text>
            <View
              style={[
                styles.inputWrapper,
                errors.password && styles.inputError,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={THEME_COLORS.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#8B9693"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errors.password) {
                    setErrors((current) => ({
                      ...current,
                      password: undefined,
                    }));
                  }
                }}
                secureTextEntry={!showPassword}
                autoComplete="password"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((current) => !current)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={THEME_COLORS.secondaryText}
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}

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

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc tiếp tục với</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <Ionicons
                  name="logo-google"
                  size={20}
                  color={THEME_COLORS.primary}
                />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleFacebookLogin}
                disabled={loading}
              >
                <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                <Text style={styles.socialButtonText}>Facebook</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate("Register")}
              disabled={loading}
            >
              <Text style={styles.linkText}>
                Chưa có tài khoản?{" "}
                <Text style={styles.linkBold}>Đăng ký ngay</Text>
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
          source={require("../../assets/images/brand_logo.png")}
          style={styles.logo}
          resizeMode="cover"
        />
      </View>
      <View style={styles.brandTextBlock}>
        <Text style={styles.appName}>Depressy</Text>
        <Text style={styles.brandCaption}>
          Lắng nghe tâm trí, thấu hiểu chính mình
        </Text>
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
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  authBrand: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F7FAF8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(29,107,99,0.16)",
    overflow: "hidden",
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
    fontWeight: "900",
    color: THEME_COLORS.primary,
    fontFamily: "Manrope",
    includeFontPadding: false,
    lineHeight: 34,
  },
  brandCaption: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME_COLORS.secondaryText,
    fontFamily: "Manrope",
    marginTop: 2,
  },
  card: {
    backgroundColor: THEME_COLORS.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(20,78,73,0.12)",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: "#394541",
    marginTop: Spacing.sm,
    marginBottom: 7,
    fontFamily: "Manrope",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
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
    fontFamily: "Manrope",
  },
  errorText: {
    color: THEME_COLORS.danger,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontFamily: "Manrope",
  },
  primaryButton: {
    backgroundColor: THEME_COLORS.primary,
    borderRadius: BorderRadius.full,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    fontFamily: "Manrope",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME_COLORS.divider,
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#73807C",
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "Manrope",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: BorderRadius.md,
    backgroundColor: "#FFFFFF",
    paddingVertical: 13,
    minHeight: 48,
  },
  socialButtonText: {
    color: THEME_COLORS.text,
    fontWeight: "700",
    marginLeft: 8,
    fontFamily: "Manrope",
  },
  linkButton: {
    marginTop: 24,
    alignItems: "center",
  },
  linkText: {
    color: THEME_COLORS.secondaryText,
    fontSize: 14,
    fontFamily: "Manrope",
  },
  linkBold: {
    color: THEME_COLORS.primary,
    fontWeight: "800",
  },
});
