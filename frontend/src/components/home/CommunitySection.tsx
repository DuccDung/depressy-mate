import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { API_ORIGIN } from '../../services/api';
import { Post, socialService } from '../../services/socialService';
import { UserAvatar } from '../socials/UserAvatar';

interface CommunitySectionProps {
  onSeeAll?: () => void;
  onVideoPress?: (post: Post) => void;
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

const formatDate = (dateString: string) => {
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateString);
  const date = new Date(hasTimezone ? dateString : `${dateString}Z`);
  if (Number.isNaN(date.getTime())) return '';

  const diffMins = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffMins < 24 * 60) return `${Math.floor(diffMins / 60)} giờ trước`;
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

export const CommunitySection: React.FC<CommunitySectionProps> = ({ onSeeAll, onVideoPress }) => {
  const [videos, setVideos] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await socialService.getVideoPosts(10);
      setVideos(result.data.filter((post) => post.media_type === 'VIDEO' && !!post.media_url));
    } catch (error) {
      console.error('Could not load community videos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVideos();
    }, [loadVideos])
  );

  return (
    <View style={styles.section}>
      <View style={styles.communityHeader}>
        <View style={styles.headingBlock}>
          <Text style={styles.sectionHeading}>Cộng đồng</Text>
          <Text style={styles.communitySubtitle}>Video chia sẻ từ Khám phá</Text>
        </View>
        <TouchableOpacity style={styles.seeAllButton} onPress={onSeeAll} activeOpacity={0.8}>
          <Text style={styles.seeAllText}>Xem tất cả</Text>
          <Ionicons name="arrow-forward" size={15} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={Colors.light.primary} />
          <Text style={styles.loadingText}>Đang tải video...</Text>
        </View>
      ) : videos.length === 0 ? (
        <TouchableOpacity style={styles.emptyCard} onPress={onSeeAll} activeOpacity={0.86}>
          <View style={styles.emptyIcon}>
            <Ionicons name="videocam-outline" size={24} color={Colors.light.primary} />
          </View>
          <View style={styles.emptyTextBlock}>
            <Text style={styles.emptyTitle}>Chưa có video cộng đồng</Text>
            <Text style={styles.emptySubtitle}>Mở Khám phá để đăng video đầu tiên.</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={Colors.light.onSurfaceVariant} />
        </TouchableOpacity>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reelScroll}>
          {videos.map((post, index) => {
            const streamUrl = resolveStreamUrl(post.media_url);
            return (
              <TouchableOpacity
                key={post.id}
                style={[styles.reelCard, index === 0 && styles.featuredCard]}
                onPress={() => onVideoPress?.(post)}
                activeOpacity={0.9}
              >
                {!!streamUrl && (
                  <Video
                    source={{ uri: streamUrl }}
                    style={styles.reelVideo}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isMuted
                    useNativeControls={false}
                    pointerEvents="none"
                  />
                )}
                <View style={styles.reelOverlay} />
                <View style={styles.videoBadge}>
                  <Ionicons name="videocam" size={11} color="#FFF" />
                  <Text style={styles.videoBadgeText}>Video</Text>
                </View>
                <View style={styles.playIconBox}>
                  <Ionicons name="play" size={22} color="#FFF" />
                </View>
                <View style={styles.reelBottomInfo}>
                  <View style={styles.reelAuthorRow}>
                    <UserAvatar
                      userId={post.user_id}
                      size={27}
                      prefetchData={{ avatarUrl: post.author_avatar, name: post.author_name }}
                      containerStyle={styles.reelAvatar}
                    />
                    <View style={styles.authorTextBlock}>
                      <Text style={styles.reelAuthorName} numberOfLines={1}>{post.author_name}</Text>
                      <Text style={styles.reelTime}>{formatDate(post.created_at)}</Text>
                    </View>
                  </View>
                  <Text style={styles.reelTitle} numberOfLines={2}>
                    {post.content || 'Một khoảnh khắc nhẹ nhàng từ cộng đồng'}
                  </Text>
                  <View style={styles.reelStatsRow}>
                    <View style={styles.statBox}>
                      <Ionicons name="heart" size={13} color="rgba(255,255,255,0.95)" />
                      <Text style={styles.statText}>{post.like_count}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Ionicons name="chatbubble" size={13} color="rgba(255,255,255,0.95)" />
                      <Text style={styles.statText}>{post.comment_count}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.sm,
  },
  communityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  headingBlock: {
    flex: 1,
    marginRight: Spacing.md,
  },
  sectionHeading: {
    fontSize: 22,
    fontFamily: 'Manrope',
    fontWeight: '900',
    color: '#144E49',
  },
  communitySubtitle: {
    fontSize: 13,
    fontFamily: 'Manrope',
    color: Colors.light.onSurfaceVariant,
    marginTop: 3,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  seeAllText: {
    color: Colors.light.primary,
    fontWeight: '900',
    fontFamily: 'Manrope',
    fontSize: 13,
  },
  loadingCard: {
    height: 180,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.12)',
  },
  loadingText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: Colors.light.onSurfaceVariant,
    marginTop: Spacing.sm,
  },
  emptyCard: {
    minHeight: 112,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFF',
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.12)',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DDF4F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  emptyTextBlock: {
    flex: 1,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '900',
    color: Colors.light.onSurface,
  },
  emptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: Colors.light.onSurfaceVariant,
    marginTop: 3,
  },
  reelScroll: {
    paddingBottom: Spacing.md,
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
  },
  reelCard: {
    width: 154,
    height: 208,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0E1E1B',
    shadowColor: '#111817',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 4,
  },
  featuredCard: {
    width: 160,
    height: 216,
  },
  reelVideo: {
    width: '100%',
    height: '100%',
  },
  reelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  videoBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  videoBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
  },
  playIconBox: {
    position: 'absolute',
    alignSelf: 'center',
    top: '35%',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  reelBottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    paddingTop: 30,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  reelAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  reelAvatar: {
    marginRight: 7,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  authorTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  reelAuthorName: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: 'Manrope',
    fontWeight: '900',
  },
  reelTime: {
    color: 'rgba(255,255,255,0.76)',
    fontFamily: 'Manrope',
    fontSize: 9,
    marginTop: 2,
  },
  reelTitle: {
    color: '#FFF',
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    marginBottom: 7,
  },
  reelStatsRow: {
    flexDirection: 'row',
    gap: 11,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 10,
    fontFamily: 'Manrope',
    fontWeight: '900',
  },
});
