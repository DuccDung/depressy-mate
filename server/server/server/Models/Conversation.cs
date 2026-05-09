using System;
using System.Collections.Generic;

namespace server.Models;

public partial class Conversation
{
    public Guid Id { get; set; }

    public string Type { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<ConversationParticipant> ConversationParticipants { get; set; } = new List<ConversationParticipant>();

    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
}
