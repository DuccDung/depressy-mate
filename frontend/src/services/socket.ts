import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lấy từ config tương tự như API (cùng server port 3000)
const SOCKET_URL = 'http://192.168.111.213:3000';

class SocketService {
  public socket: Socket | null = null;

  async initSocket() {
    if (this.socket && this.socket.connected) return this.socket;

    const token = await AsyncStorage.getItem('userToken');
    if (!token) return null;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to realtime server');
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    return this.socket;
  }

  getSocket() {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketService();
