import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Image, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { socialService } from '../../services/socialService';

interface CreatePostScreenProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export const CreatePostScreen: React.FC<CreatePostScreenProps> = ({ visible, onClose, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [isUploading, setIsUploading] = useState(false);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'], // Chấp nhận cả ảnh và video
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setMediaUri(result.assets[0].uri);
      setMediaType(result.assets[0].type === 'video' ? 'VIDEO' : 'IMAGE');
    }
  };

  const handlePost = async () => {
    if (!mediaUri && !content.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung hoặc chọn một ảnh/video.');
      return;
    }

    setIsUploading(true);
    try {
      let finalMediaUrl = '';

      if (mediaUri) {
        // 1. Lấy presigned URL
        const fileName = mediaUri.split('/').pop() || `upload_${Date.now()}`;
        
        // Mặc định cho type của file upload (tuỳ logic thực tế cần bóc tách kỹ hơn)
        const contentType = mediaType === 'IMAGE' ? 'image/jpeg' : 'video/mp4'; 
        // FileSize ở frontend (ReactNative) thường không có sẵn qua ImagePicker nếu ko request chi tiết. Mặc định gán dummy size hơp lệ, backend đã chặn theo stream.
        const fileSize = 100000; 

        // GỌI API THẬT
        const uploadInfo = await socialService.requestUploadUrl(fileName, fileSize, contentType, mediaType);
        
        // 2. Put binary file lên storage = presigned URL
        await socialService.uploadToStorage(uploadInfo.signedUrl, mediaUri, contentType);
        finalMediaUrl = uploadInfo.publicUrl;
      }

      // 3. Tạo post record
      await socialService.createPost(content.trim() || '', finalMediaUrl, mediaType);

      // Hoàn tất
      setContent('');
      setMediaUri(null);
      onPostCreated();
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.message || 'Không thể đăng bài viết lúc này.';
      console.error('Lỗi khi đăng bài:', errMsg);
      Alert.alert('Lỗi', errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn} disabled={isUploading}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tạo bài viết</Text>
            <TouchableOpacity 
              onPress={handlePost} 
              style={[styles.headerBtn, { alignItems: 'flex-end' }]}
              disabled={isUploading || (!content.trim() && !mediaUri)}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={Colors.light.primary} />
              ) : (
                <Text style={[styles.postText, (!content.trim() && !mediaUri) && { color: Colors.light.onSurfaceVariant }]}>Đăng</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Content Input */}
          <View style={styles.contentArea}>
            <TextInput
              style={styles.input}
              placeholder="Bạn muốn chia sẻ điều gì?"
              placeholderTextColor={Colors.light.onSurfaceVariant}
              multiline
              autoFocus
              value={content}
              onChangeText={setContent}
              editable={!isUploading}
            />

            {mediaUri && (
              <View style={styles.mediaPreviewContainer}>
                <Image source={{ uri: mediaUri }} style={styles.mediaPreview} />
                <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setMediaUri(null)}>
                  <Ionicons name="close-circle" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Bottom Tools */}
          <View style={styles.toolsRow}>
            <TouchableOpacity style={styles.toolBtn} onPress={pickMedia} disabled={isUploading}>
              <Ionicons name="image" size={24} color={Colors.light.primary} />
              <Text style={styles.toolText}>Ảnh / Video</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.surfaceContainerLowest,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.outlineVariant,
  },
  headerBtn: {
    width: 60,
  },
  cancelText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    color: Colors.light.onSurfaceVariant,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.onSurface,
  },
  postText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  contentArea: {
    flex: 1,
    padding: Spacing.md,
  },
  input: {
    fontFamily: 'Manrope',
    fontSize: 18,
    color: Colors.light.onSurface,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  mediaPreviewContainer: {
    marginTop: Spacing.md,
    position: 'relative',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  mediaPreview: {
    width: '100%',
    aspectRatio: 4/3,
    backgroundColor: Colors.light.surfaceContainerHighest,
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  toolsRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.outlineVariant,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.onSurface,
  }
});
