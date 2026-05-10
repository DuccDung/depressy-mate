using System.Globalization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server.Services;

public sealed class ChatOperationException : Exception
{
    public ChatOperationException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }

    public int StatusCode { get; }
}

public class ChatService
{
    private const int MaxMessageLength = 4000;
    private const int MaxGroupNameLength = 255;

    private readonly DepressyMateContext _context;

    public ChatService(DepressyMateContext context)
    {
        _context = context;
    }

    public static Guid GetUserId(ClaimsPrincipal principal)
    {
        var rawId = principal.FindFirstValue("id") ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(rawId, out var userId))
        {
            throw new ChatOperationException(401, "Phiên đăng nhập không hợp lệ.");
        }

        return userId;
    }

    public async Task<List<ChatUserDto>> SearchUsersAsync(Guid currentUserId, string? query, int limit, CancellationToken cancellationToken)
    {
        var keyword = query?.Trim();
        if (string.IsNullOrWhiteSpace(keyword))
        {
            return new List<ChatUserDto>();
        }

        var safeLimit = Math.Clamp(limit, 5, 30);

        return await _context.Users
            .AsNoTracking()
            .Include(user => user.Profile)
            .Where(user => user.Id != currentUserId)
            .Where(user =>
                user.Email.Contains(keyword) ||
                (user.FullName != null && user.FullName.Contains(keyword)) ||
                (user.Profile != null && user.Profile.FullName.Contains(keyword)))
            .OrderBy(user => user.Profile != null ? user.Profile.FullName : user.FullName)
            .ThenBy(user => user.Email)
            .Take(safeLimit)
            .Select(user => new ChatUserDto
            {
                UserId = user.Id,
                Email = user.Email,
                FullName = user.Profile != null ? user.Profile.FullName : (user.FullName ?? user.Email),
                AvatarUrl = user.Profile != null ? user.Profile.AvatarUrl : user.AvatarUrl
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<ChatUserDto?> GetUserProfileAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await _context.Users
            .AsNoTracking()
            .Include(user => user.Profile)
            .Where(user => user.Id == userId)
            .Select(user => new ChatUserDto
            {
                UserId = user.Id,
                Email = user.Email,
                FullName = user.Profile != null ? user.Profile.FullName : (user.FullName ?? user.Email),
                AvatarUrl = user.Profile != null ? user.Profile.AvatarUrl : user.AvatarUrl
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<ConversationDto>> GetConversationsAsync(Guid currentUserId, CancellationToken cancellationToken)
    {
        var conversationIds = await _context.ConversationParticipants
            .AsNoTracking()
            .Where(participant => participant.UserId == currentUserId && participant.LeftAt == null)
            .Select(participant => participant.ConversationId)
            .ToListAsync(cancellationToken);

        var conversations = new List<ConversationDto>();
        foreach (var conversationId in conversationIds)
        {
            var conversation = await GetConversationAsync(conversationId, currentUserId, cancellationToken);
            if (conversation is not null)
            {
                conversations.Add(conversation);
            }
        }

        return conversations
            .OrderByDescending(item => item.LastMessageAt ?? item.UpdatedAt)
            .ThenByDescending(item => item.CreatedAt)
            .ToList();
    }

    public async Task<ConversationDto?> GetConversationAsync(Guid conversationId, Guid currentUserId, CancellationToken cancellationToken)
    {
        var isParticipant = await IsActiveParticipantAsync(conversationId, currentUserId, cancellationToken);
        if (!isParticipant)
        {
            return null;
        }

        var conversation = await _context.Conversations
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == conversationId, cancellationToken);

        return conversation is null
            ? null
            : await BuildConversationDtoAsync(conversation, currentUserId, cancellationToken);
    }

    public async Task<ConversationCreateResult> CreateDirectConversationAsync(Guid currentUserId, Guid participantId, CancellationToken cancellationToken)
    {
        if (currentUserId == participantId)
        {
            throw new ChatOperationException(400, "Không thể tự tạo cuộc trò chuyện với chính mình.");
        }

        var participantExists = await _context.Users.AnyAsync(user => user.Id == participantId, cancellationToken);
        if (!participantExists)
        {
            throw new ChatOperationException(404, "Không tìm thấy người dùng cần nhắn tin.");
        }

        var existingId = await _context.Conversations
            .Where(conversation => conversation.Type == "DIRECT")
            .Where(conversation =>
                conversation.ConversationParticipants.Count(participant => participant.LeftAt == null) == 2 &&
                conversation.ConversationParticipants.Any(participant => participant.UserId == currentUserId && participant.LeftAt == null) &&
                conversation.ConversationParticipants.Any(participant => participant.UserId == participantId && participant.LeftAt == null))
            .Select(conversation => conversation.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (existingId != Guid.Empty)
        {
            var existingConversation = await GetConversationAsync(existingId, currentUserId, cancellationToken)
                ?? throw new ChatOperationException(404, "Không tìm thấy cuộc trò chuyện.");
            return new ConversationCreateResult
            {
                Conversation = existingConversation,
                Existing = true
            };
        }

        var now = DateTime.UtcNow;
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            Type = "DIRECT",
            CreatedBy = currentUserId,
            CreatedAt = now,
            UpdatedAt = now
        };

        conversation.ConversationParticipants.Add(new ConversationParticipant
        {
            ConversationId = conversation.Id,
            UserId = currentUserId,
            Role = "MEMBER",
            JoinedAt = now,
            LastReadAt = now
        });

        conversation.ConversationParticipants.Add(new ConversationParticipant
        {
            ConversationId = conversation.Id,
            UserId = participantId,
            Role = "MEMBER",
            JoinedAt = now
        });

        _context.Conversations.Add(conversation);
        await _context.SaveChangesAsync(cancellationToken);

        var createdConversation = await GetConversationAsync(conversation.Id, currentUserId, cancellationToken)
            ?? throw new ChatOperationException(500, "Không thể tạo cuộc trò chuyện.");

        return new ConversationCreateResult
        {
            Conversation = createdConversation,
            Existing = false
        };
    }

    public async Task<ConversationCreateResult> CreateGroupConversationAsync(Guid currentUserId, GroupConversationRequest request, CancellationToken cancellationToken)
    {
        var name = NormalizeGroupName(request.Name);
        var participantIds = request.ParticipantIds
            .Where(id => id != Guid.Empty && id != currentUserId)
            .Distinct()
            .ToList();

        if (participantIds.Count < 2)
        {
            throw new ChatOperationException(400, "Nhóm cần ít nhất 2 thành viên khác.");
        }

        var existingUsers = await _context.Users
            .Where(user => participantIds.Contains(user.Id))
            .Select(user => user.Id)
            .ToListAsync(cancellationToken);

        if (existingUsers.Count != participantIds.Count)
        {
            throw new ChatOperationException(400, "Danh sách thành viên có người dùng không tồn tại.");
        }

        var now = DateTime.UtcNow;
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            Type = "GROUP",
            Name = name,
            AvatarUrl = NormalizeOptionalUrl(request.AvatarUrl),
            CreatedBy = currentUserId,
            CreatedAt = now,
            UpdatedAt = now
        };

        conversation.ConversationParticipants.Add(new ConversationParticipant
        {
            ConversationId = conversation.Id,
            UserId = currentUserId,
            Role = "OWNER",
            JoinedAt = now,
            LastReadAt = now
        });

        foreach (var participantId in participantIds)
        {
            conversation.ConversationParticipants.Add(new ConversationParticipant
            {
                ConversationId = conversation.Id,
                UserId = participantId,
                Role = "MEMBER",
                JoinedAt = now
            });
        }

        _context.Conversations.Add(conversation);
        await _context.SaveChangesAsync(cancellationToken);

        var createdConversation = await GetConversationAsync(conversation.Id, currentUserId, cancellationToken)
            ?? throw new ChatOperationException(500, "Không thể tạo nhóm.");

        return new ConversationCreateResult
        {
            Conversation = createdConversation,
            Existing = false
        };
    }

    public async Task<PagedMessagesDto> GetMessagesAsync(
        Guid currentUserId,
        Guid conversationId,
        DateTime? before,
        int limit,
        CancellationToken cancellationToken)
    {
        await EnsureActiveParticipantAsync(conversationId, currentUserId, cancellationToken);

        var safeLimit = Math.Clamp(limit, 10, 80);
        var query = _context.Messages
            .AsNoTracking()
            .Include(message => message.Sender)
            .ThenInclude(sender => sender.Profile)
            .Where(message => message.ConversationId == conversationId && message.DeletedAt == null);

        if (before.HasValue)
        {
            query = query.Where(message => message.CreatedAt < before.Value);
        }

        var rows = await query
            .OrderByDescending(message => message.CreatedAt)
            .Take(safeLimit + 1)
            .ToListAsync(cancellationToken);

        var hasMore = rows.Count > safeLimit;
        if (hasMore)
        {
            rows.RemoveAt(rows.Count - 1);
        }

        var orderedRows = rows.OrderBy(message => message.CreatedAt).ToList();

        return new PagedMessagesDto
        {
            Data = orderedRows.Select(MapMessageDto).ToList(),
            HasMore = hasMore,
            NextCursor = hasMore && orderedRows.Count > 0
                ? orderedRows.First().CreatedAt.ToString("O", CultureInfo.InvariantCulture)
                : null
        };
    }

    public async Task<MessageDto> SendMessageAsync(Guid currentUserId, Guid conversationId, string? content, CancellationToken cancellationToken)
    {
        var participant = await EnsureActiveParticipantAsync(conversationId, currentUserId, cancellationToken);
        var normalizedContent = NormalizeMessage(content);

        var conversation = await _context.Conversations
            .FirstOrDefaultAsync(item => item.Id == conversationId, cancellationToken)
            ?? throw new ChatOperationException(404, "Không tìm thấy cuộc trò chuyện.");

        var now = DateTime.UtcNow;
        var message = new Message
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderId = currentUserId,
            Content = normalizedContent,
            MessageType = "TEXT",
            IsRead = false,
            CreatedAt = now
        };

        participant.LastReadAt = now;
        conversation.UpdatedAt = now;
        conversation.LastMessageAt = now;

        _context.Messages.Add(message);
        await _context.SaveChangesAsync(cancellationToken);

        var savedMessage = await _context.Messages
            .AsNoTracking()
            .Include(item => item.Sender)
            .ThenInclude(sender => sender.Profile)
            .FirstAsync(item => item.Id == message.Id, cancellationToken);

        return MapMessageDto(savedMessage);
    }

    public async Task MarkReadAsync(Guid currentUserId, Guid conversationId, CancellationToken cancellationToken)
    {
        var participant = await EnsureActiveParticipantAsync(conversationId, currentUserId, cancellationToken);
        participant.LastReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<ConversationDto> UpdateGroupAsync(Guid currentUserId, Guid conversationId, UpdateConversationRequest request, CancellationToken cancellationToken)
    {
        var conversation = await EnsureGroupManagerAsync(currentUserId, conversationId, cancellationToken);

        if (request.Name is not null)
        {
            conversation.Name = NormalizeGroupName(request.Name);
        }

        if (request.AvatarUrl is not null)
        {
            conversation.AvatarUrl = NormalizeOptionalUrl(request.AvatarUrl);
        }

        conversation.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return await GetConversationAsync(conversationId, currentUserId, cancellationToken)
            ?? throw new ChatOperationException(404, "Không tìm thấy nhóm.");
    }

    public async Task<ConversationDto> AddMembersAsync(Guid currentUserId, Guid conversationId, AddMembersRequest request, CancellationToken cancellationToken)
    {
        var conversation = await EnsureGroupManagerAsync(currentUserId, conversationId, cancellationToken);
        var userIds = request.UserIds
            .Where(id => id != Guid.Empty && id != currentUserId)
            .Distinct()
            .ToList();

        if (userIds.Count == 0)
        {
            throw new ChatOperationException(400, "Vui lòng chọn thành viên cần thêm.");
        }

        var existingUsers = await _context.Users
            .Where(user => userIds.Contains(user.Id))
            .Select(user => user.Id)
            .ToListAsync(cancellationToken);

        if (existingUsers.Count != userIds.Count)
        {
            throw new ChatOperationException(400, "Danh sách thêm có người dùng không tồn tại.");
        }

        var currentParticipants = await _context.ConversationParticipants
            .Where(participant => participant.ConversationId == conversationId && userIds.Contains(participant.UserId))
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var userId in userIds)
        {
            var existingParticipant = currentParticipants.FirstOrDefault(participant => participant.UserId == userId);
            if (existingParticipant is null)
            {
                _context.ConversationParticipants.Add(new ConversationParticipant
                {
                    ConversationId = conversationId,
                    UserId = userId,
                    Role = "MEMBER",
                    JoinedAt = now
                });
            }
            else if (existingParticipant.LeftAt is not null)
            {
                existingParticipant.LeftAt = null;
                existingParticipant.JoinedAt = now;
                existingParticipant.LastReadAt = null;
                existingParticipant.Role = "MEMBER";
            }
        }

        conversation.UpdatedAt = now;
        await _context.SaveChangesAsync(cancellationToken);

        return await GetConversationAsync(conversationId, currentUserId, cancellationToken)
            ?? throw new ChatOperationException(404, "Không tìm thấy nhóm.");
    }

    public async Task<ConversationDto> RemoveMemberAsync(Guid currentUserId, Guid conversationId, Guid memberId, CancellationToken cancellationToken)
    {
        await EnsureGroupManagerAsync(currentUserId, conversationId, cancellationToken);

        if (currentUserId == memberId)
        {
            throw new ChatOperationException(400, "Hãy dùng chức năng rời nhóm để tự rời khỏi nhóm.");
        }

        var participant = await _context.ConversationParticipants
            .FirstOrDefaultAsync(item => item.ConversationId == conversationId && item.UserId == memberId && item.LeftAt == null, cancellationToken)
            ?? throw new ChatOperationException(404, "Thành viên không còn trong nhóm.");

        if (participant.Role == "OWNER")
        {
            throw new ChatOperationException(400, "Không thể xóa chủ nhóm.");
        }

        participant.LeftAt = DateTime.UtcNow;
        await TouchConversationAsync(conversationId, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetConversationAsync(conversationId, currentUserId, cancellationToken)
            ?? throw new ChatOperationException(404, "Không tìm thấy nhóm.");
    }

    public async Task LeaveGroupAsync(Guid currentUserId, Guid conversationId, CancellationToken cancellationToken)
    {
        var conversation = await _context.Conversations
            .FirstOrDefaultAsync(item => item.Id == conversationId, cancellationToken)
            ?? throw new ChatOperationException(404, "Không tìm thấy nhóm.");

        if (conversation.Type != "GROUP")
        {
            throw new ChatOperationException(400, "Cuộc trò chuyện 1-1 không hỗ trợ rời nhóm.");
        }

        var participants = await _context.ConversationParticipants
            .Where(item => item.ConversationId == conversationId && item.LeftAt == null)
            .OrderBy(item => item.JoinedAt)
            .ToListAsync(cancellationToken);

        var currentParticipant = participants.FirstOrDefault(item => item.UserId == currentUserId)
            ?? throw new ChatOperationException(403, "Bạn không thuộc nhóm này.");

        if (currentParticipant.Role == "OWNER")
        {
            var nextOwner = participants.FirstOrDefault(item => item.UserId != currentUserId);
            if (nextOwner is not null)
            {
                nextOwner.Role = "OWNER";
            }
        }

        currentParticipant.LeftAt = DateTime.UtcNow;
        conversation.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> IsActiveParticipantAsync(Guid conversationId, Guid userId, CancellationToken cancellationToken)
    {
        return await _context.ConversationParticipants
            .AsNoTracking()
            .AnyAsync(participant =>
                participant.ConversationId == conversationId &&
                participant.UserId == userId &&
                participant.LeftAt == null,
                cancellationToken);
    }

    public async Task<List<Guid>> GetActiveConversationIdsAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await _context.ConversationParticipants
            .AsNoTracking()
            .Where(participant => participant.UserId == userId && participant.LeftAt == null)
            .Select(participant => participant.ConversationId)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<Guid>> GetActiveParticipantIdsAsync(Guid conversationId, CancellationToken cancellationToken)
    {
        return await _context.ConversationParticipants
            .AsNoTracking()
            .Where(participant => participant.ConversationId == conversationId && participant.LeftAt == null)
            .Select(participant => participant.UserId)
            .ToListAsync(cancellationToken);
    }

    private async Task<ConversationDto> BuildConversationDtoAsync(Conversation conversation, Guid currentUserId, CancellationToken cancellationToken)
    {
        var participants = await _context.ConversationParticipants
            .AsNoTracking()
            .Include(participant => participant.User)
            .ThenInclude(user => user.Profile)
            .Where(participant => participant.ConversationId == conversation.Id && participant.LeftAt == null)
            .OrderBy(participant => participant.UserId == currentUserId)
            .ThenBy(participant => participant.JoinedAt)
            .ToListAsync(cancellationToken);

        var currentParticipant = participants.FirstOrDefault(participant => participant.UserId == currentUserId);
        var lastReadAt = currentParticipant?.LastReadAt ?? DateTime.MinValue;

        var lastMessage = await _context.Messages
            .AsNoTracking()
            .Where(message => message.ConversationId == conversation.Id && message.DeletedAt == null)
            .OrderByDescending(message => message.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var unreadCount = await _context.Messages
            .AsNoTracking()
            .CountAsync(message =>
                message.ConversationId == conversation.Id &&
                message.DeletedAt == null &&
                message.SenderId != currentUserId &&
                message.CreatedAt > lastReadAt,
                cancellationToken);

        var participantDtos = participants.Select(participant => new ConversationParticipantDto
        {
            UserId = participant.UserId,
            Email = participant.User.Email,
            FullName = GetDisplayName(participant.User),
            AvatarUrl = GetAvatarUrl(participant.User),
            Role = participant.Role,
            JoinedAt = participant.JoinedAt,
            LastReadAt = participant.LastReadAt
        }).ToList();

        var otherParticipant = participantDtos.FirstOrDefault(participant => participant.UserId != currentUserId);
        var displayName = conversation.Type == "DIRECT"
            ? otherParticipant?.FullName ?? "Cuộc trò chuyện"
            : conversation.Name ?? BuildFallbackGroupName(participantDtos, currentUserId);

        var displayAvatarUrl = conversation.Type == "DIRECT"
            ? otherParticipant?.AvatarUrl
            : conversation.AvatarUrl;

        return new ConversationDto
        {
            Id = conversation.Id,
            Type = conversation.Type,
            Name = conversation.Name,
            AvatarUrl = conversation.AvatarUrl,
            DisplayName = displayName,
            DisplayAvatarUrl = displayAvatarUrl,
            CreatedAt = conversation.CreatedAt,
            UpdatedAt = conversation.UpdatedAt,
            LastMessageContent = lastMessage?.Content,
            LastMessageAt = lastMessage?.CreatedAt ?? conversation.LastMessageAt,
            LastMessageSenderId = lastMessage?.SenderId,
            LastMessageType = lastMessage?.MessageType,
            UnreadCount = unreadCount,
            ParticipantCount = participantDtos.Count,
            Participants = participantDtos
        };
    }

    private async Task<ConversationParticipant> EnsureActiveParticipantAsync(Guid conversationId, Guid userId, CancellationToken cancellationToken)
    {
        return await _context.ConversationParticipants
            .FirstOrDefaultAsync(participant =>
                participant.ConversationId == conversationId &&
                participant.UserId == userId &&
                participant.LeftAt == null,
                cancellationToken)
            ?? throw new ChatOperationException(403, "Bạn không có quyền truy cập cuộc trò chuyện này.");
    }

    private async Task<Conversation> EnsureGroupManagerAsync(Guid currentUserId, Guid conversationId, CancellationToken cancellationToken)
    {
        var conversation = await _context.Conversations
            .FirstOrDefaultAsync(item => item.Id == conversationId, cancellationToken)
            ?? throw new ChatOperationException(404, "Không tìm thấy nhóm.");

        if (conversation.Type != "GROUP")
        {
            throw new ChatOperationException(400, "Chức năng này chỉ dùng cho nhóm chat.");
        }

        var participant = await EnsureActiveParticipantAsync(conversationId, currentUserId, cancellationToken);
        if (participant.Role is not ("OWNER" or "ADMIN"))
        {
            throw new ChatOperationException(403, "Bạn không có quyền quản lý nhóm.");
        }

        return conversation;
    }

    private async Task TouchConversationAsync(Guid conversationId, CancellationToken cancellationToken)
    {
        var conversation = await _context.Conversations.FirstOrDefaultAsync(item => item.Id == conversationId, cancellationToken);
        if (conversation is not null)
        {
            conversation.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static MessageDto MapMessageDto(Message message)
    {
        return new MessageDto
        {
            Id = message.Id,
            ConversationId = message.ConversationId,
            SenderId = message.SenderId,
            SenderName = GetDisplayName(message.Sender),
            SenderAvatar = GetAvatarUrl(message.Sender),
            Content = message.Content,
            MessageType = message.MessageType,
            MediaUrl = message.MediaUrl,
            IsRead = message.IsRead,
            CreatedAt = message.CreatedAt,
            EditedAt = message.EditedAt
        };
    }

    private static string GetDisplayName(User user)
    {
        return user.Profile?.FullName ?? user.FullName ?? user.Email;
    }

    private static string? GetAvatarUrl(User user)
    {
        return user.Profile?.AvatarUrl ?? user.AvatarUrl;
    }

    private static string BuildFallbackGroupName(List<ConversationParticipantDto> participants, Guid currentUserId)
    {
        var names = participants
            .Where(participant => participant.UserId != currentUserId)
            .Take(3)
            .Select(participant => participant.FullName)
            .ToList();

        return names.Count == 0 ? "Nhóm chat" : string.Join(", ", names);
    }

    private static string NormalizeGroupName(string? name)
    {
        var normalizedName = name?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedName))
        {
            throw new ChatOperationException(400, "Tên nhóm là bắt buộc.");
        }

        if (normalizedName.Length > MaxGroupNameLength)
        {
            throw new ChatOperationException(400, $"Tên nhóm không được vượt quá {MaxGroupNameLength} ký tự.");
        }

        return normalizedName;
    }

    private static string? NormalizeOptionalUrl(string? url)
    {
        var normalizedUrl = url?.Trim();
        return string.IsNullOrWhiteSpace(normalizedUrl) ? null : normalizedUrl;
    }

    private static string NormalizeMessage(string? content)
    {
        var normalizedContent = content?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedContent))
        {
            throw new ChatOperationException(400, "Tin nhắn không được để trống.");
        }

        if (normalizedContent.Length > MaxMessageLength)
        {
            throw new ChatOperationException(400, $"Tin nhắn không được vượt quá {MaxMessageLength} ký tự.");
        }

        return normalizedContent;
    }
}
