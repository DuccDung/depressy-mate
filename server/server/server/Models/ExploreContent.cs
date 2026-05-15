using System;
using System.Collections.Generic;

namespace server.Models;

public partial class ExploreContent
{
    public Guid Id { get; set; }

    public Guid CategoryId { get; set; }

    public string Title { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string? Subtitle { get; set; }

    public string? Summary { get; set; }

    public string ContentType { get; set; } = null!;

    public string? ThumbnailUrl { get; set; }

    public string? YoutubeUrl { get; set; }

    public string? YoutubeVideoId { get; set; }

    public string? BadgeText { get; set; }

    public string? BadgeColor { get; set; }

    public string? IconName { get; set; }

    public string? IconColor { get; set; }

    public string? IconBackgroundColor { get; set; }

    public string? Content { get; set; }

    public Guid CreatedBy { get; set; }

    public Guid? UpdatedBy { get; set; }

    public string Status { get; set; } = null!;

    public DateTime? PublishedAt { get; set; }

    public int DisplayOrder { get; set; }

    public bool IsFeatured { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ExploreCategory Category { get; set; } = null!;

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual User? UpdatedByNavigation { get; set; }

    public virtual ICollection<ExploreContentSection> ExploreContentSections { get; set; } = new List<ExploreContentSection>();

    public virtual ICollection<ExploreContentView> ExploreContentViews { get; set; } = new List<ExploreContentView>();
}
