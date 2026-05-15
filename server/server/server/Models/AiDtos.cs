using System.Text.Json.Serialization;

namespace server.Models;

public sealed class AiChatRequest
{
    [JsonPropertyName("message")]
    public string Message { get; init; } = string.Empty;

    [JsonPropertyName("history")]
    public List<AiChatHistoryMessage> History { get; init; } = new();
}

public sealed class AiChatHistoryMessage
{
    [JsonPropertyName("role")]
    public string Role { get; init; } = "user";

    [JsonPropertyName("content")]
    public string Content { get; init; } = string.Empty;
}

public sealed class AiChatResponse
{
    [JsonPropertyName("response")]
    public string Response { get; init; } = string.Empty;
}
