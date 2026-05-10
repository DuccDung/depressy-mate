-- Depressy Mate - health tracking history tables
-- Run once on existing SQL Server databases before using the rebuilt home dashboard.

IF OBJECT_ID('dbo.breathing_sessions', 'U') IS NULL
BEGIN
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
END;
GO

IF OBJECT_ID('dbo.sleep_sessions', 'U') IS NULL
BEGIN
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
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_breathing_sessions_user_created' AND object_id = OBJECT_ID('dbo.breathing_sessions'))
    CREATE INDEX IX_breathing_sessions_user_created ON dbo.breathing_sessions(user_id, created_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_sleep_sessions_user_created' AND object_id = OBJECT_ID('dbo.sleep_sessions'))
    CREATE INDEX IX_sleep_sessions_user_created ON dbo.sleep_sessions(user_id, created_at DESC);
GO
