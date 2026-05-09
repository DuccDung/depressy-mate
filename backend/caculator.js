function calculateAssessmentResult(assessmentCode, userAnswers, scaleDefinition, thresholdConfig) {

    // Bước 1 & 2: Khởi tạo và Cộng điểm thô (Giữ nguyên như cũ)
    let rawScores = {};
    let totalRawScore = 0;
    const optionScores = scaleDefinition.options.map(opt => opt.score);
    const maxOptionScore = Math.max(...optionScores);
    const minOptionScore = Math.min(...optionScores);

    userAnswers.forEach(answer => {
        const questionConfig = scaleDefinition.questions.find(q => q.order === answer.question_order);
        if (questionConfig) {
            let finalQuestionScore = answer.score;
            const category = questionConfig.category;

            // Xử lý điểm ngược (Reverse Scoring) cho RADS
            if (questionConfig.is_reverse_score) {
                finalQuestionScore = (maxOptionScore + minOptionScore) - answer.score;
            }

            if (rawScores[category] === undefined) {
                rawScores[category] = 0;
            }
            rawScores[category] += finalQuestionScore;
            totalRawScore += finalQuestionScore;
        }
    });

    // Bước 3: Xử lý Nhân hệ số (Giữ nguyên)
    let finalScores = {};
    if (assessmentCode === "DASS-21") {
        for (let cat in rawScores) {
            finalScores[cat] = rawScores[cat] * 2;
        }
    } else {
        finalScores = { ...rawScores };
        finalScores["Total"] = totalRawScore;
    }

    // ==========================================
    // BƯỚC 4 ĐÃ ĐƯỢC LÀM MỚI 100%: TỰ ĐỘNG HÓA HOÀN TOÀN
    // ==========================================
    let classifications = {};
    let overallSeverity = 0;

    // Tự động quét qua tất cả các tiêu chí đánh giá được định nghĩa trong file JSON Threshold
    thresholdConfig.scales.forEach(scale => {
        let category = scale.category;

        // Logic tự động: DASS-21 đối chiếu theo từng mảng bệnh, các bài test khác (RADS, SAS) đối chiếu theo Tổng điểm
        let scoreToCompare = (assessmentCode === "DASS-21") ? finalScores[category] : finalScores["Total"];

        // Tìm mức độ kết luận tương ứng với điểm
        let resultLevel = scale.levels.find(t => scoreToCompare >= t.min && scoreToCompare <= t.max);

        if (resultLevel) {
            classifications[category] = resultLevel.level;

            // Cập nhật mức độ nghiêm trọng cao nhất
            if (resultLevel.severity_score > overallSeverity) {
                overallSeverity = resultLevel.severity_score;
            }
        }
    });

    return {
        assessment_code: assessmentCode,
        raw_scores: rawScores,
        final_scores: finalScores,
        classifications: classifications,
        overall_severity: overallSeverity,
        is_red_alert: overallSeverity >= 3
    };
}

module.exports = { calculateAssessmentResult };
