import api from './api';

export type AiChatRole = 'user' | 'assistant';

export type AiChatHistoryMessage = {
  role: AiChatRole;
  content: string;
};

type AiChatResponse = {
  response: string;
};

export const aiService = {
  async sendMessage(message: string, history: AiChatHistoryMessage[] = []) {
    const response = await api.post<AiChatResponse>('/ai/chat', {
      message,
      history,
    });

    return response.data.response;
  },
};
