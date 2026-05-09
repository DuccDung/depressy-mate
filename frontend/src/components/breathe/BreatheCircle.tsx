import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography, Spacing, BorderRadius } from '../../../constants/theme';

const CIRCLE_SIZE = 280;
const AURA_SIZE = CIRCLE_SIZE * 1.35;
const STROKE_WIDTH = 12;
const PROGRESS_STROKE = 14;
const RADIUS = (CIRCLE_SIZE - PROGRESS_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type BreathePhase = 'idle' | 'inhale' | 'hold' | 'exhale';

interface Props {
  countdown: number;
  phase: BreathePhase;
  phaseLabel: string;
  progress: number;
  isRunning: boolean;
  currentCycle: number;
  totalCycles: number;
}


export default function BreatheCircle({
  countdown,
  phase,
  phaseLabel,
  progress,
  isRunning,
  currentCycle,
  totalCycles,
}: Props) {
  // Pulsing scale animation for the aura
  const auraScale = useSharedValue(1);
  const auraOpacity = useSharedValue(0.2);
  // Inner glow pulse
  const innerGlowScale = useSharedValue(0.85);
  const innerGlowOpacity = useSharedValue(0.3);
  // Ring border pulse
  const ringBorderScale = useSharedValue(1.05);

  useEffect(() => {
    if (phase === 'inhale') {
      // Expand during inhale
      auraScale.value = withTiming(1.25, { duration: 4000, easing: Easing.out(Easing.quad) });
      auraOpacity.value = withTiming(0.35, { duration: 4000 });
      innerGlowScale.value = withTiming(1, { duration: 4000, easing: Easing.out(Easing.quad) });
      innerGlowOpacity.value = withTiming(0.5, { duration: 4000 });
      ringBorderScale.value = withTiming(1.12, { duration: 4000, easing: Easing.out(Easing.quad) });
    } else if (phase === 'hold') {
      // Gentle subtle pulse during hold
      auraScale.value = withRepeat(
        withSequence(
          withTiming(1.28, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.22, { duration: 1000, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
      auraOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 })
        ),
        -1,
        true
      );
    } else if (phase === 'exhale') {
      // Shrink during exhale
      auraScale.value = withTiming(1, { duration: 6000, easing: Easing.in(Easing.quad) });
      auraOpacity.value = withTiming(0.15, { duration: 6000 });
      innerGlowScale.value = withTiming(0.75, { duration: 6000, easing: Easing.in(Easing.quad) });
      innerGlowOpacity.value = withTiming(0.2, { duration: 6000 });
      ringBorderScale.value = withTiming(1.02, { duration: 6000, easing: Easing.in(Easing.quad) });
    } else {
      // Idle: gentle floating animation
      auraScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
      auraOpacity.value = withRepeat(
        withSequence(
          withTiming(0.25, { duration: 2000 }),
          withTiming(0.15, { duration: 2000 })
        ),
        -1,
        true
      );
      innerGlowScale.value = 0.85;
      innerGlowOpacity.value = 0.3;
      ringBorderScale.value = 1.05;
    }
  }, [phase]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      cancelAnimation(auraScale);
      cancelAnimation(auraOpacity);
      cancelAnimation(innerGlowScale);
      cancelAnimation(innerGlowOpacity);
      cancelAnimation(ringBorderScale);
    };
  }, []);

  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: auraScale.value }],
    opacity: auraOpacity.value,
  }));

  const innerGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerGlowScale.value }],
    opacity: innerGlowOpacity.value,
  }));

  const ringBorderStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringBorderScale.value }],
  }));

  // Progress ring stroke offset
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  // Phase color
  const getPhaseColor = () => {
    switch (phase) {
      case 'inhale': return '#0D9488';  // teal-600
      case 'hold': return Colors.light.primary;
      case 'exhale': return '#2DD4BF';  // teal-400
      default: return '#5EEAD4'; // teal-300
    }
  };

  return (
    <View style={styles.container}>
      {/* Outer aura glow */}
      <Animated.View style={[styles.aura, auraStyle]} />

      {/* Animated ring border */}
      <Animated.View style={[styles.ringBorder, ringBorderStyle]} />

      {/* Main circle */}
      <View style={styles.mainCircle}>
        {/* Inner mint glow */}
        <Animated.View style={[styles.innerGlow, innerGlowStyle]} />

        {/* Countdown + Label */}
        <View style={styles.textContainer}>
          <Text style={styles.countdownText}>{countdown}</Text>
          <Text style={styles.phaseLabel}>{phaseLabel.toUpperCase()}</Text>
        </View>

        {/* SVG Progress Ring */}
        <Svg style={styles.svgRing} width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          {/* Background ring */}
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke="rgba(204, 251, 241, 0.6)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Progress ring */}
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke={getPhaseColor()}
            strokeWidth={PROGRESS_STROKE}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
          />
        </Svg>
      </View>

      {/* Cycle indicator */}
      {phase !== 'idle' && (
        <View style={styles.cycleIndicator}>
          <Text style={styles.cycleText}>
            Vòng {currentCycle + 1} / {totalCycles}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: AURA_SIZE,
    height: AURA_SIZE + 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  aura: {
    position: 'absolute',
    width: AURA_SIZE,
    height: AURA_SIZE,
    borderRadius: AURA_SIZE / 2,
    backgroundColor: 'rgba(45, 212, 191, 0.25)',
  },
  ringBorder: {
    position: 'absolute',
    width: CIRCLE_SIZE + 24,
    height: CIRCLE_SIZE + 24,
    borderRadius: (CIRCLE_SIZE + 24) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(121, 247, 234, 0.3)',
  },
  mainCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#E6FAF7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Ambient shadow
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
  },
  innerGlow: {
    position: 'absolute',
    width: CIRCLE_SIZE - 32,
    height: CIRCLE_SIZE - 32,
    borderRadius: (CIRCLE_SIZE - 32) / 2,
    backgroundColor: '#2DD4BF',
  },
  textContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  countdownText: {
    fontSize: 80,
    fontFamily: Typography.fontFamily,
    fontWeight: '200',
    color: Colors.light.secondary,
    lineHeight: 88,
  },
  phaseLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    color: Colors.light.onSurfaceVariant,
    letterSpacing: 3,
    marginTop: 4,
  },
  svgRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cycleIndicator: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  cycleText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    fontWeight: '600',
    color: Colors.light.onSurfaceVariant,
  },
});
