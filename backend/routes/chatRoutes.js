const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const chatController = require('../controllers/chatController');

router.get('/conversations', authMiddleware, chatController.getConversations);
router.post('/conversations', authMiddleware, chatController.createConversation);
router.get('/conversations/:id/messages', authMiddleware, chatController.getMessages);
router.post('/conversations/:id/messages', authMiddleware, chatController.sendMessage);
router.put('/conversations/:id/messages/read', authMiddleware, chatController.markAsRead);

module.exports = router;
