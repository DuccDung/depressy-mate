import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onFilterPress: () => void;
  placeholder?: string;
}

export default function SearchFilterBar({
  searchQuery,
  onSearchChange,
  onFilterPress,
  placeholder = "Tìm kiếm...",
}: SearchFilterBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color={Colors.light.onSurfaceVariant} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.light.onSurfaceVariant}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearButton}>
            <Feather name="x-circle" size={18} color={Colors.light.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={styles.filterButton} onPress={onFilterPress}>
        <Feather name="sliders" size={20} color={Colors.light.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.light.surfaceContainerHigh,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: Typography.fontFamily,
    fontSize: Typography.sizes.body,
    color: Colors.light.onSurface,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.surfaceContainerHigh,
  },
});
