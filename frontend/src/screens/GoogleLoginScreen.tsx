import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import WebView from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants/theme';
import { useAuth, type User } from '../contexts/AuthContext';
import { API_ORIGIN } from '../services/api';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'GoogleLogin'>;

const GOOGLE_RETURN_URL = 'frontend://auth/google';
const GOOGLE_CALLBACK_PREFIX = `${GOOGLE_RETURN_URL}?`;

const getOAuthErrorMessage = (error: string) => {
  switch (error) {
    case 'missing_google_email':
      return 'Google không trả về email hợp lệ. Vui lòng thử lại bằng tài khoản khác.';
    case 'google_auth_failed':
      return 'Không thể xác thực Google. Vui lòng thử lại.';
    default:
      return 'Đăng nhập Google chưa hoàn tất. Vui lòng thử lại.';
  }
};

const normalizeAuthUser = (rawUser: any): User => {
  const email = typeof rawUser?.email === 'string' ? rawUser.email : '';
  const fullName = typeof rawUser?.fullName === 'string' && rawUser.fullName.trim()
    ? rawUser.fullName
    : email;

  return {
    id: String(rawUser?.id ?? ''),
    email,
    role: typeof rawUser?.role === 'string' ? rawUser.role : 'USER',
    fullName,
    avatarUrl: typeof rawUser?.avatarUrl === 'string' ? rawUser.avatarUrl : undefined,
  };
};

export default function GoogleLoginScreen({ navigation }: Props) {
  const { completeOAuthLogin } = useAuth();
  const handledCallbackRef = useRef(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [webViewKey, setWebViewKey] = useState(0);

  const authUrl = useMemo(() => {
    const returnUrl = encodeURIComponent(GOOGLE_RETURN_URL);
    return `${API_ORIGIN}/api/auth/google?returnUrl=${returnUrl}`;
  }, []);

  const finishWithError = useCallback(
    (message: string) => {
      setIsCompleting(false);
      Alert.alert('Không thể đăng nhập Google', message, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    [navigation]
  );

  const handleAuthCallback = useCallback(
    (url: string) => {
      if (!url.startsWith(GOOGLE_CALLBACK_PREFIX)) {
        return false;
      }

      if (handledCallbackRef.current) {
        return true;
      }

      handledCallbackRef.current = true;
      setIsCompleting(true);

      try {
        const callbackUrl = new URL(url);
        const error = callbackUrl.searchParams.get('error');
        if (error) {
          finishWithError(getOAuthErrorMessage(error));
          return true;
        }

        const token = callbackUrl.searchParams.get('token');
        const userParam = callbackUrl.searchParams.get('user');

        if (!token || !userParam) {
          finishWithError('Server chưa trả về phiên đăng nhập hợp lệ.');
          return true;
        }

        const user = normalizeAuthUser(JSON.parse(userParam));
        if (!user.id || !user.email) {
          finishWithError('Thông tin tài khoản Google chưa hợp lệ.');
          return true;
        }

        void completeOAuthLogin(token, user).catch(() => {
          handledCallbackRef.current = false;
          setIsCompleting(false);
          Alert.alert(
            'Không thể lưu đăng nhập',
            'Ứng dụng chưa lưu được phiên Google. Vui lòng thử lại.'
          );
        });
      } catch {
        finishWithError('Ứng dụng chưa đọc được phản hồi từ server.');
      }

      return true;
    },
    [completeOAuthLogin, finishWithError]
  );

  const handleRetry = () => {
    handledCallbackRef.current = false;
    setLoadError(null);
    setIsCompleting(false);
    setWebViewKey((current) => current + 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          disabled={isCompleting}
          accessibilityLabel="Đóng"
        >
          <Ionicons name="close" size={24} color={Colors.light.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Google</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.webViewContainer}>
        {loadError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={42} color={Colors.light.primary} />
            <Text style={styles.errorTitle}>Không mở được Google</Text>
            <Text style={styles.errorMessage}>{loadError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            key={webViewKey}
            source={{ uri: authUrl }}
            originWhitelist={['http://*', 'https://*', 'frontend://*']}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            startInLoadingState
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={(request) => !handleAuthCallback(request.url)}
            onNavigationStateChange={(state) => {
              handleAuthCallback(state.url);
            }}
            onError={(event) => {
              if (handledCallbackRef.current) {
                return;
              }

              setLoadError(
                event.nativeEvent.description || 'Vui lòng kiểm tra kết nối mạng và thử lại.'
              );
            }}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
              </View>
            )}
          />
        )}

        {isCompleting && (
          <View style={styles.completingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.outlineVariant,
    backgroundColor: Colors.light.surfaceContainerLowest,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  title: {
    color: Colors.light.onSurface,
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 40,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  completingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(25, 28, 30, 0.45)',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.light.background,
  },
  errorTitle: {
    marginTop: Spacing.md,
    color: Colors.light.onSurface,
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: Spacing.sm,
    color: Colors.light.onSurfaceVariant,
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.lg,
    minWidth: 128,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.lg,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '800',
  },
});
