using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Services;

namespace server.Controllers.Api;

[ApiController]
[Route("api/users")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class UsersApiController : ControllerBase
{
    private readonly ChatService _chatService;

    public UsersApiController(ChatService chatService)
    {
        _chatService = chatService;
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
}
