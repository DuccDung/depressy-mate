using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Services;

namespace server.Controllers.Api;

[ApiController]
[Route("api/journals")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class JournalsApiController : ControllerBase
{
    private readonly DepressyMateContext _context;

    public JournalsApiController(DepressyMateContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetJournals([FromQuery] int limit = 20, [FromQuery] int offset = 0, CancellationToken cancellationToken = default)
    {
        var currentUserId = ChatService.GetUserId(User);
        var safeLimit = Math.Clamp(limit, 1, 100);
        var safeOffset = Math.Max(0, offset);

        var query = _context.Journals
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
            journals = rows.Select(MapJournal),
            total,
            limit = safeLimit,
            offset = safeOffset
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateJournalRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var title = Clean(request.Title) ?? "Nhật ký không tên";
        var content = Clean(request.Content);
        var audioUrl = Clean(request.AudioUrl);

        if (content is null && audioUrl is null)
        {
            return BadRequest(new { error = "Vui lòng viết nội dung hoặc ghi âm nhật ký." });
        }

        if (title.Length > 255)
        {
            return BadRequest(new { error = "Tiêu đề không được vượt quá 255 ký tự." });
        }

        if (audioUrl?.Length > 1000)
        {
            return BadRequest(new { error = "Đường dẫn âm thanh quá dài." });
        }

        var now = DateTime.UtcNow;
        var journal = new Journal
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            Title = title,
            Content = content,
            AudioUrl = audioUrl,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Journals.Add(journal);
        await _context.SaveChangesAsync(cancellationToken);
        return Created($"/api/journals/{journal.Id}", MapJournal(journal));
    }

    private static object MapJournal(Journal item)
    {
        return new
        {
            id = item.Id,
            user_id = item.UserId,
            title = item.Title,
            content = item.Content,
            audio_url = item.AudioUrl,
            created_at = item.CreatedAt,
            updated_at = item.UpdatedAt
        };
    }

    private static string? Clean(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}

public sealed class CreateJournalRequest
{
    [JsonPropertyName("title")]
    public string? Title { get; init; }

    [JsonPropertyName("content")]
    public string? Content { get; init; }

    [JsonPropertyName("audioUrl")]
    public string? AudioUrl { get; init; }

    [JsonPropertyName("audio_url")]
    public string? AudioUrlSnake
    {
        get => AudioUrl;
        init => AudioUrl = value;
    }
}
