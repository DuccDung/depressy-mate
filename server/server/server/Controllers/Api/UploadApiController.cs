using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace server.Controllers.Api;

[ApiController]
[Route("api/upload")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class UploadApiController : ControllerBase
{
    private const long MaxMediaBytes = 25 * 1024 * 1024;
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
        ".mp4",
        ".mov",
        ".m4v"
    };

    private readonly IWebHostEnvironment _environment;
    private readonly FileExtensionContentTypeProvider _contentTypeProvider = new();

    public UploadApiController(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    [HttpPost("media")]
    [RequestSizeLimit(MaxMediaBytes)]
    public async Task<IActionResult> UploadMedia([FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { error = "Vui lòng chọn file cần tải lên." });
        }

        if (file.Length > MaxMediaBytes)
        {
            return BadRequest(new { error = "File không được vượt quá 25MB." });
        }

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(extension))
        {
            return BadRequest(new { error = "File chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF hoặc video MP4/MOV." });
        }

        var webRoot = _environment.WebRootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot");
        var uploadDirectory = Path.Combine(webRoot, "uploads", "posts");
        Directory.CreateDirectory(uploadDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var filePath = Path.Combine(uploadDirectory, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var relativeUrl = $"/uploads/posts/{fileName}";
        var publicUrl = $"{Request.Scheme}://{Request.Host}{relativeUrl}";
        var mediaType = file.ContentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase) ? "VIDEO" : "IMAGE";

        return Ok(new
        {
            publicUrl,
            path = relativeUrl,
            mediaType
        });
    }

    [HttpGet("media/{fileName}/stream")]
    [AllowAnonymous]
    public IActionResult StreamMedia(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName) || fileName != Path.GetFileName(fileName))
        {
            return BadRequest(new { error = "Ten file khong hop le." });
        }

        var extension = Path.GetExtension(fileName);
        if (!AllowedExtensions.Contains(extension))
        {
            return BadRequest(new { error = "Dinh dang file khong duoc ho tro." });
        }

        var webRoot = _environment.WebRootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot");
        var filePath = Path.Combine(webRoot, "uploads", "posts", fileName);
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { error = "Khong tim thay file." });
        }

        if (!_contentTypeProvider.TryGetContentType(filePath, out var contentType))
        {
            contentType = extension.Equals(".mp4", StringComparison.OrdinalIgnoreCase)
                ? "video/mp4"
                : "application/octet-stream";
        }

        var stream = System.IO.File.OpenRead(filePath);
        Response.Headers.AcceptRanges = "bytes";
        return File(stream, contentType, enableRangeProcessing: true);
    }
}
