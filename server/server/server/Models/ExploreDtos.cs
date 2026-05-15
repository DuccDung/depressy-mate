using System.Text.Json.Serialization;

namespace server.Models;

public sealed class ExploreCategoryDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("slug")]
    public string Slug { get; init; } = string.Empty;

    [JsonPropertyName("category_type")]
    public string CategoryType { get; init; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; init; }

    [JsonPropertyName("display_order")]
    public int DisplayOrder { get; init; }

    [JsonPropertyName("contents")]
    public List<ExploreContentDto> Contents { get; init; } = [];
}

public sealed class ExploreContentDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; init; }

    [JsonPropertyName("category_id")]
    public Guid CategoryId { get; init; }

    [JsonPropertyName("title")]
    public string Title { get; init; } = string.Empty;

    [JsonPropertyName("slug")]
    public string Slug { get; init; } = string.Empty;

    [JsonPropertyName("subtitle")]
    public string? Subtitle { get; init; }

    [JsonPropertyName("summary")]
    public string? Summary { get; init; }

    [JsonPropertyName("content_type")]
    public string ContentType { get; init; } = string.Empty;

    [JsonPropertyName("thumbnail_url")]
    public string? ThumbnailUrl { get; init; }

    [JsonPropertyName("youtube_url")]
    public string? YoutubeUrl { get; init; }

    [JsonPropertyName("youtube_video_id")]
    public string? YoutubeVideoId { get; init; }

    [JsonPropertyName("badge_text")]
    public string? BadgeText { get; init; }

    [JsonPropertyName("badge_color")]
    public string? BadgeColor { get; init; }

    [JsonPropertyName("icon_name")]
    public string? IconName { get; init; }

    [JsonPropertyName("icon_color")]
    public string? IconColor { get; init; }

    [JsonPropertyName("icon_background_color")]
    public string? IconBackgroundColor { get; init; }

    [JsonPropertyName("content")]
    public string? Content { get; init; }

    [JsonPropertyName("is_featured")]
    public bool IsFeatured { get; init; }

    [JsonPropertyName("display_order")]
    public int DisplayOrder { get; init; }

    [JsonPropertyName("published_at")]
    public DateTime? PublishedAt { get; init; }
}
