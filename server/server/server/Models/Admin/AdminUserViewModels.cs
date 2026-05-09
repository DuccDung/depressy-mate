using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace server.Models.Admin;

public class AdminUserIndexViewModel
{
    public string? Search { get; set; }

    public string? Role { get; set; }

    public int TotalUsers { get; set; }

    public int AdminUsers { get; set; }

    public int DoctorUsers { get; set; }

    public int NormalUsers { get; set; }

    public int VerifiedUsers { get; set; }

    public IReadOnlyList<AdminUserRowViewModel> Users { get; set; } = [];
}

public class AdminUserRowViewModel
{
    public Guid Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }

    public string AuthProvider { get; set; } = string.Empty;

    public bool IsEmailVerified { get; set; }

    public DateTime CreatedAt { get; set; }

    public int AssessmentCount { get; set; }

    public int CheckinCount { get; set; }

    public int JournalCount { get; set; }

    public int PostCount { get; set; }
}

public class AdminUserFormViewModel
{
    public Guid? Id { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập email.")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập họ tên.")]
    [StringLength(255, ErrorMessage = "Họ tên không được vượt quá 255 ký tự.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng chọn quyền.")]
    public string Role { get; set; } = "USER";

    [StringLength(1000, ErrorMessage = "Tiểu sử không được vượt quá 1000 ký tự.")]
    public string? Bio { get; set; }

    [StringLength(100, MinimumLength = 6, ErrorMessage = "Mật khẩu phải có từ 6 đến 100 ký tự.")]
    public string? Password { get; set; }

    public bool IsEmailVerified { get; set; }

    public string? CurrentAvatarUrl { get; set; }

    public IFormFile? AvatarFile { get; set; }

    public bool IsEdit => Id.HasValue;
}
