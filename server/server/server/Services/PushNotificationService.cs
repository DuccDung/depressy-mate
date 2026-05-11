using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server.Services;

public class PushNotificationService
{
    private const int FcmBatchSize = 500;

    private readonly DepressyMateContext _context;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<PushNotificationService> _logger;
    private readonly Lazy<FirebaseMessaging?> _messaging;

    public PushNotificationService(
        DepressyMateContext context,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<PushNotificationService> logger)
    {
        _context = context;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
        _messaging = new Lazy<FirebaseMessaging?>(CreateFirebaseMessaging);
    }

    public async Task SendChatMessageNotificationAsync(
        MessageDto message,
        CancellationToken cancellationToken)
    {
        var messaging = _messaging.Value;
        if (messaging is null)
        {
            return;
        }

        var recipients = await _context.ConversationParticipants
            .AsNoTracking()
            .Where(participant =>
                participant.ConversationId == message.ConversationId &&
                participant.UserId != message.SenderId &&
                participant.LeftAt == null)
            .Select(participant => participant.UserId)
            .ToListAsync(cancellationToken);

        if (recipients.Count == 0)
        {
            return;
        }

        var tokens = await _context.UserPushTokens
            .AsNoTracking()
            .Where(token =>
                recipients.Contains(token.UserId) &&
                token.Provider == "firebase" &&
                token.IsActive &&
                token.PushToken != null)
            .Select(token => token.PushToken!)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (tokens.Count == 0)
        {
            return;
        }

        var conversation = await _context.Conversations
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == message.ConversationId, cancellationToken);

        var title = conversation?.Type == "GROUP" && !string.IsNullOrWhiteSpace(conversation.Name)
            ? $"{message.SenderName} trong {conversation.Name}"
            : message.SenderName;

