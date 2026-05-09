using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server.Controllers.Api;

[ApiController]
[Route("api/doctors")]
public class DoctorsApiController : ControllerBase
{
    private readonly DepressyMateContext _context;

    public DoctorsApiController(DepressyMateContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetDoctors(CancellationToken cancellationToken)
    {
        var doctors = await _context.Doctors
            .AsNoTracking()
            .OrderBy(doctor => doctor.Name)
            .Select(doctor => new
            {
                id = doctor.Id,
                name = doctor.Name,
                specialty = doctor.Specialty ?? string.Empty,
                degree = doctor.Degree ?? string.Empty,
                workplace = doctor.Workplace ?? string.Empty,
                experience = doctor.Experience ?? string.Empty,
                treatment_focus = doctor.TreatmentFocus ?? string.Empty,
                price_reference = doctor.PriceReference ?? string.Empty,
                url_avatar = doctor.UrlAvatar ?? string.Empty
            })
            .ToListAsync(cancellationToken);

        return Ok(doctors);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDoctor(string id, CancellationToken cancellationToken)
    {
        var doctor = await _context.Doctors
            .AsNoTracking()
            .Where(item => item.Id == id)
            .Select(item => new
            {
                id = item.Id,
                name = item.Name,
                specialty = item.Specialty ?? string.Empty,
                degree = item.Degree ?? string.Empty,
                workplace = item.Workplace ?? string.Empty,
                experience = item.Experience ?? string.Empty,
                treatment_focus = item.TreatmentFocus ?? string.Empty,
                price_reference = item.PriceReference ?? string.Empty,
                url_avatar = item.UrlAvatar ?? string.Empty
            })
            .FirstOrDefaultAsync(cancellationToken);

        return doctor is null ? NotFound() : Ok(doctor);
    }
}
