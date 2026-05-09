import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../../constants/theme';

/**
 * Determines a time-period and returns appropriate theme colors and icon.
 */
function getTimeTheme(hour: number) {
  if (hour >= 5 && hour < 12) {
    // Morning
    return {
      bg: ['#FFF7ED', '#FFECD2'],
      iconBg: '#FB923C',
      iconName: 'sunny-outline' as const,
      greeting: 'Buổi sáng tốt lành',
      textColor: '#9A3412',
    };
  } else if (hour >= 12 && hour < 17) {
    // Afternoon
    return {
      bg: ['#FEF3C7', '#FDE68A'],
      iconBg: '#F59E0B',
      iconName: 'sunny' as const,
      greeting: 'Buổi chiều an yên',
      textColor: '#92400E',
    };
  } else if (hour >= 17 && hour < 20) {
    // Evening
    return {
      bg: ['#EDE9FE', '#DDD6FE'],
      iconBg: Colors.light.primary,
      iconName: 'cloudy-night-outline' as const,
      greeting: 'Buổi tối thư thái',
      textColor: Colors.light.primary,
    };
  } else {
    // Night (20-5)
    return {
      bg: ['#1E1B4B', '#312E81'],
      iconBg: '#8B5CF6',
      iconName: 'moon' as const,
      greeting: 'Chúc ngủ ngon',
      textColor: '#C4B5FD',
    };
  }
}

function isNightTime(hour: number): boolean {
  return hour >= 20 || hour < 5;
}

export default function SleepClockHeader() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = time.getHours();
  const theme = getTimeTheme(hour);
  const night = isNightTime(hour);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  // Pulsing glow effect for icon
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 2000 }),
        withTiming(0.2, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: night ? '#1E1B4B' : theme.bg[0] },
      ]}
    >
      {/* Floating icon with glow */}
      <View style={styles.iconContainer}>
        <Animated.View
          style={[
            styles.iconGlow,
            { backgroundColor: theme.iconBg },
            glowStyle,
          ]}
        />
        <View style={[styles.iconBox, { backgroundColor: theme.iconBg }]}>
          <Ionicons name={theme.iconName} size={36} color="#FFFFFF" />
        </View>
      </View>

      {/* Time label */}
      <Text style={[styles.timeLabel, { color: night ? '#A5B4FC' : theme.textColor }]}>
        {theme.greeting.toUpperCase()}
      </Text>

      {/* Clock */}
      <View style={styles.clockRow}>
        <Text style={[styles.clockText, { color: night ? '#E0E7FF' : Colors.light.onSurface }]}>
          {hours}
        </Text>
        <Text style={[styles.clockColon, { color: night ? '#818CF8' : theme.iconBg }]}>:</Text>
        <Text style={[styles.clockText, { color: night ? '#E0E7FF' : Colors.light.onSurface }]}>
          {minutes}
        </Text>
      </View>

      {/* Decorative stars for night */}
      {night && (
        <>
          <View style={[styles.star, { top: 20, left: 30 }]}>
            <Ionicons name="sparkles" size={10} color="rgba(199, 210, 254, 0.5)" />
          </View>
          <View style={[styles.star, { top: 35, right: 45 }]}>
            <Ionicons name="sparkles" size={8} color="rgba(199, 210, 254, 0.3)" />
          </View>
          <View style={[styles.star, { bottom: 60, left: 50 }]}>
            <Ionicons name="sparkles" size={12} color="rgba(199, 210, 254, 0.4)" />
          </View>
          <View style={[styles.star, { bottom: 45, right: 35 }]}>
            <Ionicons name="sparkles" size={6} color="rgba(199, 210, 254, 0.3)" />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl + Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  iconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg - 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: Spacing.sm,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  clockText: {
    fontSize: 56,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    letterSpacing: -2,
  },
  clockColon: {
    fontSize: 48,
    fontFamily: Typography.fontFamily,
    fontWeight: '300',
    marginHorizontal: 4,
  },
  star: {
    position: 'absolute',
  },
});
