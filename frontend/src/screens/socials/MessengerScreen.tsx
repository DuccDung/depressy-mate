import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { chatService, Conversation, ChatUser } from '../../services/chatService';
import { UserAvatar } from '../../components/socials/UserAvatar';

export const MessengerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Focus effect to reload conversations when returning to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchConversations();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setIsSearching(true);
        try {
          const results = await chatService.searchUsers(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error('Failed to search users:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoadingConversations(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchConversations();
  }, []);

  const handleCreateOrJoinConversation = async (participantId: string) => {
    try {
      const conv = await chatService.createConversation(participantId);
      // Navigate to chat detail screen (Placeholder for ChatDetailScreen)
      // navigation.navigate('ChatDetail', { conversationId: conv.id });
      console.log('Navigating to conversation:', conv.id);
      
      // Clear search and refresh conversations
      setSearchQuery('');
      setSearchResults([]);
      fetchConversations();
    } catch (error) {
      console.error('Failed to join conversation:', error);
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMins / 60);

    if (diffMins < 60) return `${diffMins}p`;
    if (diffHours < 24) return `${diffHours}g`;
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  // UI Renders
  const renderConversationItem = ({ item }: { item: Conversation }) => {
    // Assuming 1-on-1 chat, the first participant is the other user
    const participant = item.participants?.[0] || { full_name: 'Unknown User', avatar_url: null, user_id: '' };
    const hasUnread = item.unread_count > 0;

    return (
      <TouchableOpacity 
        style={styles.conversationCard} 
        onPress={() => console.log('Navigate to conversation', item.id)}
      >
        <UserAvatar 
          userId={participant.user_id} 
          size={56} 
          prefetchData={{ avatarUrl: participant.avatar_url, name: participant.full_name }}
          containerStyle={styles.avatarContainer}
        />
        
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text 
              style={[
                styles.participantName, 
                hasUnread && styles.unreadText
              ]}
              numberOfLines={1}
            >
              {participant.full_name}
            </Text>
            <Text style={[styles.timeText, hasUnread && styles.unreadTimeText]}>
              {formatTime(item.last_message_at || item.created_at)}
            </Text>
          </View>

          <View style={styles.messageRow}>
            <Text 
              style={[
                styles.lastMessageText, 
                hasUnread && styles.unreadText
              ]} 
              numberOfLines={1}
            >
              {item.last_message_sender_id === participant.user_id ? '' : 'Bạn: '}
              {item.last_message_content || 'Bắt đầu cuộc trò chuyện'}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unread_count > 9 ? '9+' : item.unread_count}
                </Text>
              </View>
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
    >
      <UserAvatar 
        userId={item.user_id} 
        size={40} 
        prefetchData={{ avatarUrl: item.avatar_url, name: item.full_name }}
        containerStyle={styles.avatarContainer}
      />
      <View style={styles.searchResultInfo}>
        <Text style={styles.participantName}>{item.full_name}</Text>
        <Text style={styles.timeText}>{item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
        <TouchableOpacity style={styles.newChatBtn} onPress={() => searchInputRef.current?.focus()}>
          <Ionicons name="add" size={28} color={Colors.light.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={Colors.light.icon} style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Tìm kiếm người dùng..."
            placeholderTextColor={Colors.light.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.light.icon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content */}
      <KeyboardAvoidingView 
        style={styles.contentContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {searchQuery.length > 0 ? (
          // Search Results View
          isSearching ? (
            <ActivityIndicator size="large" color={Colors.light.primary} style={styles.loader} />
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.user_id}
              renderItem={renderSearchItem}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <Text style={styles.emptyText}>Không tìm thấy người dùng nào.</Text>
          )
        ) : (
          // Conversations View
          isLoadingConversations ? (
            <ActivityIndicator size="large" color={Colors.light.primary} style={styles.loader} />
          ) : conversations.length > 0 ? (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              renderItem={renderConversationItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
              }
            />
          ) : (
            <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào.</Text>
          )
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
    fontWeight: 'bold',
    color: Colors.light.onSurface,
  },
  newChatBtn: {
    padding: Spacing.xs,
    backgroundColor: Colors.light.surfaceContainer,
    borderRadius: BorderRadius.full,
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
  conversationInfo: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.surfaceContainer,
    paddingBottom: Spacing.xs,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontFamily: 'Manrope',
    fontSize: 17,
    color: Colors.light.onSurface,
    fontWeight: '500',
    flex: 1,
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    fontFamily: 'Manrope',
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.surfaceContainer,
  },
  searchResultInfo: {
    flex: 1,
  },
  loader: {
    marginTop: Spacing.xl,
  },
  emptyText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    color: Colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginTop: Spacing.xl,
  }
});
