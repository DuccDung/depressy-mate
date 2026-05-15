using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Models.Admin;

namespace server.Controllers.Admin;

[Route("admin/explore")]
public class AdminExploreController : Controller
{
    private const long MaxThumbnailBytes = 8 * 1024 * 1024;
    private static readonly string[] AdminRoles = ["AMDIN", "ADMIN"];
    private static readonly HashSet<string> ThumbnailExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    private readonly DepressyMateContext _context;
    private readonly IWebHostEnvironment _environment;

    public AdminExploreController(DepressyMateContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    [HttpGet("")]
    public async Task<IActionResult> Index(string? search, string? status, Guid? categoryId, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        await EnsureDefaultCategoriesAsync(cancellationToken);

        var normalizedSearch = search?.Trim();
        var normalizedStatus = string.IsNullOrWhiteSpace(status) ? "published" : status.Trim().ToLowerInvariant();
        var query = _context.ExploreContents
            .AsNoTracking()
            .Include(item => item.Category)
            .AsQueryable();

        query = normalizedStatus switch
        {
            "draft" => query.Where(item => item.Status == "DRAFT"),
            "inactive" => query.Where(item => !item.IsActive),
            "all" => query,
            _ => query.Where(item => item.Status == "PUBLISHED" && item.IsActive)
        };

        if (categoryId.HasValue)
        {
            query = query.Where(item => item.CategoryId == categoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            query = query.Where(item =>
                item.Title.Contains(normalizedSearch) ||
                item.Slug.Contains(normalizedSearch) ||
                (item.Subtitle != null && item.Subtitle.Contains(normalizedSearch)) ||
                (item.Summary != null && item.Summary.Contains(normalizedSearch)));
        }

        var model = new AdminExploreIndexViewModel
        {
            Search = normalizedSearch,
            Status = normalizedStatus,
            CategoryId = categoryId,
            Categories = await BuildCategorySelectItemsAsync(categoryId, true, cancellationToken),
            TotalContents = await _context.ExploreContents.CountAsync(cancellationToken),
            PublishedContents = await _context.ExploreContents.CountAsync(item => item.Status == "PUBLISHED" && item.IsActive, cancellationToken),
            DraftContents = await _context.ExploreContents.CountAsync(item => item.Status == "DRAFT", cancellationToken),
            VideoContents = await _context.ExploreContents.CountAsync(item => item.ContentType == "VIDEO", cancellationToken),
            Contents = await query
                .OrderBy(item => item.Category.DisplayOrder)
                .ThenBy(item => item.DisplayOrder)
                .ThenByDescending(item => item.CreatedAt)
                .Take(200)
                .Select(item => new AdminExploreContentRowViewModel
                {
                    Id = item.Id,
                    CategoryName = item.Category.Name,
                    Title = item.Title,
                    Slug = item.Slug,
                    ContentType = item.ContentType,
                    Status = item.Status,
                    ThumbnailUrl = item.ThumbnailUrl,
                    YoutubeUrl = item.YoutubeUrl,
                    DisplayOrder = item.DisplayOrder,
                    IsActive = item.IsActive,
                    IsFeatured = item.IsFeatured,
                    CreatedAt = item.CreatedAt,
                    PublishedAt = item.PublishedAt
                })
                .ToListAsync(cancellationToken)
        };

        return View("~/Views/Admin/Explore/Index.cshtml", model);
    }

    [HttpGet("create")]
    public async Task<IActionResult> Create(CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        await EnsureDefaultCategoriesAsync(cancellationToken);

        var model = new AdminExploreContentFormViewModel
        {
            Categories = await BuildCategorySelectItemsAsync(null, false, cancellationToken),
            ContentTypes = BuildContentTypeSelectItems("ARTICLE"),
            Statuses = BuildStatusSelectItems("DRAFT")
        };

        return View("~/Views/Admin/Explore/Form.cshtml", model);
    }

    [HttpPost("create")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(AdminExploreContentFormViewModel model, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        await ValidateExploreFormAsync(model, cancellationToken);
        if (!ModelState.IsValid)
        {
            await PopulateFormOptionsAsync(model, cancellationToken);
            return View("~/Views/Admin/Explore/Form.cshtml", model);
        }

        var now = DateTime.UtcNow;
        var thumbnailUrl = await SaveThumbnailAsync(model.ThumbnailFile, cancellationToken) ?? Clean(model.ThumbnailUrl);
        var status = NormalizeStatus(model.Status);
        var content = new ExploreContent
        {
            Id = Guid.NewGuid(),
            CategoryId = model.CategoryId,
            Title = model.Title.Trim(),
            Slug = await BuildUniqueSlugAsync(model.Slug, model.Title, null, cancellationToken),
            Subtitle = Clean(model.Subtitle),
            Summary = Clean(model.Summary),
            ContentType = NormalizeContentType(model.ContentType),
            ThumbnailUrl = thumbnailUrl,
            YoutubeUrl = Clean(model.YoutubeUrl),
            YoutubeVideoId = Clean(model.YoutubeVideoId) ?? ExtractYoutubeVideoId(model.YoutubeUrl),
            BadgeText = Clean(model.BadgeText),
            BadgeColor = Clean(model.BadgeColor),
            IconName = Clean(model.IconName),
            IconColor = Clean(model.IconColor),
            IconBackgroundColor = Clean(model.IconBackgroundColor),
            Content = Clean(model.Content),
            CreatedBy = GetCurrentUserId() ?? Guid.Empty,
            Status = status,
            PublishedAt = status == "PUBLISHED" ? now : null,
            DisplayOrder = model.DisplayOrder,
            IsFeatured = model.IsFeatured,
            IsActive = model.IsActive,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.ExploreContents.Add(content);
        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminExploreSuccess"] = "Đã thêm nội dung Khám phá.";

        return RedirectToAction(nameof(Index));
    }

    [HttpGet("{id:guid}/edit")]
    public async Task<IActionResult> Edit(Guid id, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        var content = await _context.ExploreContents
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (content is null)
        {
            return NotFound();
        }

        var model = new AdminExploreContentFormViewModel
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
            Status = content.Status,
            DisplayOrder = content.DisplayOrder,
            IsFeatured = content.IsFeatured,
            IsActive = content.IsActive
        };

        await PopulateFormOptionsAsync(model, cancellationToken);
        return View("~/Views/Admin/Explore/Form.cshtml", model);
    }

    [HttpPost("{id:guid}/edit")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(Guid id, AdminExploreContentFormViewModel model, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        model.Id = id;
        await ValidateExploreFormAsync(model, cancellationToken);
        if (!ModelState.IsValid)
        {
            await PopulateFormOptionsAsync(model, cancellationToken);
            return View("~/Views/Admin/Explore/Form.cshtml", model);
        }

        var content = await _context.ExploreContents.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (content is null)
        {
            return NotFound();
        }

        var now = DateTime.UtcNow;
        var thumbnailUrl = await SaveThumbnailAsync(model.ThumbnailFile, cancellationToken);
        var status = NormalizeStatus(model.Status);

        content.CategoryId = model.CategoryId;
        content.Title = model.Title.Trim();
        content.Slug = await BuildUniqueSlugAsync(model.Slug, model.Title, id, cancellationToken);
        content.Subtitle = Clean(model.Subtitle);
        content.Summary = Clean(model.Summary);
        content.ContentType = NormalizeContentType(model.ContentType);
        content.ThumbnailUrl = thumbnailUrl ?? Clean(model.ThumbnailUrl);
        content.YoutubeUrl = Clean(model.YoutubeUrl);
        content.YoutubeVideoId = Clean(model.YoutubeVideoId) ?? ExtractYoutubeVideoId(model.YoutubeUrl);
        content.BadgeText = Clean(model.BadgeText);
        content.BadgeColor = Clean(model.BadgeColor);
        content.IconName = Clean(model.IconName);
        content.IconColor = Clean(model.IconColor);
        content.IconBackgroundColor = Clean(model.IconBackgroundColor);
        content.Content = Clean(model.Content);
        content.UpdatedBy = GetCurrentUserId();
        content.Status = status;
        content.PublishedAt = status == "PUBLISHED" ? content.PublishedAt ?? now : null;
        content.DisplayOrder = model.DisplayOrder;
        content.IsFeatured = model.IsFeatured;
        content.IsActive = model.IsActive;
        content.UpdatedAt = now;

        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminExploreSuccess"] = "Đã cập nhật nội dung Khám phá.";

        return RedirectToAction(nameof(Index));
    }

    [HttpPost("{id:guid}/toggle")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Toggle(Guid id, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        var content = await _context.ExploreContents.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (content is null)
        {
            TempData["AdminExploreError"] = "Không tìm thấy nội dung.";
            return RedirectToAction(nameof(Index));
        }

        content.IsActive = !content.IsActive;
        content.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminExploreSuccess"] = content.IsActive ? "Đã hiển thị nội dung." : "Đã ẩn nội dung.";

        return RedirectToAction(nameof(Index));
    }

    [HttpPost("{id:guid}/delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        var content = await _context.ExploreContents.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (content is null)
        {
            TempData["AdminExploreError"] = "Không tìm thấy nội dung cần xóa.";
            return RedirectToAction(nameof(Index));
        }

        await _context.ExploreContentViews.Where(item => item.ContentId == id).ExecuteDeleteAsync(cancellationToken);
        await _context.ExploreContentSections.Where(item => item.ContentId == id).ExecuteDeleteAsync(cancellationToken);

        _context.ExploreContents.Remove(content);
        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminExploreSuccess"] = "Đã xóa nội dung Khám phá.";

        return RedirectToAction(nameof(Index));
    }

    private async Task ValidateExploreFormAsync(AdminExploreContentFormViewModel model, CancellationToken cancellationToken)
    {
        if (!await _context.ExploreCategories.AnyAsync(item => item.Id == model.CategoryId, cancellationToken))
        {
            ModelState.AddModelError(nameof(model.CategoryId), "Nhóm hiển thị không hợp lệ.");
        }

        if (NormalizeContentType(model.ContentType) == "VIDEO" && string.IsNullOrWhiteSpace(model.YoutubeUrl))
        {
            ModelState.AddModelError(nameof(model.YoutubeUrl), "Video cần có link YouTube.");
        }

        if (!string.IsNullOrWhiteSpace(model.YoutubeUrl) && ExtractYoutubeVideoId(model.YoutubeUrl) is null)
        {
            ModelState.AddModelError(nameof(model.YoutubeUrl), "Link YouTube không hợp lệ.");
        }

        if (model.ThumbnailFile is not null)
        {
            if (model.ThumbnailFile.Length > MaxThumbnailBytes)
            {
                ModelState.AddModelError(nameof(model.ThumbnailFile), "Ảnh thumbnail không được vượt quá 8MB.");
            }

            var extension = Path.GetExtension(model.ThumbnailFile.FileName);
            if (!ThumbnailExtensions.Contains(extension))
            {
                ModelState.AddModelError(nameof(model.ThumbnailFile), "Ảnh thumbnail chỉ hỗ trợ JPG, PNG hoặc WEBP.");
            }
        }
    }

    private async Task PopulateFormOptionsAsync(AdminExploreContentFormViewModel model, CancellationToken cancellationToken)
    {
        model.Categories = await BuildCategorySelectItemsAsync(model.CategoryId, false, cancellationToken);
        model.ContentTypes = BuildContentTypeSelectItems(model.ContentType);
        model.Statuses = BuildStatusSelectItems(model.Status);
    }

    private async Task<IReadOnlyList<SelectListItem>> BuildCategorySelectItemsAsync(Guid? selectedId, bool includeAll, CancellationToken cancellationToken)
    {
        var categories = await _context.ExploreCategories
            .AsNoTracking()
            .OrderBy(item => item.DisplayOrder)
            .ThenBy(item => item.Name)
            .ToListAsync(cancellationToken);

        var items = categories.Select(item => new SelectListItem
        {
            Value = item.Id.ToString(),
            Text = $"{item.Name} ({item.CategoryType})",
            Selected = item.Id == selectedId
        }).ToList();

        if (includeAll)
        {
            items.Insert(0, new SelectListItem { Value = "", Text = "Tất cả nhóm", Selected = !selectedId.HasValue });
        }

        return items;
    }

    private static IReadOnlyList<SelectListItem> BuildContentTypeSelectItems(string? selected)
    {
        string current = NormalizeContentType(selected);
        return new[]
        {
            new SelectListItem("Bài viết", "ARTICLE", current == "ARTICLE"),
            new SelectListItem("Video YouTube", "VIDEO", current == "VIDEO"),
            new SelectListItem("Workshop/Class", "WORKSHOP", current == "WORKSHOP"),
            new SelectListItem("Skill card", "SKILL", current == "SKILL")
        };
    }

    private static IReadOnlyList<SelectListItem> BuildStatusSelectItems(string? selected)
    {
        string current = NormalizeStatus(selected);
        return new[]
        {
            new SelectListItem("Nháp", "DRAFT", current == "DRAFT"),
            new SelectListItem("Đã xuất bản", "PUBLISHED", current == "PUBLISHED"),
            new SelectListItem("Lưu trữ", "ARCHIVED", current == "ARCHIVED")
        };
    }

    private async Task EnsureDefaultCategoriesAsync(CancellationToken cancellationToken)
    {
        if (await _context.ExploreCategories.AnyAsync(cancellationToken))
        {
            return;
        }

        _context.ExploreCategories.AddRange(
            new ExploreCategory { Id = Guid.NewGuid(), Name = "Workshops & Classes", Slug = "workshops-classes", CategoryType = "WORKSHOP", DisplayOrder = 1, IsActive = true, CreatedAt = DateTime.UtcNow },
            new ExploreCategory { Id = Guid.NewGuid(), Name = "Healing Media", Slug = "healing-media", CategoryType = "MEDIA", DisplayOrder = 2, IsActive = true, CreatedAt = DateTime.UtcNow },
            new ExploreCategory { Id = Guid.NewGuid(), Name = "Skill Building", Slug = "skill-building", CategoryType = "SKILL", DisplayOrder = 3, IsActive = true, CreatedAt = DateTime.UtcNow });

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task<string?> SaveThumbnailAsync(IFormFile? thumbnailFile, CancellationToken cancellationToken)
    {
        if (thumbnailFile is null || thumbnailFile.Length == 0)
        {
            return null;
        }

        var extension = Path.GetExtension(thumbnailFile.FileName).ToLowerInvariant();
        var uploadDirectory = Path.Combine(_environment.WebRootPath, "uploads", "explore");
        Directory.CreateDirectory(uploadDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadDirectory, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await thumbnailFile.CopyToAsync(stream, cancellationToken);

        return $"/uploads/explore/{fileName}";
    }

    private async Task<string> BuildUniqueSlugAsync(string? slug, string title, Guid? currentId, CancellationToken cancellationToken)
    {
        var baseSlug = Slugify(string.IsNullOrWhiteSpace(slug) ? title : slug);
        var candidate = baseSlug;
        var suffix = 2;

        while (await _context.ExploreContents.AnyAsync(item => item.Slug == candidate && item.Id != currentId, cancellationToken))
        {
            candidate = $"{baseSlug}-{suffix++}";
        }

        return candidate;
    }

    private Guid? GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var userId) ? userId : null;
    }

    private static string NormalizeContentType(string? value)
    {
        var normalized = value?.Trim().ToUpperInvariant();
        return normalized is "VIDEO" or "WORKSHOP" or "SKILL" ? normalized : "ARTICLE";
    }

    private static string NormalizeStatus(string? value)
    {
        var normalized = value?.Trim().ToUpperInvariant();
        return normalized is "PUBLISHED" or "ARCHIVED" ? normalized : "DRAFT";
    }

    private static string? Clean(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string Slugify(string value)
    {
        var normalized = value.Trim().ToLowerInvariant();
        normalized = Regex.Replace(normalized, @"[^a-z0-9\s-]", string.Empty);
        normalized = Regex.Replace(normalized, @"\s+", "-");
        normalized = Regex.Replace(normalized, @"-+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(normalized) ? Guid.NewGuid().ToString("N")[..12] : normalized;
    }

    private static string? ExtractYoutubeVideoId(string? youtubeUrl)
    {
        if (string.IsNullOrWhiteSpace(youtubeUrl))
        {
            return null;
        }

        if (!Uri.TryCreate(youtubeUrl.Trim(), UriKind.Absolute, out var uri))
        {
            return null;
        }

        if (uri.Host.Contains("youtu.be", StringComparison.OrdinalIgnoreCase))
        {
            return uri.AbsolutePath.Trim('/').Split('/').FirstOrDefault();
        }

        if (!uri.Host.Contains("youtube.com", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(uri.Query);
        if (query.TryGetValue("v", out var videoId))
        {
            return videoId.ToString();
        }

        var segments = uri.AbsolutePath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        return segments.Length >= 2 && segments[0] is "embed" or "shorts" ? segments[1] : null;
    }

    private async Task<bool> EnsureAdminAsync()
    {
        if (User.Identity?.IsAuthenticated == true &&
            IsAdminRole(User.FindFirstValue(ClaimTypes.Role)))
        {
            return true;
        }

        if (User.Identity?.IsAuthenticated == true)
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        }

        return false;
    }

    private IActionResult RedirectToAdminLogin()
    {
        return RedirectToAction("Login", "Admin", new { returnUrl = HttpContext.Request.Path.ToString() });
    }

    private static bool IsAdminRole(string? role)
    {
        return !string.IsNullOrWhiteSpace(role) &&
            AdminRoles.Any(item => string.Equals(item, role.Trim(), StringComparison.OrdinalIgnoreCase));
    }
}
