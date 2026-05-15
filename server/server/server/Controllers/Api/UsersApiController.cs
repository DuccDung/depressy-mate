using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Services;

namespace server.Controllers.Api;

[ApiController]
[Route("api/users")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class UsersApiController : ControllerBase
{
    private readonly ChatService _chatService;
    private readonly DepressyMateContext _context;

    public UsersApiController(ChatService chatService, DepressyMateContext context)
    {
        _chatService = chatService;
        _context = context;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var user = await _context.Users
            .AsNoTracking()
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Id == currentUserId, cancellationToken);

        return user is null ? Unauthorized(new { error = "Phiên đăng nhập không hợp lệ." }) : Ok(ToProfileDto(user));
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe(UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var user = await _context.Users
            .Include(item => item.Profile)
            .FirstOrDefaultAsync(item => item.Id == currentUserId, cancellationToken);

        if (user is null)
        {
            return Unauthorized(new { error = "Phiên đăng nhập không hợp lệ." });
        }

        var fullName = Clean(request.FullName);
        if (fullName is null)
        {
            return BadRequest(new { error = "Họ tên không được để trống." });
        }

        if (fullName.Length > 255)
        {
            return BadRequest(new { error = "Họ tên không được vượt quá 255 ký tự." });
        }

        var avatarUrl = Clean(request.AvatarUrl);
        if (avatarUrl?.Length > 1000)
        {
            return BadRequest(new { error = "Đường dẫn ảnh đại diện quá dài." });
        }

        var bio = Clean(request.Bio);
        if (bio?.Length > 1000)
        {
            return BadRequest(new { error = "Giới thiệu không được vượt quá 1000 ký tự." });
        }

        if (request.Age.HasValue && !IsValidAge(request.Age.Value))
        {
            return BadRequest(new { error = "Tuoi phai nam trong khoang 6 den 120." });
        }

        var now = DateTime.UtcNow;
        user.FullName = fullName;
        user.AvatarUrl = avatarUrl;
        if (request.Age.HasValue)
        {
            user.Age = request.Age.Value;
        }
        user.UpdatedAt = now;

        if (user.Profile is null)
        {
            user.Profile = new Profile
            {
                UserId = user.Id,
                FullName = fullName,
                AvatarUrl = avatarUrl,
                Bio = bio,
                CreatedAt = now,
                UpdatedAt = now
            };
        }
        else
        {
            user.Profile.FullName = fullName;
            user.Profile.AvatarUrl = avatarUrl;
            user.Profile.Bio = bio;
            user.Profile.UpdatedAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(ToProfileDto(user));
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? q, [FromQuery] int limit = 20, CancellationToken cancellationToken = default)
    {
        var currentUserId = ChatService.GetUserId(User);
        var users = await _chatService.SearchUsersAsync(currentUserId, q, limit, cancellationToken);
        return Ok(users);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetUser(Guid id, CancellationToken cancellationToken)
    {
        var user = await _chatService.GetUserProfileAsync(id, cancellationToken);
        return user is null ? NotFound(new { error = "Không tìm thấy người dùng." }) : Ok(user);
    }

    private static object ToProfileDto(User user)
    {
        return new
        {
            id = user.Id,
            email = user.Email,
            role = user.Role,
            fullName = user.Profile?.FullName ?? user.FullName ?? user.Email,
            age = user.Age,
            avatarUrl = user.Profile?.AvatarUrl ?? user.AvatarUrl,
            bio = user.Profile?.Bio,
            authProvider = string.IsNullOrWhiteSpace(user.AuthProvider) ? "local" : user.AuthProvider,
            isEmailVerified = user.IsEmailVerified,
            createdAt = user.CreatedAt,
            updatedAt = user.UpdatedAt
        };
    }

    private static string? Clean(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static bool IsValidAge(int age)
    {
        return age is >= 6 and <= 120;
    }
}

public sealed class UpdateProfileRequest
{
    public string? FullName { get; init; }

    public string? AvatarUrl { get; init; }

    public string? Bio { get; init; }

    public int? Age { get; init; }
}
