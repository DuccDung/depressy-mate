import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../../constants/theme';
import { socialService, Post } from '../../services/socialService';
import socketService from '../../services/socket';
import { PostCard } from '../../components/socials/PostCard';
import { CommentModal } from '../../components/socials/CommentModal';
import { CreatePostScreen } from './CreatePostScreen';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from '../../components/socials/UserAvatar';

export default function SocialFeedScreen({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Cursor pagination
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Modals state
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  // Initial fetch
  useEffect(() => {
    fetchPosts();
    setupSocket();

    return () => {
      // Dọn dẹp listener khi Unmount màn hình Feed
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('new_notification');
      }
    };
  }, []);

  const setupSocket = async () => {
    const socket = await socketService.initSocket();
    if (socket) {
      socket.on('new_notification', (data) => {
        // GỌI SOCKET THẬT ĐỂ CẬP NHẬT REALTIME CHO FEED (Chủ post nhận được sẽ update)
        if (data.type === 'LIKE' || data.type === 'COMMENT') {
          // fetch lại bài đó hoặc tăng nhẹ local cho chủ bài viết
          setPosts(prev => prev.map(p => {
            if (p.id === data.post_id) {
              return {
                ...p,
                like_count: data.type === 'LIKE' ? p.like_count + 1 : p.like_count,
                comment_count: data.type === 'COMMENT' ? p.comment_count + 1 : p.comment_count
              };
            }
            return p;
          }));
        }
      });
    }
  };

  const fetchPosts = async (currentCursor?: string | null, isRefresh = false) => {
    if (loading) return;
    if (!isRefresh && !hasMore) return;

    setLoading(true);
    try {
      const data = await socialService.getPosts(10, currentCursor || undefined);
      if (isRefresh) {
        setPosts(data.data);
      } else {
        // Tránh trùng lặp khi append
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = data.data.filter((p: Post) => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
      }
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (error) {
      console.error('Lỗi tải feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts(null, true);
  }, []);

  const handleLike = async (postId: string) => {
    // Pessimistic / Gọi Real API
    try {
      // 1. Gọi API
      const result = await socialService.toggleLike(postId);
      // 2. Cập nhật state chính xác theo DB
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            is_liked: result.action === 'liked',
            like_count: result.like_count
          };
        }
        return p;
      }));
    } catch (error) {
      console.error('Lỗi thả tim:', error);
    }
  };

  const handleCommentAdded = () => {
    // Tăng count khi chính mình tạo post
    setPosts(prev => prev.map(p => {
      if (p.id === commentPostId) {
        return { ...p, comment_count: p.comment_count + 1 };
      }
      return p;
    }));
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onLike={handleLike}
      onComment={(id) => setCommentPostId(id)}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cộng đồng</Text>
        <UserAvatar 
          userId={user?.id || ''} 
          size={36} 
          prefetchData={{ avatarUrl: user?.avatarUrl, name: user?.fullName }} 
        />
      </View>

      {/* Feed (Lazy Loading) */}
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        // Lazy Loading / Infinite Scroll Config
        onEndReached={() => fetchPosts(cursor)} // Trigger khi cuộn xuống cuối
        onEndReachedThreshold={0.5} // Trigger khi còn 50% màn hình là tới cuối
        initialNumToRender={5} // Render 5 bài cự ly đầu để tối ưu bộ nhớ
        windowSize={10} // Giới hạn window render FlatList
        maxToRenderPerBatch={5}
        removeClippedSubviews={true} // Bỏ các thẻ không ở trong view (giảm RAM, chống lag)
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.light.primary]} />
        }
        ListFooterComponent={
          loading && !refreshing ? (
            <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginVertical: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>Chưa có bài viết nào. Hãy là người mở đầu!</Text>
          ) : null
        }
      />

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreatePost(true)}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      {/* Modals */}
      <CreatePostScreen
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={() => {
          setShowCreatePost(false);
          onRefresh(); // Tải lại Feed khi đăng thành công
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
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.outlineVariant,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.onSurface,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100, // Nhường chỗ cho FAB
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontFamily: 'Manrope',
    color: Colors.light.onSurfaceVariant,
    fontSize: 16,
  }
});
