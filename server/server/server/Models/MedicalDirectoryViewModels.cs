using System.ComponentModel.DataAnnotations;

namespace server.Models;

public class MedicalDirectoryViewModel
{
    public List<DoctorDirectoryItem> Doctors { get; set; } = new();

    public List<ClinicDirectoryItem> Clinics { get; set; } = new();
}

public class DoctorDirectoryItem
{
    public string? Id { get; set; }

    [Required]
    [StringLength(255)]
    public string Name { get; set; } = string.Empty;

    [StringLength(255)]
    public string? Specialty { get; set; }

    [StringLength(255)]
    public string? Degree { get; set; }

    [StringLength(500)]
    public string? Workplace { get; set; }

    [StringLength(255)]
    public string? Experience { get; set; }

    public string? TreatmentFocus { get; set; }

    [StringLength(255)]
    public string? PriceReference { get; set; }

    [StringLength(1000)]
    public string? UrlAvatar { get; set; }
}

public class ClinicDirectoryItem
{
    public string? Id { get; set; }

    [Required]
    [StringLength(255)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Address { get; set; }

    [StringLength(255)]
    public string? Department { get; set; }

    [StringLength(255)]
    public string? WorkingHours { get; set; }

    public string? Services { get; set; }

    [StringLength(255)]
    public string? PriceReference { get; set; }

    [StringLength(1000)]
    public string? UrlAvatar { get; set; }
}
