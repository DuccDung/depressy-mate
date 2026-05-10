using System;

namespace server.Models;

public partial class UserPushToken
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string Provider { get; set; } = null!;

    public string? PushToken { get; set; }

    public string? OneSignalPlayerId { get; set; }

    public string? Platform { get; set; }

    public string? DeviceName { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
