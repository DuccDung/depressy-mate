import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, currentPage === 1 && styles.buttonDisabled]} 
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <Feather 
          name="chevron-left" 
          size={20} 
          color={currentPage === 1 ? Colors.light.outlineVariant : Colors.light.onSurface} 
        />
      </TouchableOpacity>

      <Text style={styles.pageText}>
        Trang <Text style={styles.boldText}>{currentPage}</Text> / {totalPages}
      </Text>

      <TouchableOpacity 
        style={[styles.button, currentPage === totalPages && styles.buttonDisabled]} 
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <Feather 
          name="chevron-right" 
          size={20} 
          color={currentPage === totalPages ? Colors.light.outlineVariant : Colors.light.onSurface} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.surfaceContainerHigh,
    marginHorizontal: Spacing.md,
  },
  buttonDisabled: {
    backgroundColor: Colors.light.surface,
    borderColor: 'transparent',
  },
  pageText: {
    fontFamily: Typography.fontFamily,
    fontSize: Typography.sizes.body,
    color: Colors.light.onSurfaceVariant,
  },
  boldText: {
    fontWeight: Typography.weights.bold as any,
    color: Colors.light.onSurface,
  },
});
