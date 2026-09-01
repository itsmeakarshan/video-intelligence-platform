using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Services;

public class ChatHistoryMessage
{
    public string Role { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

public interface IMemoryService
{
    Task<Conversation> GetOrCreateConversationAsync(int userId, string? conversationId, int? courseId = null);
    Task<Conversation?> GetCourseConversationAsync(int userId, int courseId);
    Task<bool> ClearCourseConversationAsync(int userId, int courseId);
    Task<List<ChatHistoryMessage>> GetHistoryAsync(string conversationId, int userId, int maxHistory = 20);
    Task AddMessageAsync(string conversationId, int userId, string role, string text);
}
