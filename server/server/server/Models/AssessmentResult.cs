using System;
using System.Collections.Generic;

namespace server.Models;

public partial class AssessmentResult
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string AssessmentCode { get; set; } = null!;

    public string RawScores { get; set; } = null!;

    public string FinalScores { get; set; } = null!;

    public string Classifications { get; set; } = null!;

    public int OverallSeverity { get; set; }

    public bool IsRedAlert { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
