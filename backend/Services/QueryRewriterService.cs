namespace VideoIntelligencePlatform.Backend.Services;

public class QueryRewriterService : IQueryRewriterService
{
    private readonly IGeminiService _geminiService;

    public QueryRewriterService(IGeminiService geminiService)
    {
        _geminiService = geminiService;
    }

    public async Task<string> RewriteQuestionAsync(string question, List<ChatHistoryMessage> history)
    {
        if (history == null || !history.Any())
        {
            return question;
        }

        var recent = history.TakeLast(6).ToList();
        var convLines = recent.Select(m => $"{m.Role}: {m.Text}");
        var conversation = string.Join("\n", convLines);

        var prompt = $"""
You rewrite follow-up questions.

Conversation:

{conversation}

Latest Question:

{question}

Rewrite the latest question so that it is completely standalone.

Rules:

- Preserve the original meaning.
- Replace pronouns like it, this, they, that.
- Do not answer.
- Return only the rewritten question.

Examples:

React?
Who created it?

↓

Who created React?

CSS Grid?
When was it introduced?

↓

When was CSS Grid introduced?
""";

        var rewritten = await _geminiService.GenerateContentAsync(prompt, maxTokens: 100);
        return string.IsNullOrWhiteSpace(rewritten) ? question : rewritten.Trim();
    }
}
