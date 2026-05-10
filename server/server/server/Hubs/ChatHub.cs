using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using server.Models;
using server.Services;

namespace server.Hubs;

[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class ChatHub : Hub
{
    private readonly ChatService _chatService;
    private readonly PushNotificationService _pushNotificationService;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(
        ChatService chatService,
        PushNotificationService pushNotificationService,
        ILogger<ChatHub> logger)
    {
        _chatService = chatService;
        _pushNotificationService = pushNotificationService;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetCurrentUserId();
        await Groups.AddToGroupAsync(Context.ConnectionId, ChatGroups.User(userId), Context.ConnectionAborted);

        var conversationIds = await _chatService.GetActiveConversationIdsAsync(userId, Context.ConnectionAborted);
        foreach (var conversationId in conversationIds)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, ChatGroups.Conversation(conversationId), Context.ConnectionAborted);
        }

        await base.OnConnectedAsync();
    }

    public async Task JoinConversation(string conversationId)
    {
        var userId = GetCurrentUserId();
        var parsedConversationId = ParseConversationId(conversationId);

        var isParticipant = await _chatService.IsActiveParticipantAsync(parsedConversationId, userId, Context.ConnectionAborted);
        if (!isParticipant)
        {
            throw new HubException("Bạn không có quyền tham gia phòng chat này.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, ChatGroups.Conversation(parsedConversationId), Context.ConnectionAborted);
    }

    public async Task<MessageDto> SendMessage(string conversationId, string content)
    {
        var userId = GetCurrentUserId();
        var parsedConversationId = ParseConversationId(conversationId);

        try
        {
            var message = await _chatService.SendMessageAsync(userId, parsedConversationId, content, Context.ConnectionAborted);
            await Clients.OthersInGroup(ChatGroups.Conversation(parsedConversationId))
                .SendAsync("message:new", message, Context.ConnectionAborted);

            await Clients.Group(ChatGroups.Conversation(parsedConversationId))
                .SendAsync("conversation:updated", new
                {
                    conversation_id = parsedConversationId,
                    message
                }, Context.ConnectionAborted);

            await _pushNotificationService.SendChatMessageNotificationAsync(message, Context.ConnectionAborted);

            return message;
        }
        catch (ChatOperationException exception)
        {
            throw new HubException(exception.Message);
        }
    }

    public async Task MarkConversationRead(string conversationId)
    {
        var userId = GetCurrentUserId();
        var parsedConversationId = ParseConversationId(conversationId);
        var readAt = DateTime.UtcNow;

        try
        {
            await _chatService.MarkReadAsync(userId, parsedConversationId, Context.ConnectionAborted);
            await Clients.OthersInGroup(ChatGroups.Conversation(parsedConversationId))
                .SendAsync("conversation:read", new
                {
                    conversation_id = parsedConversationId,
                    user_id = userId,
                    read_at = readAt
                }, Context.ConnectionAborted);
        }
        catch (ChatOperationException exception)
        {
            throw new HubException(exception.Message);
        }
    }

    public async Task SetTyping(string conversationId, bool isTyping)
    {
        var userId = GetCurrentUserId();
        var parsedConversationId = ParseConversationId(conversationId);

        var isParticipant = await _chatService.IsActiveParticipantAsync(parsedConversationId, userId, Context.ConnectionAborted);
        if (!isParticipant)
        {
            throw new HubException("Bạn không có quyền gửi trạng thái nhập tin nhắn.");
        }

        await Clients.OthersInGroup(ChatGroups.Conversation(parsedConversationId))
            .SendAsync("typing:update", new
            {
                conversation_id = parsedConversationId,
                user_id = userId,
                is_typing = isTyping
            }, Context.ConnectionAborted);
    }

    private Guid GetCurrentUserId()
    {
        try
        {
            return ChatService.GetUserId(Context.User!);
        }
        catch (ChatOperationException exception)
        {
            _logger.LogWarning("Rejected chat hub call because user id is invalid: {Message}", exception.Message);
            throw new HubException(exception.Message);
        }
    }

    private static Guid ParseConversationId(string conversationId)
    {
        if (!Guid.TryParse(conversationId, out var parsedConversationId))
        {
            throw new HubException("Mã cuộc trò chuyện không hợp lệ.");
        }

        return parsedConversationId;
    }
}
