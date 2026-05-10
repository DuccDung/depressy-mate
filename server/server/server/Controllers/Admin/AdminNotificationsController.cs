using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Models.Admin;
using server.Services;

namespace server.Controllers.Admin;

[Route("admin/notifications")]
public class AdminNotificationsController : Controller
{
    private static readonly string[] AdminRoles = ["AMDIN", "ADMIN"];

    private readonly DepressyMateContext _context;
    private readonly PushNotificationService _pushNotificationService;

    public AdminNotificationsController(
        DepressyMateContext context,
        PushNotificationService pushNotificationService)
    {
        _context = context;
        _pushNotificationService = pushNotificationService;
    }

    [HttpGet("")]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        var model = await BuildViewModelAsync(new AdminPushNotificationViewModel(), cancellationToken);
        return View("~/Views/Admin/Notifications/Index.cshtml", model);
    }

    [HttpPost("send")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Send(AdminPushNotificationViewModel model, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        model.TargetMode = NormalizeTargetMode(model.TargetMode);
        model.Title = model.Title?.Trim() ?? string.Empty;
        model.Body = model.Body?.Trim() ?? string.Empty;
        model.SelectedUserIds = model.SelectedUserIds
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        if (model.IsSelectedTarget && model.SelectedUserIds.Count == 0)
        {
            ModelState.AddModelError(nameof(model.SelectedUserIds), "Vui lòng chọn ít nhất một người dùng.");
        }

        if (!ModelState.IsValid)
        {
            var invalidModel = await BuildViewModelAsync(model, cancellationToken);
            return View("~/Views/Admin/Notifications/Index.cshtml", invalidModel);
        }

        var result = await _pushNotificationService.SendAdminNotificationAsync(
            model.Title,
            model.Body,
            !model.IsSelectedTarget,
            model.SelectedUserIds,
            cancellationToken);

        if (!result.IsFirebaseConfigured)
        {
            TempData["AdminNotificationError"] =
                "Firebase service account chưa được cấu hình, nên backend chưa thể gửi thông báo đẩy.";
            return RedirectToAction(nameof(Index));
        }

        TempData["AdminNotificationSuccess"] =
            $"Đã gửi thông báo tới {result.SuccessCount}/{result.TokenCount} thiết bị của {result.TargetUserCount} người dùng. " +
            $"Thất bại: {result.FailureCount}. Token lỗi đã tắt: {result.InvalidTokenCount}.";

        return RedirectToAction(nameof(Index));
    }

    private async Task<AdminPushNotificationViewModel> BuildViewModelAsync(
        AdminPushNotificationViewModel model,
        CancellationToken cancellationToken)
    {
        var selectedIds = model.SelectedUserIds.ToHashSet();

        var users = await _context.Users
            .AsNoTracking()
            .Include(user => user.Profile)
            .OrderBy(user => user.Profile != null ? user.Profile.FullName : user.FullName)
            .ThenBy(user => user.Email)
            .Select(user => new AdminPushNotificationUserOption
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.Profile != null ? user.Profile.FullName : (user.FullName ?? user.Email),
                Role = user.Role,
                ActivePushTokenCount = user.UserPushTokens.Count(token =>
                    token.Provider == "firebase" &&
                    token.IsActive &&
                    token.PushToken != null),
                IsSelected = selectedIds.Contains(user.Id)
            })
            .ToListAsync(cancellationToken);

        model.TargetMode = NormalizeTargetMode(model.TargetMode);
        model.Users = users;
        model.TotalUsers = users.Count;
        model.UsersWithActiveTokens = users.Count(user => user.ActivePushTokenCount > 0);
        model.ActiveTokenCount = await _context.UserPushTokens
            .AsNoTracking()
            .CountAsync(token =>
                token.Provider == "firebase" &&
                token.IsActive &&
                token.PushToken != null,
                cancellationToken);

        return model;
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

    private static string NormalizeTargetMode(string? targetMode)
    {
        return string.Equals(
            targetMode?.Trim(),
            AdminPushNotificationViewModel.TargetSelected,
            StringComparison.OrdinalIgnoreCase)
            ? AdminPushNotificationViewModel.TargetSelected
            : AdminPushNotificationViewModel.TargetAll;
    }
}