        var body = TrimNotificationBody(message.Content);
        foreach (var batch in tokens.Chunk(FcmBatchSize))
        {
            await SendBatchAsync(
                messaging,
                batch.ToList(),
                title,
                body,
                new Dictionary<string, string>
                {
                    ["type"] = "chat_message",
                    ["conversationId"] = message.ConversationId.ToString(),
                    ["messageId"] = message.Id.ToString(),
                    ["senderId"] = message.SenderId.ToString()
                },
                "chat notification",
                cancellationToken);
        }
    }

    public Task SendConversationCreatedNotificationAsync(
        ConversationDto conversation,
        Guid actorUserId,
        IReadOnlyCollection<Guid> recipientUserIds,
        CancellationToken cancellationToken)
    {
        var actorName = GetParticipantName(conversation, actorUserId) ?? "Depressy Mate";
        var isGroup = string.Equals(conversation.Type, "GROUP", StringComparison.OrdinalIgnoreCase);
        var title = isGroup ? conversation.DisplayName : actorName;
        var body = isGroup
            ? $"{actorName} đã thêm bạn vào nhóm."
            : $"{actorName} đã bắt đầu cuộc trò chuyện với bạn.";

        return SendConversationEventNotificationAsync(
            conversation.Id,
            actorUserId,
            recipientUserIds,
            "conversation_created",
            title,
            body,
            cancellationToken);
    }

    public Task SendGroupMembersAddedNotificationAsync(
        ConversationDto conversation,
        Guid actorUserId,
        IReadOnlyCollection<Guid> recipientUserIds,
        CancellationToken cancellationToken)
    {
        var actorName = GetParticipantName(conversation, actorUserId) ?? "Một thành viên";
        return SendConversationEventNotificationAsync(
            conversation.Id,
            actorUserId,
            recipientUserIds,
            "group_members_added",
            conversation.DisplayName,
            $"{actorName} đã thêm bạn vào nhóm.",
            cancellationToken);
    }

    public Task SendConversationUpdatedNotificationAsync(
        ConversationDto conversation,
        Guid actorUserId,
        IReadOnlyCollection<Guid> recipientUserIds,
        CancellationToken cancellationToken)
    {
        var actorName = GetParticipantName(conversation, actorUserId) ?? "Một thành viên";
        return SendConversationEventNotificationAsync(
            conversation.Id,
            actorUserId,
            recipientUserIds,
            "conversation_updated",
            conversation.DisplayName,
            $"{actorName} đã cập nhật thông tin nhóm.",
            cancellationToken);
    }

    public Task SendConversationRemovedNotificationAsync(
        Guid conversationId,
        string conversationName,
        Guid actorUserId,
        IReadOnlyCollection<Guid> recipientUserIds,
        string body,
        CancellationToken cancellationToken)
    {
        return SendConversationEventNotificationAsync(
            conversationId,
            actorUserId,
            recipientUserIds,
            "conversation_removed",
            conversationName,
            body,
            cancellationToken);
    }

    public Task SendGroupMemberLeftNotificationAsync(
        ConversationDto conversation,
        Guid actorUserId,
        IReadOnlyCollection<Guid> recipientUserIds,
        CancellationToken cancellationToken)
    {
        var actorName = GetParticipantName(conversation, actorUserId) ?? "Một thành viên";
        return SendConversationEventNotificationAsync(
            conversation.Id,
            actorUserId,
            recipientUserIds,
            "group_member_left",
            conversation.DisplayName,
            $"{actorName} đã rời nhóm.",
            cancellationToken);
    }

    public async Task<PushNotificationSendResult> SendAdminNotificationAsync(
        string title,
        string body,
        bool sendToAll,
        IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken)
    {
        var messaging = _messaging.Value;
        if (messaging is null)
        {
            return new PushNotificationSendResult
            {
                IsFirebaseConfigured = false
            };
        }

        var normalizedTitle = NormalizeNotificationTitle(title);
        var normalizedBody = TrimNotificationBody(body);
        var distinctUserIds = userIds
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        if (!sendToAll && distinctUserIds.Count == 0)
        {
            return new PushNotificationSendResult
            {
                IsFirebaseConfigured = true
            };
        }

        var tokenQuery = _context.UserPushTokens
            .AsNoTracking()
            .Where(token =>
                token.Provider == "firebase" &&
                token.IsActive &&
                token.PushToken != null);

        if (!sendToAll)
        {
            tokenQuery = tokenQuery.Where(token => distinctUserIds.Contains(token.UserId));
        }

        var tokenRows = await tokenQuery
            .Select(token => new
            {
                token.UserId,
                Token = token.PushToken!
            })
            .Distinct()
            .ToListAsync(cancellationToken);

        var tokens = tokenRows
            .Select(token => token.Token)
            .Distinct()
            .ToList();

        var result = new PushNotificationSendResult
        {
            IsFirebaseConfigured = true,
            TargetUserCount = tokenRows.Select(token => token.UserId).Distinct().Count(),
            TokenCount = tokens.Count
        };

        foreach (var batch in tokens.Chunk(FcmBatchSize))
        {
            var batchResult = await SendBatchAsync(
                messaging,
                batch.ToList(),
                normalizedTitle,
                normalizedBody,
                new Dictionary<string, string>
                {
                    ["type"] = "admin_notification",
                    ["source"] = "admin"
                },
                "admin notification",
                cancellationToken);

            result.SuccessCount += batchResult.SuccessCount;
            result.FailureCount += batchResult.FailureCount;
            result.InvalidTokenCount += batchResult.InvalidTokenCount;
        }

        return result;
    }

    private async Task SendConversationEventNotificationAsync(
        Guid conversationId,
        Guid actorUserId,
        IReadOnlyCollection<Guid> recipientUserIds,
        string eventName,
        string title,
        string body,
        CancellationToken cancellationToken)
    {
        var messaging = _messaging.Value;
        if (messaging is null)
        {
            return;
        }

        var targetUserIds = recipientUserIds
            .Where(userId => userId != Guid.Empty && userId != actorUserId)
            .Distinct()
            .ToList();

        if (targetUserIds.Count == 0)
        {
            return;
        }

        var tokens = await _context.UserPushTokens
            .AsNoTracking()
            .Where(token =>
                targetUserIds.Contains(token.UserId) &&
                token.Provider == "firebase" &&
                token.IsActive &&
                token.PushToken != null)
            .Select(token => token.PushToken!)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (tokens.Count == 0)
        {
            return;
        }

        foreach (var batch in tokens.Chunk(FcmBatchSize))
        {
            await SendBatchAsync(
                messaging,
                batch.ToList(),
                NormalizeNotificationTitle(title),
                TrimNotificationBody(body),
                new Dictionary<string, string>
                {
                    ["type"] = "conversation_event",
                    ["event"] = eventName,
                    ["conversationId"] = conversationId.ToString(),
                    ["actorId"] = actorUserId.ToString()
                },
                $"conversation {eventName} notification",
                cancellationToken);
        }
    }

    private async Task<PushNotificationBatchResult> SendBatchAsync(
        FirebaseMessaging messaging,
        List<string> tokens,
        string title,
        string body,
        IReadOnlyDictionary<string, string> data,
        string logContext,
        CancellationToken cancellationToken)
    {
        var multicast = new MulticastMessage
        {
            Tokens = tokens,
            Notification = new Notification
            {
                Title = title,
                Body = body
            },
            Data = new Dictionary<string, string>(data),
            Android = new AndroidConfig
            {
                Priority = Priority.High
            }
        };

        try
        {
            var response = await messaging.SendEachForMulticastAsync(multicast, cancellationToken);
            var invalidTokenCount = 0;
            if (response.FailureCount > 0)
            {
                invalidTokenCount = await DeactivateInvalidTokensAsync(tokens, response, cancellationToken);
            }

            return new PushNotificationBatchResult
            {
                SuccessCount = response.SuccessCount,
                FailureCount = response.FailureCount,
                InvalidTokenCount = invalidTokenCount
            };
        }
        catch (FirebaseMessagingException exception)
        {
            _logger.LogWarning(exception, "Could not send FCM {LogContext} batch.", logContext);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Unexpected FCM {LogContext} error.", logContext);
        }

        return new PushNotificationBatchResult
        {
            FailureCount = tokens.Count
        };
    }

    private async Task<int> DeactivateInvalidTokensAsync(
        List<string> tokens,
        BatchResponse response,
        CancellationToken cancellationToken)
    {
        var invalidTokens = new List<string>();
        for (var index = 0; index < response.Responses.Count; index++)
        {
            var sendResponse = response.Responses[index];
            var errorCode = sendResponse.Exception?.MessagingErrorCode;
            if (errorCode is MessagingErrorCode.Unregistered or MessagingErrorCode.InvalidArgument)
            {
                invalidTokens.Add(tokens[index]);
            }
        }

        if (invalidTokens.Count == 0)
        {
            return 0;
        }

        await _context.UserPushTokens
            .Where(token => token.PushToken != null && invalidTokens.Contains(token.PushToken))
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(token => token.IsActive, false)
                    .SetProperty(token => token.UpdatedAt, DateTime.UtcNow),
                cancellationToken);

        return invalidTokens.Count;
    }

    private FirebaseMessaging? CreateFirebaseMessaging()
    {
        var serviceAccountPath =
            _configuration["Firebase:ServiceAccountPath"] ??
            _configuration["Firebase__ServiceAccountPath"] ??
            Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS");

        if (string.IsNullOrWhiteSpace(serviceAccountPath))
        {
            _logger.LogWarning("Firebase service account is not configured; push notifications are disabled.");
            return null;
        }

        if (!Path.IsPathRooted(serviceAccountPath))
        {
            serviceAccountPath = Path.Combine(_environment.ContentRootPath, serviceAccountPath);
        }

        if (!File.Exists(serviceAccountPath))
        {
            _logger.LogWarning(
                "Firebase service account file does not exist at {ServiceAccountPath}; push notifications are disabled.",
                serviceAccountPath);
            return null;
        }

        var appName = $"depressy-mate-{Path.GetFullPath(serviceAccountPath).GetHashCode():x}";
        FirebaseApp? app;
        try
        {
            app = FirebaseApp.GetInstance(appName);
        }
        catch (ArgumentException)
        {
            app = null;
        }

        app ??= FirebaseApp.Create(new AppOptions
        {
            Credential = CredentialFactory
                .FromFile(serviceAccountPath, JsonCredentialParameters.ServiceAccountCredentialType)
        }, appName);

        return FirebaseMessaging.GetMessaging(app);
    }

    private static string TrimNotificationBody(string content)
    {
        var normalized = string.IsNullOrWhiteSpace(content) ? "Bạn có thông báo mới." : content.Trim();
        return normalized.Length <= 120 ? normalized : $"{normalized[..117]}...";
    }

    private static string NormalizeNotificationTitle(string title)
    {
        var normalized = string.IsNullOrWhiteSpace(title) ? "Depressy Mate" : title.Trim();
        return normalized.Length <= 80 ? normalized : normalized[..80];
    }

    private static string? GetParticipantName(ConversationDto conversation, Guid userId)
    {
        return conversation.Participants
            .FirstOrDefault(participant => participant.UserId == userId)
            ?.FullName;
    }
}

public sealed class PushNotificationSendResult
{
    public bool IsFirebaseConfigured { get; init; }

    public int TargetUserCount { get; init; }

    public int TokenCount { get; init; }

    public int SuccessCount { get; set; }

    public int FailureCount { get; set; }

    public int InvalidTokenCount { get; set; }
}

internal sealed class PushNotificationBatchResult
{
    public int SuccessCount { get; init; }

    public int FailureCount { get; init; }

    public int InvalidTokenCount { get; init; }
}
