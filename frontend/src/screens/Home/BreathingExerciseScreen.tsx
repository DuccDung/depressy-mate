import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../../../constants/theme';
import BreatheCircle from '../../components/breathe/BreatheCircle';
import HowItWorksCard from '../../components/breathe/HowItWorksCard';
import SessionCompleteModal from '../../components/breathe/SessionCompleteModal';


// Breathing pattern: Inhale 4s, Hold 4s, Exhale 6s = 14s total per cycle
const BREATHE_CONFIG = {
  inhale: 4,
  hold: 4,
  exhale: 6,
  totalCycles: 8, // ~2 minutes
};

type BreathePhase = 'idle' | 'inhale' | 'hold' | 'exhale';

interface Props {
  onClose: () => void;
}

export default function BreathingExerciseScreen({ onClose }: Props) {
  const [phase, setPhase] = useState<BreathePhase>('idle');
  const [countdown, setCountdown] = useState(BREATHE_CONFIG.inhale);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = React.useRef<BreathePhase>('idle');
  const countdownRef = React.useRef(BREATHE_CONFIG.inhale);
  const cycleRef = React.useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetExercise = useCallback(() => {
    stopTimer();
    setPhase('idle');
    setCountdown(BREATHE_CONFIG.inhale);
    setCurrentCycle(0);
    setIsRunning(false);
    phaseRef.current = 'idle';
    countdownRef.current = BREATHE_CONFIG.inhale;
    cycleRef.current = 0;
  }, [stopTimer]);

  const tick = useCallback(() => {
    countdownRef.current -= 1;

    if (countdownRef.current <= 0) {
      // Transition to next phase
      if (phaseRef.current === 'inhale') {
        phaseRef.current = 'hold';
        countdownRef.current = BREATHE_CONFIG.hold;
        setPhase('hold');
      } else if (phaseRef.current === 'hold') {
        phaseRef.current = 'exhale';
        countdownRef.current = BREATHE_CONFIG.exhale;
        setPhase('exhale');
      } else if (phaseRef.current === 'exhale') {
        cycleRef.current += 1;
        setCurrentCycle(cycleRef.current);

        if (cycleRef.current >= BREATHE_CONFIG.totalCycles) {
          // Session complete
          stopTimer();
          setIsRunning(false);
          setPhase('idle');
          phaseRef.current = 'idle';
          setShowComplete(true);
          return;
        }

        phaseRef.current = 'inhale';
        countdownRef.current = BREATHE_CONFIG.inhale;
        setPhase('inhale');
      }
    }

    setCountdown(countdownRef.current);
  }, [stopTimer]);

  const startExercise = useCallback(() => {
    resetExercise();
    setIsRunning(true);
    phaseRef.current = 'inhale';
    countdownRef.current = BREATHE_CONFIG.inhale;
    setPhase('inhale');
    setCountdown(BREATHE_CONFIG.inhale);

    timerRef.current = setInterval(tick, 1000);
  }, [resetExercise, tick]);

  const pauseExercise = useCallback(() => {
    stopTimer();
    setIsRunning(false);
  }, [stopTimer]);

  const resumeExercise = useCallback(() => {
    setIsRunning(true);
    timerRef.current = setInterval(tick, 1000);
  }, [tick]);

  const handleStartPause = () => {
    if (phase === 'idle') {
      startExercise();
    } else if (isRunning) {
      pauseExercise();
    } else {
      resumeExercise();
    }
  };

  const getPhaseLabel = (): string => {
    switch (phase) {
      case 'inhale': return 'Hít vào';
      case 'hold': return 'Giữ hơi';
      case 'exhale': return 'Thở ra';
      default: return 'Giây';
    }
  };

  const getButtonLabel = (): string => {
    if (phase === 'idle') return 'Bắt đầu';
    if (isRunning) return 'Tạm dừng';
    return 'Tiếp tục';
  };

  const getButtonIcon = (): string => {
    if (phase === 'idle' || !isRunning) return 'play';
    return 'pause';
  };

  // Calculate progress for the ring (0 to 1)
  const getProgress = (): number => {
    if (phase === 'idle') return 0;
    const phaseDuration =
      phase === 'inhale' ? BREATHE_CONFIG.inhale :
        phase === 'hold' ? BREATHE_CONFIG.hold :
          BREATHE_CONFIG.exhale;
    return 1 - (countdown / phaseDuration);
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => { resetExercise(); onClose(); }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sanctuary</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.labelText}>BÀI TẬP CHÁNH NIỆM</Text>
          <Text style={styles.mainTitle}>Hít thở</Text>
        </View>

        {/* Central breathe circle */}
        <BreatheCircle
          countdown={countdown}
          phase={phase}
          phaseLabel={getPhaseLabel()}
          progress={getProgress()}
          isRunning={isRunning}
          currentCycle={currentCycle}
          totalCycles={BREATHE_CONFIG.totalCycles}
        />

        {/* How it works */}
        <HowItWorksCard />

        {/* Start / Pause Button */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleStartPause}
          activeOpacity={0.85}
        >
          <Ionicons name={getButtonIcon() as any} size={22} color="#FFFFFF" />
          <Text style={styles.ctaButtonText}>{getButtonLabel()}</Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Session Complete Modal */}
      <SessionCompleteModal
        visible={showComplete}
        cycles={BREATHE_CONFIG.totalCycles}
        onClose={() => { setShowComplete(false); resetExercise(); }}
        onRestart={() => { setShowComplete(false); startExercise(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E0F7F4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl + Spacing.md,
  },
  labelText: {
    fontSize: Typography.sizes.label,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    color: Colors.light.primary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  mainTitle: {
    fontSize: 36,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.onSurface,
    letterSpacing: Typography.letterSpacing.display,
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: Spacing.lg,
    ...Shadows.ambient,
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.3,
    // Gradient simulation: use primary as bg
    backgroundColor: Colors.light.primary,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
  },
});
