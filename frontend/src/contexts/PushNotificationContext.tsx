import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { ForegroundPushNotification } from '../services/firebaseMessagingService';

interface PushNotificationContextType {
  showNotification: (notification: ForegroundPushNotification) => void;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

const POPUP_DURATION_MS = 5200;
const BRAND_LOGO = require('../../assets/images/brand_logo.png');

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<ForegroundPushNotification | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideNotification = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setNotification(null);
  }, []);

  const showNotification = useCallback((nextNotification: ForegroundPushNotification) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    setNotification(nextNotification);
    hideTimerRef.current = setTimeout(() => {
      setNotification(null);
      hideTimerRef.current = null;
    }, POPUP_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  return (
    <PushNotificationContext.Provider value={{ showNotification }}>
      <View style={styles.root}>
        {children}
        <PushNotificationPopup notification={notification} onClose={hideNotification} />
      </View>
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotifications must be used within PushNotificationProvider');
  }
  return context;
}

function PushNotificationPopup({
  notification,
  onClose,
}: {
  notification: ForegroundPushNotification | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    if (!notification) {
      translateY.value = -120;
      opacity.value = 0;
      scale.value = 0.96;
      return;
    }

    translateY.value = withSpring(0, { damping: 16, stiffness: 160 });
    opacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
    scale.value = withSpring(1, { damping: 14, stiffness: 180 });
  }, [notification]);

  const popupStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!notification) return null;

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View style={[styles.popup, { top: insets.top + Spacing.sm }, popupStyle]}>
        <View style={styles.logoShell}>
          <Image source={BRAND_LOGO} style={styles.logo} />
        </View>

        <View style={styles.content}>
          <View style={styles.metaRow}>
            <View style={styles.brandDot} />
            <Text style={styles.brandText}>Depressy Mate</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title || 'Thông báo mới'}
          </Text>
          {!!notification.body && (
            <Text style={styles.body} numberOfLines={2}>
              {notification.body}
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.72}>
          <Ionicons name="close" size={18} color={Colors.light.onSurfaceVariant} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  popup: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    minHeight: 88,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(107, 56, 212, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    ...Shadows.ambient,
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  logoShell: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F2EEFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 99, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  logo: {
    width: 48,
    height: 48,
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.light.secondary,
    marginRight: 6,
  },
  brandText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.secondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.onSurface,
  },
  body: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Typography.fontFamily,
    fontWeight: '500',
    color: Colors.light.onSurfaceVariant,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.light.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
});
