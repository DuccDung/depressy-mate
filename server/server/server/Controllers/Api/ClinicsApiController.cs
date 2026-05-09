using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server.Controllers.Api;

[ApiController]
[Route("api/clinics")]
public class ClinicsApiController : ControllerBase
{
    private readonly DepressyMateContext _context;

    public ClinicsApiController(DepressyMateContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetClinics(CancellationToken cancellationToken)
    {
        var clinics = await _context.Clinics
            .AsNoTracking()
            .OrderBy(clinic => clinic.Name)
            .Select(clinic => new
            {
                id = clinic.Id,
                name = clinic.Name,
                address = clinic.Address ?? string.Empty,
                department = clinic.Department ?? string.Empty,
                working_hours = clinic.WorkingHours ?? string.Empty,
                services = clinic.Services ?? string.Empty,
                price_reference = clinic.PriceReference ?? string.Empty,
                url_avatar = clinic.UrlAvatar ?? string.Empty
            })
            .ToListAsync(cancellationToken);

        return Ok(clinics);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetClinic(string id, CancellationToken cancellationToken)
    {
        var clinic = await _context.Clinics
            .AsNoTracking()
            .Where(item => item.Id == id)
            .Select(item => new
            {
                id = item.Id,
                name = item.Name,
                address = item.Address ?? string.Empty,
                department = item.Department ?? string.Empty,
                working_hours = item.WorkingHours ?? string.Empty,
                services = item.Services ?? string.Empty,
                price_reference = item.PriceReference ?? string.Empty,
                url_avatar = item.UrlAvatar ?? string.Empty
            })
            .FirstOrDefaultAsync(cancellationToken);

        return clinic is null ? NotFound() : Ok(clinic);
    }
}
