using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Services;

namespace server.Controllers.Api;

[ApiController]
[Route("api/auth")]
public class FacebookAuthApiController : ControllerBase
{
    private const string DefaultAppReturnUrl = "frontend://auth/facebook";

    private readonly DepressyMateContext _context;
    private readonly JwtTokenService _jwtTokenService;

    public FacebookAuthApiController(DepressyMateContext context, JwtTokenService jwtTokenService)
    {
        _context = context;
        _jwtTokenService = jwtTokenService;
    }

    [HttpGet("facebook")]
    public IActionResult FacebookLogin([FromQuery] string? returnUrl)
    {
        var safeReturnUrl = NormalizeAppReturnUrl(returnUrl);
        var callbackUrl =
            $"{Request.Scheme}://{Request.Host}/api/auth/facebook/callback?returnUrl={Uri.EscapeDataString(safeReturnUrl)}";

        var properties = new AuthenticationProperties
        {
            RedirectUri = callbackUrl
        };

        return Challenge(properties, FacebookDefaults.AuthenticationScheme);
    }

    [HttpGet("facebook/callback")]
    public async Task<IActionResult> FacebookCallback([FromQuery] string? returnUrl)
    {
        var safeReturnUrl = NormalizeAppReturnUrl(returnUrl);
        var authResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);

        if (!authResult.Succeeded || authResult.Principal is null)
        {
            return RedirectWithError(safeReturnUrl, "facebook_auth_failed");
        }

        var facebookId = authResult.Principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(facebookId))
        {
            return RedirectWithError(safeReturnUrl, "missing_facebook_id");
        }

        var facebookEmail = authResult.Principal.FindFirstValue(ClaimTypes.Email);
        var fullName = authResult.Principal.FindFirstValue(ClaimTypes.Name);
        var avatarUrl = authResult.Principal.FindFirstValue("urn:facebook:picture");
        var email = string.IsNullOrWhiteSpace(facebookEmail)
            ? $"facebook_{facebookId}@facebook.local"
            : facebookEmail.Trim().ToLowerInvariant();

        var user = await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.FacebookId == facebookId);

        user ??= await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Email == email);

        if (user is null)
        {
            user = CreateFacebookUser(facebookId, email, fullName, avatarUrl, facebookEmail is not null);
            _context.Users.Add(user);
        }
        else
        {
            UpdateFacebookUser(user, facebookId, fullName, avatarUrl, facebookEmail is not null);
        }

        await _context.SaveChangesAsync();
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

        var token = _jwtTokenService.Generate(user);
        return RedirectWithAuthResult(safeReturnUrl, token, ToAuthUser(user));
    }

    private static User CreateFacebookUser(
        string facebookId,
        string email,
        string? fullName,
        string? avatarUrl,
        bool isEmailVerified)
    {
        var now = DateTime.UtcNow;
        var userId = Guid.NewGuid();
        var displayName = string.IsNullOrWhiteSpace(fullName) ? email : fullName.Trim();

        return new User
        {
            Id = userId,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword($"facebook:{Guid.NewGuid():N}"),
            Role = "USER",
            AvatarUrl = avatarUrl,
            FacebookId = facebookId,
            FullName = displayName,
            AuthProvider = "facebook",
            IsEmailVerified = isEmailVerified,
            CreatedAt = now,
            UpdatedAt = now,
            Profile = new server.Models.Profile
            {
                UserId = userId,
                FullName = displayName,
                AvatarUrl = avatarUrl,
                CreatedAt = now,
                UpdatedAt = now
            }
        };
    }

    private static void UpdateFacebookUser(
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
        }
        else
        {
            user.Profile.FullName = displayName;
            user.Profile.AvatarUrl = avatarUrl ?? user.Profile.AvatarUrl;
            user.Profile.UpdatedAt = now;
        }
    }

    private static object ToAuthUser(User user)
    {
        return new
        {
            id = user.Id,
            email = user.Email,
            role = user.Role,
            fullName = user.Profile?.FullName ?? user.FullName,
            avatarUrl = user.Profile?.AvatarUrl ?? user.AvatarUrl
        };
    }

    private static string NormalizeAppReturnUrl(string? returnUrl)
    {
        if (string.IsNullOrWhiteSpace(returnUrl))
        {
            return DefaultAppReturnUrl;
        }

        return returnUrl.StartsWith("frontend://", StringComparison.OrdinalIgnoreCase)
            ? returnUrl
            : DefaultAppReturnUrl;
    }

    private static IActionResult RedirectWithAuthResult(string returnUrl, string token, object user)
    {
        var json = JsonSerializer.Serialize(user, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        return new RedirectResult(AppendQuery(returnUrl, new Dictionary<string, string>
        {
            ["token"] = token,
            ["user"] = json
        }));
    }

    private static IActionResult RedirectWithError(string returnUrl, string error)
    {
        return new RedirectResult(AppendQuery(returnUrl, new Dictionary<string, string>
        {
            ["error"] = error
        }));
    }

    private static string AppendQuery(string url, IReadOnlyDictionary<string, string> values)
    {
        var separator = url.Contains('?') ? "&" : "?";
        var query = string.Join("&", values.Select(item =>
            $"{Uri.EscapeDataString(item.Key)}={Uri.EscapeDataString(item.Value)}"));

        return $"{url}{separator}{query}";
    }
}
