const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const uploadController = require('../controllers/uploadController');

router.post('/request-url', authMiddleware, uploadController.requestUploadUrl);

module.exports = router;
