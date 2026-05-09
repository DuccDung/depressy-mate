import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';

interface ActionGridProps {
  onAction: (id: string) => void;
}

export const ActionGrid: React.FC<ActionGridProps> = ({ onAction }) => {
  const actions = [
    {
      id: 'breathe',
      title: 'Hít thở',
      sub: '2 phút thực hành',
      icon: 'weather-windy',
      iconSet: 'MaterialCommunityIcons',
      bg: 'rgba(167,243,208, 0.4)',
      iconCol: Colors.light.secondary
    },
    {
      id: 'checkin',
      title: 'Cập nhật trạng thái',
      sub: 'Bạn ổn không?',
      icon: 'heart-outline',
      iconSet: 'Ionicons',
      bg: 'rgba(221,214,254, 0.4)',
      iconCol: Colors.light.primary
    },
    {
      id: 'reflect',
      title: 'Nhật ký',
      sub: 'Câu chuyện của bạn',
      icon: 'book-outline',
      iconSet: 'Ionicons',
      bg: 'rgba(191,219,254, 0.4)',
      iconCol: '#3B82F6'
    },
    {
      id: 'sleep',
      title: 'Giấc ngủ',
      sub: 'Thư giãn',
      icon: 'moon-outline',
      iconSet: 'Ionicons',
      bg: '#FFF3E0',
      iconCol: '#FB923C'
    }
  ];

  const renderIcon = (item: any) => {
    if (item.iconSet === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={item.icon as any} size={24} color={item.iconCol} />;
    }
    return <Ionicons name={item.icon as any} size={24} color={item.iconCol} />;
  };

  return (
    <>
      <Text style={styles.sectionHeading}>Hành động nhanh</Text>
      <View style={styles.gridContainer}>
        {actions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.gridItem, { backgroundColor: item.bg }]}
            onPress={() => onAction(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.gridIconBox}>
              {renderIcon(item)}
            </View>
            <View>
              <Text style={styles.gridTitle}>{item.title}</Text>
              <Text style={styles.gridSub}>{item.sub}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeading: {
    fontSize: 20,
    fontFamily: 'Manrope',
    fontWeight: 'bold',
    color: Colors.light.onSurface,
    marginBottom: Spacing.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '47%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: 8,
  },
  gridIconBox: {
    width: 48,
    height: 48,
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  gridTitle: {
    fontFamily: 'Manrope',
    fontWeight: 'bold',
    color: Colors.light.onSurface,
    fontSize: 15,
  },
  gridSub: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: Colors.light.onSurfaceVariant,
    marginTop: 2,
  },
});
