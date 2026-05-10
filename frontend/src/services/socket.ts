import * as signalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ORIGIN } from './api';
import type { Message } from './chatService';

class RealtimeService {
  public connection: signalR.HubConnection | null = null;
  private starting: Promise<signalR.HubConnection | null> | null = null;
  private activeToken: string | null = null;

  async initSocket() {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      await this.disconnect();
      return null;
    }

    if (
      this.connection?.state === signalR.HubConnectionState.Connected &&
      this.activeToken === token
    ) {
      return this.connection;
    }

    if (this.connection && this.activeToken !== token) {
      await this.disconnect();
    }

    if (this.starting) {
      return this.starting;
    }

    this.starting = this.startConnection(token);
    try {
      return await this.starting;
    } finally {
      this.starting = null;
    }
  }

  getSocket() {
    return this.connection;
  }

  async joinConversation(conversationId: string) {
    const connection = await this.initSocket();
    if (connection?.state === signalR.HubConnectionState.Connected) {
      await connection.invoke('JoinConversation', conversationId);
    }
  }

  async sendMessage(conversationId: string, content: string): Promise<Message> {
    const connection = await this.initSocket();
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Realtime connection is not ready.');
    }

    return connection.invoke<Message>('SendMessage', conversationId, content);
  }

  async markConversationRead(conversationId: string) {
    const connection = await this.initSocket();
    if (connection?.state === signalR.HubConnectionState.Connected) {
      await connection.invoke('MarkConversationRead', conversationId);
    }
  }

  async setTyping(conversationId: string, isTyping: boolean) {
    const connection = await this.initSocket();
    if (connection?.state === signalR.HubConnectionState.Connected) {
      await connection.invoke('SetTyping', conversationId, isTyping);
    }
  }

  async disconnect() {
    this.starting = null;
    this.activeToken = null;

    if (this.connection) {
      const connection = this.connection;
      this.connection = null;
      await connection.stop();
    }
  }

  private async startConnection(token: string) {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_ORIGIN}/hubs/chat`, {
        accessTokenFactory: async () => (await AsyncStorage.getItem('userToken')) || '',
        withCredentials: false,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.onreconnected(() => {
      console.log('[Realtime] Reconnected');
    });

    connection.onclose((error) => {
      if (error) {
        console.warn('[Realtime] Connection closed', error.message);
      }
    });

    await connection.start();
    this.connection = connection;
    this.activeToken = token;
    console.log('[Realtime] Connected to SignalR hub');

    return connection;
  }
}

export default new RealtimeService();
