import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { Post } from '../../services/socialService';
import { UserAvatar } from './UserAvatar';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
}

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffMins < 24 * 60) return `${Math.floor(diffMins / 60)} giờ trước`;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export const PostCard: React.FC<PostCardProps> = ({ post, onLike, onComment }) => {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <UserAvatar 
          userId={post.user_id} 
          size={40} 
          prefetchData={{ avatarUrl: post.author_avatar, name: post.author_name }}
          containerStyle={{ marginRight: Spacing.sm }}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.authorName}>{post.author_name}</Text>
          <Text style={styles.time}>{formatDate(post.created_at)}</Text>
        </View>
      </View>

      {/* Content */}
      {post.content && (
        <Text style={styles.content}>{post.content}</Text>
      )}

      {/* Media */}
      {post.media_url && (
         <View style={styles.mediaContainer}>
           {post.media_type === 'IMAGE' ? (
             <Image source={{ uri: post.media_url }} style={styles.media} resizeMode="cover" />
           ) : (
             <View style={[styles.media, styles.videoPlaceholder]}>
               {/* Video placeholder - using expo-av in prod later, for now simulate video frame */}
               <Image source={{ uri: post.media_url }} style={[StyleSheet.absoluteFillObject, { opacity: 0.6 }]} />
               <View style={styles.playButton}>
                 <Ionicons name="play" size={32} color="#FFF" />
               </View>
             </View>
           )}
         </View>
      )}

      {/* Action Stats */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>{post.like_count} lượt thích</Text>
        <Text style={styles.statsText}>{post.comment_count} bình luận</Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsBox}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(post.id)}>
          <Ionicons name={post.is_liked ? "heart" : "heart-outline"} size={22} color={post.is_liked ? '#E53935' : Colors.light.onSurfaceVariant} />
          <Text style={[styles.actionText, post.is_liked && { color: '#E53935' }]}>
            Thích
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onComment(post.id)}>
          <Ionicons name="chatbubble-outline" size={20} color={Colors.light.onSurfaceVariant} />
          <Text style={styles.actionText}>Bình luận</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surfaceContainerLowest,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  authorName: {
    fontFamily: 'Manrope',
    fontWeight: 'bold',
    fontSize: 16,
    color: Colors.light.onSurface,
  },
  time: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: Colors.light.onSurfaceVariant,
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
    aspectRatio: 4/3,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    backgroundColor: Colors.light.surfaceContainerHighest,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
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
    justifyContent: 'space-around',
    paddingTop: Spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: Colors.light.onSurfaceVariant,
    fontWeight: '600',
  }
});
