using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Models;
using server.Services;

namespace server.Controllers.Api;

[ApiController]
[Route("api/ai")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public sealed class AiChatApiController : ControllerBase
{
    private readonly DeepSeekService _deepSeekService;
    private readonly ILogger<AiChatApiController> _logger;

    public AiChatApiController(DeepSeekService deepSeekService, ILogger<AiChatApiController> logger)
    {
        _deepSeekService = deepSeekService;
        _logger = logger;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat(AiChatRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { error = "Vui lòng nhập nội dung tin nhắn." });
        }

        try
        {
            var response = await _deepSeekService.GetChatResponseAsync(
                request.Message,
                request.History,
                cancellationToken);

            return Ok(new AiChatResponse { Response = response });
        }
        catch (InvalidOperationException exception)
        {
            _logger.LogError(exception, "DeepSeek configuration is missing.");
            return StatusCode(500, new { error = "AI chưa được cấu hình API key trên server." });
        }
        catch (HttpRequestException exception)
        {
            _logger.LogError(exception, "DeepSeek API request failed.");
            return StatusCode(502, new { error = "Không thể kết nối dịch vụ AI. Vui lòng thử lại sau." });
        }
    }
}
