-- Depressy Mate - SQL Server schema
-- Run this script inside the target database.

IF OBJECT_ID('dbo.messages', 'U') IS NOT NULL DROP TABLE dbo.messages;
IF OBJECT_ID('dbo.conversation_participants', 'U') IS NOT NULL DROP TABLE dbo.conversation_participants;
IF OBJECT_ID('dbo.conversations', 'U') IS NOT NULL DROP TABLE dbo.conversations;
IF OBJECT_ID('dbo.comment_likes', 'U') IS NOT NULL DROP TABLE dbo.comment_likes;
IF OBJECT_ID('dbo.post_saves', 'U') IS NOT NULL DROP TABLE dbo.post_saves;
IF OBJECT_ID('dbo.comments', 'U') IS NOT NULL DROP TABLE dbo.comments;
IF OBJECT_ID('dbo.post_likes', 'U') IS NOT NULL DROP TABLE dbo.post_likes;
IF OBJECT_ID('dbo.posts', 'U') IS NOT NULL DROP TABLE dbo.posts;
IF OBJECT_ID('dbo.journals', 'U') IS NOT NULL DROP TABLE dbo.journals;
IF OBJECT_ID('dbo.sleep_sessions', 'U') IS NOT NULL DROP TABLE dbo.sleep_sessions;
IF OBJECT_ID('dbo.breathing_sessions', 'U') IS NOT NULL DROP TABLE dbo.breathing_sessions;
IF OBJECT_ID('dbo.mood_checkins', 'U') IS NOT NULL DROP TABLE dbo.mood_checkins;
IF OBJECT_ID('dbo.assessment_results', 'U') IS NOT NULL DROP TABLE dbo.assessment_results;
IF OBJECT_ID('dbo.user_push_tokens', 'U') IS NOT NULL DROP TABLE dbo.user_push_tokens;
IF OBJECT_ID('dbo.profiles', 'U') IS NOT NULL DROP TABLE dbo.profiles;
IF OBJECT_ID('dbo.clinics', 'U') IS NOT NULL DROP TABLE dbo.clinics;
IF OBJECT_ID('dbo.doctors', 'U') IS NOT NULL DROP TABLE dbo.doctors;
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
GO

CREATE TABLE dbo.users (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_users PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    role NVARCHAR(30) NOT NULL CONSTRAINT DF_users_role DEFAULT 'USER',
    avatar_url NVARCHAR(1000) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_users_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT CK_users_role CHECK (role IN ('USER', 'DOCTOR', 'ADMIN'))
);
GO

