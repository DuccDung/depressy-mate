import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../../../constants/theme';


interface Props {
  visible: boolean;
  cycles: number;
  onClose: () => void;
  onRestart: () => void;
}

export default function SessionCompleteModal({ visible, cycles, onClose, onRestart }: Props) {
  const cardScale = useSharedValue(0.8);
  const cardOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      cardScale.value = withSpring(1, { damping: 15, stiffness: 120 });
      cardOpacity.value = withTiming(1, { duration: 300 });
      checkScale.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 100 }));
    } else {
      cardScale.value = 0.8;
      cardOpacity.value = 0;
      checkScale.value = 0;
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  if (!visible) return null;

  const totalSeconds = cycles * (4 + 4 + 6);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, cardStyle]}>
          {/* Check icon */}
          <Animated.View style={[styles.checkCircle, checkStyle]}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </Animated.View>

          <Text style={styles.title}>Tuyệt vời! 🎉</Text>
          <Text style={styles.subtitle}>
            Bạn đã hoàn thành bài tập thở
          </Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{cycles}</Text>
              <Text style={styles.statLabel}>Vòng thở</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {minutes > 0 ? `${minutes}p ${seconds}s` : `${seconds}s`}
              </Text>
              <Text style={styles.statLabel}>Tổng thời gian</Text>
            </View>
          </View>

          {/* Actions */}
          <TouchableOpacity style={styles.restartButton} onPress={onRestart} activeOpacity={0.85}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.restartText}>Lặp lại bài tập</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeText}>Về trang chủ</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.ambient,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.onSurface,
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily,
    fontWeight: '500',
    color: Colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.secondary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    fontWeight: '600',
    color: Colors.light.onSurfaceVariant,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.light.outlineVariant,
    opacity: 0.3,
    marginHorizontal: Spacing.md,
  },
  restartButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.md,
    ...Shadows.ambient,
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.25,
  },
  restartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: Spacing.sm,
  },
  closeText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    color: Colors.light.primary,
  },
});
