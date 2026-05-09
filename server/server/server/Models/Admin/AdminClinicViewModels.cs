using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace server.Models.Admin;

public class AdminClinicIndexViewModel
{
    public string? Search { get; set; }

    public int TotalClinics { get; set; }

    public int DepartmentCount { get; set; }

    public int AddressCount { get; set; }

    public int WithAvatarCount { get; set; }

    public IReadOnlyList<AdminClinicRowViewModel> Clinics { get; set; } = [];
}

public class AdminClinicRowViewModel
{
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public string Department { get; set; } = string.Empty;

    public string WorkingHours { get; set; } = string.Empty;

    public string ServicesText { get; set; } = string.Empty;

    public string PriceReference { get; set; } = string.Empty;

    public string? UrlAvatar { get; set; }

    public DateTime UpdatedAt { get; set; }
}

public class AdminClinicFormViewModel
{
    public string? Id { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập tên phòng khám.")]
    [StringLength(255, ErrorMessage = "Tên phòng khám không được vượt quá 255 ký tự.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "Địa chỉ không được vượt quá 500 ký tự.")]
    public string? Address { get; set; }

    [StringLength(255, ErrorMessage = "Khoa/phòng ban không được vượt quá 255 ký tự.")]
    public string? Department { get; set; }

    [StringLength(255, ErrorMessage = "Giờ làm việc không được vượt quá 255 ký tự.")]
    public string? WorkingHours { get; set; }

    public string? Services { get; set; }

    [StringLength(255, ErrorMessage = "Giá tham khảo không được vượt quá 255 ký tự.")]
    public string? PriceReference { get; set; }

    public string? CurrentAvatarUrl { get; set; }

    public IFormFile? AvatarFile { get; set; }

    public bool IsEdit => !string.IsNullOrWhiteSpace(Id);
}
