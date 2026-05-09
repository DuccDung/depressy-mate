import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';

interface Props {
  imageUri: string | null;
  onImageSelected: (uri: string) => void;
  onImageRemoved: () => void;
}

export default function ImagePickerSection({ imageUri, onImageSelected, onImageRemoved }: Props) {

  const requestPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền truy cập thư viện ảnh để sử dụng tính năng này.');
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      onImageSelected(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền sử dụng camera.');
        return;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      onImageSelected(result.assets[0].uri);
    }
  };

  if (imageUri) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Ảnh đính kèm</Text>
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <TouchableOpacity style={styles.removeButton} onPress={onImageRemoved} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={28} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thêm ảnh (tuỳ chọn)</Text>
      <View style={styles.buttonsRow}>
        <TouchableOpacity style={styles.pickButton} onPress={pickImage} activeOpacity={0.7}>
          <View style={styles.pickIconBox}>
            <Ionicons name="images-outline" size={22} color={Colors.light.primary} />
          </View>
          <Text style={styles.pickLabel}>Thư viện</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.pickButton} onPress={takePhoto} activeOpacity={0.7}>
          <View style={styles.pickIconBox}>
            <Ionicons name="camera-outline" size={22} color={Colors.light.secondary} />
          </View>
          <Text style={styles.pickLabel}>Chụp ảnh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    fontWeight: '700',
    color: Colors.light.onSurface,
    marginBottom: Spacing.md,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  pickButton: {
    flex: 1,
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadows.ghostBorder,
  },
  pickIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pickLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    fontWeight: '600',
    color: Colors.light.onSurfaceVariant,
  },
  previewContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
  },
});
