using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using System.Text.Json;

namespace server.Controllers;

public class MedicalDirectoryController : Controller
{
    private readonly DepressyMateContext _context;

    public MedicalDirectoryController(DepressyMateContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        return View(await BuildViewModelAsync(cancellationToken));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateDoctor(DoctorDirectoryItem input, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(input.Name))
        {
            TempData["DirectoryError"] = "Tên bác sĩ là bắt buộc.";
            return RedirectToAction(nameof(Index));
        }

        var now = DateTime.UtcNow;
        var doctor = new Doctor
        {
            Id = Guid.NewGuid().ToString(),
            Name = input.Name.Trim(),
            Specialty = Clean(input.Specialty),
            Degree = Clean(input.Degree),
            Workplace = Clean(input.Workplace),
            Experience = Clean(input.Experience),
            TreatmentFocus = CleanJsonList(input.TreatmentFocus),
            PriceReference = Clean(input.PriceReference),
            UrlAvatar = Clean(input.UrlAvatar),
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Doctors.Add(doctor);
        await _context.SaveChangesAsync(cancellationToken);

        TempData["DirectorySuccess"] = "Đã thêm bác sĩ.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateDoctor(DoctorDirectoryItem input, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(input.Id))
        {
            TempData["DirectoryError"] = "Không tìm thấy mã bác sĩ cần cập nhật.";
            return RedirectToAction(nameof(Index));
        }

        if (string.IsNullOrWhiteSpace(input.Name))
        {
            TempData["DirectoryError"] = "Tên bác sĩ là bắt buộc.";
            return RedirectToAction(nameof(Index));
        }

        var doctor = await _context.Doctors.FirstOrDefaultAsync(item => item.Id == input.Id, cancellationToken);
        if (doctor is null)
        {
            TempData["DirectoryError"] = "Không tìm thấy bác sĩ cần cập nhật.";
            return RedirectToAction(nameof(Index));
        }

        doctor.Name = input.Name.Trim();
        doctor.Specialty = Clean(input.Specialty);
        doctor.Degree = Clean(input.Degree);
        doctor.Workplace = Clean(input.Workplace);
        doctor.Experience = Clean(input.Experience);
        doctor.TreatmentFocus = CleanJsonList(input.TreatmentFocus);
        doctor.PriceReference = Clean(input.PriceReference);
        doctor.UrlAvatar = Clean(input.UrlAvatar);
        doctor.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        TempData["DirectorySuccess"] = "Đã cập nhật bác sĩ.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteDoctor(string id, CancellationToken cancellationToken)
    {
        var doctor = await _context.Doctors.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (doctor is null)
        {
            TempData["DirectoryError"] = "Không tìm thấy bác sĩ cần xóa.";
            return RedirectToAction(nameof(Index));
        }

        _context.Doctors.Remove(doctor);
        await _context.SaveChangesAsync(cancellationToken);

        TempData["DirectorySuccess"] = "Đã xóa bác sĩ.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateClinic(ClinicDirectoryItem input, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(input.Name))
        {
            TempData["DirectoryError"] = "Tên phòng khám là bắt buộc.";
            return RedirectToAction(nameof(Index));
        }

        var now = DateTime.UtcNow;
        var clinic = new Clinic
        {
            Id = Guid.NewGuid().ToString(),
            Name = input.Name.Trim(),
            Address = Clean(input.Address),
            Department = Clean(input.Department),
            WorkingHours = Clean(input.WorkingHours),
            Services = CleanJsonList(input.Services),
            PriceReference = Clean(input.PriceReference),
            UrlAvatar = Clean(input.UrlAvatar),
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Clinics.Add(clinic);
        await _context.SaveChangesAsync(cancellationToken);

        TempData["DirectorySuccess"] = "Đã thêm phòng khám.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateClinic(ClinicDirectoryItem input, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(input.Id))
        {
            TempData["DirectoryError"] = "Không tìm thấy mã phòng khám cần cập nhật.";
            return RedirectToAction(nameof(Index));
        }

        if (string.IsNullOrWhiteSpace(input.Name))
        {
            TempData["DirectoryError"] = "Tên phòng khám là bắt buộc.";
            return RedirectToAction(nameof(Index));
        }

        var clinic = await _context.Clinics.FirstOrDefaultAsync(item => item.Id == input.Id, cancellationToken);
        if (clinic is null)
        {
            TempData["DirectoryError"] = "Không tìm thấy phòng khám cần cập nhật.";
            return RedirectToAction(nameof(Index));
        }

        clinic.Name = input.Name.Trim();
        clinic.Address = Clean(input.Address);
        clinic.Department = Clean(input.Department);
        clinic.WorkingHours = Clean(input.WorkingHours);
        clinic.Services = CleanJsonList(input.Services);
        clinic.PriceReference = Clean(input.PriceReference);
        clinic.UrlAvatar = Clean(input.UrlAvatar);
        clinic.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        TempData["DirectorySuccess"] = "Đã cập nhật phòng khám.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteClinic(string id, CancellationToken cancellationToken)
    {
        var clinic = await _context.Clinics.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (clinic is null)
        {
            TempData["DirectoryError"] = "Không tìm thấy phòng khám cần xóa.";
            return RedirectToAction(nameof(Index));
        }

        _context.Clinics.Remove(clinic);
        await _context.SaveChangesAsync(cancellationToken);

        TempData["DirectorySuccess"] = "Đã xóa phòng khám.";
        return RedirectToAction(nameof(Index));
    }

    private async Task<MedicalDirectoryViewModel> BuildViewModelAsync(CancellationToken cancellationToken)
    {
        var doctors = await _context.Doctors
            .AsNoTracking()
            .OrderBy(item => item.Name)
            .Select(item => new DoctorDirectoryItem
            {
                Id = item.Id,
                Name = item.Name,
                Specialty = item.Specialty,
                Degree = item.Degree,
                Workplace = item.Workplace,
                Experience = item.Experience,
                TreatmentFocus = JsonListToText(item.TreatmentFocus),
                PriceReference = item.PriceReference,
                UrlAvatar = item.UrlAvatar
            })
            .ToListAsync(cancellationToken);

        var clinics = await _context.Clinics
            .AsNoTracking()
            .OrderBy(item => item.Name)
            .Select(item => new ClinicDirectoryItem
            {
                Id = item.Id,
                Name = item.Name,
                Address = item.Address,
                Department = item.Department,
                WorkingHours = item.WorkingHours,
                Services = JsonListToText(item.Services),
                PriceReference = item.PriceReference,
                UrlAvatar = item.UrlAvatar
            })
            .ToListAsync(cancellationToken);

        return new MedicalDirectoryViewModel
        {
            Doctors = doctors,
            Clinics = clinics
        };
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
}
