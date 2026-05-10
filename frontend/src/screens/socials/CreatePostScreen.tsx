import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { socialService } from '../../services/socialService';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from '../../components/socials/UserAvatar';

interface CreatePostScreenProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export const CreatePostScreen: React.FC<CreatePostScreenProps> = ({ visible, onClose, onPostCreated }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh/video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      setMediaType(asset.type === 'video' ? 'VIDEO' : 'IMAGE');
    }
  };

  const closeAndReset = () => {
    if (isUploading) return;
    setContent('');
    setMediaUri(null);
    setMediaType(null);
    onClose();
  };

  const handlePost = async () => {
    if (!mediaUri && !content.trim()) {
      Alert.alert('Thiếu nội dung', 'Hãy viết vài dòng hoặc chọn ảnh/video để chia sẻ.');
      return;
    }

    setIsUploading(true);
    try {
      let finalMediaUrl: string | null = null;
      let finalMediaType: 'IMAGE' | 'VIDEO' | null = mediaType;

      if (mediaUri) {
        const fileName = mediaUri.split('/').pop() || `post_${Date.now()}`;
        const contentType = mediaType === 'VIDEO' ? 'video/mp4' : 'image/jpeg';
        const uploadInfo = await socialService.uploadMedia(mediaUri, fileName, contentType);
        finalMediaUrl = uploadInfo.publicUrl;
        finalMediaType = uploadInfo.mediaType;
      }

      await socialService.createPost(content.trim(), finalMediaUrl, finalMediaType);

      setContent('');
      setMediaUri(null);
      setMediaType(null);
      onPostCreated();
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.message || 'Không thể đăng bài viết lúc này.';
      console.error('Failed to create post:', errMsg);
      Alert.alert('Chưa đăng được bài', errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={closeAndReset} presentationStyle="pageSheet">
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={closeAndReset} style={styles.headerBtn} disabled={isUploading}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tạo bài viết</Text>
            <TouchableOpacity
              onPress={handlePost}
              style={[styles.postButton, (!content.trim() && !mediaUri) && styles.postButtonDisabled]}
              disabled={isUploading || (!content.trim() && !mediaUri)}
            >
              {isUploading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.postText}>Đăng</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.authorRow}>
            <UserAvatar
              userId={user?.id || ''}
              size={42}
              prefetchData={{ avatarUrl: user?.avatarUrl, name: user?.fullName }}
              containerStyle={styles.authorAvatar}
            />
            <View>
              <Text style={styles.authorName}>{user?.fullName || 'Bạn'}</Text>
              <Text style={styles.authorHint}>Chia sẻ điều hữu ích cho cộng đồng</Text>
            </View>
          </View>

          <View style={styles.contentArea}>
            <TextInput
              style={styles.input}
              placeholder="Bạn muốn chia sẻ điều gì hôm nay?"
              placeholderTextColor={Colors.light.onSurfaceVariant}
              multiline
              autoFocus
              value={content}
              onChangeText={setContent}
              editable={!isUploading}
              maxLength={3000}
            />

            {mediaUri && (
              <View style={styles.mediaPreviewContainer}>
                <Image source={{ uri: mediaUri }} style={styles.mediaPreview} />
                {mediaType === 'VIDEO' && (
                  <View style={styles.videoBadge}>
                    <Ionicons name="play" size={18} color="#FFF" />
                  </View>
                )}
                <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setMediaUri(null)} disabled={isUploading}>
                  <Ionicons name="close" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.toolsRow}>
            <TouchableOpacity style={styles.toolBtn} onPress={pickMedia} disabled={isUploading}>
              <Ionicons name="image-outline" size={22} color={Colors.light.primary} />
              <Text style={styles.toolText}>Ảnh / Video</Text>
            </TouchableOpacity>
            <Text style={styles.counterText}>{content.length}/3000</Text>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.outlineVariant,
  },
  headerBtn: {
    width: 64,
  },
  cancelText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    color: Colors.light.onSurfaceVariant,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.onSurface,
  },
  postButton: {
    width: 64,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonDisabled: {
    opacity: 0.45,
  },
  postText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  authorAvatar: {
    marginRight: Spacing.sm,
  },
  authorName: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.onSurface,
  },
  authorHint: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: Colors.light.onSurfaceVariant,
    marginTop: 2,
  },
  contentArea: {
    flex: 1,
    padding: Spacing.md,
  },
  input: {
    fontFamily: 'Manrope',
    fontSize: 17,
    color: Colors.light.onSurface,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  mediaPreviewContainer: {
    marginTop: Spacing.md,
    position: 'relative',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.light.surfaceContainerHighest,
  },
  mediaPreview: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  videoBadge: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 54,
    height: 54,
    marginLeft: -27,
    marginTop: -27,
    borderRadius: 27,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.outlineVariant,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  toolText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.onSurface,
  },
  counterText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: Colors.light.onSurfaceVariant,
  },
});
