const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

// Map user_id -> Set of socket IDs (1 user có thể mở nhiều tab/device)
const userSocketMap = new Map();

/**
 * Khởi tạo Socket.io server, tích hợp JWT auth.
 * @param {import('http').Server} httpServer
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Middleware xác thực JWT trước khi cho phép kết nối
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, email, role }
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`[Socket] User ${userId} connected (socket: ${socket.id})`);

    // Lưu mapping user -> socket
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);

    // Join room cá nhân để dễ emit targeted events
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      console.log(`[Socket] User ${userId} disconnected (socket: ${socket.id})`);
      const sockets = userSocketMap.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSocketMap.delete(userId);
        }
      }
    });
  });

  return io;
};

/**
 * Lấy instance Socket.io (gọi sau khi initSocket)
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket first.');
  }
  return io;
};

/**
 * Kiểm tra user có online không
 */
const isUserOnline = (userId) => {
  return userSocketMap.has(userId) && userSocketMap.get(userId).size > 0;
};

module.exports = { initSocket, getIO, isUserOnline };
