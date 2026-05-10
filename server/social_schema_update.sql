-- Non-destructive social/explore schema upgrade for existing SQL Server databases.
-- Run this once before using nested comments, comment likes, and saved posts.

IF COL_LENGTH('dbo.comments', 'parent_comment_id') IS NULL
    ALTER TABLE dbo.comments ADD parent_comment_id UNIQUEIDENTIFIER NULL;
GO

IF COL_LENGTH('dbo.comments', 'like_count') IS NULL
    ALTER TABLE dbo.comments ADD like_count INT NOT NULL CONSTRAINT DF_comments_like_count DEFAULT 0;
GO

IF COL_LENGTH('dbo.comments', 'reply_count') IS NULL
    ALTER TABLE dbo.comments ADD reply_count INT NOT NULL CONSTRAINT DF_comments_reply_count DEFAULT 0;
GO

IF COL_LENGTH('dbo.comments', 'updated_at') IS NULL
    ALTER TABLE dbo.comments ADD updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_comments_updated_at DEFAULT SYSUTCDATETIME();
GO

IF COL_LENGTH('dbo.comments', 'deleted_at') IS NULL
    ALTER TABLE dbo.comments ADD deleted_at DATETIME2(3) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_comments_parent')
    ALTER TABLE dbo.comments ADD CONSTRAINT FK_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES dbo.comments(id);
GO

IF OBJECT_ID('dbo.comment_likes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.comment_likes (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_comment_likes PRIMARY KEY DEFAULT NEWID(),
        comment_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2(3) NOT NULL CONSTRAINT DF_comment_likes_created_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_comment_likes_comments FOREIGN KEY (comment_id) REFERENCES dbo.comments(id) ON DELETE CASCADE,
        CONSTRAINT FK_comment_likes_users FOREIGN KEY (user_id) REFERENCES dbo.users(id),
        CONSTRAINT UQ_comment_likes_comment_user UNIQUE (comment_id, user_id)
    );
END
GO

IF OBJECT_ID('dbo.post_saves', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.post_saves (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_post_saves PRIMARY KEY DEFAULT NEWID(),
        post_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2(3) NOT NULL CONSTRAINT DF_post_saves_created_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_post_saves_posts FOREIGN KEY (post_id) REFERENCES dbo.posts(id) ON DELETE CASCADE,
        CONSTRAINT FK_post_saves_users FOREIGN KEY (user_id) REFERENCES dbo.users(id),
        CONSTRAINT UQ_post_saves_post_user UNIQUE (post_id, user_id)
    );
END
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_comments_post_created' AND object_id = OBJECT_ID('dbo.comments'))
    DROP INDEX IX_comments_post_created ON dbo.comments;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_comments_post_parent_created' AND object_id = OBJECT_ID('dbo.comments'))
    CREATE INDEX IX_comments_post_parent_created ON dbo.comments(post_id, parent_comment_id, created_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_post_saves_user_created' AND object_id = OBJECT_ID('dbo.post_saves'))
    CREATE INDEX IX_post_saves_user_created ON dbo.post_saves(user_id, created_at DESC);
GO

UPDATE p
SET
    like_count = ISNULL(likes.total_likes, 0),
    comment_count = ISNULL(comments.total_comments, 0)
FROM dbo.posts p
OUTER APPLY (
    SELECT COUNT(*) AS total_likes
    FROM dbo.post_likes pl
    WHERE pl.post_id = p.id
) likes
OUTER APPLY (
    SELECT COUNT(*) AS total_comments
    FROM dbo.comments c
    WHERE c.post_id = p.id AND c.deleted_at IS NULL
) comments;
GO

UPDATE c
SET
    like_count = ISNULL(likes.total_likes, 0),
    reply_count = ISNULL(replies.total_replies, 0)
FROM dbo.comments c
OUTER APPLY (
    SELECT COUNT(*) AS total_likes
    FROM dbo.comment_likes cl
    WHERE cl.comment_id = c.id
) likes
OUTER APPLY (
    SELECT COUNT(*) AS total_replies
    FROM dbo.comments r
    WHERE r.parent_comment_id = c.id AND r.deleted_at IS NULL
) replies;
GO
