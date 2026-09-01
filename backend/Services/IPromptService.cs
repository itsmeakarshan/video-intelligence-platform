namespace VideoIntelligencePlatform.Backend.Services;

public interface IPromptService
{
    string SystemPrompt { get; }
    string ChatSystemInstruction { get; }
    string BuildChatPrompt(string question, string context);
    string BuildMentionPrompt(string question, string occurrencesSummary, int occurrenceCount);
    string BuildSummaryPrompt(string context);
    string BuildNotesPrompt(string context);
    string BuildQuizPrompt(string context, string difficulty = "Medium", int questions = 10);
}
