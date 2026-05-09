using System;
using System.Collections.Generic;

namespace server.Models;

public partial class ConversationParticipant
{
    public Guid ConversationId { get; set; }

    public Guid UserId { get; set; }

    public DateTime JoinedAt { get; set; }

    public virtual Conversation Conversation { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
