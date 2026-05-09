using System.ComponentModel.DataAnnotations;

namespace server.Models.Admin;

public class AdminLoginViewModel
{
    [Required(ErrorMessage = "Vui lòng nhập email.")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập mật khẩu.")]
    public string Password { get; set; } = string.Empty;

    public string? ReturnUrl { get; set; }
}

public class AdminDashboardViewModel
{
    public string AdminName { get; set; } = string.Empty;

    public string AdminEmail { get; set; } = string.Empty;

    public string AdminRole { get; set; } = string.Empty;

    public int TotalUsers { get; set; }

    public int TotalDoctors { get; set; }

    public int TotalClinics { get; set; }

    public int TotalAssessments { get; set; }

    public int TotalCheckins { get; set; }

    public int TotalPosts { get; set; }
}
