using System;

namespace server.Models;

public partial class ExploreContentView
{
    public Guid Id { get; set; }

    public Guid ContentId { get; set; }

    public Guid? UserId { get; set; }

    public DateTime ViewedAt { get; set; }

    public virtual ExploreContent Content { get; set; } = null!;

    public virtual User? User { get; set; }
}
