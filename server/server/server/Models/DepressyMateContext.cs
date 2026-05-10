using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace server.Models;

public partial class DepressyMateContext : DbContext
{
    public DepressyMateContext()
    {
    }

    public DepressyMateContext(DbContextOptions<DepressyMateContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AssessmentResult> AssessmentResults { get; set; }

    public virtual DbSet<BreathingSession> BreathingSessions { get; set; }

    public virtual DbSet<Clinic> Clinics { get; set; }

    public virtual DbSet<Comment> Comments { get; set; }

    public virtual DbSet<CommentLike> CommentLikes { get; set; }

    public virtual DbSet<Conversation> Conversations { get; set; }

    public virtual DbSet<ConversationParticipant> ConversationParticipants { get; set; }

    public virtual DbSet<Doctor> Doctors { get; set; }

    public virtual DbSet<Journal> Journals { get; set; }

    public virtual DbSet<Message> Messages { get; set; }

    public virtual DbSet<MoodCheckin> MoodCheckins { get; set; }

    public virtual DbSet<Post> Posts { get; set; }

    public virtual DbSet<PostLike> PostLikes { get; set; }

    public virtual DbSet<PostSave> PostSaves { get; set; }

    public virtual DbSet<Profile> Profiles { get; set; }

    public virtual DbSet<SleepSession> SleepSessions { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserPushToken> UserPushTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AssessmentResult>(entity =>
        {
            entity.ToTable("assessment_results");

            entity.HasIndex(e => new { e.UserId, e.CreatedAt }, "IX_assessment_results_user_created").IsDescending(false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasColumnName("id");
            entity.Property(e => e.AssessmentCode)
                .HasMaxLength(50)
                .HasColumnName("assessment_code");
            entity.Property(e => e.Classifications).HasColumnName("classifications");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.FinalScores).HasColumnName("final_scores");
            entity.Property(e => e.IsRedAlert).HasColumnName("is_red_alert");
            entity.Property(e => e.OverallSeverity).HasColumnName("overall_severity");
            entity.Property(e => e.RawScores).HasColumnName("raw_scores");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.AssessmentResults)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_assessment_results_users");
        });

        modelBuilder.Entity<BreathingSession>(entity =>
        {
            entity.ToTable("breathing_sessions");

            entity.HasIndex(e => new { e.UserId, e.CreatedAt }, "IX_breathing_sessions_user_created").IsDescending(false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasColumnName("id");
            entity.Property(e => e.Completed).HasColumnName("completed");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.CyclesCompleted).HasColumnName("cycles_completed");
            entity.Property(e => e.DurationSeconds).HasColumnName("duration_seconds");
            entity.Property(e => e.TotalCycles).HasColumnName("total_cycles");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.BreathingSessions)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_breathing_sessions_users");
        });

