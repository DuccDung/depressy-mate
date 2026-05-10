using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Models;
using server.Services;

namespace server.Controllers.Api;

[ApiController]
[Route("api/push-tokens")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class PushTokensApiController : ControllerBase
{
    private const int MaxProviderLength = 50;
    private const int MaxPushTokenLength = 500;
    private const int MaxPlatformLength = 50;
    private const int MaxDeviceNameLength = 255;

    private readonly DepressyMateContext _context;

    public PushTokensApiController(DepressyMateContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> RegisterPushToken(
        PushTokenRegistrationRequest request,
        CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        string provider;
        string pushToken;
        try
        {
            provider = NormalizeProvider(request.Provider);
            pushToken = NormalizePushToken(request.Token);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { error = exception.Message });
        }

        var platform = NormalizeOptional(request.Platform, MaxPlatformLength);
        var deviceName = NormalizeOptional(request.DeviceName, MaxDeviceNameLength);
        var now = DateTime.UtcNow;

        var existingToken = await _context.UserPushTokens
            .FirstOrDefaultAsync(
                item => item.Provider == provider && item.PushToken == pushToken,
                cancellationToken);

        if (existingToken is null)
        {
            existingToken = new UserPushToken
            {
                Id = Guid.NewGuid(),
                UserId = currentUserId,
                Provider = provider,
                PushToken = pushToken,
                Platform = platform,
                DeviceName = deviceName,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.UserPushTokens.Add(existingToken);
        }
        else
        {
            existingToken.UserId = currentUserId;
            existingToken.Platform = platform ?? existingToken.Platform;
            existingToken.DeviceName = deviceName ?? existingToken.DeviceName;
            existingToken.IsActive = true;
            existingToken.UpdatedAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            id = existingToken.Id,
            provider = existingToken.Provider,
            platform = existingToken.Platform,
            isActive = existingToken.IsActive,
            updatedAt = existingToken.UpdatedAt
        });
    }

    [HttpPost("deactivate")]
    public async Task<IActionResult> DeactivatePushToken(
        PushTokenDeactivateRequest request,
        CancellationToken cancellationToken)
    {
        var currentUserId = ChatService.GetUserId(User);
        string provider;
        string pushToken;
        try
        {
            provider = NormalizeProvider(request.Provider);
            pushToken = NormalizePushToken(request.Token);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { error = exception.Message });
        }

        var existingToken = await _context.UserPushTokens
            .FirstOrDefaultAsync(
                item =>
                    item.UserId == currentUserId &&
                    item.Provider == provider &&
                    item.PushToken == pushToken,
                cancellationToken);

        if (existingToken is not null)
        {
            existingToken.IsActive = false;
            existingToken.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Ok(new { deactivated = true });
    }

    private static string NormalizeProvider(string? provider)
    {
        var normalized = string.IsNullOrWhiteSpace(provider)
            ? "firebase"
            : provider.Trim().ToLowerInvariant();

        if (normalized.Length > MaxProviderLength)
        {
            throw new ArgumentException("Provider khong hop le.");
        }

        if (normalized != "firebase" && normalized != "onesignal")
        {
            throw new ArgumentException("Provider push notification khong duoc ho tro.");
        }

        return normalized;
    }

    private static string NormalizePushToken(string? token)
    {
        var normalized = token?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("Push token la bat buoc.");
        }

        if (normalized.Length > MaxPushTokenLength)
        {
            throw new ArgumentException("Push token qua dai.");
        }

        return normalized;
    }

    private static string? NormalizeOptional(string? value, int maxLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        return normalized.Length > maxLength
            ? normalized[..maxLength]
            : normalized;
    }
}

public sealed class PushTokenRegistrationRequest
{
    [JsonPropertyName("token")]
    public string? Token { get; init; }

    [JsonPropertyName("provider")]
    public string? Provider { get; init; }

    [JsonPropertyName("platform")]
    public string? Platform { get; init; }

    [JsonPropertyName("deviceName")]
    public string? DeviceName { get; init; }
}

public sealed class PushTokenDeactivateRequest
{
    [JsonPropertyName("token")]
    public string? Token { get; init; }

    [JsonPropertyName("provider")]
    public string? Provider { get; init; }
}
