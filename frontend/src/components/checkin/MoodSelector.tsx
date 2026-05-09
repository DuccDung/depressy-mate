import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '../../../constants/theme';

export type MoodType = 'excellent' | 'good' | 'okay' | 'sad' | 'terrible';

interface MoodOption {
  key: MoodType;
  emoji: string;
  label: string;
  color: string;
  bgActive: string;
}

const MOODS: MoodOption[] = [
  { key: 'excellent', emoji: '🤩', label: 'Tuyệt vời', color: '#16A34A', bgActive: 'rgba(22, 163, 74, 0.12)' },
  { key: 'good', emoji: '😊', label: 'Tốt', color: '#22C55E', bgActive: 'rgba(34, 197, 94, 0.12)' },
  { key: 'okay', emoji: '😐', label: 'Ổn', color: '#F59E0B', bgActive: 'rgba(245, 158, 11, 0.12)' },
  { key: 'sad', emoji: '😢', label: 'Buồn', color: '#3B82F6', bgActive: 'rgba(59, 130, 246, 0.12)' },
  { key: 'terrible', emoji: '😞', label: 'Tệ', color: '#EF4444', bgActive: 'rgba(239, 68, 68, 0.12)' },
];

interface Props {
  selected: MoodType | null;
  onSelect: (mood: MoodType) => void;
}

function MoodItem({ item, isSelected, onPress }: { item: MoodOption; isSelected: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(1.15, { damping: 8 }, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.moodItem,
          isSelected && { backgroundColor: item.bgActive, borderColor: item.color, borderWidth: 2 },
          animStyle,
        ]}
      >
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={[styles.moodLabel, isSelected && { color: item.color, fontWeight: '800' }]}>
          {item.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function MoodSelector({ selected, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bạn đang cảm thấy thế nào?</Text>
      <View style={styles.moodRow}>
        {MOODS.map((item) => (
          <MoodItem
            key={item.key}
            item={item}
            isSelected={selected === item.key}
            onPress={() => onSelect(item.key)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 18,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: Colors.light.onSurface,
    marginBottom: Spacing.lg,
    letterSpacing: -0.3,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodItem: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 60,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  moodLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    fontWeight: '600',
    color: Colors.light.onSurfaceVariant,
  },
});
