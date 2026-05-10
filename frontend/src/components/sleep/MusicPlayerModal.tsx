import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { SleepTrack } from './sleepData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  track: SleepTrack | null;
  onClose: () => void;
  onSessionEnd?: (payload: { track: SleepTrack; durationMs: number; listenedMs: number }) => void;
}

export default function MusicPlayerModal({ visible, track, onClose, onSessionEnd }: Props) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const positionRef = React.useRef(0);
  const durationRef = React.useRef(0);

  // Album art animation
  const albumScale = useSharedValue(0.85);
  const albumOpacity = useSharedValue(0);

  // Vinyl disc pulse
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (visible && track) {
      albumScale.value = withSpring(1, { damping: 14, stiffness: 90 });
      albumOpacity.value = withTiming(1, { duration: 400 });
      loadAudio();
    } else {
      albumScale.value = 0.85;
      albumOpacity.value = 0;
    }
  }, [visible, track]);

  // Pulsing animation when playing
  useEffect(() => {
    if (isPlaying) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [isPlaying]);

  const loadAudio = async () => {
    if (!track) return;

    try {
      setIsLoading(true);
      // Unload existing sound
      if (sound) {
        await sound.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.audioUrl },
        { shouldPlay: false, isLooping: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsLoading(false);
    } catch (error) {
      console.log('Error loading audio:', error);
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      positionRef.current = status.positionMillis || 0;
      durationRef.current = status.durationMillis || 0;
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying || false);
    }
  };

  const handlePlayPause = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.log('Error toggling playback:', error);
    }
  };

  const handleSeek = async (direction: 'forward' | 'backward') => {
    if (!sound) return;

    try {
      const newPosition = direction === 'forward'
        ? Math.min(position + 15000, duration)
        : Math.max(position - 15000, 0);
      await sound.setPositionAsync(newPosition);
    } catch (error) {
      console.log('Error seeking:', error);
    }
  };

  const handleClose = async () => {
    try {
      if (track && positionRef.current >= 1000) {
        onSessionEnd?.({
          track,
          durationMs: durationRef.current || track.durationMs,
          listenedMs: positionRef.current,
        });
      }

      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
    } catch (error) {
      console.log('Error cleaning up audio:', error);
    }
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    positionRef.current = 0;
    durationRef.current = 0;
    onClose();
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  const albumStyle = useAnimatedStyle(() => ({
    transform: [{ scale: albumScale.value }],
    opacity: albumOpacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  if (!track) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Blurred Background Tint */}
        <View style={[styles.bgTint, { backgroundColor: track.bgColor }]} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton} activeOpacity={0.7}>
            <Ionicons name="chevron-down" size={28} color={Colors.light.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>ĐANG PHÁT</Text>
            <Text style={styles.headerCategory}>{track.categoryLabel}</Text>
          </View>
          <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
            <Ionicons name="ellipsis-horizontal" size={24} color={Colors.light.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Album Art */}
        <Animated.View style={[styles.albumSection, albumStyle]}>
          <Animated.View style={[styles.albumShadow, pulseStyle]}>
            <View style={styles.albumContainer}>
              <Image source={{ uri: track.image }} style={styles.albumImage} />
              {/* Vinyl disc overlay */}
              <View style={styles.vinylOverlay}>
                <View style={styles.vinylCenter} />
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.trackArtist}>{track.artist}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            <View style={[styles.progressDot, { left: `${progress * 100}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={() => {}} activeOpacity={0.6}>
            <Ionicons name="shuffle" size={22} color={Colors.light.onSurfaceVariant} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => handleSeek('backward')}
            activeOpacity={0.6}
          >
            <Ionicons name="play-back" size={28} color={Colors.light.onSurface} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlayPause}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <Text style={styles.loadingText}>...</Text>
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color="#FFFFFF"
                style={!isPlaying ? { marginLeft: 3 } : undefined}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => handleSeek('forward')}
            activeOpacity={0.6}
          >
            <Ionicons name="play-forward" size={28} color={Colors.light.onSurface} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtn} onPress={() => {}} activeOpacity={0.6}>
            <Ionicons name="repeat" size={22} color={Colors.light.secondary} />
          </TouchableOpacity>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.bottomBtn} activeOpacity={0.6}>
            <Ionicons name="heart-outline" size={22} color={Colors.light.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomBtn} activeOpacity={0.6}>
            <Ionicons name="timer-outline" size={22} color={Colors.light.onSurfaceVariant} />
            <Text style={styles.bottomBtnText}>Hẹn giờ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomBtn} activeOpacity={0.6}>
            <Ionicons name="share-outline" size={22} color={Colors.light.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const ALBUM_SIZE = SCREEN_WIDTH * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: Spacing.lg,
  },
  bgTint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    color: Colors.light.onSurfaceVariant,
    letterSpacing: 2,
  },
  headerCategory: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.onSurface,
    marginTop: 2,
  },
  albumSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  albumShadow: {
    borderRadius: BorderRadius.lg,
    ...Shadows.ambient,
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.15,
    shadowRadius: 40,
  },
  albumContainer: {
    width: ALBUM_SIZE,
    height: ALBUM_SIZE,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  albumImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  vinylOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vinylCenter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  trackInfo: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  trackTitle: {
    fontSize: 22,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.onSurface,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  trackArtist: {
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    fontWeight: '500',
    color: Colors.light.onSurfaceVariant,
  },
  progressSection: {
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.light.surfaceContainerHigh,
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
  progressDot: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.primary,
    marginLeft: -6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    fontWeight: '600',
    color: Colors.light.onSurfaceVariant,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  controlBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl + Spacing.md,
  },
  bottomBtn: {
    alignItems: 'center',
    gap: 4,
  },
  bottomBtnText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily,
    fontWeight: '600',
    color: Colors.light.onSurfaceVariant,
  },
});
