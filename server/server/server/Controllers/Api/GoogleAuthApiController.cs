using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Services;

namespace server.Controllers.Api;

[ApiController]
[Route("api/auth")]
public class GoogleAuthApiController : ControllerBase
{
    private const string DefaultAppReturnUrl = "frontend://auth/google";

    private readonly DepressyMateContext _context;
    private readonly JwtTokenService _jwtTokenService;

    public GoogleAuthApiController(
        DepressyMateContext context,
        JwtTokenService jwtTokenService)
    {
        _context = context;
        _jwtTokenService = jwtTokenService;
    }

    [HttpGet("google")]
    public IActionResult GoogleLogin([FromQuery] string? returnUrl)
    {
        var safeReturnUrl = NormalizeAppReturnUrl(returnUrl);
        var callbackUrl =
            $"{Request.Scheme}://{Request.Host}/api/auth/google/callback?returnUrl={Uri.EscapeDataString(safeReturnUrl)}";

        var properties = new AuthenticationProperties
        {
            RedirectUri = callbackUrl
        };

        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string? returnUrl)
    {
        var safeReturnUrl = NormalizeAppReturnUrl(returnUrl);
        var authResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);

        if (!authResult.Succeeded || authResult.Principal is null)
        {
            return RedirectWithError(safeReturnUrl, "google_auth_failed");
        }

        var googleEmail = authResult.Principal.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(googleEmail))
        {
            return RedirectWithError(safeReturnUrl, "missing_google_email");
        }

        var email = googleEmail.Trim().ToLowerInvariant();
        var fullName = authResult.Principal.FindFirstValue(ClaimTypes.Name);
        var avatarUrl = authResult.Principal.FindFirstValue("urn:google:picture");

        var user = await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Email == email);

        if (user is null)
        {
            user = CreateGoogleUser(email, fullName, avatarUrl);
            _context.Users.Add(user);
        }
        else
        {
            UpdateGoogleUser(user, fullName, avatarUrl);
        }

        await _context.SaveChangesAsync();
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

        var token = _jwtTokenService.Generate(user);
        return RedirectWithAuthResult(safeReturnUrl, token, ToAuthUser(user));
    }

    private static User CreateGoogleUser(string email, string? fullName, string? avatarUrl)
    {
        var now = DateTime.UtcNow;
        var userId = Guid.NewGuid();
        var displayName = string.IsNullOrWhiteSpace(fullName) ? email : fullName.Trim();

        return new User
        {
            Id = userId,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword($"google:{Guid.NewGuid():N}"),
            Role = "USER",
            AvatarUrl = avatarUrl,
            FullName = displayName,
            AuthProvider = "google",
            IsEmailVerified = true,
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

    private static void UpdateGoogleUser(User user, string? fullName, string? avatarUrl)
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
