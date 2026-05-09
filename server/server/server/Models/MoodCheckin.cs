using System;
using System.Collections.Generic;

namespace server.Models;

public partial class MoodCheckin
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string Mood { get; set; } = null!;

    public string? Note { get; set; }

    public string? ImageUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
