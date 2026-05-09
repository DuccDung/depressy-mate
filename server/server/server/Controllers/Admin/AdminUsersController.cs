using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Models.Admin;

namespace server.Controllers.Admin;

[Route("admin/users")]
public class AdminUsersController : Controller
{
    private const long MaxAvatarBytes = 5 * 1024 * 1024;
    private static readonly string[] AdminRoles = ["AMDIN", "ADMIN"];
    private static readonly string[] UserRoles = ["USER", "DOCTOR", "ADMIN", "AMDIN"];
    private static readonly HashSet<string> AvatarExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    private readonly DepressyMateContext _context;
    private readonly IWebHostEnvironment _environment;

    public AdminUsersController(DepressyMateContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    [HttpGet("")]
    public async Task<IActionResult> Index(string? search, string? role, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        var normalizedSearch = search?.Trim();
        var normalizedRole = NormalizeRole(role);

        var usersQuery = _context.Users
            .AsNoTracking()
            .Include(item => item.Profile)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            usersQuery = usersQuery.Where(item =>
                item.Email.Contains(normalizedSearch) ||
                (item.FullName != null && item.FullName.Contains(normalizedSearch)) ||
                (item.Profile != null && item.Profile.FullName.Contains(normalizedSearch)));
        }

        if (!string.IsNullOrWhiteSpace(normalizedRole))
        {
            usersQuery = usersQuery.Where(item => item.Role == normalizedRole);
        }

        var users = await usersQuery
            .OrderByDescending(item => item.CreatedAt)
            .Take(200)
            .Select(item => new AdminUserRowViewModel
            {
                Id = item.Id,
                Email = item.Email,
                FullName = item.Profile != null ? item.Profile.FullName : item.FullName ?? item.Email,
                Role = item.Role,
                AvatarUrl = item.Profile != null ? item.Profile.AvatarUrl : item.AvatarUrl,
                AuthProvider = item.AuthProvider ?? "local",
                IsEmailVerified = item.IsEmailVerified,
                CreatedAt = item.CreatedAt,
                AssessmentCount = item.AssessmentResults.Count,
                CheckinCount = item.MoodCheckins.Count,
                JournalCount = item.Journals.Count,
                PostCount = item.Posts.Count
            })
            .ToListAsync(cancellationToken);

        var model = new AdminUserIndexViewModel
        {
            Search = normalizedSearch,
            Role = normalizedRole,
            Users = users,
            TotalUsers = await _context.Users.CountAsync(cancellationToken),
            AdminUsers = await _context.Users.CountAsync(item => item.Role == "ADMIN" || item.Role == "AMDIN", cancellationToken),
            DoctorUsers = await _context.Users.CountAsync(item => item.Role == "DOCTOR", cancellationToken),
            NormalUsers = await _context.Users.CountAsync(item => item.Role == "USER", cancellationToken),
            VerifiedUsers = await _context.Users.CountAsync(item => item.IsEmailVerified, cancellationToken)
        };

        return View("~/Views/Admin/Users/Index.cshtml", model);
    }

