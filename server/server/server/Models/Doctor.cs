using System;
using System.Collections.Generic;

namespace server.Models;

public partial class Doctor
{
    public string Id { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Specialty { get; set; }

    public string? Degree { get; set; }

    public string? Workplace { get; set; }

    public string? Experience { get; set; }

    public string? TreatmentFocus { get; set; }

    public string? PriceReference { get; set; }

    public string? UrlAvatar { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
