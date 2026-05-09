const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const postController = require('../controllers/postController');

// Feed công khai (nhưng nếu có token thì trả thêm is_liked)
router.get('/', optionalAuth, postController.getFeed);
router.get('/:id', optionalAuth, postController.getPostById);

// Cần đăng nhập
router.post('/', authMiddleware, postController.createPost);
router.put('/:id', authMiddleware, postController.updatePost);
router.delete('/:id', authMiddleware, postController.deletePost);

/**
 * Middleware cho phép xem feed mà không cần đăng nhập,
 * nhưng nếu có token thì parse user info.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const jwt = require('jsonwebtoken');
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Token hết hạn hoặc sai → bỏ qua, vẫn cho xem feed
    }
  }
  next();
}

module.exports = router;
