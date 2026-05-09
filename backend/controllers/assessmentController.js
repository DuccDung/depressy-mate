const pool = require('../config/db');
const { calculateAssessmentResult } = require('../caculator');
const clinicalScalesSeed = require('../clinical_scales_seed.json');

/**
 * Lấy ra configuration của bài test từ seed data 
 * Bọc lại để xử lý trường hợp mảng bị lồng do lỗi format JSON
 */
const getScaleConfig = (assessmentCode) => {
    // Flat mảng để tìm linh hoạt hơn
    const flatSeed = clinicalScalesSeed.flat();
    
    const scaleDefinition = flatSeed.find(
        item => item.assessment_code === assessmentCode && item.questions
    );
    
    const thresholdConfig = flatSeed.find(
        item => item.assessment_code === assessmentCode && item.scales
    );

    return { scaleDefinition, thresholdConfig };
};

/**
 * POST /api/assessments/calculate
 * Tính toán kết quả bài test và lưu vào CSDL
 * Bắt buộc truyền body: { assessment_code, user_answers }
 */
const submitAssessment = async (req, res) => {
    const { assessment_code, user_answers } = req.body;
    
    // Yêu cầu user phải login để lấy userId (từ token trong middleware)
    // Hoặc tạm thời nếu chưa gắn Auth middleware, ta dùng mock user/chờ FE gửi
    const userId = req.user ? req.user.id : null;

    if (!assessment_code || !Array.isArray(user_answers) || user_answers.length === 0) {
        return res.status(400).json({ error: 'Mã bài test hoặc danh sách câu trả lời không hợp lệ.' });
    }

    if (!userId) {
        return res.status(401).json({ error: 'Yêu cầu đăng nhập để lưu kết quả bài test.' });
    }

    try {
        const { scaleDefinition, thresholdConfig } = getScaleConfig(assessment_code);

        if (!scaleDefinition || !thresholdConfig) {
            return res.status(404).json({ error: `Không tìm thấy bộ cấu hình hợp lệ cho bài test ${assessment_code}` });
        }

        // 1. Tính toán điểm số và cấp độ
        const result = calculateAssessmentResult(
            assessment_code,
            user_answers,
            scaleDefinition,
            thresholdConfig
        );

        // 2. Lưu kết quả vào DB
        const insertQuery = `
            INSERT INTO assessment_results (
                user_id, 
                assessment_code, 
                raw_scores, 
                final_scores, 
                classifications, 
                overall_severity, 
                is_red_alert
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        
        const values = [
            userId,
            result.assessment_code,
            JSON.stringify(result.raw_scores),
            JSON.stringify(result.final_scores),
            JSON.stringify(result.classifications),
            result.overall_severity,
            result.is_red_alert
        ];

        const dbRes = await pool.query(insertQuery, values);
        const savedResult = dbRes.rows[0];

        // 3. Trả về cho frontend
        res.status(200).json({
            message: 'Đã lưu và tính toán thành công',
            data: savedResult
        });
        
    } catch (err) {
        console.error('Lỗi tính toán bài test:', err);
        res.status(500).json({ error: 'Có lỗi xảy ra trong quá trình tính điểm bài đánh giá.' });
    }
};

/**
 * GET /api/assessments/history
 * Lấy lịch sử làm bài của User
 */
const getAssessmentHistory = async (req, res) => {
    const userId = req.user ? req.user.id : null;

    if (!userId) {
        return res.status(401).json({ error: 'Yêu cầu đăng nhập.' });
    }

    try {
        const query = `
            SELECT * FROM assessment_results 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        
        res.status(200).json({ data: result.rows });
    } catch (err) {
        console.error('Lỗi lấy lịch sử:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { submitAssessment, getAssessmentHistory };
