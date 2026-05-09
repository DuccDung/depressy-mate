import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../../../constants/theme';

const STEPS = [
  {
    number: 1,
    text: 'Hít vào từ từ bằng mũi trong ',
    highlight: '4 giây',
    suffix: ', cảm nhận phổi đầy không khí.',
    bgOpacity: 1,
  },
  {
    number: 2,
    text: 'Giữ hơi thở nhẹ nhàng trong ',
    highlight: '4 giây',
    suffix: ', để sự tĩnh lặng lan tỏa.',
    bgOpacity: 0.5,
  },
  {
    number: 3,
    text: 'Thở ra chậm rãi bằng miệng trong ',
    highlight: '6 giây',
    suffix: ', thả trôi mọi căng thẳng.',
    bgOpacity: 0.3,
  },
];

export default function HowItWorksCard() {
  return (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Cách thực hiện</Text>
        <View style={styles.divider} />
      </View>

      {/* Steps */}
      <View style={styles.stepsContainer}>
        {STEPS.map((step) => (
          <View key={step.number} style={styles.stepRow}>
            <View style={[styles.stepBadge, { opacity: step.bgOpacity }]}>
              <Text style={styles.stepNumber}>{step.number}</Text>
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepText}>
                {step.text}
                <Text style={styles.stepHighlight}>{step.highlight}</Text>
                {step.suffix}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.lg - 8, // ~24px like xl in design
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.ghostBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    color: Colors.light.onSurface,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(203, 195, 215, 0.2)',
  },
  stepsContainer: {
    gap: Spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md + 4,
  },
  stepBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.secondaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumber: {
    fontSize: 18,
    fontFamily: Typography.fontFamily,
    fontWeight: '800',
    color: '#007169', // on-secondary-container from design
  },
  stepTextContainer: {
    flex: 1,
    paddingTop: 2,
  },
  stepText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    fontWeight: '500',
    color: Colors.light.onSurfaceVariant,
    lineHeight: 22,
  },
  stepHighlight: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
});
