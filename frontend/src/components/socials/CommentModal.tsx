import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { socialService, Comment } from '../../services/socialService';
import { UserAvatar } from './UserAvatar';

interface CommentModalProps {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
  onCommentAdded: () => void; // Trigger để feed cập nhật comment_count
}

export const CommentModal: React.FC<CommentModalProps> = ({ visible, postId, onClose, onCommentAdded }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lazy load states
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (visible && postId) {
      setComments([]);
      setCursor(null);
      setHasMore(true);
      fetchComments();
    }
  }, [visible, postId]);

  const fetchComments = async (currentCursor?: string | null) => {
    if (!postId || loading) return;
    if (!hasMore && currentCursor !== undefined) return;

    setLoading(true);
    try {
      const data = await socialService.getComments(postId, 15, currentCursor || undefined);
      if (currentCursor) {
        setComments(prev => [...prev, ...data.data]);
      } else {
        setComments(data.data);
      }
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (error) {
      console.error('Lỗi lấy bình luận:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!inputText.trim() || !postId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // GIẢI THÍCH: GỌI API THẬT, NHẬN OBJECT CHUẨN TỪ DB SAU ĐÓ MỚI UPDATE STATE (KHÔNG CẬP NHẬT GIẢ)
      const newComment = await socialService.createComment(postId, inputText);
      setComments(prev => [newComment, ...prev]);
      setInputText('');
      onCommentAdded();
    } catch (error) {
      console.error('Lỗi khi comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentRow}>
      <UserAvatar 
        userId={item.user_id} 
        size={36} 
        prefetchData={{ avatarUrl: item.author_avatar, name: item.author_name }} 
        containerStyle={{ marginRight: Spacing.sm }}
      />
      <View style={styles.commentBubble}>
        <Text style={styles.commentAuthor}>{item.author_name}</Text>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View style={{ width: 40 }} />
            <Text style={styles.headerTitle}>Bình luận</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.light.onSurface} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={comments}
            keyExtractor={item => item.id}
            renderItem={renderComment}
            contentContainerStyle={styles.listContent}
            onEndReached={() => fetchComments(cursor)}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loading ? <ActivityIndicator size="small" color={Colors.light.primary} style={{ marginVertical: 20 }} /> : null}
            ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text> : null}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Viết bình luận..."
              placeholderTextColor={Colors.light.onSurfaceVariant}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
              onPress={handlePostComment}
              disabled={!inputText.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFF" />
              )}
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
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.onSurface,
  },
  closeBtn: {
    width: 40,
    alignItems: 'flex-end',
  },
  listContent: {
    padding: Spacing.md,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: Spacing.sm,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: Colors.light.surfaceContainer,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  commentAuthor: {
    fontFamily: 'Manrope',
    fontWeight: 'bold',
    fontSize: 14,
    color: Colors.light.onSurface,
  },
  commentText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: Colors.light.onSurface,
    marginTop: 2,
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontFamily: 'Manrope',
    color: Colors.light.onSurfaceVariant,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.outlineVariant,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.light.surfaceContainerHighest,
    borderRadius: BorderRadius.pill,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    fontFamily: 'Manrope',
    color: Colors.light.onSurface,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  }
});
