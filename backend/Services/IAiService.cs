using VideoIntelligencePlatform.Backend.DTOs;

namespace VideoIntelligencePlatform.Backend.Services;

public interface IAiService
{
    Task<ChatResponseDto> ChatWithAiAsync(string question, int userId, string? conversationId, List<int>? videoIds = null, int? courseId = null);
    IAsyncEnumerable<string> ChatWithAiStreamAsync(string question, int userId, string conversationId, List<int>? videoIds, int? courseId = null, CancellationToken cancellationToken = default);
    Task<ChatResponseDto> SummaryWithAiAsync(int userId, List<int>? videoIds = null);
    Task<ChatResponseDto> NotesWithAiAsync(int userId, List<int>? videoIds = null);
    Task<ChatResponseDto> QuizWithAiAsync(int userId, string difficulty = "Medium", int questions = 10, List<int>? videoIds = null);
    bool IsGeneralChat(string question);
}
