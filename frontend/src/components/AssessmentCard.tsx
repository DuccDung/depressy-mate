import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface AssessmentCardProps {
  assessment: any;
  onPress: () => void;
}

export default function AssessmentCard({ assessment, onPress }: AssessmentCardProps) {
  return (
    <TouchableOpacity style={[styles.card, Shadows.ambient]} onPress={onPress} activeOpacity={0.8}>
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
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  codeBadge: {
    backgroundColor: Colors.light.primary,
    color: Colors.light.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Manrope',
  },
  ageBadge: {
    backgroundColor: Colors.light.surfaceContainerLow,
    color: Colors.light.onSurfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontFamily: 'Manrope',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.onSurface,
    marginBottom: Spacing.xs,
    fontFamily: 'Manrope',
  },
  description: {
    fontSize: 14,
    color: Colors.light.onSurfaceVariant,
    lineHeight: 20,
    fontFamily: 'Manrope',
  },
});
