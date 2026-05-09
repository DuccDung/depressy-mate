using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace server.Models.Admin;

public class AdminContentIndexViewModel
{
    public string? Search { get; set; }

    public string Status { get; set; } = "active";

    public int TotalPosts { get; set; }

    public int ActivePosts { get; set; }

    public int HiddenPosts { get; set; }

    public int WithMediaPosts { get; set; }

    public IReadOnlyList<AdminPostRowViewModel> Posts { get; set; } = [];
}

public class AdminPostRowViewModel
{
    public Guid Id { get; set; }

    public string AuthorName { get; set; } = string.Empty;

    public string AuthorEmail { get; set; } = string.Empty;

    public string? AuthorAvatarUrl { get; set; }

    public string ContentPreview { get; set; } = string.Empty;

    public string? MediaUrl { get; set; }

    public string MediaType { get; set; } = string.Empty;

    public int LikeCount { get; set; }

    public int CommentCount { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public bool IsHidden => DeletedAt.HasValue;
}

public class AdminPostFormViewModel
{
    public Guid? Id { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn tác giả.")]
    public Guid UserId { get; set; }

    public string? Content { get; set; }

    public string? CurrentMediaUrl { get; set; }

    public string? MediaType { get; set; } = "IMAGE";

    public IFormFile? MediaFile { get; set; }

    public bool IsHidden { get; set; }

    public IReadOnlyList<SelectListItem> Authors { get; set; } = [];

    public bool IsEdit => Id.HasValue;
}
