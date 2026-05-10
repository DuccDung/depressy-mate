using System;
using System.Collections.Generic;

namespace server.Models;

public partial class User
{
    public Guid Id { get; set; }

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string Role { get; set; } = null!;

    public string? AvatarUrl { get; set; }

    public string? FacebookId { get; set; }

    public string? FullName { get; set; }

    public string? AuthProvider { get; set; }

    public bool IsEmailVerified { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<AssessmentResult> AssessmentResults { get; set; } = new List<AssessmentResult>();

    public virtual ICollection<BreathingSession> BreathingSessions { get; set; } = new List<BreathingSession>();

    public virtual ICollection<Comment> Comments { get; set; } = new List<Comment>();

    public virtual ICollection<CommentLike> CommentLikes { get; set; } = new List<CommentLike>();

    public virtual ICollection<ConversationParticipant> ConversationParticipants { get; set; } = new List<ConversationParticipant>();

    public virtual ICollection<Journal> Journals { get; set; } = new List<Journal>();

    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();

    public virtual ICollection<MoodCheckin> MoodCheckins { get; set; } = new List<MoodCheckin>();

    public virtual ICollection<PostLike> PostLikes { get; set; } = new List<PostLike>();

    public virtual ICollection<PostSave> PostSaves { get; set; } = new List<PostSave>();

    public virtual ICollection<Post> Posts { get; set; } = new List<Post>();

    public virtual ICollection<UserPushToken> UserPushTokens { get; set; } = new List<UserPushToken>();

    public virtual ICollection<SleepSession> SleepSessions { get; set; } = new List<SleepSession>();

    public virtual Profile? Profile { get; set; }
}
