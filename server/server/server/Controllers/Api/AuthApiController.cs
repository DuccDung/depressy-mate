using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Services;

namespace server.Controllers.Api;

[ApiController]
[Route("api/auth")]
public class AuthApiController : ControllerBase
{
    private readonly DepressyMateContext _context;
    private readonly JwtTokenService _jwtTokenService;

    public AuthApiController(DepressyMateContext context, JwtTokenService jwtTokenService)
    {
        _context = context;
        _jwtTokenService = jwtTokenService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest(new { error = "Email, password, and fullName are required." });
        }

        if (request.Password.Length < 6)
        {
            return BadRequest(new { error = "Password must be at least 6 characters." });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var emailExists = await _context.Users.AnyAsync(user => user.Email == email);
        if (emailExists)
        {
            return Conflict(new { error = "Email already registered." });
        }

        var now = DateTime.UtcNow;
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = "USER",
            CreatedAt = now,
            UpdatedAt = now,
            Profile = new server.Models.Profile
            {
                UserId = userId,
                FullName = request.FullName.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

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
            fullName = user.Profile?.FullName,
            avatarUrl = user.Profile?.AvatarUrl ?? user.AvatarUrl
        };
    }
}

public record RegisterRequest(string Email, string Password, string FullName);

public record LoginRequest(string Email, string Password);
