using System;

namespace server.Models;

public partial class SleepSession
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string? TrackId { get; set; }

    public string? TrackTitle { get; set; }

    public int DurationMs { get; set; }

    public int ListenedMs { get; set; }

    public bool Completed { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
