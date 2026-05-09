const express = require('express');
const router = express.Router();
const { submitAssessment, getAssessmentHistory } = require('../controllers/assessmentController');
const jwt = require('jsonwebtoken');

// Middleware xác thực token 
// Vì chúng ta cần userId để lưu assessment_results
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Dữ liệu payload: { id, email, role }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

// POST /api/assessments/calculate
router.post('/calculate', authenticate, submitAssessment);

// GET /api/assessments/history 
router.get('/history', authenticate, getAssessmentHistory);

module.exports = router;
