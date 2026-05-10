using System.ComponentModel.DataAnnotations;

namespace server.Models.Admin;

public class AdminPushNotificationViewModel
{
    public const string TargetAll = "all";

    public const string TargetSelected = "selected";

    [Required(ErrorMessage = "Vui lòng nhập tiêu đề thông báo.")]
    [StringLength(80, ErrorMessage = "Tiêu đề không được vượt quá 80 ký tự.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập nội dung thông báo.")]
    [StringLength(120, ErrorMessage = "Nội dung không được vượt quá 120 ký tự.")]
    public string Body { get; set; } = string.Empty;

    public string TargetMode { get; set; } = TargetAll;

    public List<Guid> SelectedUserIds { get; set; } = [];

    public IReadOnlyList<AdminPushNotificationUserOption> Users { get; set; } = [];

    public int TotalUsers { get; set; }

    public int UsersWithActiveTokens { get; set; }

    public int ActiveTokenCount { get; set; }

    public bool IsSelectedTarget => string.Equals(TargetMode, TargetSelected, StringComparison.OrdinalIgnoreCase);
}

public class AdminPushNotificationUserOption
{
    public Guid Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public int ActivePushTokenCount { get; set; }

    public bool IsSelected { get; set; }

    public string DisplayName => $"{FullName} - {Email}";
}
