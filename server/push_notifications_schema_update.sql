-- Depressy Mate - push notification token table
-- Run once on existing SQL Server databases before enabling FCM push notifications.

IF OBJECT_ID('dbo.user_push_tokens', 'U') IS NULL
BEGIN
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
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_user_push_tokens_provider_token' AND object_id = OBJECT_ID('dbo.user_push_tokens'))
    CREATE UNIQUE INDEX UQ_user_push_tokens_provider_token
        ON dbo.user_push_tokens(provider, push_token)
        WHERE push_token IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_user_push_tokens_user_active' AND object_id = OBJECT_ID('dbo.user_push_tokens'))
    CREATE INDEX IX_user_push_tokens_user_active
        ON dbo.user_push_tokens(user_id, is_active);
GO
