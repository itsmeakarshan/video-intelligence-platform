namespace VideoIntelligencePlatform.Backend.Services;

public interface IGeminiService
{
    Task<string> GenerateContentAsync(string prompt, int maxTokens = 4096, string? systemInstruction = null, string? responseMimeType = null);
    IAsyncEnumerable<string> StreamContentAsync(string prompt, int maxTokens = 4096, string? systemInstruction = null, CancellationToken cancellationToken = default);
    Task<string> AskGeminiAsync(string question, string context);
    Task<string> AskSummaryAsync(string context);
    Task<string> AskNotesAsync(string context);
    Task<string> AskQuizAsync(string context, string difficulty = "Medium", int questions = 10);
    Task<(bool Success, string Message, string? Model)> TestApiKeyAsync(string? testKey = null);
    bool UpdateApiKey(string newKey);
    bool RemoveApiKey();
    string GetMaskedApiKey();
    string? GetActiveApiKey();
}
