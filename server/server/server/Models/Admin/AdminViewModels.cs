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

    public int TotalMessages { get; set; }

    public int TotalConversations { get; set; }

    public int DirectConversations { get; set; }

    public int GroupConversations { get; set; }

    public int TotalPostLikes { get; set; }

    public int TotalPostSaves { get; set; }

    public int TotalComments { get; set; }

    public int ActiveUsers30Days { get; set; }

    public int NewUsers14Days { get; set; }

    public int CommunityInteractions { get; set; }

    public int Engagement14Days { get; set; }

    public IReadOnlyList<AdminDailyActivityPoint> DailyActivity { get; set; } = [];

    public IReadOnlyList<AdminTopPostViewModel> TopPosts { get; set; } = [];
}

public class AdminDailyActivityPoint
{
    public string Label { get; set; } = string.Empty;

    public int Posts { get; set; }

    public int Messages { get; set; }

    public int Interactions { get; set; }

    public int Checkins { get; set; }

    public int Users { get; set; }

    public int Total => Posts + Messages + Interactions + Checkins + Users;
}

public class AdminTopPostViewModel
{
    public Guid Id { get; set; }

    public string AuthorName { get; set; } = string.Empty;

    public string ContentPreview { get; set; } = string.Empty;

    public int LikeCount { get; set; }

    public int CommentCount { get; set; }

    public DateTime CreatedAt { get; set; }

    public int Score => LikeCount + CommentCount;
}
