namespace server.Hubs;

public static class ChatGroups
{
    public static string Conversation(Guid conversationId) => $"conversation:{conversationId}";

    public static string User(Guid userId) => $"user:{userId}";
}