    [HttpGet("create")]
    public async Task<IActionResult> Create()
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        return View("~/Views/Admin/Users/Form.cshtml", new AdminUserFormViewModel
        {
            IsEmailVerified = true
        });
    }

    [HttpPost("create")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(AdminUserFormViewModel model, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        if (string.IsNullOrWhiteSpace(model.Password))
        {
            ModelState.AddModelError(nameof(model.Password), "Vui lòng nhập mật khẩu khi tạo người dùng.");
        }

        await ValidateUserFormAsync(model, cancellationToken);

        if (!ModelState.IsValid)
        {
            return View("~/Views/Admin/Users/Form.cshtml", model);
        }

        var now = DateTime.UtcNow;
        var userId = Guid.NewGuid();
        var avatarUrl = await SaveAvatarAsync(model.AvatarFile, cancellationToken);

        var user = new User
        {
            Id = userId,
            Email = model.Email.Trim().ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
            Role = NormalizeRole(model.Role) ?? "USER",
            FullName = model.FullName.Trim(),
            AvatarUrl = avatarUrl,
            AuthProvider = "local",
            IsEmailVerified = model.IsEmailVerified,
            CreatedAt = now,
            UpdatedAt = now,
            Profile = new server.Models.Profile
            {
                UserId = userId,
                FullName = model.FullName.Trim(),
                AvatarUrl = avatarUrl,
                Bio = model.Bio?.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminUserSuccess"] = "Đã thêm người dùng mới.";

        return RedirectToAction(nameof(Index));
    }

    [HttpGet("{id:guid}/edit")]
    public async Task<IActionResult> Edit(Guid id, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        var user = await _context.Users
            .AsNoTracking()
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (user is null)
        {
            return NotFound();
        }

        var model = new AdminUserFormViewModel
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.Profile?.FullName ?? user.FullName ?? user.Email,
            Role = user.Role,
            Bio = user.Profile?.Bio,
            IsEmailVerified = user.IsEmailVerified,
            CurrentAvatarUrl = user.Profile?.AvatarUrl ?? user.AvatarUrl
        };

        return View("~/Views/Admin/Users/Form.cshtml", model);
    }

    [HttpPost("{id:guid}/edit")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(Guid id, AdminUserFormViewModel model, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        model.Id = id;
        await ValidateUserFormAsync(model, cancellationToken);

        if (!ModelState.IsValid)
        {
            return View("~/Views/Admin/Users/Form.cshtml", model);
        }

        var user = await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (user is null)
        {
            return NotFound();
        }

        var now = DateTime.UtcNow;
        var avatarUrl = await SaveAvatarAsync(model.AvatarFile, cancellationToken);
        var fullName = model.FullName.Trim();

        user.Email = model.Email.Trim().ToLowerInvariant();
        user.FullName = fullName;
        user.Role = NormalizeRole(model.Role) ?? "USER";
        user.IsEmailVerified = model.IsEmailVerified;
        user.UpdatedAt = now;

        if (!string.IsNullOrWhiteSpace(model.Password))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password);
            user.AuthProvider = string.IsNullOrWhiteSpace(user.AuthProvider) ? "local" : user.AuthProvider;
        }

        if (!string.IsNullOrWhiteSpace(avatarUrl))
        {
            user.AvatarUrl = avatarUrl;
        }

        if (user.Profile is null)
        {
            user.Profile = new server.Models.Profile
            {
                UserId = user.Id,
                FullName = fullName,
                AvatarUrl = user.AvatarUrl,
                Bio = model.Bio?.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            };
        }
        else
        {
            user.Profile.FullName = fullName;
            user.Profile.Bio = model.Bio?.Trim();
            user.Profile.UpdatedAt = now;
            if (!string.IsNullOrWhiteSpace(avatarUrl))
            {
                user.Profile.AvatarUrl = avatarUrl;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminUserSuccess"] = "Đã cập nhật người dùng.";

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

        var currentAdminId = GetCurrentUserId();
        if (currentAdminId == id)
        {
            TempData["AdminUserError"] = "Bạn không thể xóa chính tài khoản đang đăng nhập.";
            return RedirectToAction(nameof(Index));
        }

        var user = await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (user is null)
        {
            TempData["AdminUserError"] = "Không tìm thấy người dùng cần xóa.";
            return RedirectToAction(nameof(Index));
        }

        if (await HasBlockingRelationsAsync(id, cancellationToken))
        {
            TempData["AdminUserError"] = "Không thể xóa người dùng đã có bình luận, lượt thích hoặc tin nhắn. Hãy khóa/đổi quyền tài khoản thay vì xóa.";
            return RedirectToAction(nameof(Index));
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminUserSuccess"] = "Đã xóa người dùng.";

        return RedirectToAction(nameof(Index));
    }

    private async Task ValidateUserFormAsync(AdminUserFormViewModel model, CancellationToken cancellationToken)
    {
        model.Role = NormalizeRole(model.Role) ?? model.Role;

        if (!UserRoles.Contains(model.Role, StringComparer.OrdinalIgnoreCase))
        {
            ModelState.AddModelError(nameof(model.Role), "Quyền người dùng không hợp lệ.");
        }

        var email = model.Email.Trim().ToLowerInvariant();
        var emailExists = await _context.Users.AnyAsync(item =>
            item.Email == email && (!model.Id.HasValue || item.Id != model.Id.Value),
            cancellationToken);

        if (emailExists)
        {
            ModelState.AddModelError(nameof(model.Email), "Email này đã được sử dụng.");
        }

        if (model.AvatarFile is not null)
        {
            if (model.AvatarFile.Length > MaxAvatarBytes)
            {
                ModelState.AddModelError(nameof(model.AvatarFile), "Ảnh đại diện không được vượt quá 5MB.");
            }

            var extension = Path.GetExtension(model.AvatarFile.FileName);
            if (!AvatarExtensions.Contains(extension))
            {
                ModelState.AddModelError(nameof(model.AvatarFile), "Ảnh đại diện chỉ hỗ trợ JPG, PNG hoặc WEBP.");
            }
        }
    }

    private async Task<string?> SaveAvatarAsync(IFormFile? avatarFile, CancellationToken cancellationToken)
    {
        if (avatarFile is null || avatarFile.Length == 0)
        {
            return null;
        }

        var extension = Path.GetExtension(avatarFile.FileName).ToLowerInvariant();
        var uploadDirectory = Path.Combine(_environment.WebRootPath, "uploads", "users");
        Directory.CreateDirectory(uploadDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadDirectory, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await avatarFile.CopyToAsync(stream, cancellationToken);

        return $"/uploads/users/{fileName}";
    }

    private async Task<bool> HasBlockingRelationsAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await _context.Comments.AnyAsync(item => item.UserId == userId, cancellationToken) ||
            await _context.PostLikes.AnyAsync(item => item.UserId == userId, cancellationToken) ||
            await _context.Messages.AnyAsync(item => item.SenderId == userId, cancellationToken);
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

    private Guid? GetCurrentUserId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(rawId, out var id) ? id : null;
    }

    private static bool IsAdminRole(string? role)
    {
        return !string.IsNullOrWhiteSpace(role) &&
            AdminRoles.Any(item => string.Equals(item, role.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    private static string? NormalizeRole(string? role)
    {
        return string.IsNullOrWhiteSpace(role) ? null : role.Trim().ToUpperInvariant();
    }
}
