const jwt = require('jsonwebtoken');
require('dotenv').config();

// Create fake token for test
const token = jwt.sign(
  { id: 'f23f0e3d-652f-4ae9-967f-fde4e7527a11', email: 'test@test.com', role: 'USER' },
  process.env.JWT_SECRET || 'depressy_mate_jwt_secret_key_2026_bkhn'
);

const payload = {
    assessment_code: "SAS",
    user_answers: [
        { question_order: 1, score: 3 },
        { question_order: 2, score: 2 },
        { question_order: 3, score: 4 },
        { question_order: 4, score: 1 },
        { question_order: 5, score: 3 },
        { question_order: 6, score: 4 },
        { question_order: 7, score: 2 },
        { question_order: 8, score: 1 },
        { question_order: 9, score: 2 },
        { question_order: 10, score: 3 },
        { question_order: 11, score: 4 },
        { question_order: 12, score: 2 },
        { question_order: 13, score: 3 },
        { question_order: 14, score: 1 },
        { question_order: 15, score: 4 },
        { question_order: 16, score: 2 },
        { question_order: 17, score: 3 },
        { question_order: 18, score: 1 },
        { question_order: 19, score: 2 },
        { question_order: 20, score: 4 }
    ]
};

const runTest = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/assessments/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Data:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
};

runTest();
