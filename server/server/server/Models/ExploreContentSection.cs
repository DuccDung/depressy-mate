using System;

namespace server.Models;

public partial class ExploreContentSection
{
    public Guid Id { get; set; }

    public Guid ContentId { get; set; }

    public string SectionType { get; set; } = null!;

    public string? Heading { get; set; }

    public string? Body { get; set; }

    public string? MediaUrl { get; set; }

    public int DisplayOrder { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ExploreContent Content { get; set; } = null!;
}
