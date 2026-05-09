using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Models.Admin;

namespace server.Controllers.Admin;

[Route("admin/content")]
public class AdminContentController : Controller
{
    private const long MaxMediaBytes = 10 * 1024 * 1024;
    private static readonly string[] AdminRoles = ["AMDIN", "ADMIN"];
    private static readonly HashSet<string> MediaExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif"
    };

    private readonly DepressyMateContext _context;
    private readonly IWebHostEnvironment _environment;

    public AdminContentController(DepressyMateContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    [HttpGet("")]
    public async Task<IActionResult> Index(string? search, string? status, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        var normalizedSearch = search?.Trim();
        var normalizedStatus = string.IsNullOrWhiteSpace(status) ? "active" : status.Trim().ToLowerInvariant();
        var postsQuery = _context.Posts
            .AsNoTracking()
            .Include(item => item.User)
            .ThenInclude(item => item.Profile)
            .AsQueryable();

        postsQuery = normalizedStatus switch
        {
            "hidden" => postsQuery.Where(item => item.DeletedAt != null),
            "all" => postsQuery,
            _ => postsQuery.Where(item => item.DeletedAt == null)
        };

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            postsQuery = postsQuery.Where(item =>
                (item.Content != null && item.Content.Contains(normalizedSearch)) ||
                item.User.Email.Contains(normalizedSearch) ||
                (item.User.FullName != null && item.User.FullName.Contains(normalizedSearch)) ||
                (item.User.Profile != null && item.User.Profile.FullName != null && item.User.Profile.FullName.Contains(normalizedSearch)));
        }

        var posts = await postsQuery
            .OrderByDescending(item => item.CreatedAt)
            .Take(200)
            .Select(item => new AdminPostRowViewModel
            {
                Id = item.Id,
                AuthorName = item.User.Profile != null && item.User.Profile.FullName != null
                    ? item.User.Profile.FullName
                    : item.User.FullName ?? item.User.Email,
                AuthorEmail = item.User.Email,
                AuthorAvatarUrl = item.User.Profile != null && item.User.Profile.AvatarUrl != null
                    ? item.User.Profile.AvatarUrl
                    : item.User.AvatarUrl,
                ContentPreview = item.Content ?? string.Empty,
                MediaUrl = item.MediaUrl,
                MediaType = item.MediaType ?? string.Empty,
                LikeCount = item.PostLikes.Count,
                CommentCount = item.Comments.Count,
                CreatedAt = item.CreatedAt,
                UpdatedAt = item.UpdatedAt,
                DeletedAt = item.DeletedAt
            })
            .ToListAsync(cancellationToken);

        var model = new AdminContentIndexViewModel
        {
            Search = normalizedSearch,
            Status = normalizedStatus,
            Posts = posts,
            TotalPosts = await _context.Posts.CountAsync(cancellationToken),
            ActivePosts = await _context.Posts.CountAsync(item => item.DeletedAt == null, cancellationToken),
            HiddenPosts = await _context.Posts.CountAsync(item => item.DeletedAt != null, cancellationToken),
            WithMediaPosts = await _context.Posts.CountAsync(item => item.MediaUrl != null && item.MediaUrl != "", cancellationToken)
        };

        return View("~/Views/Admin/Content/Index.cshtml", model);
    }

    [HttpGet("create")]
    public async Task<IActionResult> Create(CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        var model = new AdminPostFormViewModel
        {
            UserId = GetCurrentUserId() ?? Guid.Empty
        };

        await PopulateAuthorsAsync(model, cancellationToken);
        return View("~/Views/Admin/Content/Form.cshtml", model);
    }

    [HttpPost("create")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(AdminPostFormViewModel model, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        await ValidatePostFormAsync(model, cancellationToken);

        if (!ModelState.IsValid)
        {
            await PopulateAuthorsAsync(model, cancellationToken);
            return View("~/Views/Admin/Content/Form.cshtml", model);
        }

        var mediaUrl = await SaveMediaAsync(model.MediaFile, cancellationToken);
        var now = DateTime.UtcNow;

        var post = new Post
        {
            UserId = model.UserId,
            Content = Clean(model.Content),
            MediaUrl = mediaUrl,
            MediaType = string.IsNullOrWhiteSpace(mediaUrl) ? null : "IMAGE",
            DeletedAt = model.IsHidden ? now : null,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminContentSuccess"] = "Đã thêm bài viết mới.";

        return RedirectToAction(nameof(Index));
    }

    [HttpGet("{id:guid}/edit")]
    public async Task<IActionResult> Edit(Guid id, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        var post = await _context.Posts
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (post is null)
        {
            return NotFound();
        }

        var model = new AdminPostFormViewModel
        {
            Id = post.Id,
            UserId = post.UserId,
            Content = post.Content,
            CurrentMediaUrl = post.MediaUrl,
            MediaType = post.MediaType,
            IsHidden = post.DeletedAt.HasValue
        };

        await PopulateAuthorsAsync(model, cancellationToken);
        return View("~/Views/Admin/Content/Form.cshtml", model);
    }

    [HttpPost("{id:guid}/edit")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(Guid id, AdminPostFormViewModel model, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        model.Id = id;
        await ValidatePostFormAsync(model, cancellationToken);

        if (!ModelState.IsValid)
        {
            await PopulateAuthorsAsync(model, cancellationToken);
            return View("~/Views/Admin/Content/Form.cshtml", model);
        }

        var post = await _context.Posts.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (post is null)
        {
            return NotFound();
        }

        var mediaUrl = await SaveMediaAsync(model.MediaFile, cancellationToken);
        var now = DateTime.UtcNow;

        post.UserId = model.UserId;
        post.Content = Clean(model.Content);
        post.UpdatedAt = now;
        post.DeletedAt = model.IsHidden ? post.DeletedAt ?? now : null;

        if (!string.IsNullOrWhiteSpace(mediaUrl))
        {
            post.MediaUrl = mediaUrl;
            post.MediaType = "IMAGE";
        }

        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminContentSuccess"] = "Đã cập nhật bài viết.";

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

        var post = await _context.Posts.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (post is null)
        {
            TempData["AdminContentError"] = "Không tìm thấy bài viết.";
            return RedirectToAction(nameof(Index));
        }

        post.DeletedAt = post.DeletedAt.HasValue ? null : DateTime.UtcNow;
        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminContentSuccess"] = post.DeletedAt.HasValue ? "Đã ẩn bài viết." : "Đã khôi phục bài viết.";

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

        var post = await _context.Posts.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (post is null)
        {
            TempData["AdminContentError"] = "Không tìm thấy bài viết cần xóa.";
            return RedirectToAction(nameof(Index));
        }

        await _context.Comments.Where(item => item.PostId == id).ExecuteDeleteAsync(cancellationToken);
        await _context.PostLikes.Where(item => item.PostId == id).ExecuteDeleteAsync(cancellationToken);

        _context.Posts.Remove(post);
        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminContentSuccess"] = "Đã xóa bài viết.";

        return RedirectToAction(nameof(Index));
    }

    private async Task PopulateAuthorsAsync(AdminPostFormViewModel model, CancellationToken cancellationToken)
    {
        model.Authors = await _context.Users
            .AsNoTracking()
            .Include(item => item.Profile)
            .OrderBy(item => item.Profile != null && item.Profile.FullName != null ? item.Profile.FullName : item.FullName ?? item.Email)
            .Select(item => new SelectListItem
            {
                Value = item.Id.ToString(),
                Text = (item.Profile != null && item.Profile.FullName != null ? item.Profile.FullName : item.FullName ?? item.Email) + " - " + item.Email,
                Selected = item.Id == model.UserId
            })
            .ToListAsync(cancellationToken);
    }

    private async Task ValidatePostFormAsync(AdminPostFormViewModel model, CancellationToken cancellationToken)
    {
        if (!await _context.Users.AnyAsync(item => item.Id == model.UserId, cancellationToken))
        {
            ModelState.AddModelError(nameof(model.UserId), "Tác giả không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(model.Content) &&
            string.IsNullOrWhiteSpace(model.CurrentMediaUrl) &&
            (model.MediaFile is null || model.MediaFile.Length == 0))
        {
            ModelState.AddModelError(nameof(model.Content), "Vui lòng nhập nội dung hoặc chọn ảnh cho bài viết.");
        }

        if (model.MediaFile is not null)
        {
            if (model.MediaFile.Length > MaxMediaBytes)
            {
                ModelState.AddModelError(nameof(model.MediaFile), "Ảnh bài viết không được vượt quá 10MB.");
            }

            var extension = Path.GetExtension(model.MediaFile.FileName);
            if (!MediaExtensions.Contains(extension))
            {
                ModelState.AddModelError(nameof(model.MediaFile), "Ảnh bài viết chỉ hỗ trợ JPG, PNG, WEBP hoặc GIF.");
            }
        }
    }

    private async Task<string?> SaveMediaAsync(IFormFile? mediaFile, CancellationToken cancellationToken)
    {
        if (mediaFile is null || mediaFile.Length == 0)
        {
            return null;
        }

        var extension = Path.GetExtension(mediaFile.FileName).ToLowerInvariant();
        var uploadDirectory = Path.Combine(_environment.WebRootPath, "uploads", "posts");
        Directory.CreateDirectory(uploadDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadDirectory, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await mediaFile.CopyToAsync(stream, cancellationToken);

        return $"/uploads/posts/{fileName}";
    }

    private Guid? GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var userId) ? userId : null;
    }

    private static string? Clean(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
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
