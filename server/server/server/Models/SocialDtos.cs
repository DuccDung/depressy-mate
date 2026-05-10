using System.Text.Json.Serialization;

namespace server.Models;

public sealed class PostDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; init; }

    [JsonPropertyName("user_id")]
    public Guid UserId { get; init; }

    [JsonPropertyName("content")]
    public string? Content { get; init; }

    [JsonPropertyName("media_url")]
    public string? MediaUrl { get; init; }

    [JsonPropertyName("media_type")]
    public string? MediaType { get; init; }

    [JsonPropertyName("like_count")]
    public int LikeCount { get; init; }

    [JsonPropertyName("comment_count")]
    public int CommentCount { get; init; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; init; }

    [JsonPropertyName("author_name")]
    public string AuthorName { get; init; } = string.Empty;

    [JsonPropertyName("author_avatar")]
    public string? AuthorAvatar { get; init; }

    [JsonPropertyName("is_liked")]
    public bool IsLiked { get; init; }

    [JsonPropertyName("is_saved")]
    public bool IsSaved { get; init; }
}

public sealed class CommentDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; init; }

    [JsonPropertyName("post_id")]
    public Guid PostId { get; init; }

    [JsonPropertyName("user_id")]
    public Guid UserId { get; init; }

    [JsonPropertyName("parent_comment_id")]
    public Guid? ParentCommentId { get; init; }

    [JsonPropertyName("content")]
    public string Content { get; init; } = string.Empty;

    [JsonPropertyName("like_count")]
    public int LikeCount { get; init; }

    [JsonPropertyName("reply_count")]
    public int ReplyCount { get; init; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; init; }

    [JsonPropertyName("author_name")]
    public string AuthorName { get; init; } = string.Empty;

    [JsonPropertyName("author_avatar")]
    public string? AuthorAvatar { get; init; }

    [JsonPropertyName("is_liked")]
    public bool IsLiked { get; init; }

    [JsonPropertyName("replies")]
    public List<CommentDto> Replies { get; init; } = new();
}

public sealed class PagedPostsDto
{
    [JsonPropertyName("data")]
    public List<PostDto> Data { get; init; } = new();

    [JsonPropertyName("next_cursor")]
    public string? NextCursor { get; init; }

    [JsonPropertyName("has_more")]
    public bool HasMore { get; init; }
}

public sealed class PagedCommentsDto
{
    [JsonPropertyName("data")]
    public List<CommentDto> Data { get; init; } = new();

    [JsonPropertyName("next_cursor")]
    public string? NextCursor { get; init; }

    [JsonPropertyName("has_more")]
    public bool HasMore { get; init; }
}

public sealed class CreatePostRequest
{
    [JsonPropertyName("content")]
    public string? Content { get; init; }

    [JsonPropertyName("media_url")]
    public string? MediaUrl { get; init; }

    [JsonPropertyName("media_type")]
    public string? MediaType { get; init; }
}

public sealed class CreateCommentRequest
{
    [JsonPropertyName("content")]
    public string Content { get; init; } = string.Empty;

    [JsonPropertyName("parent_comment_id")]
    public Guid? ParentCommentId { get; init; }
}
