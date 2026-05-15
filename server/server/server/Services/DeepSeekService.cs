using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using server.Models;

namespace server.Services;

public sealed class DeepSeekService
{
    private const string DefaultBaseUrl = "https://api.deepseek.com/v1";
    private const string DefaultModel = "deepseek-chat";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public DeepSeekService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<string> GetChatResponseAsync(
        string userMessage,
        IReadOnlyCollection<AiChatHistoryMessage>? history = null,
        CancellationToken cancellationToken = default)
    {
        var apiKey = _configuration["DeepSeek:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("DeepSeek API key is missing.");
        }

        var baseUrl = (_configuration["DeepSeek:BaseUrl"] ?? DefaultBaseUrl).TrimEnd('/');
        var model = _configuration["DeepSeek:Model"] ?? DefaultModel;
        var messages = BuildMessages(userMessage, history);
        var request = new DeepSeekChatRequest(
            Model: model,
            Messages: messages,
            Temperature: 0.7,
            MaxTokens: 1200);

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions")
        {
            Content = JsonContent.Create(request, options: JsonOptions)
        };
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException($"DeepSeek API error: {(int)response.StatusCode} {response.ReasonPhrase}. {errorContent}");
        }

        var payload = await response.Content.ReadFromJsonAsync<DeepSeekChatResponse>(JsonOptions, cancellationToken);
        return payload?.Choices.FirstOrDefault()?.Message.Content?.Trim()
            ?? "Mình chưa nhận được phản hồi phù hợp. Bạn thử gửi lại ngắn gọn hơn nhé.";
    }

    private static List<DeepSeekMessage> BuildMessages(string userMessage, IReadOnlyCollection<AiChatHistoryMessage>? history)
    {
        var messages = new List<DeepSeekMessage>
        {
            new(
                "system",
                """
                Bạn là trợ lý AI đồng hành sức khỏe tinh thần của Depressy.
                Hãy trả lời bằng tiếng Việt, giọng ấm áp, ngắn gọn, dễ hiểu.
                Không chẩn đoán bệnh, không thay thế chuyên gia y tế.
                Nếu người dùng có dấu hiệu muốn tự làm hại bản thân hoặc người khác, hãy khuyến khích họ liên hệ người thân, chuyên gia, hoặc dịch vụ khẩn cấp tại địa phương ngay.
                """)
        };

        if (history is not null)
        {
            foreach (var item in history.TakeLast(10))
            {
                var role = item.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase)
                    ? "assistant"
                    : "user";

                if (!string.IsNullOrWhiteSpace(item.Content))
                {
                    messages.Add(new DeepSeekMessage(role, item.Content.Trim()));
                }
            }
        }

        messages.Add(new DeepSeekMessage("user", userMessage.Trim()));
        return messages;
    }

    private sealed record DeepSeekChatRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("messages")] IReadOnlyList<DeepSeekMessage> Messages,
        [property: JsonPropertyName("temperature")] double Temperature,
        [property: JsonPropertyName("max_tokens")] int MaxTokens);

    private sealed record DeepSeekMessage(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("content")] string Content);

    private sealed record DeepSeekChatResponse(
        [property: JsonPropertyName("choices")] List<DeepSeekChoice> Choices);

    private sealed record DeepSeekChoice(
        [property: JsonPropertyName("message")] DeepSeekMessage Message);
}
