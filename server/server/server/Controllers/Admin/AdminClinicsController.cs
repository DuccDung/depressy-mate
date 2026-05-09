using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Models.Admin;

namespace server.Controllers.Admin;

[Route("admin/clinics")]
public class AdminClinicsController : Controller
{
    private const long MaxAvatarBytes = 5 * 1024 * 1024;
    private static readonly string[] AdminRoles = ["AMDIN", "ADMIN"];
    private static readonly HashSet<string> AvatarExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    private readonly DepressyMateContext _context;
    private readonly IWebHostEnvironment _environment;

    public AdminClinicsController(DepressyMateContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    [HttpGet("")]
    public async Task<IActionResult> Index(string? search, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        var normalizedSearch = search?.Trim();
        var clinicsQuery = _context.Clinics.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            clinicsQuery = clinicsQuery.Where(item =>
                item.Name.Contains(normalizedSearch) ||
                (item.Department != null && item.Department.Contains(normalizedSearch)) ||
                (item.Address != null && item.Address.Contains(normalizedSearch)));
        }

        var clinicRows = await clinicsQuery
            .OrderBy(item => item.Name)
            .Take(200)
            .Select(item => new
            {
                item.Id,
                item.Name,
                item.Address,
                item.Department,
                item.WorkingHours,
                item.Services,
                item.PriceReference,
                item.UrlAvatar,
                item.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        var clinics = clinicRows
            .Select(item => new AdminClinicRowViewModel
            {
                Id = item.Id,
                Name = item.Name,
                Address = item.Address ?? string.Empty,
                Department = item.Department ?? string.Empty,
                WorkingHours = item.WorkingHours ?? string.Empty,
                ServicesText = JsonListToText(item.Services) ?? string.Empty,
                PriceReference = item.PriceReference ?? string.Empty,
                UrlAvatar = item.UrlAvatar,
                UpdatedAt = item.UpdatedAt
            })
            .ToList();

        var model = new AdminClinicIndexViewModel
        {
            Search = normalizedSearch,
            Clinics = clinics,
            TotalClinics = await _context.Clinics.CountAsync(cancellationToken),
            DepartmentCount = await _context.Clinics
                .Where(item => item.Department != null && item.Department != "")
                .Select(item => item.Department)
                .Distinct()
                .CountAsync(cancellationToken),
            AddressCount = await _context.Clinics
                .Where(item => item.Address != null && item.Address != "")
                .Select(item => item.Address)
                .Distinct()
                .CountAsync(cancellationToken),
            WithAvatarCount = await _context.Clinics
                .CountAsync(item => item.UrlAvatar != null && item.UrlAvatar != "", cancellationToken)
        };

        return View("~/Views/Admin/Clinics/Index.cshtml", model);
    }

    [HttpGet("create")]
    public async Task<IActionResult> Create()
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        return View("~/Views/Admin/Clinics/Form.cshtml", new AdminClinicFormViewModel());
    }

    [HttpPost("create")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(AdminClinicFormViewModel model, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        await ValidateClinicFormAsync(model);

        if (!ModelState.IsValid)
        {
            return View("~/Views/Admin/Clinics/Form.cshtml", model);
        }

        var now = DateTime.UtcNow;
        var avatarUrl = await SaveAvatarAsync(model.AvatarFile, cancellationToken);

        var clinic = new Clinic
        {
            Id = await CreateClinicIdAsync(model.Name, cancellationToken),
            Name = model.Name.Trim(),
            Address = Clean(model.Address),
            Department = Clean(model.Department),
            WorkingHours = Clean(model.WorkingHours),
            Services = CleanJsonList(model.Services),
            PriceReference = Clean(model.PriceReference),
            UrlAvatar = avatarUrl,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Clinics.Add(clinic);
        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminClinicSuccess"] = "Đã thêm phòng khám mới.";

        return RedirectToAction(nameof(Index));
    }

    [HttpGet("{id}/edit")]
    public async Task<IActionResult> Edit(string id, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        var clinic = await _context.Clinics
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (clinic is null)
        {
            return NotFound();
        }

        var model = new AdminClinicFormViewModel
        {
            Id = clinic.Id,
            Name = clinic.Name,
            Address = clinic.Address,
            Department = clinic.Department,
            WorkingHours = clinic.WorkingHours,
            Services = JsonListToText(clinic.Services),
            PriceReference = clinic.PriceReference,
            CurrentAvatarUrl = clinic.UrlAvatar
        };

        return View("~/Views/Admin/Clinics/Form.cshtml", model);
    }

    [HttpPost("{id}/edit")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(string id, AdminClinicFormViewModel model, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        model.Id = id;
        await ValidateClinicFormAsync(model);

        if (!ModelState.IsValid)
        {
            return View("~/Views/Admin/Clinics/Form.cshtml", model);
        }

        var clinic = await _context.Clinics.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (clinic is null)
        {
            return NotFound();
        }

        var avatarUrl = await SaveAvatarAsync(model.AvatarFile, cancellationToken);

        clinic.Name = model.Name.Trim();
        clinic.Address = Clean(model.Address);
        clinic.Department = Clean(model.Department);
        clinic.WorkingHours = Clean(model.WorkingHours);
        clinic.Services = CleanJsonList(model.Services);
        clinic.PriceReference = Clean(model.PriceReference);
        clinic.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(avatarUrl))
        {
            clinic.UrlAvatar = avatarUrl;
        }

        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminClinicSuccess"] = "Đã cập nhật phòng khám.";

        return RedirectToAction(nameof(Index));
    }

    [HttpPost("{id}/delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        var clinic = await _context.Clinics.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (clinic is null)
        {
            TempData["AdminClinicError"] = "Không tìm thấy phòng khám cần xóa.";
            return RedirectToAction(nameof(Index));
        }

        _context.Clinics.Remove(clinic);
        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminClinicSuccess"] = "Đã xóa phòng khám.";

        return RedirectToAction(nameof(Index));
    }

    private Task ValidateClinicFormAsync(AdminClinicFormViewModel model)
    {
        if (model.AvatarFile is not null)
        {
            if (model.AvatarFile.Length > MaxAvatarBytes)
            {
                ModelState.AddModelError(nameof(model.AvatarFile), "Ảnh phòng khám không được vượt quá 5MB.");
            }

            var extension = Path.GetExtension(model.AvatarFile.FileName);
            if (!AvatarExtensions.Contains(extension))
            {
                ModelState.AddModelError(nameof(model.AvatarFile), "Ảnh phòng khám chỉ hỗ trợ JPG, PNG hoặc WEBP.");
            }
        }

        return Task.CompletedTask;
    }

    private async Task<string?> SaveAvatarAsync(IFormFile? avatarFile, CancellationToken cancellationToken)
    {
        if (avatarFile is null || avatarFile.Length == 0)
        {
            return null;
        }

        var extension = Path.GetExtension(avatarFile.FileName).ToLowerInvariant();
        var uploadDirectory = Path.Combine(_environment.WebRootPath, "uploads", "clinics");
        Directory.CreateDirectory(uploadDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadDirectory, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await avatarFile.CopyToAsync(stream, cancellationToken);

        return $"/uploads/clinics/{fileName}";
    }

    private async Task<string> CreateClinicIdAsync(string name, CancellationToken cancellationToken)
    {
        var slug = CreateSlug(name);
        var candidate = slug;
        var index = 2;

        while (await _context.Clinics.AnyAsync(item => item.Id == candidate, cancellationToken))
        {
            candidate = $"{slug}-{index}";
            index++;
        }

        return candidate;
    }

    private static string CreateSlug(string value)
    {
        var normalized = value.Trim().ToLowerInvariant();
        var chars = normalized
            .Select(item => char.IsLetterOrDigit(item) ? item : '-')
            .ToArray();
        var slug = string.Join("-", new string(chars).Split('-', StringSplitOptions.RemoveEmptyEntries));

        if (string.IsNullOrWhiteSpace(slug))
        {
            slug = "clinic-" + Guid.NewGuid().ToString("N")[..12];
        }

        return slug.Length > 80 ? slug[..80] : slug;
    }

    private static string? Clean(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string? CleanJsonList(string? value)
    {
        var cleaned = Clean(value);
        if (cleaned is null)
        {
            return null;
        }

        if (IsValidJson(cleaned))
        {
            return cleaned;
        }

        var items = cleaned
            .Split(new[] { "\r\n", "\n", ";" }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .ToArray();

        return items.Length == 0 ? null : JsonSerializer.Serialize(items);
    }

    private static string? JsonListToText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(value);
            var root = document.RootElement;

            if (root.ValueKind == JsonValueKind.Array)
            {
                var items = root.EnumerateArray()
                    .Select(item => item.ValueKind == JsonValueKind.String ? item.GetString() : item.GetRawText())
                    .Where(item => !string.IsNullOrWhiteSpace(item));

                return string.Join(Environment.NewLine, items);
            }

            if (root.ValueKind == JsonValueKind.String)
            {
                return root.GetString();
            }
        }
        catch (JsonException)
        {
            return value;
        }

        return value;
    }

    private static bool IsValidJson(string value)
    {
        try
        {
            using var _ = JsonDocument.Parse(value);
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private async Task<bool> EnsureAdminAsync()
    {
        if (User.Identity?.IsAuthenticated == true &&
            IsAdminRole(User.FindFirstValue(ClaimTypes.Role)))
        {
            return true;
        }

        if (User.Identity?.IsAuthenticated == true)
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        }

        return false;
    }

    private IActionResult RedirectToAdminLogin()
    {
        return RedirectToAction("Login", "Admin", new { returnUrl = HttpContext.Request.Path.ToString() });
    }

    private static bool IsAdminRole(string? role)
    {
        return !string.IsNullOrWhiteSpace(role) &&
            AdminRoles.Any(item => string.Equals(item, role.Trim(), StringComparison.OrdinalIgnoreCase));
    }
}
