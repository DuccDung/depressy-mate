using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using server.Models;
using server.Services;

namespace server.Controllers.Api;

[ApiController]
[Route("api/auth")]
public class AuthApiController : ControllerBase
{
    private const int RegistrationOtpExpiryMinutes = 10;
    private const int MaxRegistrationOtpAttempts = 5;
    private static readonly TimeSpan RegistrationOtpLifetime = TimeSpan.FromMinutes(RegistrationOtpExpiryMinutes);

    private readonly DepressyMateContext _context;
    private readonly JwtTokenService _jwtTokenService;
    private readonly IMemoryCache _cache;
    private readonly EmailSender _emailSender;
    private readonly ILogger<AuthApiController> _logger;

    public AuthApiController(
        DepressyMateContext context,
        JwtTokenService jwtTokenService,
        IMemoryCache cache,
        EmailSender emailSender,
        ILogger<AuthApiController> logger)
    {
        _context = context;
        _jwtTokenService = jwtTokenService;
        _cache = cache;
        _emailSender = emailSender;
        _logger = logger;
    }

    [HttpPost("register")]
    public Task<IActionResult> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        return RequestRegistrationOtp(request, cancellationToken);
    }

    [HttpPost("register/request-otp")]
    public async Task<IActionResult> RequestRegistrationOtp(RegisterRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest(new { error = "Vui lòng nhập đầy đủ họ tên, email và mật khẩu." });
        }

        if (request.Password.Length < 6)
        {
            return BadRequest(new { error = "Mật khẩu phải có ít nhất 6 ký tự." });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var emailExists = await _context.Users.AnyAsync(user => user.Email == email);
        if (emailExists)
        {
            return Conflict(new { error = "Email này đã được đăng ký." });
        }

        var otp = GenerateOtp();
        var expiresAt = DateTimeOffset.UtcNow.Add(RegistrationOtpLifetime);
        var pendingRegistration = new PendingRegistration
        {
            Email = email,
            FullName = request.FullName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            OtpHash = BCrypt.Net.BCrypt.HashPassword(otp),
            ExpiresAt = expiresAt
        };

        var cacheKey = GetRegistrationOtpCacheKey(email);
        _cache.Set(cacheKey, pendingRegistration, expiresAt);

        try
        {
            await _emailSender.SendRegistrationOtpAsync(email, otp, cancellationToken);
        }
        catch (Exception exception)
        {
            _cache.Remove(cacheKey);
            _logger.LogError(exception, "Could not send registration OTP to {Email}.", email);
            return StatusCode(500, new { error = "Không thể gửi mã OTP qua email. Vui lòng thử lại sau." });
        }

        return Ok(new
        {
            message = "Mã OTP đã được gửi tới email của bạn.",
            expiresInSeconds = (int)RegistrationOtpLifetime.TotalSeconds
        });
    }

    [HttpPost("register/verify-otp")]
    public async Task<IActionResult> VerifyRegistrationOtp(VerifyRegisterOtpRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp))
        {
            return BadRequest(new { error = "Email và mã OTP là bắt buộc." });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var cacheKey = GetRegistrationOtpCacheKey(email);
        if (!_cache.TryGetValue(cacheKey, out PendingRegistration? pendingRegistration) ||
            pendingRegistration is null ||
            pendingRegistration.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            _cache.Remove(cacheKey);
            return BadRequest(new { error = "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới." });
        }

        if (!BCrypt.Net.BCrypt.Verify(request.Otp.Trim(), pendingRegistration.OtpHash))
        {
            pendingRegistration.Attempts++;
            if (pendingRegistration.Attempts >= MaxRegistrationOtpAttempts)
            {
                _cache.Remove(cacheKey);
                return BadRequest(new { error = "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng gửi lại mã mới." });
            }

            _cache.Set(cacheKey, pendingRegistration, pendingRegistration.ExpiresAt);
            return BadRequest(new { error = "Mã OTP không đúng." });
        }

        var emailExists = await _context.Users.AnyAsync(user => user.Email == email);
        if (emailExists)
        {
            _cache.Remove(cacheKey);
            return Conflict(new { error = "Email này đã được đăng ký." });
        }

        var now = DateTime.UtcNow;
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Email = email,
            PasswordHash = pendingRegistration.PasswordHash,
            Role = "USER",
            FullName = pendingRegistration.FullName,
            AuthProvider = "local",
            IsEmailVerified = true,
            CreatedAt = now,
            UpdatedAt = now,
            Profile = new server.Models.Profile
            {
                UserId = userId,
                FullName = pendingRegistration.FullName,
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        _cache.Remove(cacheKey);

        var token = _jwtTokenService.Generate(user);

        return Created("/api/auth/register", new
        {
            message = "Registration successful.",
            token,
            user = ToAuthUser(user)
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { error = "Email and password are required." });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Email == email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { error = "Invalid email or password." });
        }

        var token = _jwtTokenService.Generate(user);

        return Ok(new
        {
            message = "Login successful.",
            token,
            user = ToAuthUser(user)
        });
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

    private static string GenerateOtp()
    {
        return RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
    }

    private static string GetRegistrationOtpCacheKey(string email)
    {
        return $"registration_otp:{email}";
    }

    private sealed class PendingRegistration
    {
        public string Email { get; init; } = string.Empty;

        public string PasswordHash { get; init; } = string.Empty;

        public string FullName { get; init; } = string.Empty;

        public string OtpHash { get; init; } = string.Empty;

        public DateTimeOffset ExpiresAt { get; init; }

        public int Attempts { get; set; }
    }
}

public record RegisterRequest(string Email, string Password, string FullName);

public record VerifyRegisterOtpRequest(string Email, string Otp);

public record LoginRequest(string Email, string Password);
