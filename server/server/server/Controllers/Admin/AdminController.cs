using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Models.Admin;

namespace server.Controllers.Admin;

[Route("admin")]
public class AdminController : Controller
{
    private const string GoogleCallbackRouteName = "AdminGoogleCallback";
    private const string FacebookCallbackRouteName = "AdminFacebookCallback";
    private static readonly string[] AdminRoles = ["AMDIN", "ADMIN"];

    private readonly DepressyMateContext _context;

    public AdminController(DepressyMateContext context)
    {
        _context = context;
    }

    [HttpGet("/")]
    public IActionResult Root()
    {
        return RedirectToAction(nameof(Index));
    }

    [HttpGet("")]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        if (!IsCurrentAdmin())
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                TempData["AdminAuthError"] = "Tài khoản hiện tại không có quyền quản trị.";
            }

            return RedirectToAction(nameof(Login), new { returnUrl = Url.Action(nameof(Index), "Admin") });
        }

        var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var admin = !string.IsNullOrWhiteSpace(adminId) && Guid.TryParse(adminId, out var userId)
            ? await _context.Users
                .Include(item => item.Profile)
                .FirstOrDefaultAsync(item => item.Id == userId, cancellationToken)
            : null;

        var today = DateTime.UtcNow.Date;
        var dailyFrom = today.AddDays(-13);
        var activeFrom = today.AddDays(-29);
        var dailyActivity = await BuildDailyActivityAsync(dailyFrom, today, cancellationToken);
        var activeUsers30Days = await CountActiveUsersAsync(activeFrom, cancellationToken);
        var engagement14Days = dailyActivity.Sum(item => item.Interactions + item.Messages + item.Posts + item.Checkins);
        var topPosts = await _context.Posts
            .AsNoTracking()
            .Include(item => item.User)
            .ThenInclude(item => item.Profile)
            .Where(item => item.DeletedAt == null)
            .OrderByDescending(item => item.LikeCount + item.CommentCount)
            .ThenByDescending(item => item.CreatedAt)
            .Take(5)
            .Select(item => new AdminTopPostViewModel
            {
                Id = item.Id,
                AuthorName = item.User.Profile != null && item.User.Profile.FullName != null
                    ? item.User.Profile.FullName
                    : item.User.FullName ?? item.User.Email,
                ContentPreview = item.Content ?? string.Empty,
                LikeCount = item.LikeCount,
                CommentCount = item.CommentCount,
                CreatedAt = item.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var model = new AdminDashboardViewModel
        {
            AdminName = admin?.Profile?.FullName ?? admin?.FullName ?? User.Identity?.Name ?? "Admin",
            AdminEmail = admin?.Email ?? User.FindFirstValue(ClaimTypes.Email) ?? string.Empty,
            AdminRole = admin?.Role ?? User.FindFirstValue(ClaimTypes.Role) ?? "AMDIN",
            TotalUsers = await _context.Users.CountAsync(cancellationToken),
            TotalDoctors = await _context.Doctors.CountAsync(cancellationToken),
            TotalClinics = await _context.Clinics.CountAsync(cancellationToken),
            TotalAssessments = await _context.AssessmentResults.CountAsync(cancellationToken),
            TotalCheckins = await _context.MoodCheckins.CountAsync(cancellationToken),
            TotalPosts = await _context.Posts.CountAsync(cancellationToken),
            TotalMessages = await _context.Messages.CountAsync(item => item.DeletedAt == null, cancellationToken),
            TotalConversations = await _context.Conversations.CountAsync(cancellationToken),
            DirectConversations = await _context.Conversations.CountAsync(item => item.Type == "DIRECT", cancellationToken),
            GroupConversations = await _context.Conversations.CountAsync(item => item.Type == "GROUP", cancellationToken),
            TotalPostLikes = await _context.PostLikes.CountAsync(cancellationToken),
            TotalPostSaves = await _context.PostSaves.CountAsync(cancellationToken),
            TotalComments = await _context.Comments.CountAsync(item => item.DeletedAt == null, cancellationToken),
            ActiveUsers30Days = activeUsers30Days,
            NewUsers14Days = dailyActivity.Sum(item => item.Users),
            CommunityInteractions = await _context.PostLikes.CountAsync(cancellationToken) +
                await _context.PostSaves.CountAsync(cancellationToken) +
                await _context.Comments.CountAsync(item => item.DeletedAt == null, cancellationToken),
            Engagement14Days = engagement14Days,
            DailyActivity = dailyActivity,
            TopPosts = topPosts
        };

        return View("~/Views/Admin/Index.cshtml", model);
    }

    private async Task<List<AdminDailyActivityPoint>> BuildDailyActivityAsync(
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken)
    {
        var posts = await _context.Posts
            .AsNoTracking()
            .Where(item => item.CreatedAt >= from)
            .Select(item => item.CreatedAt)
            .ToListAsync(cancellationToken);
        var messages = await _context.Messages
            .AsNoTracking()
            .Where(item => item.DeletedAt == null && item.CreatedAt >= from)
            .Select(item => item.CreatedAt)
            .ToListAsync(cancellationToken);
        var likes = await _context.PostLikes
            .AsNoTracking()
            .Where(item => item.CreatedAt >= from)
            .Select(item => item.CreatedAt)
            .ToListAsync(cancellationToken);
        var saves = await _context.PostSaves
            .AsNoTracking()
            .Where(item => item.CreatedAt >= from)
            .Select(item => item.CreatedAt)
            .ToListAsync(cancellationToken);
        var comments = await _context.Comments
            .AsNoTracking()
            .Where(item => item.DeletedAt == null && item.CreatedAt >= from)
            .Select(item => item.CreatedAt)
            .ToListAsync(cancellationToken);
        var checkins = await _context.MoodCheckins
            .AsNoTracking()
            .Where(item => item.CreatedAt >= from)
            .Select(item => item.CreatedAt)
            .ToListAsync(cancellationToken);
        var users = await _context.Users
            .AsNoTracking()
            .Where(item => item.CreatedAt >= from)
            .Select(item => item.CreatedAt)
            .ToListAsync(cancellationToken);

        return Enumerable.Range(0, (to - from).Days + 1)
            .Select(offset => from.AddDays(offset))
            .Select(day =>
            {
                var nextDay = day.AddDays(1);
                return new AdminDailyActivityPoint
                {
                    Label = day.ToString("dd/MM", CultureInfo.InvariantCulture),
                    Posts = posts.Count(item => item >= day && item < nextDay),
                    Messages = messages.Count(item => item >= day && item < nextDay),
                    Interactions = likes.Count(item => item >= day && item < nextDay) +
                        saves.Count(item => item >= day && item < nextDay) +
                        comments.Count(item => item >= day && item < nextDay),
                    Checkins = checkins.Count(item => item >= day && item < nextDay),
                    Users = users.Count(item => item >= day && item < nextDay)
                };
            })
            .ToList();
    }

    private async Task<int> CountActiveUsersAsync(DateTime from, CancellationToken cancellationToken)
    {
        var userIds = new HashSet<Guid>();
        userIds.UnionWith(await _context.Posts
            .AsNoTracking()
            .Where(item => item.CreatedAt >= from)
            .Select(item => item.UserId)
            .ToListAsync(cancellationToken));
        userIds.UnionWith(await _context.Comments
            .AsNoTracking()
            .Where(item => item.DeletedAt == null && item.CreatedAt >= from)
            .Select(item => item.UserId)
            .ToListAsync(cancellationToken));
        userIds.UnionWith(await _context.Messages
            .AsNoTracking()
            .Where(item => item.DeletedAt == null && item.CreatedAt >= from)
            .Select(item => item.SenderId)
            .ToListAsync(cancellationToken));
        userIds.UnionWith(await _context.MoodCheckins
            .AsNoTracking()
            .Where(item => item.CreatedAt >= from)
            .Select(item => item.UserId)
            .ToListAsync(cancellationToken));
        userIds.UnionWith(await _context.Journals
            .AsNoTracking()
            .Where(item => item.CreatedAt >= from)
            .Select(item => item.UserId)
            .ToListAsync(cancellationToken));
        userIds.UnionWith(await _context.AssessmentResults
            .AsNoTracking()
            .Where(item => item.CreatedAt >= from)
            .Select(item => item.UserId)
            .ToListAsync(cancellationToken));

        return userIds.Count;
    }

    [HttpGet("login")]
    public async Task<IActionResult> Login(string? returnUrl = null)
    {
        if (IsCurrentAdmin())
        {
            return RedirectToAdminHome(returnUrl);
        }

        if (User.Identity?.IsAuthenticated == true)
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            TempData["AdminAuthError"] = "Tài khoản hiện tại không có quyền quản trị.";
        }

        return View("~/Views/Admin/Login.cshtml", new AdminLoginViewModel { ReturnUrl = returnUrl });
    }

    [HttpPost("login")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(AdminLoginViewModel model, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return View("~/Views/Admin/Login.cshtml", model);
        }

        var email = model.Email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Email == email, cancellationToken);

        if (user is null || !BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash))
        {
            ModelState.AddModelError(string.Empty, "Email hoặc mật khẩu không đúng.");
            return View("~/Views/Admin/Login.cshtml", model);
        }

        if (!IsAdminUser(user))
        {
            ModelState.AddModelError(string.Empty, "Tài khoản này không có quyền AMDIN.");
            return View("~/Views/Admin/Login.cshtml", model);
        }

        await SignInAdminAsync(user);
        return RedirectToAdminHome(model.ReturnUrl);
    }

    [HttpPost("google")]
    [ValidateAntiForgeryToken]
    public IActionResult Google(string? returnUrl = null)
    {
        var callbackUrl = Url.RouteUrl(
            GoogleCallbackRouteName,
            new { returnUrl },
            Request.Scheme);

        return Challenge(
            new AuthenticationProperties { RedirectUri = callbackUrl },
            GoogleDefaults.AuthenticationScheme);
    }

    [HttpPost("facebook")]
    [ValidateAntiForgeryToken]
    public IActionResult Facebook(string? returnUrl = null)
    {
        var callbackUrl = Url.RouteUrl(
            FacebookCallbackRouteName,
            new { returnUrl },
            Request.Scheme);

        return Challenge(
            new AuthenticationProperties { RedirectUri = callbackUrl },
            FacebookDefaults.AuthenticationScheme);
    }

    [HttpGet("google/callback", Name = GoogleCallbackRouteName)]
    public async Task<IActionResult> GoogleCallback(string? returnUrl = null, CancellationToken cancellationToken = default)
    {
        var authResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        if (!authResult.Succeeded || authResult.Principal is null)
        {
            TempData["AdminAuthError"] = "Không thể đăng nhập bằng Google. Vui lòng thử lại.";
            return RedirectToAction(nameof(Login), new { returnUrl });
        }

        var googleEmail = authResult.Principal.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(googleEmail))
        {
            TempData["AdminAuthError"] = "Google không trả về email hợp lệ.";
            return RedirectToAction(nameof(Login), new { returnUrl });
        }

        var email = googleEmail.Trim().ToLowerInvariant();
        var user = await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Email == email, cancellationToken);

        if (user is null || !IsAdminUser(user))
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            TempData["AdminAuthError"] = "Tài khoản Google này không có quyền AMDIN.";
            return RedirectToAction(nameof(Login), new { returnUrl });
        }

        UpdateGoogleAdminUser(
            user,
            authResult.Principal.FindFirstValue(ClaimTypes.Name),
            authResult.Principal.FindFirstValue("urn:google:picture"));

        await _context.SaveChangesAsync(cancellationToken);
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        await SignInAdminAsync(user);

        return RedirectToAdminHome(returnUrl);
    }

    [HttpGet("facebook/callback", Name = FacebookCallbackRouteName)]
    public async Task<IActionResult> FacebookCallback(string? returnUrl = null, CancellationToken cancellationToken = default)
    {
        var authResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        if (!authResult.Succeeded || authResult.Principal is null)
        {
            TempData["AdminAuthError"] = "Không thể đăng nhập bằng Facebook. Vui lòng thử lại.";
            return RedirectToAction(nameof(Login), new { returnUrl });
        }

        var facebookId = authResult.Principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(facebookId))
        {
            TempData["AdminAuthError"] = "Facebook không trả về mã tài khoản hợp lệ.";
            return RedirectToAction(nameof(Login), new { returnUrl });
        }

        var facebookEmail = authResult.Principal.FindFirstValue(ClaimTypes.Email);
        var email = facebookEmail?.Trim().ToLowerInvariant();

        var user = await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.FacebookId == facebookId, cancellationToken);

        if (user is null && !string.IsNullOrWhiteSpace(email))
        {
            user = await _context.Users
                .Include(item => item.Profile)
                .FirstOrDefaultAsync(item => item.Email == email, cancellationToken);
        }

        if (user is null || !IsAdminUser(user))
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            TempData["AdminAuthError"] = "Tài khoản Facebook này không có quyền AMDIN.";
            return RedirectToAction(nameof(Login), new { returnUrl });
        }

        UpdateFacebookAdminUser(
            user,
            facebookId,
            authResult.Principal.FindFirstValue(ClaimTypes.Name),
            authResult.Principal.FindFirstValue("urn:facebook:picture"),
            !string.IsNullOrWhiteSpace(facebookEmail));

        await _context.SaveChangesAsync(cancellationToken);
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        await SignInAdminAsync(user);

        return RedirectToAdminHome(returnUrl);
    }

    [HttpPost("logout")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction(nameof(Login));
    }

    private bool IsCurrentAdmin()
    {
        return User.Identity?.IsAuthenticated == true &&
            IsAdminRole(User.FindFirstValue(ClaimTypes.Role));
    }

    private static bool IsAdminUser(User user)
    {
        return IsAdminRole(user.Role);
    }

    private static bool IsAdminRole(string? role)
    {
        return !string.IsNullOrWhiteSpace(role) &&
            AdminRoles.Any(item => string.Equals(item, role.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    private async Task SignInAdminAsync(User user)
    {
        var fullName = user.Profile?.FullName ?? user.FullName ?? user.Email;
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, fullName),
            new(ClaimTypes.Role, user.Role),
            new("admin_session", "true")
        };

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme)),
            new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddDays(7)
            });
    }

    private IActionResult RedirectToAdminHome(string? returnUrl)
    {
        if (!string.IsNullOrWhiteSpace(returnUrl) &&
            Url.IsLocalUrl(returnUrl) &&
            returnUrl.StartsWith("/admin", StringComparison.OrdinalIgnoreCase))
        {
            return LocalRedirect(returnUrl);
        }

        return RedirectToAction(nameof(Index));
    }

    private static void UpdateGoogleAdminUser(User user, string? fullName, string? avatarUrl)
    {
        var now = DateTime.UtcNow;
        var displayName = string.IsNullOrWhiteSpace(fullName)
            ? user.FullName ?? user.Profile?.FullName ?? user.Email
            : fullName.Trim();

        user.AuthProvider = string.IsNullOrWhiteSpace(user.AuthProvider) ? "google" : user.AuthProvider;
        user.FullName = displayName;
        user.AvatarUrl = avatarUrl ?? user.AvatarUrl;
        user.IsEmailVerified = true;
        user.UpdatedAt = now;

        UpdateProfile(user, displayName, avatarUrl, now);
    }

    private static void UpdateFacebookAdminUser(
        User user,
        string facebookId,
        string? fullName,
        string? avatarUrl,
        bool isEmailVerified)
    {
        var now = DateTime.UtcNow;
        var displayName = string.IsNullOrWhiteSpace(fullName)
            ? user.FullName ?? user.Profile?.FullName ?? user.Email
            : fullName.Trim();

        user.FacebookId = facebookId;
        user.AuthProvider = string.IsNullOrWhiteSpace(user.AuthProvider) ? "facebook" : user.AuthProvider;
        user.FullName = displayName;
        user.AvatarUrl = avatarUrl ?? user.AvatarUrl;
        user.IsEmailVerified = user.IsEmailVerified || isEmailVerified;
        user.UpdatedAt = now;

        UpdateProfile(user, displayName, avatarUrl, now);
    }

    private static void UpdateProfile(User user, string displayName, string? avatarUrl, DateTime now)
    {
        if (user.Profile is null)
        {
            user.Profile = new server.Models.Profile
            {
                UserId = user.Id,
                FullName = displayName,
                AvatarUrl = avatarUrl,
                CreatedAt = now,
                UpdatedAt = now
            };
            return;
        }

        user.Profile.FullName = displayName;
        user.Profile.AvatarUrl = avatarUrl ?? user.Profile.AvatarUrl;
        user.Profile.UpdatedAt = now;
    }
}
