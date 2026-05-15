using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace server.Models.Admin;

public class AdminExploreIndexViewModel
{
    public string? Search { get; set; }

    public string Status { get; set; } = "published";

    public Guid? CategoryId { get; set; }

    public int TotalContents { get; set; }

    public int PublishedContents { get; set; }

    public int DraftContents { get; set; }

    public int VideoContents { get; set; }

    public IReadOnlyList<SelectListItem> Categories { get; set; } = [];

    public IReadOnlyList<AdminExploreContentRowViewModel> Contents { get; set; } = [];
}

public class AdminExploreContentRowViewModel
{
    public Guid Id { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Slug { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string? ThumbnailUrl { get; set; }

    public string? YoutubeUrl { get; set; }

    public int DisplayOrder { get; set; }

    public bool IsActive { get; set; }

    public bool IsFeatured { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? PublishedAt { get; set; }

    public bool IsPublished => string.Equals(Status, "PUBLISHED", StringComparison.OrdinalIgnoreCase) && IsActive;
}

public class AdminExploreContentFormViewModel
{
    public Guid? Id { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn nhóm hiển thị.")]
    public Guid CategoryId { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập tiêu đề.")]
    [StringLength(200, ErrorMessage = "Tiêu đề không được vượt quá 200 ký tự.")]
    public string Title { get; set; } = string.Empty;

    [StringLength(220, ErrorMessage = "Slug không được vượt quá 220 ký tự.")]
    public string? Slug { get; set; }

    [StringLength(300)]
    public string? Subtitle { get; set; }

    [StringLength(1000)]
    public string? Summary { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn loại nội dung.")]
    public string ContentType { get; set; } = "ARTICLE";

    public string? ThumbnailUrl { get; set; }

    public IFormFile? ThumbnailFile { get; set; }

    public string? YoutubeUrl { get; set; }

    public string? YoutubeVideoId { get; set; }

    [StringLength(100)]
    public string? BadgeText { get; set; }

    [StringLength(50)]
    public string? BadgeColor { get; set; }

    [StringLength(100)]
    public string? IconName { get; set; }

    [StringLength(50)]
    public string? IconColor { get; set; }

    [StringLength(50)]
    public string? IconBackgroundColor { get; set; }

    public string? Content { get; set; }

    public string Status { get; set; } = "DRAFT";

    public int DisplayOrder { get; set; }

    public bool IsFeatured { get; set; }

    public bool IsActive { get; set; } = true;

    public IReadOnlyList<SelectListItem> Categories { get; set; } = [];

    public IReadOnlyList<SelectListItem> ContentTypes { get; set; } = [];

    public IReadOnlyList<SelectListItem> Statuses { get; set; } = [];

    public bool IsEdit => Id.HasValue;
}
