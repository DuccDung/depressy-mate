using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using System.Text.Json.Serialization;

namespace server.Controllers.Api;

[ApiController]
[Route("api/explore")]
public class ExploreApiController : ControllerBase
{
    private readonly DepressyMateContext _context;

    public ExploreApiController(DepressyMateContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetExplore(CancellationToken cancellationToken)
    {
        var categories = await _context.ExploreCategories
            .AsNoTracking()
            .Include(item => item.ExploreContents.Where(content =>
                content.IsActive &&
                content.Status == "PUBLISHED" &&
                (!content.PublishedAt.HasValue || content.PublishedAt <= DateTime.UtcNow)))
            .Where(item => item.IsActive)
            .OrderBy(item => item.DisplayOrder)
            .ThenBy(item => item.Name)
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            data = categories.Select(MapCategoryDto).ToList()
        });
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetContent(string slug, CancellationToken cancellationToken)
    {
        var normalizedSlug = slug.Trim().ToLowerInvariant();
        var content = await _context.ExploreContents
            .AsNoTracking()
            .Include(item => item.Category)
            .FirstOrDefaultAsync(item =>
                item.Slug == normalizedSlug &&
                item.IsActive &&
                item.Status == "PUBLISHED" &&
                item.Category.IsActive &&
                (!item.PublishedAt.HasValue || item.PublishedAt <= DateTime.UtcNow),
                cancellationToken);

        if (content is null)
        {
            return NotFound(new { error = "Khong tim thay noi dung." });
        }

        return Ok(MapContentDto(content));
    }

    [HttpPost("{id:guid}/view")]
    public async Task<IActionResult> TrackView(Guid id, [FromBody] TrackExploreViewRequest? request, CancellationToken cancellationToken)
    {
        var exists = await _context.ExploreContents
            .AnyAsync(item => item.Id == id && item.IsActive && item.Status == "PUBLISHED", cancellationToken);

        if (!exists)
        {
            return NotFound(new { error = "Khong tim thay noi dung." });
        }

        _context.ExploreContentViews.Add(new ExploreContentView
        {
            Id = Guid.NewGuid(),
            ContentId = id,
            UserId = request?.UserId,
            ViewedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { tracked = true });
    }

    private static ExploreCategoryDto MapCategoryDto(ExploreCategory category)
    {
        return new ExploreCategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Slug = category.Slug,
            CategoryType = category.CategoryType,
            Description = category.Description,
            DisplayOrder = category.DisplayOrder,
            Contents = category.ExploreContents
                .OrderBy(item => item.DisplayOrder)
                .ThenByDescending(item => item.PublishedAt ?? item.CreatedAt)
                .Select(MapContentDto)
                .ToList()
        };
    }

    private static ExploreContentDto MapContentDto(ExploreContent content)
    {
        return new ExploreContentDto
        {
            Id = content.Id,
            CategoryId = content.CategoryId,
            Title = content.Title,
            Slug = content.Slug,
            Subtitle = content.Subtitle,
            Summary = content.Summary,
            ContentType = content.ContentType,
            ThumbnailUrl = content.ThumbnailUrl,
            YoutubeUrl = content.YoutubeUrl,
            YoutubeVideoId = content.YoutubeVideoId,
            BadgeText = content.BadgeText,
            BadgeColor = content.BadgeColor,
            IconName = content.IconName,
            IconColor = content.IconColor,
            IconBackgroundColor = content.IconBackgroundColor,
            Content = content.Content,
            IsFeatured = content.IsFeatured,
            DisplayOrder = content.DisplayOrder,
            PublishedAt = content.PublishedAt
        };
    }
}

public sealed class TrackExploreViewRequest
{
    [JsonPropertyName("user_id")]
    public Guid? UserId { get; init; }
}
