using System;
using System.Collections.Generic;

namespace server.Models;

public partial class Journal
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string? Title { get; set; }

    public string? Content { get; set; }

    public string? AudioUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
