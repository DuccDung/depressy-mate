using System;
using System.Collections.Generic;

namespace server.Models;

public partial class ExploreCategory
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string CategoryType { get; set; } = null!;

    public string? Description { get; set; }

    public int DisplayOrder { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<ExploreContent> ExploreContents { get; set; } = new List<ExploreContent>();
}
