import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Shadows, Spacing } from '../../../constants/theme';
import { AiChatHistoryMessage, aiService } from '../../services/aiService';

type ChatMessage = AiChatHistoryMessage & {
  id: string;
};

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Xin chào, mình là trợ lý AI của Depressy. Hôm nay tâm trí của bạn đang thế nào?',
};

export default function AiChatAssistant() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const history = useMemo(
    () => messages
      .filter((item) => item.id !== welcomeMessage.id)
      .map(({ role, content }) => ({ role, content })),
    [messages]
  );

  const closeModal = () => {
    if (!loading) {
      setVisible(false);
    }
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setInput('');
    setMessages((current) => [...current, userMessage]);
    setLoading(true);

    try {
      const response = await aiService.sendMessage(trimmed, history);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
      };
      setMessages((current) => [...current, assistantMessage]);
    } catch (error: any) {
      const fallbackMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: error?.response?.data?.error || 'Mình chưa kết nối được với AI. Bạn thử lại sau một chút nhé.',
      };
      setMessages((current) => [...current, fallbackMessage]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser ? (
          <View style={styles.botAvatar}>
            <Ionicons name="sparkles" size={14} color="#FFFFFF" />
          </View>
        ) : null}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.floatingButton, { bottom: Math.max(insets.bottom, 12) + 82 }]}
        activeOpacity={0.86}
        onPress={() => setVisible(true)}
      >
        <Ionicons name="chatbubble-ellipses" size={25} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.backdrop} onPress={closeModal} />
          <SafeAreaView
            style={[
              styles.sheet,
              keyboardHeight > 0 && styles.sheetKeyboardOpen,
              { marginBottom: keyboardHeight > 0 ? Spacing.sm : Math.max(insets.bottom, Spacing.md) },
            ]}
            edges={['top']}
          >
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Depressy AI</Text>
                <Text style={styles.subtitle}>lắng nghe tâm trí, thấu hiểu chính mình</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal} disabled={loading}>
                <Ionicons name="close" size={22} color={CHATBOT_COLORS.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            />

            {loading ? (
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color={CHATBOT_COLORS.primary} />
                <Text style={styles.typingText}>AI đang trả lời...</Text>
              </View>
            ) : null}

            <View style={[styles.inputBar, { paddingBottom: keyboardHeight > 0 ? Spacing.sm : Math.max(insets.bottom, Spacing.sm) }]}>
              <View style={styles.inputShell}>
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Nhắn với Depressy AI..."
                  placeholderTextColor="#8B9693"
                  multiline
                  maxLength={1200}
                  editable={!loading}
                  returnKeyType="send"
                  textAlignVertical="center"
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
                  activeOpacity={0.86}
                  onPress={sendMessage}
                  disabled={!input.trim() || loading}
                >
                  <Ionicons name="send" size={17} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const CHATBOT_COLORS = {
  primary: '#1D6B63',
  primaryDark: '#15554D',
  surface: '#F7FAF8',
  onSurface: '#111817',
  onSurfaceVariant: '#65736F',
  secondary: '#E8F5F2',
  border: 'rgba(20,78,73,0.12)',
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: Spacing.md,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: CHATBOT_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    ...Shadows.ambient,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.32)',
  },
  sheet: {
    width: '92%',
    maxHeight: '80%',
    minHeight: 500,
    marginHorizontal: Spacing.md,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    ...Shadows.ambient,
  },
  sheetKeyboardOpen: {
    maxHeight: '68%',
    minHeight: 360,
    borderRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CHATBOT_COLORS.border,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: CHATBOT_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  title: {
    color: CHATBOT_COLORS.onSurface,
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '900',
  },
  subtitle: {
    color: CHATBOT_COLORS.onSurfaceVariant,
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '88%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  botAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: CHATBOT_COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  assistantBubble: {
    backgroundColor: CHATBOT_COLORS.surface,
    borderBottomLeftRadius: 6,
  },
  userBubble: {
    backgroundColor: CHATBOT_COLORS.primary,
    borderBottomRightRadius: 6,
  },
  messageText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 21,
  },
  assistantText: {
    color: CHATBOT_COLORS.onSurface,
  },
  userText: {
    color: '#FFFFFF',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  typingText: {
    color: CHATBOT_COLORS.onSurfaceVariant,
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
  },
  inputBar: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CHATBOT_COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: CHATBOT_COLORS.surface,
    borderWidth: 1,
    borderColor: CHATBOT_COLORS.border,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 96,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: CHATBOT_COLORS.onSurface,
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 20,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: CHATBOT_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  sendButtonDisabled: {
    opacity: 0.48,
  },
});
