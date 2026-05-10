using System.Globalization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using server.Hubs;
using server.Models;
using server.Services;

namespace server.Controllers.Api;

[ApiController]
[Route("api/conversations")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class ConversationsApiController : ControllerBase
{
    private readonly ChatService _chatService;
    private readonly IHubContext<ChatHub> _hubContext;

    public ConversationsApiController(ChatService chatService, IHubContext<ChatHub> hubContext)
    {
        _chatService = chatService;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetConversations(CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var conversations = await _chatService.GetConversationsAsync(currentUserId, cancellationToken);
        return Ok(conversations);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetConversation(Guid id, CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        var conversation = await _chatService.GetConversationAsync(id, currentUserId, cancellationToken);
        return conversation is null
            ? NotFound(new { error = "Không tìm thấy cuộc trò chuyện." })
            : Ok(conversation);
    }

    [HttpPost]
    public Task<IActionResult> CreateDirectConversation(DirectConversationRequest request, CancellationToken cancellationToken)
    {
        return CreateDirectConversationExplicit(request, cancellationToken);
    }

    [HttpPost("direct")]
    public async Task<IActionResult> CreateDirectConversationExplicit(DirectConversationRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var currentUserId = ChatService.GetUserId(User);
            var result = await _chatService.CreateDirectConversationAsync(currentUserId, request.ParticipantId, cancellationToken);
            if (!result.Existing)
            {
                await NotifyConversationCreatedAsync(result.Conversation.Id, result.Conversation.Participants.Select(item => item.UserId), cancellationToken);
            }

            return result.Existing
                ? Ok(result)
                : Created($"/api/conversations/{result.Id}", result);
        }
        catch (ChatOperationException exception)
        {
            return ToErrorResult(exception);
        }
    }

    [HttpPost("group")]
    public async Task<IActionResult> CreateGroupConversation(GroupConversationRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var currentUserId = ChatService.GetUserId(User);
            var result = await _chatService.CreateGroupConversationAsync(currentUserId, request, cancellationToken);
            await NotifyConversationCreatedAsync(result.Conversation.Id, result.Conversation.Participants.Select(item => item.UserId), cancellationToken);
            return Created($"/api/conversations/{result.Id}", result);
        }
        catch (ChatOperationException exception)
        {
            return ToErrorResult(exception);
        }
    }

    [HttpGet("{id:guid}/messages")]
    public async Task<IActionResult> GetMessages(
        Guid id,
        [FromQuery] int limit = 30,
        [FromQuery] string? before = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var currentUserId = ChatService.GetUserId(User);
            var beforeDate = ParseCursor(before);
            var messages = await _chatService.GetMessagesAsync(currentUserId, id, beforeDate, limit, cancellationToken);
            return Ok(messages);
        }
        catch (ChatOperationException exception)
        {
            return ToErrorResult(exception);
        }
    }

    [HttpPost("{id:guid}/messages")]
    public async Task<IActionResult> SendMessage(Guid id, SendMessageRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var currentUserId = ChatService.GetUserId(User);
            var message = await _chatService.SendMessageAsync(currentUserId, id, request.Content, cancellationToken);
            await _hubContext.Clients.Group(ChatGroups.Conversation(id))
                .SendAsync("message:new", message, cancellationToken);
            await _hubContext.Clients.Group(ChatGroups.Conversation(id))
                .SendAsync("conversation:updated", new
                {
                    conversation_id = id,
                    message
                }, cancellationToken);
            return Created($"/api/conversations/{id}/messages/{message.Id}", message);
        }
        catch (ChatOperationException exception)
        {
            return ToErrorResult(exception);
        }
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var currentUserId = ChatService.GetUserId(User);
            var readAt = DateTime.UtcNow;
            await _chatService.MarkReadAsync(currentUserId, id, cancellationToken);
            await _hubContext.Clients.Group(ChatGroups.Conversation(id))
                .SendAsync("conversation:read", new
                {
                    conversation_id = id,
                    user_id = currentUserId,
                    read_at = readAt
                }, cancellationToken);
            return Ok(new { conversation_id = id, read_at = readAt });
        }
        catch (ChatOperationException exception)
        {
            return ToErrorResult(exception);
        }
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> UpdateGroup(Guid id, UpdateConversationRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var currentUserId = ChatService.GetUserId(User);
            var conversation = await _chatService.UpdateGroupAsync(currentUserId, id, request, cancellationToken);
            await NotifyConversationUpdatedAsync(id, cancellationToken);
            return Ok(conversation);
        }
        catch (ChatOperationException exception)
        {
            return ToErrorResult(exception);
        }
    }

    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> AddMembers(Guid id, AddMembersRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var currentUserId = ChatService.GetUserId(User);
            var conversation = await _chatService.AddMembersAsync(currentUserId, id, request, cancellationToken);
            await NotifyConversationCreatedAsync(id, conversation.Participants.Select(item => item.UserId), cancellationToken);
            return Ok(conversation);
        }
        catch (ChatOperationException exception)
        {
            return ToErrorResult(exception);
        }
    }

    [HttpDelete("{id:guid}/members/{memberId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid memberId, CancellationToken cancellationToken)
    {
        try
        {
            var currentUserId = ChatService.GetUserId(User);
            var conversation = await _chatService.RemoveMemberAsync(currentUserId, id, memberId, cancellationToken);
            await NotifyConversationUpdatedAsync(id, cancellationToken);
            await _hubContext.Clients.Group(ChatGroups.User(memberId))
                .SendAsync("conversation:removed", new { conversation_id = id }, cancellationToken);
            return Ok(conversation);
        }
        catch (ChatOperationException exception)
        {
            return ToErrorResult(exception);
        }
    }

    [HttpPost("{id:guid}/leave")]
    public async Task<IActionResult> LeaveGroup(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var currentUserId = ChatService.GetUserId(User);
            await _chatService.LeaveGroupAsync(currentUserId, id, cancellationToken);
            await NotifyConversationUpdatedAsync(id, cancellationToken);
            await _hubContext.Clients.Group(ChatGroups.User(currentUserId))
                .SendAsync("conversation:removed", new { conversation_id = id }, cancellationToken);
            return Ok(new { conversation_id = id, left = true });
        }
        catch (ChatOperationException exception)
        {
            return ToErrorResult(exception);
        }
    }

    private async Task NotifyConversationCreatedAsync(Guid conversationId, IEnumerable<Guid> userIds, CancellationToken cancellationToken)
    {
        foreach (var userId in userIds.Distinct())
        {
            var conversation = await _chatService.GetConversationAsync(conversationId, userId, cancellationToken);
            if (conversation is not null)
            {
                await _hubContext.Clients.Group(ChatGroups.User(userId))
                    .SendAsync("conversation:new", conversation, cancellationToken);
            }
        }
    }

    private async Task NotifyConversationUpdatedAsync(Guid conversationId, CancellationToken cancellationToken)
    {
        var participantIds = await _chatService.GetActiveParticipantIdsAsync(conversationId, cancellationToken);
        foreach (var userId in participantIds)
        {
            var conversation = await _chatService.GetConversationAsync(conversationId, userId, cancellationToken);
            if (conversation is not null)
            {
                await _hubContext.Clients.Group(ChatGroups.User(userId))
                    .SendAsync("conversation:updated", new
                    {
                        conversation_id = conversationId,
                        conversation
                    }, cancellationToken);
            }
        }
    }

    private static DateTime? ParseCursor(string? cursor)
    {
        if (string.IsNullOrWhiteSpace(cursor))
        {
            return null;
        }

        return DateTime.TryParse(
            cursor,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal,
            out var parsedCursor)
            ? parsedCursor
            : null;
    }

    private IActionResult ToErrorResult(ChatOperationException exception)
    {
        return exception.StatusCode switch
        {
            401 => Unauthorized(new { error = exception.Message }),
            403 => StatusCode(403, new { error = exception.Message }),
            404 => NotFound(new { error = exception.Message }),
            _ => StatusCode(exception.StatusCode, new { error = exception.Message })
        };
    }
}