        modelBuilder.Entity<Clinic>(entity =>
        {
            entity.ToTable("clinics");

            entity.Property(e => e.Id)
                .HasMaxLength(100)
                .HasColumnName("id");
            entity.Property(e => e.Address)
                .HasMaxLength(500)
                .HasColumnName("address");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.Department)
                .HasMaxLength(255)
                .HasColumnName("department");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.PriceReference)
                .HasMaxLength(255)
                .HasColumnName("price_reference");
            entity.Property(e => e.Services).HasColumnName("services");
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("updated_at");
            entity.Property(e => e.UrlAvatar)
                .HasMaxLength(1000)
                .HasColumnName("url_avatar");
            entity.Property(e => e.WorkingHours)
                .HasMaxLength(255)
                .HasColumnName("working_hours");
        });

        modelBuilder.Entity<Comment>(entity =>
        {
            entity.ToTable("comments");

            entity.HasIndex(e => new { e.PostId, e.ParentCommentId, e.CreatedAt }, "IX_comments_post_parent_created").IsDescending(false, false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasColumnName("id");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.DeletedAt)
                .HasPrecision(3)
                .HasColumnName("deleted_at");
            entity.Property(e => e.LikeCount).HasColumnName("like_count");
            entity.Property(e => e.ParentCommentId).HasColumnName("parent_comment_id");
            entity.Property(e => e.PostId).HasColumnName("post_id");
            entity.Property(e => e.ReplyCount).HasColumnName("reply_count");
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.ParentComment).WithMany(p => p.InverseParentComment)
                .HasForeignKey(d => d.ParentCommentId)
                .HasConstraintName("FK_comments_parent");

            entity.HasOne(d => d.Post).WithMany(p => p.Comments)
                .HasForeignKey(d => d.PostId)
                .HasConstraintName("FK_comments_posts");

            entity.HasOne(d => d.User).WithMany(p => p.Comments)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_comments_users");
        });

        modelBuilder.Entity<CommentLike>(entity =>
        {
            entity.ToTable("comment_likes");

            entity.HasIndex(e => new { e.CommentId, e.UserId }, "UQ_comment_likes_comment_user").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasColumnName("id");
            entity.Property(e => e.CommentId).HasColumnName("comment_id");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Comment).WithMany(p => p.CommentLikes)
                .HasForeignKey(d => d.CommentId)
                .HasConstraintName("FK_comment_likes_comments");

            entity.HasOne(d => d.User).WithMany(p => p.CommentLikes)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_comment_likes_users");
        });

        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.ToTable("conversations");

            entity.HasIndex(e => e.UpdatedAt, "IX_conversations_updated").IsDescending();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasColumnName("id");
            entity.Property(e => e.AvatarUrl)
                .HasMaxLength(1000)
                .HasColumnName("avatar_url");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.LastMessageAt)
                .HasPrecision(3)
                .HasColumnName("last_message_at");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.Type)
                .HasMaxLength(20)
                .HasDefaultValue("DIRECT")
                .HasColumnName("type");
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<ConversationParticipant>(entity =>
        {
            entity.HasKey(e => new { e.ConversationId, e.UserId });

            entity.ToTable("conversation_participants");

            entity.HasIndex(e => e.UserId, "IX_conversation_participants_user");

            entity.Property(e => e.ConversationId).HasColumnName("conversation_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.JoinedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("joined_at");
            entity.Property(e => e.LastReadAt)
                .HasPrecision(3)
                .HasColumnName("last_read_at");
            entity.Property(e => e.LeftAt)
                .HasPrecision(3)
                .HasColumnName("left_at");
            entity.Property(e => e.Role)
                .HasMaxLength(20)
                .HasDefaultValue("MEMBER")
                .HasColumnName("role");

            entity.HasOne(d => d.Conversation).WithMany(p => p.ConversationParticipants)
                .HasForeignKey(d => d.ConversationId)
                .HasConstraintName("FK_conversation_participants_conversations");

            entity.HasOne(d => d.User).WithMany(p => p.ConversationParticipants)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_conversation_participants_users");
        });

        modelBuilder.Entity<Doctor>(entity =>
        {
            entity.ToTable("doctors");

            entity.Property(e => e.Id)
                .HasMaxLength(100)
                .HasDefaultValueSql("(CONVERT([nvarchar](100),newid()))")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.Degree)
                .HasMaxLength(255)
                .HasColumnName("degree");
            entity.Property(e => e.Experience)
                .HasMaxLength(255)
                .HasColumnName("experience");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.PriceReference)
                .HasMaxLength(255)
                .HasColumnName("price_reference");
            entity.Property(e => e.Specialty)
                .HasMaxLength(255)
                .HasColumnName("specialty");
            entity.Property(e => e.TreatmentFocus).HasColumnName("treatment_focus");
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("updated_at");
            entity.Property(e => e.UrlAvatar)
                .HasMaxLength(1000)
                .HasColumnName("url_avatar");
            entity.Property(e => e.Workplace)
                .HasMaxLength(500)
                .HasColumnName("workplace");
        });

        modelBuilder.Entity<Journal>(entity =>
        {
            entity.ToTable("journals");

            entity.HasIndex(e => new { e.UserId, e.CreatedAt }, "IX_journals_user_created").IsDescending(false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasColumnName("id");
            entity.Property(e => e.AudioUrl)
                .HasMaxLength(1000)
                .HasColumnName("audio_url");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Journals)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_journals_users");
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.ToTable("messages");

            entity.HasIndex(e => new { e.ConversationId, e.CreatedAt }, "IX_messages_conversation_created").IsDescending(false, true);

            entity.HasIndex(e => new { e.ConversationId, e.SenderId, e.IsRead }, "IX_messages_unread");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasColumnName("id");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.ConversationId).HasColumnName("conversation_id");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.DeletedAt)
                .HasPrecision(3)
                .HasColumnName("deleted_at");
            entity.Property(e => e.EditedAt)
                .HasPrecision(3)
                .HasColumnName("edited_at");
            entity.Property(e => e.IsRead).HasColumnName("is_read");
            entity.Property(e => e.MediaUrl)
                .HasMaxLength(1000)
                .HasColumnName("media_url");
            entity.Property(e => e.MessageType)
                .HasMaxLength(20)
                .HasDefaultValue("TEXT")
                .HasColumnName("message_type");
            entity.Property(e => e.SenderId).HasColumnName("sender_id");

            entity.HasOne(d => d.Conversation).WithMany(p => p.Messages)
                .HasForeignKey(d => d.ConversationId)
                .HasConstraintName("FK_messages_conversations");

            entity.HasOne(d => d.Sender).WithMany(p => p.Messages)
                .HasForeignKey(d => d.SenderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_messages_users");
        });

        modelBuilder.Entity<MoodCheckin>(entity =>
        {
            entity.ToTable("mood_checkins");

            entity.HasIndex(e => new { e.UserId, e.CreatedAt }, "IX_mood_checkins_user_created").IsDescending(false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(1000)
                .HasColumnName("image_url");
            entity.Property(e => e.Mood)
                .HasMaxLength(30)
                .HasColumnName("mood");
            entity.Property(e => e.Note)
                .HasMaxLength(500)
                .HasColumnName("note");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.MoodCheckins)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_mood_checkins_users");
        });

        modelBuilder.Entity<Post>(entity =>
        {
            entity.ToTable("posts");

            entity.HasIndex(e => e.CreatedAt, "IX_posts_created_active")
                .IsDescending()
                .HasFilter("([deleted_at] IS NULL)");

            entity.HasIndex(e => new { e.UserId, e.CreatedAt }, "IX_posts_user_created").IsDescending(false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasColumnName("id");
            entity.Property(e => e.CommentCount).HasColumnName("comment_count");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.DeletedAt)
                .HasPrecision(3)
                .HasColumnName("deleted_at");
            entity.Property(e => e.LikeCount).HasColumnName("like_count");
            entity.Property(e => e.MediaType)
                .HasMaxLength(20)
                .HasDefaultValue("IMAGE")
                .HasColumnName("media_type");
            entity.Property(e => e.MediaUrl)
                .HasMaxLength(1000)
                .HasColumnName("media_url");
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Posts)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_posts_users");
        });

        modelBuilder.Entity<PostLike>(entity =>
        {
            entity.ToTable("post_likes");

            entity.HasIndex(e => new { e.PostId, e.UserId }, "UQ_post_likes_post_user").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.PostId).HasColumnName("post_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Post).WithMany(p => p.PostLikes)
                .HasForeignKey(d => d.PostId)
                .HasConstraintName("FK_post_likes_posts");

            entity.HasOne(d => d.User).WithMany(p => p.PostLikes)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_post_likes_users");
        });

        modelBuilder.Entity<PostSave>(entity =>
        {
            entity.ToTable("post_saves");

            entity.HasIndex(e => new { e.PostId, e.UserId }, "UQ_post_saves_post_user").IsUnique();

            entity.HasIndex(e => new { e.UserId, e.CreatedAt }, "IX_post_saves_user_created").IsDescending(false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.PostId).HasColumnName("post_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Post).WithMany(p => p.PostSaves)
                .HasForeignKey(d => d.PostId)
                .HasConstraintName("FK_post_saves_posts");

            entity.HasOne(d => d.User).WithMany(p => p.PostSaves)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_post_saves_users");
        });

        modelBuilder.Entity<SleepSession>(entity =>
        {
            entity.ToTable("sleep_sessions");

            entity.HasIndex(e => new { e.UserId, e.CreatedAt }, "IX_sleep_sessions_user_created").IsDescending(false, true);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasColumnName("id");
            entity.Property(e => e.Completed).HasColumnName("completed");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.DurationMs).HasColumnName("duration_ms");
            entity.Property(e => e.ListenedMs).HasColumnName("listened_ms");
            entity.Property(e => e.TrackId)
                .HasMaxLength(100)
                .HasColumnName("track_id");
            entity.Property(e => e.TrackTitle)
                .HasMaxLength(255)
                .HasColumnName("track_title");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.SleepSessions)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_sleep_sessions_users");
        });

        modelBuilder.Entity<Profile>(entity =>
        {
            entity.HasKey(e => e.UserId);

            entity.ToTable("profiles");

            entity.Property(e => e.UserId)
                .ValueGeneratedNever()
                .HasColumnName("user_id");
            entity.Property(e => e.AvatarUrl)
                .HasMaxLength(1000)
                .HasColumnName("avatar_url");
            entity.Property(e => e.Bio).HasColumnName("bio");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.FullName)
                .HasMaxLength(255)
                .HasColumnName("full_name");
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.User).WithOne(p => p.Profile)
                .HasForeignKey<Profile>(d => d.UserId)
                .HasConstraintName("FK_profiles_users");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");

            entity.HasIndex(e => e.Email, "UQ_users_email").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasColumnName("id");
            entity.Property(e => e.AvatarUrl)
                .HasMaxLength(1000)
                .HasColumnName("avatar_url");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .HasColumnName("email");
            entity.Property(e => e.AuthProvider)
                .HasMaxLength(50)
                .HasColumnName("auth_provider");
            entity.Property(e => e.FacebookId)
                .HasMaxLength(100)
                .HasColumnName("facebook_id");
            entity.Property(e => e.FullName)
                .HasMaxLength(255)
                .HasColumnName("full_name");
            entity.Property(e => e.IsEmailVerified).HasColumnName("is_email_verified");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasColumnName("password_hash");
            entity.Property(e => e.Role)
                .HasMaxLength(30)
                .HasDefaultValue("USER")
                .HasColumnName("role");
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<UserPushToken>(entity =>
        {
            entity.ToTable("user_push_tokens");

            entity.HasIndex(e => e.UserId, "IX_user_push_tokens_user_active");

            entity.HasIndex(e => new { e.Provider, e.PushToken }, "UQ_user_push_tokens_provider_token")
                .IsUnique()
                .HasFilter("([push_token] IS NOT NULL)");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("(newid())")
                .HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("created_at");
            entity.Property(e => e.DeviceName)
                .HasMaxLength(255)
                .HasColumnName("device_name");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.OneSignalPlayerId)
                .HasMaxLength(255)
                .HasColumnName("onesignal_player_id");
            entity.Property(e => e.Platform)
                .HasMaxLength(50)
                .HasColumnName("platform");
            entity.Property(e => e.Provider)
                .HasMaxLength(50)
                .HasColumnName("provider");
            entity.Property(e => e.PushToken)
                .HasMaxLength(500)
                .HasColumnName("push_token");
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.UserPushTokens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_user_push_tokens_users");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
