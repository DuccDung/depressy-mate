const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journalController');
const authMiddleware = require('../middlewares/authMiddleware');

// Yêu cầu đăng nhập cho tất cả route nhật ký
router.use(authMiddleware);

router.post('/', journalController.createJournal);
router.get('/', journalController.getJournals);

module.exports = router;
