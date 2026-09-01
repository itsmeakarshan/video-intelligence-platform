namespace VideoIntelligencePlatform.Backend.Services;

public interface IQueryRewriterService
{
    Task<string> RewriteQuestionAsync(string question, List<ChatHistoryMessage> history);
}
