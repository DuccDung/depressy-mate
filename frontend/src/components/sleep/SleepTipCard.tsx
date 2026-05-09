import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { getTodayTip } from './sleepData';

export default function SleepTipCard() {
  const tip = getTodayTip();

  return (
    <View style={styles.container}>
      {/* Decorative accent line */}
      <View style={styles.accentLine} />

      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <Ionicons name="bulb-outline" size={16} color={Colors.light.secondary} />
        </View>
        <Text style={styles.label}>MẸO NGỦ NGON</Text>
      </View>

      <Text style={styles.tipText}>{tip}</Text>

      <View style={styles.footerRow}>
        <Ionicons name="refresh-outline" size={14} color={Colors.light.onSurfaceVariant} />
        <Text style={styles.footerText}>Cập nhật mỗi ngày</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    ...Shadows.ghostBorder,
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.light.secondaryFixed,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(121, 247, 234, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    color: Colors.light.secondary,
    letterSpacing: 2.5,
  },
  tipText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    fontWeight: '500',
    color: Colors.light.onSurfaceVariant,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    fontWeight: '500',
    color: Colors.light.onSurfaceVariant,
    opacity: 0.6,
  },
});
