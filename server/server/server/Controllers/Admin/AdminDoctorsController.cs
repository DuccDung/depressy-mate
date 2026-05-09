using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Models.Admin;

namespace server.Controllers.Admin;

[Route("admin/doctors")]
public class AdminDoctorsController : Controller
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

    public AdminDoctorsController(DepressyMateContext context, IWebHostEnvironment environment)
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
        var doctorsQuery = _context.Doctors.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            doctorsQuery = doctorsQuery.Where(item =>
                item.Name.Contains(normalizedSearch) ||
                (item.Specialty != null && item.Specialty.Contains(normalizedSearch)) ||
                (item.Workplace != null && item.Workplace.Contains(normalizedSearch)));
        }

        var doctors = await doctorsQuery
            .OrderBy(item => item.Name)
            .Take(200)
            .Select(item => new AdminDoctorRowViewModel
            {
                Id = item.Id,
                Name = item.Name,
                Specialty = item.Specialty ?? string.Empty,
                Degree = item.Degree ?? string.Empty,
                Workplace = item.Workplace ?? string.Empty,
                Experience = item.Experience ?? string.Empty,
                PriceReference = item.PriceReference ?? string.Empty,
                UrlAvatar = item.UrlAvatar,
                UpdatedAt = item.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        var model = new AdminDoctorIndexViewModel
        {
            Search = normalizedSearch,
            Doctors = doctors,
            TotalDoctors = await _context.Doctors.CountAsync(cancellationToken),
            SpecialtyCount = await _context.Doctors
                .Where(item => item.Specialty != null && item.Specialty != "")
                .Select(item => item.Specialty)
                .Distinct()
                .CountAsync(cancellationToken),
            WorkplaceCount = await _context.Doctors
                .Where(item => item.Workplace != null && item.Workplace != "")
                .Select(item => item.Workplace)
                .Distinct()
                .CountAsync(cancellationToken),
            WithAvatarCount = await _context.Doctors
                .CountAsync(item => item.UrlAvatar != null && item.UrlAvatar != "", cancellationToken)
        };

        return View("~/Views/Admin/Doctors/Index.cshtml", model);
    }

    [HttpGet("create")]
    public async Task<IActionResult> Create()
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        return View("~/Views/Admin/Doctors/Form.cshtml", new AdminDoctorFormViewModel());
    }

    [HttpPost("create")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(AdminDoctorFormViewModel model, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        await ValidateDoctorFormAsync(model);

        if (!ModelState.IsValid)
        {
            return View("~/Views/Admin/Doctors/Form.cshtml", model);
        }

        var now = DateTime.UtcNow;
        var avatarUrl = await SaveAvatarAsync(model.AvatarFile, cancellationToken);

        var doctor = new Doctor
        {
            Name = model.Name.Trim(),
            Specialty = model.Specialty?.Trim(),
            Degree = model.Degree?.Trim(),
            Workplace = model.Workplace?.Trim(),
            Experience = model.Experience?.Trim(),
            TreatmentFocus = model.TreatmentFocus?.Trim(),
            PriceReference = model.PriceReference?.Trim(),
            UrlAvatar = avatarUrl,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Doctors.Add(doctor);
        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminDoctorSuccess"] = "Đã thêm bác sĩ mới.";

        return RedirectToAction(nameof(Index));
    }

    [HttpGet("{id}/edit")]
    public async Task<IActionResult> Edit(string id, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        var doctor = await _context.Doctors
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (doctor is null)
        {
            return NotFound();
        }

        var model = new AdminDoctorFormViewModel
        {
            Id = doctor.Id,
            Name = doctor.Name,
            Specialty = doctor.Specialty,
            Degree = doctor.Degree,
            Workplace = doctor.Workplace,
            Experience = doctor.Experience,
            TreatmentFocus = doctor.TreatmentFocus,
            PriceReference = doctor.PriceReference,
            CurrentAvatarUrl = doctor.UrlAvatar
        };

        return View("~/Views/Admin/Doctors/Form.cshtml", model);
    }

    [HttpPost("{id}/edit")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(string id, AdminDoctorFormViewModel model, CancellationToken cancellationToken)
    {
        if (!await EnsureAdminAsync())
        {
            return RedirectToAdminLogin();
        }

        model.Id = id;
        await ValidateDoctorFormAsync(model);

        if (!ModelState.IsValid)
        {
            return View("~/Views/Admin/Doctors/Form.cshtml", model);
        }

        var doctor = await _context.Doctors.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (doctor is null)
        {
            return NotFound();
        }

        var avatarUrl = await SaveAvatarAsync(model.AvatarFile, cancellationToken);

        doctor.Name = model.Name.Trim();
        doctor.Specialty = model.Specialty?.Trim();
        doctor.Degree = model.Degree?.Trim();
        doctor.Workplace = model.Workplace?.Trim();
        doctor.Experience = model.Experience?.Trim();
        doctor.TreatmentFocus = model.TreatmentFocus?.Trim();
        doctor.PriceReference = model.PriceReference?.Trim();
        doctor.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(avatarUrl))
        {
            doctor.UrlAvatar = avatarUrl;
        }

        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminDoctorSuccess"] = "Đã cập nhật bác sĩ.";

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

        var doctor = await _context.Doctors.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (doctor is null)
        {
            TempData["AdminDoctorError"] = "Không tìm thấy bác sĩ cần xóa.";
            return RedirectToAction(nameof(Index));
        }

        _context.Doctors.Remove(doctor);
        await _context.SaveChangesAsync(cancellationToken);
        TempData["AdminDoctorSuccess"] = "Đã xóa bác sĩ.";

        return RedirectToAction(nameof(Index));
    }

    private Task ValidateDoctorFormAsync(AdminDoctorFormViewModel model)
    {
        if (model.AvatarFile is not null)
        {
            if (model.AvatarFile.Length > MaxAvatarBytes)
            {
                ModelState.AddModelError(nameof(model.AvatarFile), "Ảnh bác sĩ không được vượt quá 5MB.");
            }

            var extension = Path.GetExtension(model.AvatarFile.FileName);
            if (!AvatarExtensions.Contains(extension))
            {
                ModelState.AddModelError(nameof(model.AvatarFile), "Ảnh bác sĩ chỉ hỗ trợ JPG, PNG hoặc WEBP.");
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
        var uploadDirectory = Path.Combine(_environment.WebRootPath, "uploads", "doctors");
        Directory.CreateDirectory(uploadDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadDirectory, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await avatarFile.CopyToAsync(stream, cancellationToken);

        return $"/uploads/doctors/{fileName}";
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
