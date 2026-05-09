import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';

interface DoctorCardProps {
  id: string;
  name: string;
  specialty: string;
  degree: string;
  experience: string;
  price_reference: string;
  url_avatar: string;
  onPressContact: () => void;
}

export default function DoctorCard({
  name,
  specialty,
  degree,
  experience,
  price_reference,
  url_avatar,
  onPressContact,
}: DoctorCardProps) {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <Image 
          source={{ uri: url_avatar || 'https://via.placeholder.com/150' }} 
          style={styles.avatar} 
        />
        <View style={styles.infoCol}>
          <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
          <Text style={styles.degreeText}>{degree} - {specialty}</Text>
        </View>
      </View>
      
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Feather name="briefcase" size={16} color={Colors.light.primary} />
          <Text style={styles.detailText} numberOfLines={2}>{experience}</Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="dollar-sign" size={16} color={Colors.light.primary} />
          <Text style={styles.detailText}>{price_reference}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.contactButton}
        onPress={onPressContact}
        activeOpacity={0.8}
      >
        <Text style={styles.contactButtonText}>Liên hệ ngay</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.ambient,
    ...Shadows.ghostBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  infoCol: {
    flex: 1,
  },
  nameText: {
    fontFamily: Typography.fontFamily,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold as any,
    color: Colors.light.onSurface,
  },
  degreeText: {
    fontFamily: Typography.fontFamily,
    fontSize: Typography.sizes.label,
    color: Colors.light.onSurfaceVariant,
    marginTop: 2,
  },
  detailsContainer: {
    backgroundColor: Colors.light.surfaceContainerLow,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginVertical: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontFamily: Typography.fontFamily,
    fontSize: 13,
    color: Colors.light.onSurfaceVariant,
    marginLeft: 8,
    flex: 1,
  },
  contactButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  contactButtonText: {
    fontFamily: Typography.fontFamily,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold as any,
    color: Colors.light.background,
  },
});
