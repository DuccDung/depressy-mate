using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Services;

namespace server.Controllers.Api;

[ApiController]
[Route("api/assessments")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class AssessmentsApiController : ControllerBase
{
    private readonly DepressyMateContext _context;

    public AssessmentsApiController(DepressyMateContext context)
    {
        _context = context;
    }

    [HttpPost("calculate")]
    public async Task<IActionResult> Calculate(CalculateAssessmentRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var assessmentCode = request.AssessmentCode?.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(assessmentCode))
        {
            return BadRequest(new { error = "Thiếu mã bài test." });
        }

        var answers = request.UserAnswers
            .GroupBy(item => item.QuestionOrder)
            .ToDictionary(group => group.Key, group => group.Last().Score);

        if (answers.Count == 0)
        {
            return BadRequest(new { error = "Vui lòng trả lời ít nhất một câu hỏi." });
        }

        var calculated = CalculateResult(assessmentCode, answers);
        var now = DateTime.UtcNow;
        var entity = new AssessmentResult
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            AssessmentCode = assessmentCode,
            RawScores = JsonSerializer.Serialize(calculated.RawScores),
            FinalScores = JsonSerializer.Serialize(calculated.FinalScores),
            Classifications = JsonSerializer.Serialize(calculated.Classifications),
            OverallSeverity = calculated.OverallSeverity,
            IsRedAlert = calculated.IsRedAlert,
            CreatedAt = now
        };

        _context.AssessmentResults.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { data = MapResult(entity) });
    }

    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery] int limit = 50, [FromQuery] int offset = 0, CancellationToken cancellationToken = default)
    {
        var currentUserId = ChatService.GetUserId(User);
        var safeLimit = Math.Clamp(limit, 1, 200);
        var safeOffset = Math.Max(0, offset);

        var query = _context.AssessmentResults
            .AsNoTracking()
            .Where(item => item.UserId == currentUserId)
            .OrderByDescending(item => item.CreatedAt);

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .Skip(safeOffset)
            .Take(safeLimit)
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            data = rows.Select(MapResult),
            total,
            limit = safeLimit,
            offset = safeOffset
        });
    }

    private static CalculatedAssessment CalculateResult(string code, Dictionary<int, int> answers)
    {
        return code switch
        {
            "DASS-21" => CalculateDass21(answers),
            "PHQ-9" => CalculateSingleScale(code, "Depression", answers, Thresholds.Phq9, redAlertQuestion: 9),
            "GAD-7" => CalculateSingleScale(code, "Anxiety", answers, Thresholds.Gad7),
            "SAS" => CalculateSas(answers),
            "RADS" => CalculateRads(answers),
            _ => CalculateGeneric(code, answers)
        };
    }

    private static CalculatedAssessment CalculateDass21(Dictionary<int, int> answers)
    {
        var groups = new Dictionary<string, int[]>
        {
            ["Depression"] = new[] { 3, 5, 10, 13, 16, 17, 21 },
            ["Anxiety"] = new[] { 2, 4, 7, 9, 15, 19, 20 },
            ["Stress"] = new[] { 1, 6, 8, 11, 12, 14, 18 }
        };

        var finalScores = groups.ToDictionary(
            item => item.Key,
            item => item.Value.Sum(order => answers.GetValueOrDefault(order)) * 2);
        var classifications = new Dictionary<string, string>();
        var severities = new List<int>();

        foreach (var item in finalScores)
        {
            var threshold = item.Key switch
            {
                "Depression" => Thresholds.DassDepression,
                "Anxiety" => Thresholds.DassAnxiety,
                _ => Thresholds.DassStress
            };
            var level = Classify(item.Value, threshold);
            classifications[item.Key] = level.Label;
            severities.Add(level.Severity);
        }

        return CreateCalculated("DASS-21", answers, finalScores, classifications, severities.Max());
    }

    private static CalculatedAssessment CalculateSas(Dictionary<int, int> answers)
    {
        var reverseOrders = new HashSet<int> { 5, 9, 13, 17, 19 };
        var total = Enumerable.Range(1, 20).Sum(order =>
        {
            var score = answers.GetValueOrDefault(order);
            return reverseOrders.Contains(order) ? 5 - score : score;
        });

        var level = Classify(total, Thresholds.Sas);
        return CreateCalculated(
            "SAS",
            answers,
            new Dictionary<string, int> { ["Anxiety"] = total },
            new Dictionary<string, string> { ["Anxiety"] = level.Label },
            level.Severity);
    }

    private static CalculatedAssessment CalculateRads(Dictionary<int, int> answers)
    {
        var reverseOrders = new HashSet<int> { 1, 5, 10, 12, 23, 25, 29 };
        var total = Enumerable.Range(1, 30).Sum(order =>
        {
            var score = answers.GetValueOrDefault(order);
            return reverseOrders.Contains(order) ? 5 - score : score;
        });

        var level = Classify(total, Thresholds.Rads);
        return CreateCalculated(
            "RADS",
            answers,
            new Dictionary<string, int> { ["Depression"] = total },
            new Dictionary<string, string> { ["Depression"] = level.Label },
            level.Severity);
    }

    private static CalculatedAssessment CalculateSingleScale(
        string code,
        string category,
        Dictionary<int, int> answers,
        IReadOnlyList<SeverityBand> bands,
        int? redAlertQuestion = null)
    {
        var total = answers.Values.Sum();
        var level = Classify(total, bands);
        var isRedAlert = redAlertQuestion.HasValue && answers.GetValueOrDefault(redAlertQuestion.Value) > 0;
        return CreateCalculated(
            code,
            answers,
            new Dictionary<string, int> { [category] = total },
            new Dictionary<string, string> { [category] = level.Label },
            Math.Max(level.Severity, isRedAlert ? 3 : 0),
            isRedAlert);
    }

    private static CalculatedAssessment CalculateGeneric(string code, Dictionary<int, int> answers)
    {
        var total = answers.Values.Sum();
        var maxScore = Math.Max(1, answers.Count * Math.Max(1, answers.Values.DefaultIfEmpty(0).Max()));
        var severity = Math.Clamp((int)Math.Round((double)total / maxScore * 4), 0, 4);

        return CreateCalculated(
            code,
            answers,
            new Dictionary<string, int> { ["Total"] = total },
            new Dictionary<string, string> { ["Total"] = SeverityLabel(severity) },
            severity);
    }

    private static CalculatedAssessment CreateCalculated(
        string code,
        Dictionary<int, int> answers,
        Dictionary<string, int> finalScores,
        Dictionary<string, string> classifications,
        int severity,
        bool forceRedAlert = false)
    {
        return new CalculatedAssessment
        {
            RawScores = new Dictionary<string, object>
            {
                ["assessment_code"] = code,
                ["answers"] = answers
                    .OrderBy(item => item.Key)
                    .Select(item => new { question_order = item.Key, score = item.Value })
                    .ToList()
            },
            FinalScores = finalScores,
            Classifications = classifications,
            OverallSeverity = Math.Clamp(severity, 0, 4),
            IsRedAlert = forceRedAlert || severity >= 4
        };
    }

    private static SeverityBand Classify(int score, IReadOnlyList<SeverityBand> bands)
    {
        return bands.FirstOrDefault(item => score >= item.Min && score <= item.Max)
            ?? bands.OrderByDescending(item => item.Max).First();
    }

    private static string SeverityLabel(int severity)
    {
        return severity switch
        {
            0 => "Bình thường",
            1 => "Nhẹ",
            2 => "Vừa",
            3 => "Nặng",
            _ => "Rất nặng"
        };
    }

    private static object MapResult(AssessmentResult result)
    {
        return new
        {
            id = result.Id,
            user_id = result.UserId,
            assessment_code = result.AssessmentCode,
            raw_scores = ReadJson(result.RawScores),
            final_scores = ReadJson(result.FinalScores),
            classifications = ReadJson(result.Classifications),
            overall_severity = result.OverallSeverity,
            is_red_alert = result.IsRedAlert,
            created_at = result.CreatedAt
        };
    }

    private static object ReadJson(string value)
    {
        return JsonSerializer.Deserialize<object>(value) ?? new { };
    }

    private sealed class CalculatedAssessment
    {
        public Dictionary<string, object> RawScores { get; init; } = new();

        public Dictionary<string, int> FinalScores { get; init; } = new();

        public Dictionary<string, string> Classifications { get; init; } = new();

        public int OverallSeverity { get; init; }

        public bool IsRedAlert { get; init; }
    }

    private sealed record SeverityBand(int Min, int Max, int Severity, string Label);

    private static class Thresholds
    {
        public static readonly SeverityBand[] DassDepression =
        {
            new(0, 9, 0, "Bình thường"),
            new(10, 13, 1, "Nhẹ"),
            new(14, 20, 2, "Vừa"),
            new(21, 27, 3, "Nặng"),
            new(28, 999, 4, "Rất nặng")
        };

        public static readonly SeverityBand[] DassAnxiety =
        {
            new(0, 7, 0, "Bình thường"),
            new(8, 9, 1, "Nhẹ"),
            new(10, 14, 2, "Vừa"),
            new(15, 19, 3, "Nặng"),
            new(20, 999, 4, "Rất nặng")
        };

        public static readonly SeverityBand[] DassStress =
        {
            new(0, 14, 0, "Bình thường"),
            new(15, 18, 1, "Nhẹ"),
            new(19, 25, 2, "Vừa"),
            new(26, 33, 3, "Nặng"),
            new(34, 999, 4, "Rất nặng")
        };

        public static readonly SeverityBand[] Phq9 =
        {
            new(0, 4, 0, "Bình thường"),
            new(5, 9, 1, "Trầm cảm nhẹ"),
            new(10, 14, 2, "Trầm cảm vừa"),
            new(15, 19, 3, "Trầm cảm nặng vừa"),
            new(20, 27, 4, "Trầm cảm nghiêm trọng")
        };

        public static readonly SeverityBand[] Gad7 =
        {
            new(0, 4, 0, "Bình thường"),
            new(5, 9, 1, "Lo âu nhẹ"),
            new(10, 14, 2, "Lo âu vừa"),
            new(15, 21, 4, "Lo âu nghiêm trọng")
        };

        public static readonly SeverityBand[] Sas =
        {
            new(20, 44, 0, "Bình thường"),
            new(45, 59, 1, "Lo âu nhẹ đến vừa"),
            new(60, 74, 3, "Lo âu nặng"),
            new(75, 80, 4, "Lo âu cực kỳ nghiêm trọng")
        };

        public static readonly SeverityBand[] Rads =
        {
            new(30, 59, 0, "Bình thường"),
            new(60, 76, 1, "Nguy cơ nhẹ"),
            new(77, 120, 3, "Trầm cảm lâm sàng")
        };
    }
}

public sealed class CalculateAssessmentRequest
{
    [JsonPropertyName("assessment_code")]
    public string? AssessmentCode { get; init; }

    [JsonPropertyName("user_answers")]
    public List<AssessmentAnswerDto> UserAnswers { get; init; } = new();
}

public sealed class AssessmentAnswerDto
{
    [JsonPropertyName("question_order")]
    public int QuestionOrder { get; init; }

    [JsonPropertyName("score")]
    public int Score { get; init; }
}
