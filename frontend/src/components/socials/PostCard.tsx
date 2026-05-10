import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { Post } from '../../services/socialService';
import { API_ORIGIN } from '../../services/api';
import { UserAvatar } from './UserAvatar';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onSave: (postId: string) => void;
  autoPlay?: boolean;
  highlighted?: boolean;
}

const resolveUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_ORIGIN}${url}`;
};

const resolveStreamUrl = (url?: string | null) => {
  const resolvedUrl = resolveUrl(url);
  if (!resolvedUrl) return null;

  const marker = '/uploads/posts/';
  const markerIndex = resolvedUrl.indexOf(marker);
  if (markerIndex < 0) return resolvedUrl;

  const fileName = resolvedUrl.slice(markerIndex + marker.length).split(/[?#]/)[0];
  if (!fileName) return resolvedUrl;

  return `${API_ORIGIN}/api/upload/media/${encodeURIComponent(fileName)}/stream`;
};

const parseServerDate = (dateString: string) => {
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateString);
  return new Date(hasTimezone ? dateString : `${dateString}Z`);
};

const formatDate = (dateString: string) => {
  const d = parseServerDate(dateString);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffMins < 24 * 60) return `${Math.floor(diffMins / 60)} giờ trước`;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export const PostCard: React.FC<PostCardProps> = ({ post, onLike, onComment, onSave, autoPlay = false, highlighted = false }) => {
  const mediaUrl = resolveUrl(post.media_url);
  const streamUrl = post.media_type === 'VIDEO' ? resolveStreamUrl(post.media_url) : mediaUrl;

  return (
    <View style={[styles.card, highlighted && styles.highlightedCard]}>
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
        <View style={styles.mediaContainer}>
          {post.media_type === 'VIDEO' && streamUrl ? (
            <Video
              source={{ uri: streamUrl }}
              style={styles.media}
              resizeMode={ResizeMode.COVER}
              useNativeControls
              shouldPlay={autoPlay}
              isLooping={false}
            />
          ) : (
            <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />
          )}
        </View>
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
  highlightedCard: {
    borderColor: '#1D6B63',
    borderWidth: 1.5,
    shadowColor: '#1D6B63',
    shadowOpacity: 0.16,
    elevation: 5,
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
