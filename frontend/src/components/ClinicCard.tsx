import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';

interface ClinicCardProps {
  id: string;
  name: string;
  address: string;
  working_hours: string;
  price_reference: string;
  url_avatar: string;
  onPressContact: () => void;
}

export default function ClinicCard({
  name,
  address,
  working_hours,
  price_reference,
  url_avatar,
  onPressContact,
}: ClinicCardProps) {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerContainer}>
        <Image 
          source={{ uri: url_avatar || 'https://via.placeholder.com/200' }} 
          style={styles.image} 
          resizeMode="cover"
        />
        <View style={styles.overlayTextContainer}>
          <Text style={styles.nameText} numberOfLines={2}>{name}</Text>
        </View>
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.detailRow}>
          <Feather name="map-pin" size={16} color={Colors.light.secondary} style={styles.icon} />
          <Text style={styles.detailText} numberOfLines={2}>{address}</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.detailRow, { flex: 1 }]}>
            <Feather name="clock" size={16} color={Colors.light.secondary} style={styles.icon} />
            <Text style={styles.detailText}>{working_hours}</Text>
          </View>
          <View style={[styles.detailRow, { flex: 1, paddingLeft: 8 }]}>
            <Feather name="tag" size={16} color={Colors.light.secondary} style={styles.icon} />
            <Text style={styles.detailText} numberOfLines={1}>{price_reference}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.ambient,
    ...Shadows.ghostBorder,
  },
  headerContainer: {
    height: 120,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayTextContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
    backgroundColor: 'rgba(25, 28, 30, 0.65)',
  },
  nameText: {
    fontFamily: Typography.fontFamily,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold as any,
    color: '#FFFFFF',
  },
  contentContainer: {
    padding: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  detailText: {
    fontFamily: Typography.fontFamily,
    fontSize: 13,
    color: Colors.light.onSurfaceVariant,
    flex: 1,
  },
  contactButton: {
    backgroundColor: Colors.light.background,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.light.secondary,
  },
  contactButtonText: {
    fontFamily: Typography.fontFamily,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold as any,
    color: Colors.light.secondary,
  },
});
