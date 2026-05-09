import api from './api';

export interface ChatUser {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
}

export interface ConversationParticipant {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface Conversation {
  id: string;
  type: string;
  created_at: string;
  last_message_content: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  unread_count: number;
  participants: ConversationParticipant[];
}

export const chatService = {
  // 1. Search Users
  searchUsers: async (query: string): Promise<ChatUser[]> => {
    const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  // 2. Fetch Conversations
  getConversations: async (): Promise<Conversation[]> => {
    const res = await api.get('/conversations');
    return res.data;
  },

  // 3. Create or Get Conversation
  createConversation: async (participantId: string): Promise<{ id: string; existing: boolean }> => {
    const res = await api.post('/conversations', { participant_id: participantId });
    return res.data;
  }
};
