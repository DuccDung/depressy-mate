import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Spacing, BorderRadius } from '../../../constants/theme';
import { API_ORIGIN } from '../../services/api';
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

  const unreadTotal = useMemo(
    () => conversations.reduce((total, item) => total + item.unread_count, 0),
    [conversations],
  );
  const groupTotal = useMemo(
    () => conversations.filter((item) => item.type === 'GROUP').length,
    [conversations],
  );
  const isSearchMode = searchQuery.trim().length > 0;

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
        return <Image source={{ uri: resolveImageUrl(item.display_avatar_url) }} style={styles.groupImageAvatar} />;
      }

      return (
        <View style={styles.groupAvatar}>
          <Ionicons name="people" size={24} color="#1D6B63" />
        </View>
      );
    }

    const other = item.participants[0];
    return (
      <UserAvatar
        userId={other?.user_id || ''}
        size={58}
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
        style={[styles.conversationCard, hasUnread && styles.conversationCardUnread]}
        onPress={() => navigation.navigate('ChatDetail', { conversationId: item.id, title: item.display_name })}
        activeOpacity={0.84}
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
                  <Ionicons name="people" size={11} color="#7350A6" />
                  <Text style={styles.groupPillText}>{item.participant_count}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.timeText, hasUnread && styles.unreadTimeText]}>
              {formatTime(item.last_message_at || item.updated_at)}
            </Text>
          </View>

          <View style={styles.messageRow}>
            <Text style={[styles.lastMessageText, hasUnread && styles.unreadPreviewText]} numberOfLines={1}>
              {preview}
            </Text>
            {hasUnread ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unread_count > 9 ? '9+' : item.unread_count}</Text>
              </View>
            ) : (
              <Feather name="chevron-right" size={18} color="#9AA7A3" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchItem = ({ item }: { item: ChatUser }) => (
    <TouchableOpacity
      style={styles.searchResultCard}
      onPress={() => handleCreateOrJoinConversation(item.user_id)}
      activeOpacity={0.84}
    >
      <UserAvatar
        userId={item.user_id}
        size={48}
        prefetchData={{ avatarUrl: item.avatar_url, name: item.full_name }}
        containerStyle={styles.avatarContainer}
      />
      <View style={styles.searchResultInfo}>
        <Text style={styles.participantName} numberOfLines={1}>{item.full_name}</Text>
        <Text style={styles.searchEmail} numberOfLines={1}>{item.email}</Text>
      </View>
      <View style={styles.searchAction}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.eyebrow}>Depressy Mate Chat</Text>
          <Text style={styles.headerTitle}>Tin nhắn</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('CreateGroup')} activeOpacity={0.84}>
            <Ionicons name="people-outline" size={22} color="#1D6B63" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryIconButton} onPress={() => searchInputRef.current?.focus()} activeOpacity={0.84}>
            <Ionicons name="create-outline" size={21} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Kết nối nhẹ nhàng với bạn bè, nhóm hỗ trợ và những cuộc trò chuyện đang quan trọng với bạn.
      </Text>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="chatbubbles-outline" size={25} color="#1D6B63" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Không gian trò chuyện riêng tư</Text>
          <Text style={styles.heroText}>Tin nhắn mới được cập nhật theo thời gian thực để bạn không bỏ lỡ điều cần phản hồi.</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <MessageStat icon="chatbubble-ellipses-outline" label="Cuộc trò chuyện" value={conversations.length} tone="#7350A6" background="#EEE4FF" />
        <MessageStat icon="mail-unread-outline" label="Chưa đọc" value={unreadTotal} tone="#1D6B63" background="#DDF4F0" />
        <MessageStat icon="people-outline" label="Nhóm" value={groupTotal} tone="#D77948" background="#FFEADB" />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={19} color="#55736E" style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Tìm người dùng để nhắn tin"
          placeholderTextColor="#7D8986"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#55736E" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{isSearchMode ? 'Kết quả tìm kiếm' : 'Gần đây'}</Text>
        {!isSearchMode && (
          <TouchableOpacity style={styles.quickGroupButton} onPress={() => navigation.navigate('CreateGroup')} activeOpacity={0.84}>
            <Ionicons name="add" size={16} color="#7350A6" />
            <Text style={styles.quickGroupText}>Tạo nhóm</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderContent = () => {
    if (isSearchMode) {
      if (isSearching) {
        return (
          <FlatList
            data={[] as ChatUser[]}
            renderItem={renderSearchItem}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={<InlineLoadingState label="Đang tìm người dùng..." />}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        );
      }

      if (searchResults.length > 0) {
        return (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.user_id}
            renderItem={renderSearchItem}
            ListHeaderComponent={renderHeader}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        );
      }

      return (
        <FlatList
          data={[]}
          renderItem={renderSearchItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title="Không tìm thấy người dùng phù hợp"
              text="Thử nhập tên, email hoặc một từ khóa ngắn hơn."
            />
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      );
    }

    if (isLoadingConversations) {
      return (
        <FlatList
          data={[] as Conversation[]}
          renderItem={renderConversationItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={<InlineLoadingState label="Đang tải tin nhắn..." />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    if (conversations.length > 0) {
      return (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#1D6B63" colors={['#1D6B63']} />}
        />
      );
    }

    return (
      <FlatList
        data={[]}
        renderItem={renderConversationItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="Chưa có cuộc trò chuyện"
            text="Tìm một người bạn hoặc tạo nhóm để bắt đầu."
          />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#1D6B63" colors={['#1D6B63']} />}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={styles.contentContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {renderContent()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function MessageStat({
  icon,
  label,
  value,
  tone,
  background,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  tone: string;
  background: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={17} color={tone} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InlineLoadingState({ label }: { label: string }) {
  return (
    <View style={styles.inlineLoadingState}>
      <ActivityIndicator size="large" color="#1D6B63" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={27} color="#1D6B63" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function resolveImageUrl(url: string) {
  const value = url.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F2',
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 112,
  },
  headerSection: {
    marginBottom: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '800',
    color: '#7350A6',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 28,
    fontWeight: '900',
    color: '#144E49',
    marginTop: 3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryIconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1D6B63',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1D6B63',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 4,
  },
  subtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#65736F',
    lineHeight: 20,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  heroCard: {
    minHeight: 108,
    borderRadius: BorderRadius.md,
    backgroundColor: '#1D6B63',
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DDF4F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: 'Manrope',
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#CFEDE8',
    lineHeight: 18,
    marginTop: 5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    minHeight: 86,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#FFFFFF',
    padding: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.12)',
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '900',
    color: '#12201D',
  },
  statLabel: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#687572',
    marginTop: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    height: 50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.14)',
    marginBottom: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#111817',
  },
  clearButton: {
    padding: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '900',
    color: '#144E49',
  },
  quickGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 16,
    backgroundColor: '#EEE4FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickGroupText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '900',
    color: '#7350A6',
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.12)',
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  conversationCardUnread: {
    borderColor: 'rgba(29,107,99,0.24)',
    backgroundColor: '#FCFFFE',
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  groupAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    marginRight: Spacing.md,
    backgroundColor: '#DDF4F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupImageAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    marginRight: Spacing.md,
    backgroundColor: '#DDF4F0',
  },
  conversationInfo: {
    flex: 1,
    minWidth: 0,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  nameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.sm,
    minWidth: 0,
  },
  participantName: {
    fontFamily: 'Manrope',
    fontSize: 16,
    color: '#111817',
    fontWeight: '900',
    flex: 1,
  },
  groupPill: {
    minWidth: 34,
    height: 23,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: '#EEE4FF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
  groupPillText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '900',
    color: '#7350A6',
    marginLeft: 3,
  },
  timeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '800',
    color: '#7D8986',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#65736F',
    flex: 1,
    lineHeight: 18,
  },
  unreadText: {
    color: '#0F1817',
  },
  unreadPreviewText: {
    fontWeight: '800',
    color: '#273835',
  },
  unreadTimeText: {
    color: '#1D6B63',
  },
  unreadBadge: {
    backgroundColor: '#1D6B63',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Manrope',
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20,78,73,0.12)',
  },
  searchResultInfo: {
    flex: 1,
    minWidth: 0,
  },
  searchEmail: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#65736F',
    marginTop: 3,
  },
  searchAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1D6B63',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  inlineLoadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    paddingHorizontal: Spacing.lg,
  },
  loadingText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#66726F',
    marginTop: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#DDF4F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '900',
    color: '#144E49',
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#65736F',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 19,
  },
});
