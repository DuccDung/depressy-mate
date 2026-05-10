using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Services;

namespace server.Controllers.Api;

[ApiController]
[Route("api/checkins")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class CheckinsApiController : ControllerBase
{
    private const long MaxImageBytes = 8 * 1024 * 1024;
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };
    private static readonly HashSet<string> AllowedMoods = new(StringComparer.OrdinalIgnoreCase)
    {
        "excellent",
        "good",
        "okay",
        "sad",
        "terrible"
    };

    private readonly DepressyMateContext _context;
    private readonly IWebHostEnvironment _environment;

    public CheckinsApiController(DepressyMateContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    [HttpGet]
    public async Task<IActionResult> GetCheckins([FromQuery] int limit = 20, [FromQuery] int offset = 0, CancellationToken cancellationToken = default)
    {
        var currentUserId = ChatService.GetUserId(User);
        var safeLimit = Math.Clamp(limit, 1, 100);
        var safeOffset = Math.Max(0, offset);

        var query = _context.MoodCheckins
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
            checkins = rows.Select(MapCheckin),
            total,
            limit = safeLimit,
            offset = safeOffset
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateCheckinRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var mood = request.Mood?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(mood) || !AllowedMoods.Contains(mood))
        {
            return BadRequest(new { error = "Trạng thái cảm xúc không hợp lệ." });
        }

        var note = Clean(request.Note);
        if (note?.Length > 500)
        {
            return BadRequest(new { error = "Ghi chú không được vượt quá 500 ký tự." });
        }

        var imageUrl = Clean(request.ImageUrl);
        if (imageUrl?.Length > 1000)
        {
            return BadRequest(new { error = "Đường dẫn ảnh quá dài." });
        }

        var checkin = new MoodCheckin
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            Mood = mood,
            Note = note,
            ImageUrl = imageUrl,
            CreatedAt = DateTime.UtcNow
        };

        _context.MoodCheckins.Add(checkin);
        await _context.SaveChangesAsync(cancellationToken);
        return Created($"/api/checkins/{checkin.Id}", MapCheckin(checkin));
    }

    [HttpPost("upload-image")]
    [RequestSizeLimit(MaxImageBytes)]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile image, CancellationToken cancellationToken)
    {
        if (image is null || image.Length == 0)
        {
            return BadRequest(new { error = "Vui lòng chọn ảnh cần tải lên." });
        }

        if (image.Length > MaxImageBytes)
        {
            return BadRequest(new { error = "Ảnh không được vượt quá 8MB." });
        }

        var extension = Path.GetExtension(image.FileName);
        if (!AllowedExtensions.Contains(extension))
        {
            return BadRequest(new { error = "Ảnh chỉ hỗ trợ JPG, PNG hoặc WEBP." });
        }

        var webRoot = _environment.WebRootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot");
        var uploadDirectory = Path.Combine(webRoot, "uploads", "checkins");
        Directory.CreateDirectory(uploadDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var filePath = Path.Combine(uploadDirectory, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await image.CopyToAsync(stream, cancellationToken);
        }

        var relativeUrl = $"/uploads/checkins/{fileName}";
        return Ok(new
        {
            image_url = $"{Request.Scheme}://{Request.Host}{relativeUrl}",
            path = relativeUrl
        });
    }

    private static object MapCheckin(MoodCheckin item)
    {
        return new
        {
            id = item.Id,
            user_id = item.UserId,
            mood = item.Mood,
            note = item.Note,
            image_url = item.ImageUrl,
            created_at = item.CreatedAt
        };
    }

    private static string? Clean(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}

public sealed class CreateCheckinRequest
{
    [JsonPropertyName("mood")]
    public string? Mood { get; init; }

    [JsonPropertyName("note")]
    public string? Note { get; init; }

    [JsonPropertyName("image_url")]
    public string? ImageUrl { get; init; }
}
