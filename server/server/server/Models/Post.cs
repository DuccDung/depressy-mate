using System;
using System.Collections.Generic;

namespace server.Models;

public partial class Post
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string? Content { get; set; }

    public string? MediaUrl { get; set; }

    public string? MediaType { get; set; }

    public int LikeCount { get; set; }

    public int CommentCount { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public virtual ICollection<Comment> Comments { get; set; } = new List<Comment>();

    public virtual ICollection<PostLike> PostLikes { get; set; } = new List<PostLike>();

    public virtual User User { get; set; } = null!;
}
