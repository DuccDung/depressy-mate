import api from './api';

export interface ChatUser {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
}

export interface ConversationParticipant {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joined_at: string;
  last_read_at: string | null;
}

export interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name: string | null;
  avatar_url: string | null;
  display_name: string;
  display_avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_message_content: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  last_message_type: string | null;
  unread_count: number;
  participant_count: number;
  participants: ConversationParticipant[];
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  message_type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  media_url: string | null;
  is_read: boolean;
  created_at: string;
  edited_at: string | null;
}

export interface PagedMessages {
  data: Message[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface ConversationCreateResult {
  id: string;
  existing: boolean;
  conversation: Conversation;
}

export const chatService = {
  searchUsers: async (query: string, limit = 20): Promise<ChatUser[]> => {
    const res = await api.get(`/users/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return res.data;
  },

  getUserProfile: async (userId: string): Promise<ChatUser> => {
    const res = await api.get(`/users/${userId}`);
    return res.data;
  },

  getConversations: async (): Promise<Conversation[]> => {
    const res = await api.get('/conversations');
    return res.data;
  },

  getConversation: async (conversationId: string): Promise<Conversation> => {
    const res = await api.get(`/conversations/${conversationId}`);
    return res.data;
  },

  createConversation: async (participantId: string): Promise<ConversationCreateResult> => {
    const res = await api.post('/conversations', { participant_id: participantId });
    return res.data;
  },

  createDirectConversation: async (participantId: string): Promise<ConversationCreateResult> => {
    const res = await api.post('/conversations/direct', { participant_id: participantId });
    return res.data;
  },

  createGroupConversation: async (name: string, participantIds: string[], avatarUrl?: string | null): Promise<ConversationCreateResult> => {
    const res = await api.post('/conversations/group', {
      name,
      participant_ids: participantIds,
      avatar_url: avatarUrl || null,
    });
    return res.data;
  },

  getMessages: async (conversationId: string, limit = 30, before?: string | null): Promise<PagedMessages> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.append('before', before);

    const res = await api.get(`/conversations/${conversationId}/messages?${params.toString()}`);
    return res.data;
  },

  sendMessage: async (conversationId: string, content: string): Promise<Message> => {
    const res = await api.post(`/conversations/${conversationId}/messages`, { content });
    return res.data;
  },

  markAsRead: async (conversationId: string) => {
    await api.post(`/conversations/${conversationId}/read`);
  },

  updateGroup: async (conversationId: string, payload: { name?: string; avatar_url?: string | null }): Promise<Conversation> => {
    const res = await api.patch(`/conversations/${conversationId}`, payload);
    return res.data;
  },

  addMembers: async (conversationId: string, userIds: string[]): Promise<Conversation> => {
    const res = await api.post(`/conversations/${conversationId}/members`, { user_ids: userIds });
    return res.data;
  },

  removeMember: async (conversationId: string, userId: string): Promise<Conversation> => {
    const res = await api.delete(`/conversations/${conversationId}/members/${userId}`);
    return res.data;
  },

  leaveGroup: async (conversationId: string) => {
    await api.post(`/conversations/${conversationId}/leave`);
  },
};
