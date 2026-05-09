const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const interactionController = require('../controllers/interactionController');

// Like
router.post('/posts/:id/like', authMiddleware, interactionController.toggleLike);

// Comments
router.get('/posts/:id/comments', interactionController.getComments);
router.post('/posts/:id/comments', authMiddleware, interactionController.createComment);
router.delete('/comments/:id', authMiddleware, interactionController.deleteComment);

module.exports = router;
