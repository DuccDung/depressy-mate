using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
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
    private static readonly HashSet<string> ValidGoogleIssuers = new(StringComparer.Ordinal)
    {
        "accounts.google.com",
        "https://accounts.google.com"
    };

    private readonly DepressyMateContext _context;
    private readonly JwtTokenService _jwtTokenService;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GoogleAuthApiController> _logger;

    public GoogleAuthApiController(
        DepressyMateContext context,
        JwtTokenService jwtTokenService,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<GoogleAuthApiController> logger)
    {
        _context = context;
        _jwtTokenService = jwtTokenService;
        _httpClient = httpClientFactory.CreateClient();
        _configuration = configuration;
        _logger = logger;
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

    [HttpPost("google")]
    public async Task<IActionResult> GoogleTokenLogin(
        GoogleTokenLoginRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.IdToken))
        {
            return BadRequest(new { error = "Google idToken is required." });
        }

        GoogleTokenInfo profile;
        try
        {
            profile = await ValidateGoogleIdTokenAsync(request.IdToken.Trim(), cancellationToken);
        }
        catch (GoogleTokenException exception)
        {
            return Unauthorized(new { error = exception.Message });
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Could not validate Google id token.");
            return StatusCode(502, new { error = "Khong the xac thuc Google idToken. Vui long thu lai." });
        }

        var email = profile.Email!.Trim().ToLowerInvariant();
        var user = await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Email == email, cancellationToken);

        if (user is null)
        {
            user = CreateGoogleUser(email, profile.Name, profile.Picture);
            _context.Users.Add(user);
        }
        else
        {
            UpdateGoogleUser(user, profile.Name, profile.Picture);
        }

        await _context.SaveChangesAsync(cancellationToken);

        var token = _jwtTokenService.Generate(user);
        return Ok(new
        {
            message = "Google login successful.",
            token,
            user = ToAuthUser(user)
        });
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

    private async Task<GoogleTokenInfo> ValidateGoogleIdTokenAsync(
        string idToken,
        CancellationToken cancellationToken)
    {
        var allowedAudiences = GetAllowedGoogleAudiences();
        if (allowedAudiences.Count == 0)
        {
            throw new InvalidOperationException("Google client ID is not configured.");
        }

        using var response = await _httpClient.GetAsync(
            $"https://oauth2.googleapis.com/tokeninfo?id_token={Uri.EscapeDataString(idToken)}",
            cancellationToken);

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Google tokeninfo validation failed with status {StatusCode}.", response.StatusCode);
            throw new GoogleTokenException("Google idToken khong hop le hoac da het han.");
        }

        var profile = JsonSerializer.Deserialize<GoogleTokenInfo>(json);
        if (profile is null)
        {
            throw new GoogleTokenException("Google khong tra ve thong tin nguoi dung hop le.");
        }

        if (string.IsNullOrWhiteSpace(profile.Issuer) || !ValidGoogleIssuers.Contains(profile.Issuer))
        {
            throw new GoogleTokenException("Google idToken khong co issuer hop le.");
        }

        if (string.IsNullOrWhiteSpace(profile.Audience) || !allowedAudiences.Contains(profile.Audience))
        {
            throw new GoogleTokenException("Google idToken khong thuoc ung dung nay.");
        }

        if (string.IsNullOrWhiteSpace(profile.Subject))
        {
            throw new GoogleTokenException("Google khong tra ve ma nguoi dung hop le.");
        }

        if (string.IsNullOrWhiteSpace(profile.Email))
        {
            throw new GoogleTokenException("Google khong tra ve email hop le.");
        }

        if (!profile.IsEmailVerified)
        {
            throw new GoogleTokenException("Email Google chua duoc xac thuc.");
        }

        return profile;
    }

    private HashSet<string> GetAllowedGoogleAudiences()
    {
        var values = new List<string?>
        {
            _configuration["Authentication:Google:client_id"],
            _configuration["Authentication:Google:ClientId"],
            _configuration["Authentication:Google:WebClientId"],
            _configuration["Google:ClientId"],
            _configuration["Google:WebClientId"]
        };

        AddSplitValues(values, _configuration["Authentication:Google:AllowedClientIds"]);
        AddSplitValues(values, _configuration["Authentication:Google:client_ids"]);
        AddSectionValues(values, _configuration.GetSection("Authentication:Google:AllowedClientIds"));
        AddSectionValues(values, _configuration.GetSection("Authentication:Google:client_ids"));

        return values
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value!.Trim())
            .ToHashSet(StringComparer.Ordinal);
    }

    private static void AddSplitValues(List<string?> values, string? rawValue)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return;
        }

        values.AddRange(rawValue.Split(
            new[] { ',', ';', ' ' },
            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
    }

    private static void AddSectionValues(List<string?> values, IConfigurationSection section)
    {
        foreach (var child in section.GetChildren())
        {
            values.Add(child.Value);
        }
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
            age = user.Age,
            avatarUrl = user.Profile?.AvatarUrl ?? user.AvatarUrl,
            bio = user.Profile?.Bio,
            authProvider = string.IsNullOrWhiteSpace(user.AuthProvider) ? "google" : user.AuthProvider,
            isEmailVerified = user.IsEmailVerified,
            createdAt = user.CreatedAt,
            updatedAt = user.UpdatedAt
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

    private sealed class GoogleTokenException : Exception
    {
        public GoogleTokenException(string message)
            : base(message)
        {
        }
    }

    private sealed class GoogleTokenInfo
    {
        [JsonPropertyName("iss")]
        public string? Issuer { get; set; }

        [JsonPropertyName("aud")]
        public string? Audience { get; set; }

        [JsonPropertyName("sub")]
        public string? Subject { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("email_verified")]
        public JsonElement EmailVerified { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("picture")]
        public string? Picture { get; set; }

        public bool IsEmailVerified => EmailVerified.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.String => string.Equals(
                EmailVerified.GetString(),
                "true",
                StringComparison.OrdinalIgnoreCase),
            _ => false
        };
    }
}

public record GoogleTokenLoginRequest(string IdToken);
