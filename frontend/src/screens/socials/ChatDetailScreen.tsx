import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { Conversation, Message, chatService } from '../../services/chatService';
import socketService from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from '../../components/socials/UserAvatar';

type ChatDetailRoute = RouteProp<MainStackParamList, 'ChatDetail'>;

export const ChatDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<ChatDetailRoute>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const conversationId = route.params.conversationId;

  const listRef = useRef<FlatList<Message>>(null);
  const typingSentRef = useRef(false);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  const appendMessage = useCallback((message: Message) => {
    setMessages((previous) => {
      if (previous.some((item) => item.id === message.id)) return previous;
      return [...previous, message].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const loadConversation = useCallback(async () => {
    const [conversationData, messagePage] = await Promise.all([
      chatService.getConversation(conversationId),
      chatService.getMessages(conversationId, 35),
    ]);

    setConversation(conversationData);
    setMessages(messagePage.data);
    setNextCursor(messagePage.next_cursor);
    setHasMore(messagePage.has_more);

    await chatService.markAsRead(conversationId).catch(() => null);
    await socketService.markConversationRead(conversationId).catch(() => null);

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  }, [conversationId]);

  useEffect(() => {
    let mounted = true;

    setIsLoading(true);
    loadConversation()
      .catch((error) => {
        console.error('Failed to load conversation:', error);
        if (mounted) {
          Alert.alert('Không thể mở cuộc trò chuyện', 'Vui lòng thử lại sau.');
          navigation.goBack();
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [loadConversation, navigation]);

  useEffect(() => {
    let mounted = true;

    const setupRealtime = async () => {
      const connection = await socketService.initSocket();
      if (!connection || !mounted) return;

      await socketService.joinConversation(conversationId).catch(() => null);

      const handleMessage = async (message: Message) => {
        if (message.conversation_id !== conversationId) return;
        appendMessage(message);
        if (message.sender_id !== user?.id) {
          await socketService.markConversationRead(conversationId).catch(() => null);
        }
      };

      const handleTyping = (payload: { conversation_id: string; user_id: string; is_typing: boolean }) => {
        if (payload.conversation_id !== conversationId || payload.user_id === user?.id) return;

        setTypingUserIds((previous) => {
          if (!payload.is_typing) {
            return previous.filter((id) => id !== payload.user_id);
          }

          return previous.includes(payload.user_id) ? previous : [...previous, payload.user_id];
        });

        if (typingClearTimersRef.current[payload.user_id]) {
          clearTimeout(typingClearTimersRef.current[payload.user_id]);
        }

        if (payload.is_typing) {
          typingClearTimersRef.current[payload.user_id] = setTimeout(() => {
            setTypingUserIds((previous) => previous.filter((id) => id !== payload.user_id));
          }, 1800);
        }
      };

      const handleConversationUpdate = (payload: { conversation?: Conversation }) => {
        if (payload.conversation?.id === conversationId) {
          setConversation(payload.conversation);
        }
      };

      connection.on('message:new', handleMessage);
      connection.on('typing:update', handleTyping);
      connection.on('conversation:updated', handleConversationUpdate);

      return () => {
        connection.off('message:new', handleMessage);
        connection.off('typing:update', handleTyping);
        connection.off('conversation:updated', handleConversationUpdate);
      };
    };

    let cleanup: (() => void) | undefined;
    setupRealtime().then((teardown) => {
      cleanup = teardown;
    });

    const typingTimers = typingClearTimersRef.current;

    return () => {
      mounted = false;
      cleanup?.();
      Object.values(typingTimers).forEach(clearTimeout);
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
      }
      socketService.setTyping(conversationId, false).catch(() => null);
    };
  }, [appendMessage, conversationId, user?.id]);

  const loadOlderMessages = async () => {
    if (!hasMore || !nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const page = await chatService.getMessages(conversationId, 35, nextCursor);
      setMessages((previous) => {
        const existingIds = new Set(previous.map((message) => message.id));
        const newItems = page.data.filter((message) => !existingIds.has(message.id));
        return [...newItems, ...previous];
      });
      setNextCursor(page.next_cursor);
      setHasMore(page.has_more);
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const stopTypingSoon = () => {
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = setTimeout(() => {
      typingSentRef.current = false;
      socketService.setTyping(conversationId, false).catch(() => null);
    }, 900);
  };

  const handleInputChange = (text: string) => {
    setInput(text);

    if (text.trim().length > 0 && !typingSentRef.current) {
      typingSentRef.current = true;
      socketService.setTyping(conversationId, true).catch(() => null);
    }

    stopTypingSoon();
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isSending) return;

    setInput('');
    setIsSending(true);
    typingSentRef.current = false;
    socketService.setTyping(conversationId, false).catch(() => null);

    try {
      const message = await socketService.sendMessage(conversationId, content);
      appendMessage(message);
    } catch (realtimeError) {
      try {
        const message = await chatService.sendMessage(conversationId, content);
        appendMessage(message);
      } catch (error) {
        console.error('Failed to send message:', error || realtimeError);
        setInput(content);
        Alert.alert('Chưa gửi được tin nhắn', 'Kiểm tra kết nối rồi thử lại nhé.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const renderHeaderAvatar = () => {
    if (!conversation) return <View style={styles.headerAvatarFallback} />;

    if (conversation.type === 'GROUP') {
      if (conversation.display_avatar_url) {
        return <Image source={{ uri: conversation.display_avatar_url }} style={styles.headerAvatarImage} />;
      }

      return (
        <View style={styles.headerAvatarFallback}>
          <Ionicons name="people" size={20} color={Colors.light.primary} />
        </View>
      );
    }

    const other = conversation.participants[0];
    return (
      <UserAvatar
        userId={other?.user_id || ''}
        size={40}
        prefetchData={{ avatarUrl: conversation.display_avatar_url || other?.avatar_url, name: conversation.display_name }}
      />
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.sender_id === user?.id;
    const createdAt = new Date(item.created_at);

    return (
      <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowOther]}>
        {!isMine && conversation?.type === 'GROUP' && (
          <UserAvatar
            userId={item.sender_id}
            size={28}
            prefetchData={{ avatarUrl: item.sender_avatar, name: item.sender_name }}
            containerStyle={styles.messageAvatar}
          />
        )}
        <View style={[styles.messageBubble, isMine ? styles.messageBubbleMine : styles.messageBubbleOther]}>
          {!isMine && conversation?.type === 'GROUP' && (
            <Text style={styles.senderName} numberOfLines={1}>
              {item.sender_name}
            </Text>
          )}
          <Text style={[styles.messageText, isMine && styles.messageTextMine]}>{item.content}</Text>
          <Text style={[styles.messageTime, isMine && styles.messageTimeMine]}>
            {createdAt.getHours().toString().padStart(2, '0')}:{createdAt.getMinutes().toString().padStart(2, '0')}
          </Text>
        </View>
      </View>
    );
  };

  const typingLabel = typingUserIds.length > 0 ? 'Đang nhập...' : conversation?.type === 'GROUP'
    ? `${conversation.participant_count} thành viên`
    : 'Tin nhắn riêng tư';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.light.primary} style={styles.screenLoader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.onSurface} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerIdentity}
          onPress={() => navigation.navigate('ConversationInfo', { conversationId })}
          activeOpacity={0.8}
        >
          {renderHeaderAvatar()}
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {conversation?.display_name || route.params.title || 'Tin nhắn'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {typingLabel}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.navigate('ConversationInfo', { conversationId })}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.light.onSurface} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            hasMore ? (
              <TouchableOpacity style={styles.loadMoreButton} onPress={loadOlderMessages} disabled={isLoadingMore}>
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color={Colors.light.primary} />
                ) : (
                  <Text style={styles.loadMoreText}>Tải tin cũ hơn</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Ionicons name="sparkles-outline" size={36} color={Colors.light.primary} />
              <Text style={styles.emptyMessagesTitle}>Bắt đầu câu chuyện</Text>
              <Text style={styles.emptyMessagesText}>Gửi lời chào nhẹ nhàng để mở đầu.</Text>
            </View>
          }
          onContentSizeChange={() => {
            if (messages.length > 0 && !isLoadingMore) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={Colors.light.onSurfaceVariant}
            value={input}
            onChangeText={handleInputChange}
            multiline
            maxLength={4000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  screenLoader: {
    marginTop: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.outlineVariant,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  headerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2EDFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.surfaceContainer,
  },
  headerTextGroup: {
    flex: 1,
    marginLeft: Spacing.sm,
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.onSurface,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: Colors.light.onSurfaceVariant,
    marginTop: 2,
  },
  chatArea: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  loadMoreButton: {
    alignSelf: 'center',
    minHeight: 34,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.surfaceContainer,
    marginBottom: Spacing.sm,
    justifyContent: 'center',
  },
  loadMoreText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 6,
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  messageBubbleMine: {
    backgroundColor: Colors.light.primary,
    borderBottomRightRadius: 6,
  },
  messageBubbleOther: {
    backgroundColor: Colors.light.surfaceContainer,
    borderBottomLeftRadius: 6,
  },
  senderName: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: 2,
  },
  messageText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    lineHeight: 21,
    color: Colors.light.onSurface,
  },
  messageTextMine: {
    color: '#FFF',
  },
  messageTime: {
    alignSelf: 'flex-end',
    fontFamily: 'Manrope',
    fontSize: 10,
    marginTop: 3,
    color: Colors.light.onSurfaceVariant,
  },
  messageTimeMine: {
    color: 'rgba(255,255,255,0.78)',
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyMessagesTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.onSurface,
    marginTop: Spacing.md,
  },
  emptyMessagesText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: Colors.light.onSurfaceVariant,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.outlineVariant,
    backgroundColor: Colors.light.background,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: Colors.light.surfaceContainer,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontFamily: 'Manrope',
    fontSize: 15,
    color: Colors.light.onSurface,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.primary,
    marginLeft: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
