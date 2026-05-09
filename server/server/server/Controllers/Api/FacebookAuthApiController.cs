using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
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
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FacebookAuthApiController> _logger;

    public FacebookAuthApiController(
        DepressyMateContext context,
        JwtTokenService jwtTokenService,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<FacebookAuthApiController> logger)
    {
        _context = context;
        _jwtTokenService = jwtTokenService;
        _httpClient = httpClientFactory.CreateClient();
        _configuration = configuration;
        _logger = logger;
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

    [HttpPost("facebook")]
    public async Task<IActionResult> FacebookTokenLogin(
        FacebookTokenLoginRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.AccessToken))
        {
            return BadRequest(new { error = "Facebook accessToken is required." });
        }

        FacebookProfile profile;
        try
        {
            profile = await GetFacebookProfileAsync(request.AccessToken.Trim(), cancellationToken);
        }
        catch (FacebookTokenException exception)
        {
            return Unauthorized(new { error = exception.Message });
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Could not validate Facebook access token.");
            return StatusCode(502, new { error = "Không thể xác thực Facebook access token. Vui lòng thử lại." });
        }

        var email = string.IsNullOrWhiteSpace(profile.Email)
            ? $"facebook_{profile.Id}@facebook.local"
            : profile.Email.Trim().ToLowerInvariant();

        var user = await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.FacebookId == profile.Id, cancellationToken);

        user ??= await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Email == email, cancellationToken);

        if (user is null)
        {
            user = CreateFacebookUser(
                profile.Id,
                email,
                profile.Name,
                profile.Picture?.Data?.Url,
                !string.IsNullOrWhiteSpace(profile.Email));
            _context.Users.Add(user);
        }
        else
        {
            UpdateFacebookUser(
                user,
                profile.Id,
                profile.Name,
                profile.Picture?.Data?.Url,
                !string.IsNullOrWhiteSpace(profile.Email));
        }

        await _context.SaveChangesAsync(cancellationToken);

        var token = _jwtTokenService.Generate(user);
        return Ok(new
        {
            message = "Facebook login successful.",
            token,
            user = ToAuthUser(user)
        });
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

    private async Task<FacebookProfile> GetFacebookProfileAsync(
        string accessToken,
        CancellationToken cancellationToken)
    {
        var appId = _configuration["Authentication:Facebook:AppId"];
        var appSecret = _configuration["Authentication:Facebook:AppSecret"];

        if (string.IsNullOrWhiteSpace(appId) || string.IsNullOrWhiteSpace(appSecret))
        {
            throw new InvalidOperationException("Facebook AppId/AppSecret is not configured.");
        }

        await ValidateFacebookTokenForAppAsync(accessToken, appId, appSecret, cancellationToken);

        var query = new Dictionary<string, string?>
        {
            ["fields"] = "id,name,email,picture.type(large)",
            ["access_token"] = accessToken
        };

        if (!string.IsNullOrWhiteSpace(appSecret))
        {
            query["appsecret_proof"] = CreateAppSecretProof(accessToken, appSecret);
        }

        using var response = await _httpClient.GetAsync(
            BuildFacebookGraphUrl("/me", query),
            cancellationToken);

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Facebook /me validation failed with status {StatusCode}.", response.StatusCode);
            throw new FacebookTokenException("Facebook access token không hợp lệ hoặc đã hết hạn.");
        }

        var profile = JsonSerializer.Deserialize<FacebookProfile>(json);
        if (profile is null || string.IsNullOrWhiteSpace(profile.Id))
        {
            throw new FacebookTokenException("Facebook không trả về thông tin người dùng hợp lệ.");
        }

        return profile;
    }

    private async Task ValidateFacebookTokenForAppAsync(
        string accessToken,
        string appId,
        string appSecret,
        CancellationToken cancellationToken)
    {
        using var response = await _httpClient.GetAsync(
            BuildFacebookGraphUrl("/debug_token", new Dictionary<string, string?>
            {
                ["input_token"] = accessToken,
                ["access_token"] = $"{appId}|{appSecret}"
            }),
            cancellationToken);

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Facebook debug_token failed with status {StatusCode}.", response.StatusCode);
            throw new FacebookTokenException("Facebook access token không hợp lệ hoặc đã hết hạn.");
        }

        var debugResult = JsonSerializer.Deserialize<FacebookDebugTokenResponse>(json);
        var data = debugResult?.Data;
        if (data?.IsValid != true || string.IsNullOrWhiteSpace(data.UserId))
        {
            throw new FacebookTokenException("Facebook access token không hợp lệ hoặc đã hết hạn.");
        }

        if (!string.Equals(data.AppId, appId, StringComparison.Ordinal))
        {
            throw new FacebookTokenException("Facebook access token không thuộc ứng dụng này.");
        }
    }

    private static string BuildFacebookGraphUrl(string path, IReadOnlyDictionary<string, string?> query)
    {
        var queryString = string.Join("&", query
            .Where(item => !string.IsNullOrWhiteSpace(item.Value))
            .Select(item => $"{Uri.EscapeDataString(item.Key)}={Uri.EscapeDataString(item.Value!)}"));

        return $"https://graph.facebook.com{path}?{queryString}";
    }

    private static string CreateAppSecretProof(string accessToken, string appSecret)
    {
        var keyBytes = Encoding.UTF8.GetBytes(appSecret);
        var tokenBytes = Encoding.UTF8.GetBytes(accessToken);
        using var hmac = new HMACSHA256(keyBytes);
        return Convert.ToHexString(hmac.ComputeHash(tokenBytes)).ToLowerInvariant();
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

    private sealed class FacebookTokenException : Exception
    {
        public FacebookTokenException(string message)
            : base(message)
        {
        }
    }

    private sealed class FacebookDebugTokenResponse
    {
        [JsonPropertyName("data")]
        public FacebookDebugTokenData? Data { get; set; }
    }

    private sealed class FacebookDebugTokenData
    {
        [JsonPropertyName("app_id")]
        public string? AppId { get; set; }

        [JsonPropertyName("is_valid")]
        public bool IsValid { get; set; }

        [JsonPropertyName("user_id")]
        public string? UserId { get; set; }
    }

    private sealed class FacebookProfile
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("picture")]
        public FacebookPicture? Picture { get; set; }
    }

    private sealed class FacebookPicture
    {
        [JsonPropertyName("data")]
        public FacebookPictureData? Data { get; set; }
    }

    private sealed class FacebookPictureData
    {
        [JsonPropertyName("url")]
        public string? Url { get; set; }
    }
}

public record FacebookTokenLoginRequest(string AccessToken);
