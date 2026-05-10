import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../../../constants/theme';
import SleepClockHeader from '../../components/sleep/SleepClockHeader';
import SoundTrackItem from '../../components/sleep/SoundTrackItem';
import SleepTipCard from '../../components/sleep/SleepTipCard';
import MusicPlayerModal from '../../components/sleep/MusicPlayerModal';
import { SLEEP_TRACKS, SleepTrack } from '../../components/sleep/sleepData';
import { healthService } from '../../services/healthService';

interface Props {
  onClose: () => void;
}

export default function SleepScreen({ onClose }: Props) {
  const [selectedTrack, setSelectedTrack] = useState<SleepTrack | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const handleTrackPress = (track: SleepTrack) => {
    setSelectedTrack(track);
    setShowPlayer(true);
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setSelectedTrack(null);
  };

  const handleSleepSessionEnd = async ({ track, durationMs, listenedMs }: { track: SleepTrack; durationMs: number; listenedMs: number }) => {
    try {
      await healthService.createSleepSession({
        track_id: track.id,
        track_title: track.title,
        duration_ms: durationMs,
        listened_ms: listenedMs,
        completed: durationMs > 0 && listenedMs >= durationMs * 0.9,
      });
    } catch (error) {
      console.warn('Could not save sleep session:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Âm thanh hỗ trợ giấc ngủ</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Clock Section */}
        <SleepClockHeader />

        {/* Sound List Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Âm thanh thư giãn</Text>
            <Text style={styles.sectionSubtitle}>Chọn một giai điệu dịu dàng</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.seeAllText}>Tất cả</Text>
          </TouchableOpacity>
        </View>

        {/* Track List */}
        <View style={styles.trackList}>
          {SLEEP_TRACKS.map((track, index) => (
            <SoundTrackItem
              key={track.id}
              track={track}
              index={index}
              onPress={() => handleTrackPress(track)}
            />
          ))}
        </View>

        {/* Sleep Tip */}
        <SleepTipCard />

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Music Player Modal */}
      <MusicPlayerModal
        visible={showPlayer}
        track={selectedTrack}
        onClose={handleClosePlayer}
        onSessionEnd={handleSleepSessionEnd}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.onSurface,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    fontWeight: '500',
    color: Colors.light.onSurfaceVariant,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  trackList: {
    marginBottom: Spacing.md,
  },
});
