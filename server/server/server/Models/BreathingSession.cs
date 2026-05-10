using System;

namespace server.Models;

public partial class BreathingSession
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public int DurationSeconds { get; set; }

    public int CyclesCompleted { get; set; }

    public int TotalCycles { get; set; }

    public bool Completed { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
