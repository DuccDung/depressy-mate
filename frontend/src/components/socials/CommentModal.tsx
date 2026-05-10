import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { Comment, socialService } from '../../services/socialService';
import { UserAvatar } from './UserAvatar';

interface CommentModalProps {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
  onCommentAdded: () => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({ visible, postId, onClose, onCommentAdded }) => {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (visible && postId) {
      setComments([]);
      setCursor(null);
      setHasMore(true);
      setReplyTarget(null);
      setInputText('');
      fetchComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, postId]);

  const fetchComments = async (currentCursor?: string | null) => {
    if (!postId || loading) return;
    if (!hasMore && currentCursor !== undefined) return;

    setLoading(true);
    try {
      const data = await socialService.getComments(postId, 15, currentCursor || undefined);
      if (currentCursor) {
        setComments((previous) => [...previous, ...data.data]);
      } else {
        setComments(data.data);
      }
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!inputText.trim() || !postId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newComment = await socialService.createComment(postId, inputText.trim(), replyTarget?.id);
      if (replyTarget) {
        setComments((previous) => addReplyToTree(previous, replyTarget.id, newComment));
      } else {
        setComments((previous) => [...previous, newComment]);
      }
      setInputText('');
      setReplyTarget(null);
      onCommentAdded();
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (comment: Comment) => {
    if (!postId) return;

    try {
      const result = await socialService.toggleCommentLike(postId, comment.id);
      setComments((previous) => updateCommentInTree(previous, comment.id, (item) => ({
        ...item,
        is_liked: result.is_liked,
        like_count: result.like_count,
      })));
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  const startReply = (comment: Comment) => {
    const target = comment.parent_comment_id
      ? comments.find((root) => root.id === comment.parent_comment_id) || comment
      : comment;
    setReplyTarget(target);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <CommentThread
      comment={item}
      onLike={handleLikeComment}
      onReply={startReply}
    />
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <View style={{ width: 40 }} />
            <Text style={styles.headerTitle}>Bình luận</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.light.onSurface} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            contentContainerStyle={styles.listContent}
            onEndReached={() => fetchComments(cursor)}
            onEndReachedThreshold={0.5}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={loading ? <ActivityIndicator size="small" color={Colors.light.primary} style={styles.footerLoader} /> : null}
            ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Chưa có bình luận nào. Hãy mở đầu câu chuyện.</Text> : null}
          />

          {replyTarget && (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText} numberOfLines={1}>
                Đang trả lời {replyTarget.author_name}
              </Text>
              <TouchableOpacity onPress={() => setReplyTarget(null)}>
                <Ionicons name="close" size={18} color={Colors.light.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={replyTarget ? 'Viết trả lời...' : 'Viết bình luận...'}
              placeholderTextColor={Colors.light.onSurfaceVariant}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={handlePostComment}
              disabled={!inputText.trim() || isSubmitting}
            >
              {isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={18} color="#FFF" />}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

function CommentThread({
  comment,
  onLike,
  onReply,
}: {
  comment: Comment;
  onLike: (comment: Comment) => void;
  onReply: (comment: Comment) => void;
}) {
  return (
    <View style={styles.thread}>
      <CommentRow comment={comment} onLike={onLike} onReply={onReply} />
      {comment.replies?.length > 0 && (
        <View style={styles.replies}>
          {comment.replies.map((reply) => (
            <CommentRow key={reply.id} comment={reply} onLike={onLike} onReply={onReply} compact />
          ))}
        </View>
      )}
    </View>
  );
}

function CommentRow({
  comment,
  onLike,
  onReply,
  compact = false,
}: {
  comment: Comment;
  onLike: (comment: Comment) => void;
  onReply: (comment: Comment) => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.commentRow, compact && styles.replyRow]}>
      <UserAvatar
        userId={comment.user_id}
        size={compact ? 30 : 36}
        prefetchData={{ avatarUrl: comment.author_avatar, name: comment.author_name }}
        containerStyle={styles.commentAvatar}
      />
      <View style={styles.commentBody}>
        <View style={styles.commentBubble}>
          <Text style={styles.commentAuthor}>{comment.author_name}</Text>
          <Text style={styles.commentText}>{comment.content}</Text>
        </View>
        <View style={styles.commentActions}>
          <TouchableOpacity onPress={() => onLike(comment)}>
            <Text style={[styles.commentActionText, comment.is_liked && styles.commentLikedText]}>
              {comment.is_liked ? 'Đã thích' : 'Thích'}{comment.like_count > 0 ? ` · ${comment.like_count}` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onReply(comment)}>
            <Text style={styles.commentActionText}>Trả lời</Text>
          </TouchableOpacity>
          {comment.reply_count > 0 && !compact && (
            <Text style={styles.commentMetaText}>{comment.reply_count} phản hồi</Text>
          )}
        </View>
      </View>
    </View>
  );
}

function updateCommentInTree(
  comments: Comment[],
  commentId: string,
  updater: (comment: Comment) => Comment,
): Comment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) return updater(comment);
    return {
      ...comment,
      replies: updateCommentInTree(comment.replies || [], commentId, updater),
    };
  });
}

function addReplyToTree(comments: Comment[], rootCommentId: string, reply: Comment): Comment[] {
  return comments.map((comment) => {
    if (comment.id === rootCommentId) {
      return {
        ...comment,
        reply_count: comment.reply_count + 1,
        replies: [...(comment.replies || []), reply],
      };
    }
    return comment;
  });
}

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
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.onSurface,
  },
  closeBtn: {
    width: 40,
    alignItems: 'flex-end',
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  thread: {
    marginBottom: Spacing.md,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  replyRow: {
    marginTop: Spacing.sm,
  },
  replies: {
    marginLeft: 44,
    marginTop: Spacing.xs,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(203, 195, 215, 0.45)',
  },
  commentAvatar: {
    marginRight: Spacing.sm,
  },
  commentBody: {
    flex: 1,
    minWidth: 0,
  },
  commentBubble: {
    backgroundColor: Colors.light.surfaceContainer,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  commentAuthor: {
    fontFamily: 'Manrope',
    fontWeight: '700',
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
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingTop: 6,
  },
  commentActionText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.onSurfaceVariant,
  },
  commentLikedText: {
    color: '#E64B5D',
  },
  commentMetaText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: Colors.light.onSurfaceVariant,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: '#F2EDFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.outlineVariant,
  },
  replyBannerText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.primary,
    marginRight: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.outlineVariant,
    alignItems: 'flex-end',
    backgroundColor: Colors.light.surfaceContainerLowest,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.light.surfaceContainer,
    borderRadius: BorderRadius.pill,
    minHeight: 42,
    maxHeight: 110,
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    fontFamily: 'Manrope',
    color: Colors.light.onSurface,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  footerLoader: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontFamily: 'Manrope',
    color: Colors.light.onSurfaceVariant,
  },
});
