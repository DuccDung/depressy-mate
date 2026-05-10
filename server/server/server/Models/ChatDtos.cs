using System.Text.Json.Serialization;

namespace server.Models;

public sealed class ChatUserDto
{
    [JsonPropertyName("user_id")]
    public Guid UserId { get; init; }

    [JsonPropertyName("email")]
    public string Email { get; init; } = string.Empty;

    [JsonPropertyName("full_name")]
    public string FullName { get; init; } = string.Empty;

    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; init; }
}

public sealed class ConversationParticipantDto
{
    [JsonPropertyName("user_id")]
    public Guid UserId { get; init; }

    [JsonPropertyName("email")]
    public string Email { get; init; } = string.Empty;

    [JsonPropertyName("full_name")]
    public string FullName { get; init; } = string.Empty;

    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; init; }

    [JsonPropertyName("role")]
    public string Role { get; init; } = "MEMBER";

    [JsonPropertyName("joined_at")]
    public DateTime JoinedAt { get; init; }

    [JsonPropertyName("last_read_at")]
    public DateTime? LastReadAt { get; init; }
}

public sealed class ConversationDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; init; }

    [JsonPropertyName("type")]
    public string Type { get; init; } = "DIRECT";

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; init; }

    [JsonPropertyName("display_name")]
    public string DisplayName { get; init; } = string.Empty;

    [JsonPropertyName("display_avatar_url")]
    public string? DisplayAvatarUrl { get; init; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; init; }

    [JsonPropertyName("last_message_content")]
    public string? LastMessageContent { get; init; }

    [JsonPropertyName("last_message_at")]
    public DateTime? LastMessageAt { get; init; }

    [JsonPropertyName("last_message_sender_id")]
    public Guid? LastMessageSenderId { get; init; }

    [JsonPropertyName("last_message_type")]
    public string? LastMessageType { get; init; }

    [JsonPropertyName("unread_count")]
    public int UnreadCount { get; init; }

    [JsonPropertyName("participant_count")]
    public int ParticipantCount { get; init; }

    [JsonPropertyName("participants")]
    public List<ConversationParticipantDto> Participants { get; init; } = new();
}

public sealed class MessageDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; init; }

    [JsonPropertyName("conversation_id")]
    public Guid ConversationId { get; init; }

    [JsonPropertyName("sender_id")]
    public Guid SenderId { get; init; }

    [JsonPropertyName("sender_name")]
    public string SenderName { get; init; } = string.Empty;

    [JsonPropertyName("sender_avatar")]
    public string? SenderAvatar { get; init; }

    [JsonPropertyName("content")]
    public string Content { get; init; } = string.Empty;

    [JsonPropertyName("message_type")]
    public string MessageType { get; init; } = "TEXT";

    [JsonPropertyName("media_url")]
    public string? MediaUrl { get; init; }

    [JsonPropertyName("is_read")]
    public bool IsRead { get; init; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("edited_at")]
    public DateTime? EditedAt { get; init; }
}

public sealed class PagedMessagesDto
{
    [JsonPropertyName("data")]
    public List<MessageDto> Data { get; init; } = new();

    [JsonPropertyName("next_cursor")]
    public string? NextCursor { get; init; }

    [JsonPropertyName("has_more")]
    public bool HasMore { get; init; }
}

public sealed class DirectConversationRequest
{
    [JsonPropertyName("participant_id")]
    public Guid ParticipantId { get; init; }
}

public sealed class GroupConversationRequest
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("participant_ids")]
    public List<Guid> ParticipantIds { get; init; } = new();

    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; init; }
}

public sealed class SendMessageRequest
{
    [JsonPropertyName("content")]
    public string Content { get; init; } = string.Empty;
}

public sealed class UpdateConversationRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; init; }
}

public sealed class AddMembersRequest
{
    [JsonPropertyName("user_ids")]
    public List<Guid> UserIds { get; init; } = new();
}

public sealed class ConversationCreateResult
{
    [JsonPropertyName("conversation")]
    public ConversationDto Conversation { get; init; } = new();

    [JsonPropertyName("id")]
    public Guid Id => Conversation.Id;

    [JsonPropertyName("existing")]
    public bool Existing { get; init; }
}
