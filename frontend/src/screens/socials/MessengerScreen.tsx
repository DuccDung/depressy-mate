import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { ChatUser, Conversation, chatService } from '../../services/chatService';
import socketService from '../../services/socket';
import { UserAvatar } from '../../components/socials/UserAvatar';

export const MessengerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const searchInputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoadingConversations(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  useEffect(() => {
    let mounted = true;

    const setupRealtime = async () => {
      const connection = await socketService.initSocket();
      if (!connection || !mounted) return;

      const refresh = () => fetchConversations();
      connection.on('conversation:new', refresh);
      connection.on('conversation:updated', refresh);
      connection.on('conversation:removed', refresh);
      connection.on('message:new', refresh);

      return () => {
        connection.off('conversation:new', refresh);
        connection.off('conversation:updated', refresh);
        connection.off('conversation:removed', refresh);
        connection.off('message:new', refresh);
      };
    };

    let cleanup: (() => void) | undefined;
    setupRealtime().then((teardown) => {
      cleanup = teardown;
    });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [fetchConversations]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const keyword = searchQuery.trim();
      if (keyword.length === 0) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await chatService.searchUsers(keyword);
        setSearchResults(results);
      } catch (error) {
        console.error('Failed to search users:', error);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchConversations();
  }, [fetchConversations]);

  const handleCreateOrJoinConversation = async (participantId: string) => {
    try {
      const result = await chatService.createDirectConversation(participantId);
      setSearchQuery('');
      setSearchResults([]);
      navigation.navigate('ChatDetail', {
        conversationId: result.id,
        title: result.conversation.display_name,
      });
      fetchConversations();
    } catch (error) {
      console.error('Failed to create conversation:', error);
      Alert.alert('Không thể mở tin nhắn', 'Vui lòng thử lại sau.');
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.max(0, Math.round(diffMs / 60000));
    const diffHours = Math.round(diffMins / 60);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins}p`;
    if (diffHours < 24) return `${diffHours}g`;
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const renderConversationAvatar = (item: Conversation) => {
    if (item.type === 'GROUP') {
      if (item.display_avatar_url) {
        return <Image source={{ uri: item.display_avatar_url }} style={styles.groupImageAvatar} />;
      }

      return (
        <View style={styles.groupAvatar}>
          <Ionicons name="people" size={24} color={Colors.light.primary} />
        </View>
      );
    }

    const other = item.participants[0];
    return (
      <UserAvatar
        userId={other?.user_id || ''}
        size={56}
        prefetchData={{ avatarUrl: item.display_avatar_url || other?.avatar_url, name: item.display_name || other?.full_name }}
        containerStyle={styles.avatarContainer}
      />
    );
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const hasUnread = item.unread_count > 0;
    const preview = item.last_message_content || 'Bắt đầu cuộc trò chuyện';

    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => navigation.navigate('ChatDetail', { conversationId: item.id, title: item.display_name })}
      >
        {renderConversationAvatar(item)}

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <View style={styles.nameRow}>
              <Text style={[styles.participantName, hasUnread && styles.unreadText]} numberOfLines={1}>
                {item.display_name}
              </Text>
              {item.type === 'GROUP' && (
                <View style={styles.groupPill}>
                  <Text style={styles.groupPillText}>{item.participant_count}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.timeText, hasUnread && styles.unreadTimeText]}>
              {formatTime(item.last_message_at || item.updated_at)}
            </Text>
          </View>

          <View style={styles.messageRow}>
            <Text style={[styles.lastMessageText, hasUnread && styles.unreadText]} numberOfLines={1}>
              {preview}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unread_count > 9 ? '9+' : item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchItem = ({ item }: { item: ChatUser }) => (
    <TouchableOpacity style={styles.searchResultCard} onPress={() => handleCreateOrJoinConversation(item.user_id)}>
      <UserAvatar
        userId={item.user_id}
        size={42}
        prefetchData={{ avatarUrl: item.avatar_url, name: item.full_name }}
        containerStyle={styles.avatarContainer}
      />
      <View style={styles.searchResultInfo}>
        <Text style={styles.participantName}>{item.full_name}</Text>
        <Text style={styles.timeText}>{item.email}</Text>
      </View>
      <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.light.primary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('CreateGroup')}>
            <Ionicons name="people-outline" size={24} color={Colors.light.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => searchInputRef.current?.focus()}>
            <Ionicons name="create-outline" size={24} color={Colors.light.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={Colors.light.icon} style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Tìm người dùng để nhắn tin"
            placeholderTextColor={Colors.light.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.light.icon} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.quickGroupButton} onPress={() => navigation.navigate('CreateGroup')}>
          <Ionicons name="people" size={18} color={Colors.light.primary} />
          <Text style={styles.quickGroupText}>Tạo nhóm nhanh</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.contentContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {searchQuery.trim().length > 0 ? (
          isSearching ? (
            <ActivityIndicator size="large" color={Colors.light.primary} style={styles.loader} />
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.user_id}
              renderItem={renderSearchItem}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <Text style={styles.emptyText}>Không tìm thấy người dùng phù hợp.</Text>
          )
        ) : isLoadingConversations ? (
          <ActivityIndicator size="large" color={Colors.light.primary} style={styles.loader} />
        ) : conversations.length > 0 ? (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={renderConversationItem}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={44} color={Colors.light.primary} />
            <Text style={styles.emptyTitle}>Chưa có cuộc trò chuyện</Text>
            <Text style={styles.emptyText}>Tìm một người bạn hoặc tạo nhóm để bắt đầu.</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.onSurface,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.light.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceContainer,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    height: 48,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 16,
    color: Colors.light.onSurface,
  },
  quickGroupButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F2EDFF',
  },
  quickGroupText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    paddingVertical: Spacing.xs,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  groupAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: Spacing.md,
    backgroundColor: '#F2EDFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupImageAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: Spacing.md,
    backgroundColor: Colors.light.surfaceContainer,
  },
  conversationInfo: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.outlineVariant,
    paddingBottom: Spacing.xs,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  participantName: {
    fontFamily: 'Manrope',
    fontSize: 17,
    color: Colors.light.onSurface,
    fontWeight: '500',
    flex: 1,
  },
  groupPill: {
    minWidth: 24,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: Colors.light.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
  groupPillText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.onSurfaceVariant,
  },
  timeText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: Colors.light.icon,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    color: Colors.light.onSurfaceVariant,
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
    color: Colors.light.onSurface,
  },
  unreadTimeText: {
    fontWeight: '700',
    color: Colors.light.primary,
  },
  unreadBadge: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope',
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.outlineVariant,
  },
  searchResultInfo: {
    flex: 1,
  },
  loader: {
    marginTop: Spacing.xl,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.onSurface,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    color: Colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
