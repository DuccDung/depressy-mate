import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { SleepTrack } from './sleepData';

interface Props {
  track: SleepTrack;
  onPress: () => void;
  index: number;
}

export default function SoundTrackItem({ track, onPress, index }: Props) {
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: track.bgColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Album Art */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: track.image }} style={styles.image} />
      </View>

      {/* Track Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.meta}>
          {track.duration} • {track.categoryLabel}
        </Text>
      </View>

      {/* Play Button */}
      <TouchableOpacity style={styles.playButton} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name="play" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginRight: Spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  infoContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    color: Colors.light.onSurface,
    marginBottom: 3,
  },
  meta: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    fontWeight: '600',
    color: Colors.light.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
});
