import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface AssessmentCardProps {
  assessment: any;
  onPress: () => void;
}

const palette = {
  card: '#FFFFFF',
  text: '#111817',
  muted: '#65736F',
  primary: '#1D6B63',
  primarySoft: '#E3F1EE',
  accent: '#7350A6',
  accentSoft: '#F0E9FB',
  border: 'rgba(20,78,73,0.12)',
};

export default function AssessmentCard({ assessment, onPress }: AssessmentCardProps) {
  return (
    <TouchableOpacity style={[styles.card, Shadows.ambient]} onPress={onPress} activeOpacity={0.86}>
      <View style={styles.headerRow}>
        <Text style={styles.codeBadge}>{assessment.assessment_code}</Text>
        <Text style={styles.ageBadge}>Độ tuổi: {assessment.target_age}</Text>
      </View>
      <Text style={styles.title}>{assessment.name}</Text>
      <Text style={styles.description} numberOfLines={3}>
        {assessment.description}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  codeBadge: {
    backgroundColor: palette.primary,
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Manrope',
    overflow: 'hidden',
  },
  ageBadge: {
    backgroundColor: palette.accentSoft,
    color: palette.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Manrope',
    overflow: 'hidden',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: palette.text,
    lineHeight: 24,
    marginBottom: 6,
    fontFamily: 'Manrope',
  },
  description: {
    fontSize: 14,
    color: palette.muted,
    lineHeight: 21,
    fontFamily: 'Manrope',
  },
});
