import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { PostCard } from '../components/socials/PostCard';
import { CommentModal } from '../components/socials/CommentModal';
import { CreatePostScreen } from './socials/CreatePostScreen';
import { Post, socialService } from '../services/socialService';
import type { MainStackParamList } from '../navigation/MainStackNavigator';

type ExploreTab = 'community' | 'saved';
type ExploreRouteProp = RouteProp<MainStackParamList, 'Community'>;

export default function ExploreScreen() {
  const route = useRoute<ExploreRouteProp>();
  const feedListRef = useRef<FlatList<Post>>(null);
  const requestedFocusPostRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<ExploreTab>('community');
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const focusedPostId = route.params?.focusPostId;

  const fetchPosts = useCallback(async (currentCursor?: string | null, isRefresh = false, tab = activeTab) => {
    if (loading) return;
    if (!isRefresh && !hasMore) return;

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
    setPosts([]);
    setCursor(null);
    setHasMore(true);
    fetchPosts(null, true, activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    const initialTab = route.params?.initialTab;
    if (initialTab) {
      setActiveTab(initialTab === 'saved' ? 'saved' : 'community');
      return;
    }

    if (focusedPostId) {
      setActiveTab('community');
    }
  }, [focusedPostId, route.params?.initialTab]);

  useEffect(() => {
    requestedFocusPostRef.current = null;
  }, [focusedPostId]);

  useEffect(() => {
    if (!focusedPostId || activeTab !== 'community') return;

    const focusedIndex = posts.findIndex((post) => post.id === focusedPostId);
    if (focusedIndex >= 0) {
      const timer = setTimeout(() => {
        feedListRef.current?.scrollToIndex({
          index: focusedIndex,
          animated: true,
          viewPosition: 0.08,
        });
      }, 180);

      return () => clearTimeout(timer);
    }

    if (loading || requestedFocusPostRef.current === focusedPostId) return;

    requestedFocusPostRef.current = focusedPostId;
    socialService.getPost(focusedPostId)
      .then((post) => {
        setPosts((previous) => (
          previous.some((item) => item.id === post.id) ? previous : [post, ...previous]
        ));
      })
      .catch((error) => {
        console.error('Failed to load focused post:', error);
      });
  }, [activeTab, focusedPostId, loading, posts]);

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
    <PostCard
      post={item}
      onLike={handleLike}
      onComment={setCommentPostId}
      onSave={handleSave}
      autoPlay={activeTab === 'community' && item.id === focusedPostId}
      highlighted={activeTab === 'community' && item.id === focusedPostId}
    />
  );

  const renderFeedHeader = () => (
    <View style={styles.feedIntro}>
      <Text style={styles.sectionTitle}>{activeTab === 'saved' ? 'Bài viết đã lưu' : 'Cộng đồng'}</Text>
      <Text style={styles.feedIntroText}>
        {activeTab === 'saved'
          ? 'Những bài viết bạn đã đánh dấu để quay lại khi cần.'
          : 'Chia sẻ trải nghiệm, điều đã giúp bạn bình tĩnh hơn, hoặc một ghi chú tử tế cho người khác.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        ref={feedListRef}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        ListHeaderComponent={renderFeedHeader}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => fetchPosts(cursor)}
        onEndReachedThreshold={0.45}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            feedListRef.current?.scrollToOffset({
              offset: Math.max(0, index) * 430,
              animated: true,
            });
          }, 200);
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.light.primary]} />}
        ListFooterComponent={loading && !refreshing ? <ActivityIndicator size="large" color={Colors.light.primary} style={styles.feedLoader} /> : null}
        ListEmptyComponent={!loading ? (
          <Text style={styles.emptyText}>{activeTab === 'saved' ? 'Bạn chưa lưu bài viết nào.' : 'Chưa có bài viết nào. Hãy là người mở đầu.'}</Text>
        ) : null}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreatePost(true)} activeOpacity={0.84}>
        <Ionicons name="add" size={25} color="#1D6B63" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchFab}
        onPress={() => setActiveTab(activeTab === 'saved' ? 'community' : 'saved')}
        activeOpacity={0.84}
      >
        <Ionicons name={activeTab === 'saved' ? 'people' : 'bookmark'} size={22} color="#1D6B63" />
      </TouchableOpacity>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F2',
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '800',
    color: '#135E58',
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
    right: 24,
    bottom: 148,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.16)',
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  switchFab: {
    position: 'absolute',
    right: 24,
    bottom: 88,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.16)',
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
});
