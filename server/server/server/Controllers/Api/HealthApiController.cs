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
[Route("api/health")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class HealthApiController : ControllerBase
{
    private readonly DepressyMateContext _context;

    public HealthApiController(DepressyMateContext context)
    {
        _context = context;
    }

    [HttpPost("breathing-sessions")]
    public async Task<IActionResult> CreateBreathingSession(CreateBreathingSessionRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var duration = Math.Clamp(request.DurationSeconds, 0, 24 * 60 * 60);
        var totalCycles = Math.Clamp(request.TotalCycles, 0, 1000);
        var cyclesCompleted = Math.Clamp(request.CyclesCompleted, 0, Math.Max(totalCycles, request.CyclesCompleted));

        if (duration <= 0 && cyclesCompleted <= 0)
        {
            return BadRequest(new { error = "Phiên hít thở chưa có dữ liệu để lưu." });
        }

        var session = new BreathingSession
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            DurationSeconds = duration,
            CyclesCompleted = cyclesCompleted,
            TotalCycles = totalCycles,
            Completed = request.Completed,
            CreatedAt = DateTime.UtcNow
        };

        _context.BreathingSessions.Add(session);
        await _context.SaveChangesAsync(cancellationToken);
        return Created($"/api/health/breathing-sessions/{session.Id}", MapBreathingSession(session));
    }

    [HttpPost("sleep-sessions")]
    public async Task<IActionResult> CreateSleepSession(CreateSleepSessionRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var listenedMs = Math.Clamp(request.ListenedMs, 0, 24 * 60 * 60 * 1000);
        var durationMs = Math.Clamp(request.DurationMs, 0, 24 * 60 * 60 * 1000);

        if (listenedMs < 1000)
        {
            return BadRequest(new { error = "Phiên nghe quá ngắn nên chưa được lưu." });
        }

        var session = new SleepSession
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            TrackId = Clean(request.TrackId),
            TrackTitle = Clean(request.TrackTitle),
            DurationMs = durationMs,
            ListenedMs = listenedMs,
            Completed = request.Completed || (durationMs > 0 && listenedMs >= durationMs * 0.9),
            CreatedAt = DateTime.UtcNow
        };

        _context.SleepSessions.Add(session);
        await _context.SaveChangesAsync(cancellationToken);
        return Created($"/api/health/sleep-sessions/{session.Id}", MapSleepSession(session));
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] int days = 30, CancellationToken cancellationToken = default)
    {
        var currentUserId = ChatService.GetUserId(User);
        var safeDays = Math.Clamp(days, 7, 365);
        var from = DateTime.UtcNow.Date.AddDays(-(safeDays - 1));

        var assessments = await _context.AssessmentResults
            .AsNoTracking()
            .Where(item => item.UserId == currentUserId && item.CreatedAt >= from)
            .OrderBy(item => item.CreatedAt)
            .ToListAsync(cancellationToken);

        var checkins = await _context.MoodCheckins
            .AsNoTracking()
            .Where(item => item.UserId == currentUserId && item.CreatedAt >= from)
            .OrderBy(item => item.CreatedAt)
            .ToListAsync(cancellationToken);

        var journals = await _context.Journals
            .AsNoTracking()
            .Where(item => item.UserId == currentUserId && item.CreatedAt >= from)
            .OrderBy(item => item.CreatedAt)
            .ToListAsync(cancellationToken);

        var breathing = await _context.BreathingSessions
            .AsNoTracking()
            .Where(item => item.UserId == currentUserId && item.CreatedAt >= from)
            .OrderBy(item => item.CreatedAt)
            .ToListAsync(cancellationToken);

        var sleep = await _context.SleepSessions
            .AsNoTracking()
            .Where(item => item.UserId == currentUserId && item.CreatedAt >= from)
            .OrderBy(item => item.CreatedAt)
            .ToListAsync(cancellationToken);

        var latestByAssessment = assessments
            .GroupBy(item => item.AssessmentCode)
            .Select(group => group.OrderByDescending(item => item.CreatedAt).First())
            .OrderByDescending(item => item.CreatedAt)
            .ToList();

        var daily = Enumerable.Range(0, safeDays)
            .Select(offset => from.AddDays(offset))
            .Select(day =>
            {
                var nextDay = day.AddDays(1);
                var dayCheckins = checkins.Where(item => item.CreatedAt >= day && item.CreatedAt < nextDay).ToList();
                var dayAssessments = assessments.Where(item => item.CreatedAt >= day && item.CreatedAt < nextDay).ToList();
                var dayJournals = journals.Count(item => item.CreatedAt >= day && item.CreatedAt < nextDay);
                var dayBreathing = breathing.Where(item => item.CreatedAt >= day && item.CreatedAt < nextDay).ToList();
                var daySleep = sleep.Where(item => item.CreatedAt >= day && item.CreatedAt < nextDay).ToList();

                return new
                {
                    date = day.ToString("yyyy-MM-dd"),
                    mood_score = dayCheckins.Count > 0 ? Math.Round(dayCheckins.Average(item => MoodScore(item.Mood)), 2) : (double?)null,
                    assessment_severity = dayAssessments.Count > 0 ? Math.Round(dayAssessments.Average(item => item.OverallSeverity), 2) : (double?)null,
                    checkin_count = dayCheckins.Count,
                    journal_count = dayJournals,
                    breathing_minutes = Math.Round(dayBreathing.Sum(item => item.DurationSeconds) / 60.0, 1),
                    breathing_sessions = dayBreathing.Count,
                    sleep_minutes = Math.Round(daySleep.Sum(item => item.ListenedMs) / 60000.0, 1),
                    sleep_sessions = daySleep.Count
                };
            })
            .ToList();

        var latestSeverity = latestByAssessment.FirstOrDefault()?.OverallSeverity;
        var latestMoodScore = checkins.OrderByDescending(item => item.CreatedAt).FirstOrDefault() is { } latestMood
            ? MoodScore(latestMood.Mood)
            : (double?)null;

        return Ok(new
        {
            range = new
            {
                days = safeDays,
                from = from,
                to = DateTime.UtcNow
            },
            totals = new
            {
                assessments = assessments.Count,
                checkins = checkins.Count,
                journals = journals.Count,
                breathing_sessions = breathing.Count,
                breathing_minutes = Math.Round(breathing.Sum(item => item.DurationSeconds) / 60.0, 1),
                sleep_sessions = sleep.Count,
                sleep_minutes = Math.Round(sleep.Sum(item => item.ListenedMs) / 60000.0, 1)
            },
            latest = new
            {
                assessment_severity = latestSeverity,
                mood_score = latestMoodScore,
                last_checkin_at = checkins.LastOrDefault()?.CreatedAt,
                last_journal_at = journals.LastOrDefault()?.CreatedAt,
                last_breathing_at = breathing.LastOrDefault()?.CreatedAt,
                last_sleep_at = sleep.LastOrDefault()?.CreatedAt
            },
            latest_assessments = latestByAssessment.Select(MapAssessmentPoint),
            assessment_series = assessments.Select(MapAssessmentPoint),
            mood_series = checkins.Select(item => new
            {
                id = item.Id,
                date = item.CreatedAt,
                mood = item.Mood,
                score = MoodScore(item.Mood),
                note = item.Note
            }),
            breathing_sessions = breathing.Select(MapBreathingSession),
            sleep_sessions = sleep.Select(MapSleepSession),
            journal_series = journals.Select(item => new
            {
                id = item.Id,
                date = item.CreatedAt,
                title = item.Title,
                has_audio = !string.IsNullOrWhiteSpace(item.AudioUrl),
                content_length = item.Content?.Length ?? 0
            }),
            daily,
            insight = BuildInsight(latestSeverity, latestMoodScore, breathing.Count, sleep.Count, journals.Count, checkins.Count)
        });
    }

    private static object MapAssessmentPoint(AssessmentResult item)
    {
        return new
        {
            id = item.Id,
            assessment_code = item.AssessmentCode,
            date = item.CreatedAt,
            overall_severity = item.OverallSeverity,
            is_red_alert = item.IsRedAlert,
            final_scores = ReadJson(item.FinalScores),
            classifications = ReadJson(item.Classifications)
        };
    }

    private static object MapBreathingSession(BreathingSession item)
    {
        return new
        {
            id = item.Id,
            user_id = item.UserId,
            duration_seconds = item.DurationSeconds,
            cycles_completed = item.CyclesCompleted,
            total_cycles = item.TotalCycles,
            completed = item.Completed,
            created_at = item.CreatedAt
        };
    }

    private static object MapSleepSession(SleepSession item)
    {
        return new
        {
            id = item.Id,
            user_id = item.UserId,
            track_id = item.TrackId,
            track_title = item.TrackTitle,
            duration_ms = item.DurationMs,
            listened_ms = item.ListenedMs,
            completed = item.Completed,
            created_at = item.CreatedAt
        };
    }

    private static int MoodScore(string mood)
    {
        return mood.ToLowerInvariant() switch
        {
            "excellent" => 5,
            "good" => 4,
            "okay" => 3,
            "sad" => 2,
            "terrible" => 1,
            _ => 3
        };
    }

    private static string BuildInsight(int? latestSeverity, double? latestMoodScore, int breathingCount, int sleepCount, int journalCount, int checkinCount)
    {
        if (latestSeverity >= 4)
        {
            return "Bài test gần nhất đang ở mức rất cao. Bạn nên ưu tiên liên hệ chuyên gia hoặc người thân tin cậy.";
        }

        if (latestSeverity >= 3)
        {
            return "Chỉ số gần nhất đang cần chú ý. Hãy duy trì check-in đều và cân nhắc đặt lịch tư vấn.";
        }

        if (latestMoodScore <= 2)
        {
            return "Tâm trạng gần đây có dấu hiệu đi xuống. Một phiên hít thở ngắn hoặc viết nhật ký có thể giúp bạn ổn định lại.";
        }

        if (breathingCount + sleepCount + journalCount + checkinCount == 0)
        {
            return "Hãy bắt đầu bằng một check-in ngắn để hệ thống có dữ liệu theo dõi tiến triển của bạn.";
        }

        return "Bạn đã có dữ liệu theo dõi. Tiếp tục ghi nhận đều để biểu đồ phản ánh rõ xu hướng sức khỏe hơn.";
    }

    private static object ReadJson(string value)
    {
        return JsonSerializer.Deserialize<object>(value) ?? new { };
    }

    private static string? Clean(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}

public sealed class CreateBreathingSessionRequest
{
    [JsonPropertyName("duration_seconds")]
    public int DurationSeconds { get; init; }

    [JsonPropertyName("cycles_completed")]
    public int CyclesCompleted { get; init; }

    [JsonPropertyName("total_cycles")]
    public int TotalCycles { get; init; }

    [JsonPropertyName("completed")]
    public bool Completed { get; init; }
}

public sealed class CreateSleepSessionRequest
{
    [JsonPropertyName("track_id")]
    public string? TrackId { get; init; }

    [JsonPropertyName("track_title")]
    public string? TrackTitle { get; init; }

    [JsonPropertyName("duration_ms")]
    public int DurationMs { get; init; }

    [JsonPropertyName("listened_ms")]
    public int ListenedMs { get; init; }

    [JsonPropertyName("completed")]
    public bool Completed { get; init; }
}
