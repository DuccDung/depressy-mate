import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { Post } from '../../services/socialService';
import { API_ORIGIN } from '../../services/api';
import { UserAvatar } from './UserAvatar';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onSave: (postId: string) => void;
}

const resolveUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_ORIGIN}${url}`;
};

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.max(0, Math.round(diffMs / 60000));

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffMins < 24 * 60) return `${Math.floor(diffMins / 60)} giờ trước`;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export const PostCard: React.FC<PostCardProps> = ({ post, onLike, onComment, onSave }) => {
  const mediaUrl = resolveUrl(post.media_url);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <UserAvatar
          userId={post.user_id}
          size={42}
          prefetchData={{ avatarUrl: post.author_avatar, name: post.author_name }}
          containerStyle={styles.avatar}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.authorName} numberOfLines={1}>{post.author_name}</Text>
          <Text style={styles.time}>{formatDate(post.created_at)}</Text>
        </View>
        <TouchableOpacity style={styles.saveIconButton} onPress={() => onSave(post.id)}>
          <Ionicons
            name={post.is_saved ? 'bookmark' : 'bookmark-outline'}
            size={23}
            color={post.is_saved ? Colors.light.primary : Colors.light.onSurfaceVariant}
          />
        </TouchableOpacity>
      </View>

      {!!post.content && <Text style={styles.content}>{post.content}</Text>}

      {!!mediaUrl && (
        <TouchableOpacity activeOpacity={0.92} style={styles.mediaContainer}>
          {post.media_type === 'VIDEO' ? (
            <View style={styles.videoBox}>
              <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
              <View style={styles.playButton}>
                <Ionicons name="play" size={30} color="#FFF" />
              </View>
            </View>
          ) : (
            <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
          )}
        </TouchableOpacity>
      )}

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>{post.like_count} thích</Text>
        <Text style={styles.statsText}>{post.comment_count} bình luận</Text>
      </View>

      <View style={styles.actionsBox}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(post.id)}>
          <Ionicons name={post.is_liked ? 'heart' : 'heart-outline'} size={22} color={post.is_liked ? '#E64B5D' : Colors.light.onSurfaceVariant} />
          <Text style={[styles.actionText, post.is_liked && styles.likedText]}>Thích</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onComment(post.id)}>
          <Ionicons name="chatbubble-outline" size={20} color={Colors.light.onSurfaceVariant} />
          <Text style={styles.actionText}>Bình luận</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onSave(post.id)}>
          <Ionicons name={post.is_saved ? 'bookmark' : 'bookmark-outline'} size={20} color={post.is_saved ? Colors.light.primary : Colors.light.onSurfaceVariant} />
          <Text style={[styles.actionText, post.is_saved && styles.savedText]}>Lưu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surfaceContainerLowest,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(203, 195, 215, 0.55)',
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatar: {
    marginRight: Spacing.sm,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    fontFamily: 'Manrope',
    fontWeight: '700',
    fontSize: 16,
    color: Colors.light.onSurface,
  },
  time: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: Colors.light.onSurfaceVariant,
    marginTop: 2,
  },
  saveIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surfaceContainer,
  },
  content: {
    fontFamily: 'Manrope',
    fontSize: 15,
    color: Colors.light.onSurface,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    backgroundColor: Colors.light.surfaceContainerHighest,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  videoBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  playButton: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.outlineVariant,
    marginBottom: Spacing.xs,
  },
  statsText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: Colors.light.onSurfaceVariant,
  },
  actionsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: BorderRadius.sm,
  },
  actionText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: Colors.light.onSurfaceVariant,
    fontWeight: '700',
  },
  likedText: {
    color: '#E64B5D',
  },
  savedText: {
    color: Colors.light.primary,
  },
});
