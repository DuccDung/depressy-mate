using System;
using System.Collections.Generic;

namespace server.Models;

public partial class Clinic
{
    public string Id { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Address { get; set; }

    public string? Department { get; set; }

    public string? WorkingHours { get; set; }

    public string? Services { get; set; }

    public string? PriceReference { get; set; }

    public string? UrlAvatar { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
