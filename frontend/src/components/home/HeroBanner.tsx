import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../constants/theme';

interface HeroBannerProps {
  onPress: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onPress }) => {
  return (
    <View style={styles.heroCardContainer}>
      <View style={[styles.heroCard, Shadows.ambient]}>
        <View style={styles.heroCardContent}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroTitle}>Bắt đầu hành trình</Text>
              <Text style={styles.heroSubtitle}>Làm bài kiếm tra tâm lý để hiểu rõ hơn trạng thái tinh thần của bạn</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="rocket-outline" size={28} color={Colors.light.surfaceContainerLowest} />
            </View>
          </View>
          <TouchableOpacity
            style={styles.heroButton}
            activeOpacity={0.8}
            onPress={onPress}
          >
            <Text style={styles.heroButtonText}>Bắt đầu ngay</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.light.primary} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroCardContainer: {
    marginBottom: Spacing.xl,
  },
  heroCard: {
    backgroundColor: '#6C63FF', // Warm Indigo color as requested
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  heroCardContent: {
    padding: Spacing.lg,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Manrope',
    fontWeight: 'bold',
    color: Colors.light.surfaceContainerLowest,
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Manrope',
    color: 'rgba(255,255,255,0.9)',
    maxWidth: 220,
  },
  heroIconWrap: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  heroButton: {
    backgroundColor: Colors.light.surfaceContainerLowest,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroButtonText: {
    color: Colors.light.primary,
    fontWeight: 'bold',
    fontFamily: 'Manrope',
  },
});
