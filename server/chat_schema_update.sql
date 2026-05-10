-- Non-destructive chat schema upgrade for existing SQL Server databases.
-- Run this once before using the realtime chat feature.

IF COL_LENGTH('dbo.conversations', 'name') IS NULL
    ALTER TABLE dbo.conversations ADD name NVARCHAR(255) NULL;
GO

IF COL_LENGTH('dbo.conversations', 'avatar_url') IS NULL
    ALTER TABLE dbo.conversations ADD avatar_url NVARCHAR(1000) NULL;
GO

IF COL_LENGTH('dbo.conversations', 'created_by') IS NULL
    ALTER TABLE dbo.conversations ADD created_by UNIQUEIDENTIFIER NULL;
GO

IF COL_LENGTH('dbo.conversations', 'updated_at') IS NULL
    ALTER TABLE dbo.conversations ADD updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_conversations_updated_at DEFAULT SYSUTCDATETIME();
GO

IF COL_LENGTH('dbo.conversations', 'last_message_at') IS NULL
    ALTER TABLE dbo.conversations ADD last_message_at DATETIME2(3) NULL;
GO

IF COL_LENGTH('dbo.conversation_participants', 'role') IS NULL
    ALTER TABLE dbo.conversation_participants ADD role NVARCHAR(20) NOT NULL CONSTRAINT DF_conversation_participants_role DEFAULT 'MEMBER';
GO

IF COL_LENGTH('dbo.conversation_participants', 'last_read_at') IS NULL
    ALTER TABLE dbo.conversation_participants ADD last_read_at DATETIME2(3) NULL;
GO

IF COL_LENGTH('dbo.conversation_participants', 'left_at') IS NULL
    ALTER TABLE dbo.conversation_participants ADD left_at DATETIME2(3) NULL;
GO

IF COL_LENGTH('dbo.messages', 'message_type') IS NULL
    ALTER TABLE dbo.messages ADD message_type NVARCHAR(20) NOT NULL CONSTRAINT DF_messages_message_type DEFAULT 'TEXT';
GO

IF COL_LENGTH('dbo.messages', 'media_url') IS NULL
    ALTER TABLE dbo.messages ADD media_url NVARCHAR(1000) NULL;
GO

IF COL_LENGTH('dbo.messages', 'edited_at') IS NULL
    ALTER TABLE dbo.messages ADD edited_at DATETIME2(3) NULL;
GO

IF COL_LENGTH('dbo.messages', 'deleted_at') IS NULL
    ALTER TABLE dbo.messages ADD deleted_at DATETIME2(3) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_conversations_updated' AND object_id = OBJECT_ID('dbo.conversations'))
    CREATE INDEX IX_conversations_updated ON dbo.conversations(updated_at DESC);
GO