CREATE TABLE dbo.user_push_tokens (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_user_push_tokens PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    provider NVARCHAR(50) NOT NULL,
    push_token NVARCHAR(500) NULL,
    onesignal_player_id NVARCHAR(255) NULL,
    platform NVARCHAR(50) NULL,
    device_name NVARCHAR(255) NULL,
    is_active BIT NOT NULL CONSTRAINT DF_user_push_tokens_is_active DEFAULT 1,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_user_push_tokens_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_user_push_tokens_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_user_push_tokens_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX UQ_user_push_tokens_provider_token
    ON dbo.user_push_tokens(provider, push_token)
    WHERE push_token IS NOT NULL;
GO

CREATE INDEX IX_user_push_tokens_user_active
    ON dbo.user_push_tokens(user_id, is_active);
GO

CREATE TABLE dbo.profiles (
    user_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_profiles PRIMARY KEY,
    full_name NVARCHAR(255) NOT NULL,
    avatar_url NVARCHAR(1000) NULL,
    bio NVARCHAR(MAX) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_profiles_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_profiles_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_profiles_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.assessment_results (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_assessment_results PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    assessment_code NVARCHAR(50) NOT NULL,
    raw_scores NVARCHAR(MAX) NOT NULL,
    final_scores NVARCHAR(MAX) NOT NULL,
    classifications NVARCHAR(MAX) NOT NULL,
    overall_severity INT NOT NULL,
    is_red_alert BIT NOT NULL CONSTRAINT DF_assessment_results_is_red_alert DEFAULT 0,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_assessment_results_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_assessment_results_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT CK_assessment_results_raw_scores_json CHECK (ISJSON(raw_scores) = 1),
    CONSTRAINT CK_assessment_results_final_scores_json CHECK (ISJSON(final_scores) = 1),
    CONSTRAINT CK_assessment_results_classifications_json CHECK (ISJSON(classifications) = 1)
);
GO

CREATE TABLE dbo.mood_checkins (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_mood_checkins PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    mood NVARCHAR(30) NOT NULL,
    note NVARCHAR(500) NULL,
    image_url NVARCHAR(1000) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_mood_checkins_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_mood_checkins_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT CK_mood_checkins_mood CHECK (mood IN ('excellent', 'good', 'okay', 'sad', 'terrible'))
);
GO

CREATE TABLE dbo.journals (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_journals PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(255) NULL,
    content NVARCHAR(MAX) NULL,
    audio_url NVARCHAR(1000) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_journals_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_journals_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_journals_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT CK_journals_content_or_audio CHECK (content IS NOT NULL OR audio_url IS NOT NULL)
);
GO

CREATE TABLE dbo.breathing_sessions (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_breathing_sessions PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    duration_seconds INT NOT NULL CONSTRAINT DF_breathing_sessions_duration DEFAULT 0,
    cycles_completed INT NOT NULL CONSTRAINT DF_breathing_sessions_cycles DEFAULT 0,
    total_cycles INT NOT NULL CONSTRAINT DF_breathing_sessions_total_cycles DEFAULT 0,
    completed BIT NOT NULL CONSTRAINT DF_breathing_sessions_completed DEFAULT 0,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_breathing_sessions_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_breathing_sessions_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT CK_breathing_sessions_duration CHECK (duration_seconds >= 0),
    CONSTRAINT CK_breathing_sessions_cycles CHECK (cycles_completed >= 0 AND total_cycles >= 0)
);
GO

CREATE TABLE dbo.sleep_sessions (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_sleep_sessions PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    track_id NVARCHAR(100) NULL,
    track_title NVARCHAR(255) NULL,
    duration_ms INT NOT NULL CONSTRAINT DF_sleep_sessions_duration DEFAULT 0,
    listened_ms INT NOT NULL CONSTRAINT DF_sleep_sessions_listened DEFAULT 0,
    completed BIT NOT NULL CONSTRAINT DF_sleep_sessions_completed DEFAULT 0,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_sleep_sessions_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_sleep_sessions_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT CK_sleep_sessions_duration CHECK (duration_ms >= 0 AND listened_ms >= 0)
);
GO

CREATE TABLE dbo.doctors (
    id NVARCHAR(100) NOT NULL CONSTRAINT PK_doctors PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    specialty NVARCHAR(255) NULL,
    degree NVARCHAR(255) NULL,
    workplace NVARCHAR(500) NULL,
    experience NVARCHAR(255) NULL,
    treatment_focus NVARCHAR(MAX) NULL,
    price_reference NVARCHAR(255) NULL,
    url_avatar NVARCHAR(1000) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_doctors_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_doctors_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_doctors_treatment_focus_json CHECK (treatment_focus IS NULL OR ISJSON(treatment_focus) = 1)
);
GO

CREATE TABLE dbo.clinics (
    id NVARCHAR(100) NOT NULL CONSTRAINT PK_clinics PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    address NVARCHAR(500) NULL,
    department NVARCHAR(255) NULL,
    working_hours NVARCHAR(255) NULL,
    services NVARCHAR(MAX) NULL,
    price_reference NVARCHAR(255) NULL,
    url_avatar NVARCHAR(1000) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_clinics_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_clinics_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_clinics_services_json CHECK (services IS NULL OR ISJSON(services) = 1)
);
GO

CREATE TABLE dbo.posts (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_posts PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    content NVARCHAR(MAX) NULL,
    media_url NVARCHAR(1000) NULL,
    media_type NVARCHAR(20) NULL CONSTRAINT DF_posts_media_type DEFAULT 'IMAGE',
    like_count INT NOT NULL CONSTRAINT DF_posts_like_count DEFAULT 0,
    comment_count INT NOT NULL CONSTRAINT DF_posts_comment_count DEFAULT 0,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_posts_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_posts_updated_at DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT FK_posts_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT CK_posts_content_or_media CHECK (content IS NOT NULL OR media_url IS NOT NULL),
    CONSTRAINT CK_posts_media_type CHECK (media_type IS NULL OR media_type IN ('IMAGE', 'VIDEO')),
    CONSTRAINT CK_posts_like_count CHECK (like_count >= 0),
    CONSTRAINT CK_posts_comment_count CHECK (comment_count >= 0)
);
GO

CREATE TABLE dbo.post_likes (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_post_likes PRIMARY KEY DEFAULT NEWID(),
    post_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_post_likes_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_post_likes_posts FOREIGN KEY (post_id) REFERENCES dbo.posts(id) ON DELETE CASCADE,
    CONSTRAINT FK_post_likes_users FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT UQ_post_likes_post_user UNIQUE (post_id, user_id)
);
GO

CREATE TABLE dbo.comments (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_comments PRIMARY KEY DEFAULT NEWID(),
    post_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    parent_comment_id UNIQUEIDENTIFIER NULL,
    content NVARCHAR(MAX) NOT NULL,
    like_count INT NOT NULL CONSTRAINT DF_comments_like_count DEFAULT 0,
    reply_count INT NOT NULL CONSTRAINT DF_comments_reply_count DEFAULT 0,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_comments_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_comments_updated_at DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT FK_comments_posts FOREIGN KEY (post_id) REFERENCES dbo.posts(id) ON DELETE CASCADE,
    CONSTRAINT FK_comments_users FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES dbo.comments(id),
    CONSTRAINT CK_comments_like_count CHECK (like_count >= 0),
    CONSTRAINT CK_comments_reply_count CHECK (reply_count >= 0)
);
GO

CREATE TABLE dbo.comment_likes (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_comment_likes PRIMARY KEY DEFAULT NEWID(),
    comment_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_comment_likes_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_comment_likes_comments FOREIGN KEY (comment_id) REFERENCES dbo.comments(id) ON DELETE CASCADE,
    CONSTRAINT FK_comment_likes_users FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT UQ_comment_likes_comment_user UNIQUE (comment_id, user_id)
);
GO

CREATE TABLE dbo.post_saves (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_post_saves PRIMARY KEY DEFAULT NEWID(),
    post_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_post_saves_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_post_saves_posts FOREIGN KEY (post_id) REFERENCES dbo.posts(id) ON DELETE CASCADE,
    CONSTRAINT FK_post_saves_users FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT UQ_post_saves_post_user UNIQUE (post_id, user_id)
);
GO

CREATE TABLE dbo.conversations (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_conversations PRIMARY KEY DEFAULT NEWID(),
    type NVARCHAR(20) NOT NULL CONSTRAINT DF_conversations_type DEFAULT 'DIRECT',
    name NVARCHAR(255) NULL,
    avatar_url NVARCHAR(1000) NULL,
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_conversations_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_conversations_updated_at DEFAULT SYSUTCDATETIME(),
    last_message_at DATETIME2(3) NULL,
    CONSTRAINT FK_conversations_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT CK_conversations_type CHECK (type IN ('DIRECT', 'GROUP'))
);
GO

CREATE TABLE dbo.conversation_participants (
    conversation_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    role NVARCHAR(20) NOT NULL CONSTRAINT DF_conversation_participants_role DEFAULT 'MEMBER',
    joined_at DATETIME2(3) NOT NULL CONSTRAINT DF_conversation_participants_joined_at DEFAULT SYSUTCDATETIME(),
    last_read_at DATETIME2(3) NULL,
    left_at DATETIME2(3) NULL,
    CONSTRAINT PK_conversation_participants PRIMARY KEY (conversation_id, user_id),
    CONSTRAINT FK_conversation_participants_conversations FOREIGN KEY (conversation_id) REFERENCES dbo.conversations(id) ON DELETE CASCADE,
    CONSTRAINT FK_conversation_participants_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT CK_conversation_participants_role CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER'))
);
GO

CREATE TABLE dbo.messages (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_messages PRIMARY KEY DEFAULT NEWID(),
    conversation_id UNIQUEIDENTIFIER NOT NULL,
    sender_id UNIQUEIDENTIFIER NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    message_type NVARCHAR(20) NOT NULL CONSTRAINT DF_messages_message_type DEFAULT 'TEXT',
    media_url NVARCHAR(1000) NULL,
    is_read BIT NOT NULL CONSTRAINT DF_messages_is_read DEFAULT 0,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_messages_created_at DEFAULT SYSUTCDATETIME(),
    edited_at DATETIME2(3) NULL,
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT FK_messages_conversations FOREIGN KEY (conversation_id) REFERENCES dbo.conversations(id) ON DELETE CASCADE,
    CONSTRAINT FK_messages_users FOREIGN KEY (sender_id) REFERENCES dbo.users(id),
    CONSTRAINT CK_messages_message_type CHECK (message_type IN ('TEXT', 'IMAGE', 'FILE', 'SYSTEM'))
);
GO

CREATE INDEX IX_assessment_results_user_created ON dbo.assessment_results(user_id, created_at DESC);
CREATE INDEX IX_mood_checkins_user_created ON dbo.mood_checkins(user_id, created_at DESC);
CREATE INDEX IX_journals_user_created ON dbo.journals(user_id, created_at DESC);
CREATE INDEX IX_breathing_sessions_user_created ON dbo.breathing_sessions(user_id, created_at DESC);
CREATE INDEX IX_sleep_sessions_user_created ON dbo.sleep_sessions(user_id, created_at DESC);
CREATE INDEX IX_posts_created_active ON dbo.posts(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IX_posts_user_created ON dbo.posts(user_id, created_at DESC);
CREATE INDEX IX_comments_post_parent_created ON dbo.comments(post_id, parent_comment_id, created_at DESC);
CREATE INDEX IX_post_saves_user_created ON dbo.post_saves(user_id, created_at DESC);
CREATE INDEX IX_conversations_updated ON dbo.conversations(updated_at DESC);
CREATE INDEX IX_conversation_participants_user ON dbo.conversation_participants(user_id);
CREATE INDEX IX_messages_conversation_created ON dbo.messages(conversation_id, created_at DESC);
CREATE INDEX IX_messages_unread ON dbo.messages(conversation_id, sender_id, is_read);
GO
