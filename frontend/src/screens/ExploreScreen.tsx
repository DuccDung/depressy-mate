import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { UserAvatar } from '../components/socials/UserAvatar';
import { PostCard } from '../components/socials/PostCard';
import { CommentModal } from '../components/socials/CommentModal';
import { CreatePostScreen } from './socials/CreatePostScreen';
import { Post, socialService } from '../services/socialService';

type ExploreTab = 'learn' | 'community' | 'saved';

const workshopCards = [
  {
    id: 'dance',
    title: 'Dance Therapy',
    tag: 'Therapeutic',
    image: 'https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?auto=format&fit=crop&w=720&q=80',
  },
  {
    id: 'yoga',
    title: 'Yoga Flow',
    tag: 'Mindful',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=720&q=80',
  },
  {
    id: 'art',
    title: 'Art Journaling',
    tag: 'Creative',
    image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=720&q=80',
  },
];

const healingMedia = [
  {
    id: 'movies',
    title: 'Relaxing Movies',
    subtitle: 'Visual sanctuary for your mind',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'music',
    title: 'Mindful Music',
    subtitle: 'Calming frequencies for focus',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=900&q=80',
  },
];

const skillCards = [
  {
    id: 'emotion',
    icon: 'happy-outline' as keyof typeof Ionicons.glyphMap,
    title: 'Emotional Management Tips',
    body: 'Learn to navigate complex feelings with grace and clarity using proven techniques.',
    color: '#E9DDFC',
    tint: '#7350A6',
  },
  {
    id: 'breath',
    icon: 'leaf-outline' as keyof typeof Ionicons.glyphMap,
    title: 'Daily Breathwork',
    body: 'Simple exercises to ground your nervous system in under five minutes.',
    color: '#CFEFE9',
    tint: '#006A63',
  },
  {
    id: 'journal',
    icon: 'sparkles-outline' as keyof typeof Ionicons.glyphMap,
    title: 'Journaling Prompts',
    body: 'Unlock deeper self-awareness through intentional daily writing reflections.',
    color: '#EEE4FF',
    tint: '#6B38D4',
  },
];

