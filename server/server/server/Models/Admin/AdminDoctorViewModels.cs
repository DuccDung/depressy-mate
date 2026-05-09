using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace server.Models.Admin;

public class AdminDoctorIndexViewModel
{
    public string? Search { get; set; }

    public int TotalDoctors { get; set; }

    public int SpecialtyCount { get; set; }

    public int WorkplaceCount { get; set; }

    public int WithAvatarCount { get; set; }

    public IReadOnlyList<AdminDoctorRowViewModel> Doctors { get; set; } = [];
}

public class AdminDoctorRowViewModel
{
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Specialty { get; set; } = string.Empty;

    public string Degree { get; set; } = string.Empty;

    public string Workplace { get; set; } = string.Empty;

    public string Experience { get; set; } = string.Empty;

    public string PriceReference { get; set; } = string.Empty;

    public string? UrlAvatar { get; set; }

    public DateTime UpdatedAt { get; set; }
}

public class AdminDoctorFormViewModel
{
    public string? Id { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập tên bác sĩ.")]
    [StringLength(255, ErrorMessage = "Tên bác sĩ không được vượt quá 255 ký tự.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(255, ErrorMessage = "Chuyên khoa không được vượt quá 255 ký tự.")]
    public string? Specialty { get; set; }

    [StringLength(255, ErrorMessage = "Học vị không được vượt quá 255 ký tự.")]
    public string? Degree { get; set; }

    [StringLength(500, ErrorMessage = "Nơi công tác không được vượt quá 500 ký tự.")]
    public string? Workplace { get; set; }

    [StringLength(255, ErrorMessage = "Kinh nghiệm không được vượt quá 255 ký tự.")]
    public string? Experience { get; set; }

    public string? TreatmentFocus { get; set; }

    [StringLength(255, ErrorMessage = "Giá tham khảo không được vượt quá 255 ký tự.")]
    public string? PriceReference { get; set; }

    public string? CurrentAvatarUrl { get; set; }

    public IFormFile? AvatarFile { get; set; }

    public bool IsEdit => !string.IsNullOrWhiteSpace(Id);
}