export default function ExploreScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ExploreTab>('learn');
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const isPostTab = activeTab === 'community' || activeTab === 'saved';

  const fetchPosts = useCallback(async (currentCursor?: string | null, isRefresh = false, tab = activeTab) => {
    if (loading) return;
    if (!isRefresh && !hasMore) return;
    if (tab === 'learn') return;

    setLoading(true);
    try {
      const data = tab === 'saved'
        ? await socialService.getSavedPosts(10, currentCursor || undefined)
        : await socialService.getPosts(10, currentCursor || undefined);

      setPosts((previous) => {
        if (isRefresh || !currentCursor) return data.data;
        const existingIds = new Set(previous.map((post) => post.id));
        return [...previous, ...data.data.filter((post) => !existingIds.has(post.id))];
      });
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, hasMore, loading]);

  useEffect(() => {
    if (!isPostTab) return;
    setPosts([]);
    setCursor(null);
    setHasMore(true);
    fetchPosts(null, true, activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(null, true);
  };

  const handleLike = async (postId: string) => {
    try {
      const result = await socialService.toggleLike(postId);
      setPosts((previous) => previous.map((post) => (
        post.id === postId ? { ...post, is_liked: result.is_liked, like_count: result.like_count } : post
      )));
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleSave = async (postId: string) => {
    try {
      const result = await socialService.toggleSave(postId);
      setPosts((previous) => {
        const updated = previous.map((post) => (
          post.id === postId ? { ...post, is_saved: result.is_saved } : post
        ));
        return activeTab === 'saved' && !result.is_saved
          ? updated.filter((post) => post.id !== postId)
          : updated;
      });
    } catch (error) {
      console.error('Failed to save post:', error);
    }
  };

  const handleCommentAdded = () => {
    setPosts((previous) => previous.map((post) => (
      post.id === commentPostId ? { ...post, comment_count: post.comment_count + 1 } : post
    )));
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard post={item} onLike={handleLike} onComment={setCommentPostId} onSave={handleSave} />
  );

  const renderFeedHeader = () => (
    <View style={styles.feedIntro}>
      <Text style={styles.sectionTitle}>{activeTab === 'saved' ? 'Saved Reflections' : 'Community Stories'}</Text>
      <Text style={styles.feedIntroText}>
        {activeTab === 'saved'
          ? 'Những bài viết bạn đã đánh dấu để quay lại khi cần.'
          : 'Chia sẻ trải nghiệm, điều đã giúp bạn bình tĩnh hơn, hoặc một ghi chú tử tế cho người khác.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="menu" size={22} color="#155E58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Explore & Learn</Text>
        <UserAvatar
          userId={user?.id || ''}
          size={36}
          prefetchData={{ avatarUrl: user?.avatarUrl, name: user?.fullName }}
        />
      </View>

      <View style={styles.tabs}>
        <TabButton label="Khám phá" active={activeTab === 'learn'} onPress={() => setActiveTab('learn')} />
        <TabButton label="Cộng đồng" active={activeTab === 'community'} onPress={() => setActiveTab('community')} />
        <TabButton label="Đã lưu" active={activeTab === 'saved'} onPress={() => setActiveTab('saved')} />
      </View>

      {activeTab === 'learn' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.learnContent}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Workshops & Classes</Text>
            <TouchableOpacity onPress={() => setActiveTab('community')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workshopScroller}>
            {workshopCards.map((item) => (
              <ImageBackground key={item.id} source={{ uri: item.image }} imageStyle={styles.workshopImage} style={styles.workshopCard}>
                <View style={styles.imageShade} />
                <View style={styles.workshopFooter}>
                  <View style={styles.tagPill}>
                    <Text style={styles.tagText}>{item.tag}</Text>
                  </View>
                  <Text style={styles.workshopTitle}>{item.title}</Text>
                </View>
              </ImageBackground>
            ))}
          </ScrollView>

          <Text style={[styles.sectionTitle, styles.mediaTitle]}>Healing Media</Text>
          {healingMedia.map((item) => (
            <ImageBackground key={item.id} source={{ uri: item.image }} imageStyle={styles.mediaImage} style={styles.mediaCard}>
              <View style={styles.mediaShade} />
              <View style={styles.playCircle}>
                <Ionicons name="play" size={26} color="#FFF" />
              </View>
              <View style={styles.mediaTextBlock}>
                <Text style={styles.mediaCardTitle}>{item.title}</Text>
                <Text style={styles.mediaSubtitle}>{item.subtitle}</Text>
              </View>
            </ImageBackground>
          ))}

          <Text style={[styles.sectionTitle, styles.skillTitle]}>Skill Building</Text>
          {skillCards.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.skillCard, { borderBottomColor: item.color }]}>
              <View style={[styles.skillIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={19} color={item.tint} />
              </View>
              <Text style={styles.skillCardTitle}>{item.title}</Text>
              <Text style={styles.skillBody}>{item.body}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.communityCta} onPress={() => setActiveTab('community')}>
            <View>
              <Text style={styles.communityCtaTitle}>Community Stories</Text>
              <Text style={styles.communityCtaText}>Đăng bài, bình luận và lưu lại bài viết hữu ích.</Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color="#FFF" />
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          ListHeaderComponent={renderFeedHeader}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          onEndReached={() => fetchPosts(cursor)}
          onEndReachedThreshold={0.45}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.light.primary]} />}
          ListFooterComponent={loading && !refreshing ? <ActivityIndicator size="large" color={Colors.light.primary} style={styles.feedLoader} /> : null}
          ListEmptyComponent={!loading ? (
            <Text style={styles.emptyText}>{activeTab === 'saved' ? 'Bạn chưa lưu bài viết nào.' : 'Chưa có bài viết nào. Hãy là người mở đầu.'}</Text>
          ) : null}
        />
      )}

      {isPostTab && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowCreatePost(true)}>
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      <CreatePostScreen
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={() => {
          setShowCreatePost(false);
          setActiveTab('community');
          setRefreshing(true);
          fetchPosts(null, true, 'community');
        }}
      />
      <CommentModal
        visible={!!commentPostId}
        postId={commentPostId}
        onClose={() => setCommentPostId(null)}
        onCommentAdded={handleCommentAdded}
      />
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F2',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  headerIcon: {
    width: 38,
    height: 38,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '800',
    color: '#144E49',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  tabButton: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 78, 73, 0.14)',
  },
  tabButtonActive: {
    backgroundColor: '#1D6B63',
  },
  tabButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '800',
    color: '#55736E',
  },
  tabButtonTextActive: {
    color: '#FFF',
  },
  learnContent: {
    paddingBottom: 110,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '800',
    color: '#135E58',
  },
  seeAll: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '800',
    color: '#5E477E',
  },
  workshopScroller: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  workshopCard: {
    width: 205,
    height: 300,
    overflow: 'hidden',
    borderRadius: 28,
    justifyContent: 'flex-end',
    backgroundColor: '#D9D9D9',
  },
  workshopImage: {
    borderRadius: 28,
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  workshopFooter: {
    padding: Spacing.md,
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(235, 222, 255, 0.86)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: Spacing.sm,
  },
  tagText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '800',
    color: '#5E477E',
  },
  workshopTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  mediaTitle: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    color: '#60417D',
  },
  mediaCard: {
    height: 132,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: '#D9D9D9',
  },
  mediaImage: {
    borderRadius: 28,
  },
  mediaShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  playCircle: {
    position: 'absolute',
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTextBlock: {
    position: 'absolute',
    left: Spacing.md,
    bottom: Spacing.md,
  },
  mediaCardTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  mediaSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#FFF',
    opacity: 0.88,
  },
  skillTitle: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  skillCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: Spacing.lg,
    minHeight: 146,
    borderBottomWidth: 3,
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.06,
    shadowRadius: 28,
    elevation: 3,
  },
  skillIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  skillCardTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '800',
    color: '#101818',
    marginBottom: Spacing.xs,
  },
  skillBody: {
    fontFamily: 'Manrope',
    fontSize: 13,
    lineHeight: 20,
    color: '#5B6463',
  },
  communityCta: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    minHeight: 82,
    borderRadius: 24,
    padding: Spacing.md,
    backgroundColor: '#1D6B63',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  communityCtaTitle: {
    fontFamily: 'Manrope',
    fontSize: 17,
    fontWeight: '900',
    color: '#FFF',
  },
  communityCtaText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#DDF4F0',
    marginTop: 3,
    maxWidth: 260,
  },
  feedContent: {
    padding: Spacing.md,
    paddingBottom: 120,
  },
  feedIntro: {
    marginBottom: Spacing.md,
  },
  feedIntroText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    lineHeight: 20,
    color: '#64706D',
    marginTop: Spacing.xs,
  },
  feedLoader: {
    marginVertical: Spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontFamily: 'Manrope',
    fontSize: 15,
    color: Colors.light.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 92,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1D6B63',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1D6B63',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
});
