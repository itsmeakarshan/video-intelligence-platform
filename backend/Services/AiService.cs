using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.DTOs;
using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Services;

public class AiService : IAiService
{
    private readonly AppDbContext _db;
    private readonly ISearchService _searchService;
    private readonly IGeminiService _geminiService;
    private readonly IPromptService _promptService;
    private readonly IMemoryService _memoryService;
    private readonly IQueryRewriterService _queryRewriter;
    private readonly ILogger<AiService> _logger;

    private static readonly string[] GeneralPatterns = new[]
    {
        @"\bhi\b", @"\bhello\b", @"\bhey\b", @"\bhiya\b", @"\bhow are you\b",
        @"\bwhat's up\b", @"\bwhats up\b", @"\bgood morning\b", @"\bgood afternoon\b",
        @"\bgood evening\b", @"\bthanks\b", @"\bthank you\b", @"\bbye\b", @"\bgoodbye\b",
        @"\bwho are you\b", @"\bwhat can you do\b", @"\bhelp\b"
    };

    public AiService(
        AppDbContext db,
        ISearchService searchService,
        IGeminiService geminiService,
        IPromptService promptService,
        IMemoryService memoryService,
        IQueryRewriterService queryRewriter,
        ILogger<AiService> logger)
    {
        _db = db;
        _searchService = searchService;
        _geminiService = geminiService;
        _promptService = promptService;
        _memoryService = memoryService;
        _queryRewriter = queryRewriter;
        _logger = logger;
    }

    public bool IsGeneralChat(string question)
    {
        if (string.IsNullOrWhiteSpace(question)) return false;
        var q = question.ToLower().Trim();
        return GeneralPatterns.Any(p => Regex.IsMatch(q, p, RegexOptions.IgnoreCase));
    }

    private async Task<List<int>?> GetAccessibleVideoIdsAsync(List<int>? videoIds, int? courseId = null)
    {
        var query = _db.Videos.AsQueryable();

        if (courseId.HasValue)
        {
            query = query.Where(v => v.CourseId == courseId.Value);
        }

        if (videoIds != null && videoIds.Any())
        {
            var clean = videoIds.Distinct().ToList();
            query = query.Where(v => clean.Contains(v.Id));
        }
        else if (courseId.HasValue)
        {
            return await query.Select(v => v.Id).ToListAsync();
        }
        else
        {
            return null;
        }

        var existing = await query.Select(v => v.Id).ToListAsync();
        return existing.Any() ? existing : null;
    }

    public async Task<ChatResponseDto> ChatWithAiAsync(string question, int userId, string? conversationId, List<int>? videoIds = null, int? courseId = null)
    {
        var conversation = await _memoryService.GetOrCreateConversationAsync(userId, conversationId, courseId);
        var convId = conversation.Id;
        var accessibleVideoIds = await GetAccessibleVideoIdsAsync(videoIds, courseId);

        var history = await _memoryService.GetHistoryAsync(convId, userId);

        string answer;
        List<SourceDto> sources = new();

        if (IsGeneralChat(question))
        {
            answer = await _geminiService.GenerateContentAsync(question, maxTokens: 2048, systemInstruction: _promptService.ChatSystemInstruction);
        }
        else
        {
            var rewrittenQuestion = await _queryRewriter.RewriteQuestionAsync(question, history);
            var searchResult = await _searchService.SearchAsync(rewrittenQuestion, userId, accessibleVideoIds, courseId);
            sources = searchResult.Sources;

            if (searchResult.IsMentionQuestion)
            {
                if (searchResult.MentionOccurrences.Any())
                {
                    var occBlocks = searchResult.MentionOccurrences.Select((occ, idx) =>
                        $"OCCURRENCE {idx + 1}\nTimestamp: {occ.TimestampStr}\nStart Seconds: {occ.StartTime:F1}\nVideo Title: {occ.VideoTitle}\nTranscript Text: {occ.Text}");
                    var occSummary = string.Join("\n\n", occBlocks);

                    var mentionPrompt = _promptService.BuildMentionPrompt(rewrittenQuestion, occSummary, searchResult.MentionOccurrences.Count);
                    answer = await _geminiService.GenerateContentAsync(mentionPrompt, maxTokens: 4096, systemInstruction: _promptService.ChatSystemInstruction);
                }
                else
                {
                    answer = courseId.HasValue
                        ? "I couldn't find a relevant mention of the requested topic in this course's video transcripts."
                        : "I couldn't find a relevant mention of the requested topic in the available transcript.";
                }
            }
            else
            {
                if (searchResult.Context == "NO_RELEVANT_VIDEO_CONTEXT" || string.IsNullOrWhiteSpace(searchResult.Context))
                {
                    answer = courseId.HasValue
                        ? "I couldn't find enough relevant information in this course's videos to answer your question."
                        : "I couldn't find enough relevant information in the uploaded video to answer your question.";
                }
                else
                {
                    answer = await _geminiService.AskGeminiAsync(rewrittenQuestion, searchResult.Context);
                }
            }
        }

        await _memoryService.AddMessageAsync(convId, userId, "User", question);
        await _memoryService.AddMessageAsync(convId, userId, "Assistant", answer);

        return new ChatResponseDto
        {
            Answer = answer,
            Sources = sources,
            ConversationId = convId
        };
    }

    public async IAsyncEnumerable<string> ChatWithAiStreamAsync(
        string question,
        int userId,
        string conversationId,
        List<int>? videoIds,
        int? courseId = null,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var accessibleVideoIds = await GetAccessibleVideoIdsAsync(videoIds, courseId);
        var history = await _memoryService.GetHistoryAsync(conversationId, userId);

        string fullAnswer;
        if (IsGeneralChat(question))
        {
            fullAnswer = await _geminiService.GenerateContentAsync(question, maxTokens: 2048, systemInstruction: _promptService.ChatSystemInstruction);
        }
        else
        {
            var rewrittenQuestion = await _queryRewriter.RewriteQuestionAsync(question, history);
            var searchResult = await _searchService.SearchAsync(rewrittenQuestion, userId, accessibleVideoIds, courseId);

            if (searchResult.IsMentionQuestion && searchResult.MentionOccurrences.Any())
            {
                var occBlocks = searchResult.MentionOccurrences.Select((occ, idx) =>
                    $"OCCURRENCE {idx + 1}\nTimestamp: {occ.TimestampStr}\nStart Seconds: {occ.StartTime:F1}\nVideo Title: {occ.VideoTitle}\nTranscript Text: {occ.Text}");
                var occSummary = string.Join("\n\n", occBlocks);
                var mentionPrompt = _promptService.BuildMentionPrompt(rewrittenQuestion, occSummary, searchResult.MentionOccurrences.Count);
                fullAnswer = await _geminiService.GenerateContentAsync(mentionPrompt, maxTokens: 4096, systemInstruction: _promptService.ChatSystemInstruction);
            }
            else if (searchResult.Context == "NO_RELEVANT_VIDEO_CONTEXT" || string.IsNullOrWhiteSpace(searchResult.Context))
            {
                fullAnswer = courseId.HasValue
                    ? "I couldn't find enough relevant information in this course's videos to answer your question."
                    : "I couldn't find enough relevant information in the uploaded video to answer your question.";
            }
            else
            {
                fullAnswer = await _geminiService.AskGeminiAsync(rewrittenQuestion, searchResult.Context);
            }
        }

        await _memoryService.AddMessageAsync(conversationId, userId, "User", question);
        await _memoryService.AddMessageAsync(conversationId, userId, "Assistant", fullAnswer);

        var words = fullAnswer.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (words.Length == 0)
        {
            yield return fullAnswer;
        }
        else
        {
            for (int i = 0; i < words.Length; i++)
            {
                var piece = (i == words.Length - 1) ? words[i] : words[i] + " ";
                yield return piece;
                await Task.Delay(15, cancellationToken);
            }
        }
    }

    private async Task<(string Context, List<SourceDto> Sources)> BuildFullVideoContextAsync(List<int>? videoIds)
    {
        var accessibleVideoIds = await GetAccessibleVideoIdsAsync(videoIds);

        var query = _db.Transcripts
            .Include(t => t.Video)
            .Where(t => t.Video != null);

        if (accessibleVideoIds != null && accessibleVideoIds.Any())
        {
            query = query.Where(t => accessibleVideoIds.Contains(t.VideoId));
        }

        var transcripts = await query.Take(10).ToListAsync();

        if (!transcripts.Any())
        {
            return ("NO_RELEVANT_VIDEO_CONTEXT", new List<SourceDto>());
        }

        var contextBlocks = new List<string>();
        var sources = new List<SourceDto>();

        for (int i = 0; i < transcripts.Count; i++)
        {
            var t = transcripts[i];
            var video = t.Video;
            var title = video?.OriginalFilename ?? video?.Filename ?? $"Video_{video?.Id}";

            var block = $@"VIDEO #{i + 1}
TITLE: {title}
VIDEO ID: {video?.Id}

TRANSCRIPT:
{t.TranscriptText.Trim()}";

            contextBlocks.Add(block);

            sources.Add(new SourceDto
            {
                VideoId = video?.Id,
                VideoTitle = title,
                StartTime = 0,
                EndTime = 0
            });
        }

        var context = "\n\n" + string.Join("\n\n---\n\n", contextBlocks) + "\n";
        return (context, sources);
    }

    public async Task<ChatResponseDto> SummaryWithAiAsync(int userId, List<int>? videoIds = null)
    {
        var (context, sources) = await BuildFullVideoContextAsync(videoIds);
        var answer = await _geminiService.AskSummaryAsync(context);

        return new ChatResponseDto
        {
            Answer = answer,
            Sources = sources
        };
    }

    public async Task<ChatResponseDto> NotesWithAiAsync(int userId, List<int>? videoIds = null)
    {
        var accessibleVideoIds = await GetAccessibleVideoIdsAsync(videoIds);

        if (accessibleVideoIds != null && accessibleVideoIds.Count > 1)
        {
            var allNotes = new List<string>();
            var allSources = new List<SourceDto>();

            for (int idx = 0; idx < accessibleVideoIds.Count; idx++)
            {
                int vId = accessibleVideoIds[idx];
                var (vidContext, vidSources) = await BuildFullVideoContextAsync(new List<int> { vId });
                if (!vidSources.Any()) continue;

                var video = await _db.Videos.FindAsync(vId);
                var title = video?.OriginalFilename ?? video?.Filename ?? $"Video #{idx + 1}";

                var vidAnswer = await _geminiService.AskNotesAsync(vidContext);
                allNotes.Add($"# Video #{idx + 1}: {title}\n\n{vidAnswer}");
                allSources.AddRange(vidSources);
            }

            if (allNotes.Any())
            {
                return new ChatResponseDto
                {
                    Answer = string.Join("\n\n---\n\n", allNotes),
                    Sources = allSources
                };
            }
        }

        var (singleContext, singleSources) = await BuildFullVideoContextAsync(accessibleVideoIds);
        var answer = await _geminiService.AskNotesAsync(singleContext);

        return new ChatResponseDto
        {
            Answer = answer,
            Sources = singleSources
        };
    }

    public async Task<ChatResponseDto> QuizWithAiAsync(int userId, string difficulty = "Medium", int questions = 10, List<int>? videoIds = null)
    {
        var (context, sources) = await BuildFullVideoContextAsync(videoIds);

        var rawAnswer = await _geminiService.AskQuizAsync(context, difficulty, questions);
        var validatedJson = ValidateQuizResponse(rawAnswer, context, difficulty, questions);

        return new ChatResponseDto
        {
            Answer = validatedJson,
            Sources = sources
        };
    }

    private string ValidateQuizResponse(string answer, string context, string difficulty, int requestedCount)
    {
        if (string.IsNullOrWhiteSpace(answer))
        {
            return GenerateFallbackQuiz(context, requestedCount);
        }

        var cleaned = answer.Trim();

        // 1. Strip markdown code fences if present
        if (cleaned.Contains("```"))
        {
            var match = System.Text.RegularExpressions.Regex.Match(cleaned, @"```(?:json)?\s*([\s\S]*?)\s*```", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (match.Success)
            {
                cleaned = match.Groups[1].Value.Trim();
            }
            else
            {
                var firstFence = cleaned.IndexOf("```");
                var lastFence = cleaned.LastIndexOf("```");
                if (firstFence >= 0 && lastFence > firstFence)
                {
                    var inner = cleaned.Substring(firstFence + 3, lastFence - (firstFence + 3));
                    if (inner.StartsWith("json", StringComparison.OrdinalIgnoreCase)) inner = inner.Substring(4);
                    cleaned = inner.Trim();
                }
            }
        }

        // 2. Extract substring between first { or [ and last } or ]
        int firstBrace = cleaned.IndexOf('{');
        int firstBracket = cleaned.IndexOf('[');
        int startIdx = -1;
        if (firstBrace >= 0 && firstBracket >= 0) startIdx = Math.Min(firstBrace, firstBracket);
        else if (firstBrace >= 0) startIdx = firstBrace;
        else if (firstBracket >= 0) startIdx = firstBracket;

        int lastBrace = cleaned.LastIndexOf('}');
        int lastBracket = cleaned.LastIndexOf(']');
        int endIdx = Math.Max(lastBrace, lastBracket);

        if (startIdx >= 0 && endIdx > startIdx)
        {
            cleaned = cleaned.Substring(startIdx, endIdx - startIdx + 1).Trim();
        }

        JsonNode? data = null;
        try
        {
            data = JsonNode.Parse(cleaned);
        }
        catch
        {
            // If direct JSON parse fails, try fallback generation
            return GenerateFallbackQuiz(context, requestedCount);
        }

        JsonArray? questionsList = null;
        if (data is JsonArray arr)
        {
            questionsList = arr;
        }
        else if (data is JsonObject obj)
        {
            if (obj["questions"] is JsonArray qArr) questionsList = qArr;
            else if (obj["quiz"] is JsonArray quizArr) questionsList = quizArr;
            else if (obj["quiz_questions"] is JsonArray qqArr) questionsList = qqArr;
            else
            {
                foreach (var kvp in obj)
                {
                    if (kvp.Value is JsonArray vArr && vArr.Count > 0 && vArr[0] is JsonObject)
                    {
                        questionsList = vArr;
                        break;
                    }
                }
            }
        }

        if (questionsList == null || questionsList.Count == 0)
        {
            return GenerateFallbackQuiz(context, requestedCount);
        }

        var normalizedList = new List<object>();

        for (int i = 0; i < questionsList.Count; i++)
        {
            var q = questionsList[i] as JsonObject;
            if (q == null) continue;

            var qText = q["question"]?.GetValue<string>() 
                ?? q["question_text"]?.GetValue<string>() 
                ?? q["prompt"]?.GetValue<string>() 
                ?? string.Empty;
            qText = qText.Trim();
            if (string.IsNullOrWhiteSpace(qText)) continue;

            // Options extraction
            var options = new List<string>();
            if (q["options"] is JsonArray optArr)
            {
                foreach (var opt in optArr)
                {
                    if (opt != null) options.Add(opt.ToString().Trim());
                }
            }
            else if (q["options"] is JsonObject optObj)
            {
                foreach (var kvp in optObj)
                {
                    if (kvp.Value != null) options.Add(kvp.Value.ToString().Trim());
                }
            }

            // Ensure we have at least 2 options, otherwise skip
            if (options.Count < 2) continue;

            // Pad or trim options to exactly 4 options
            while (options.Count < 4)
            {
                if (options.Count == 2) options.Add("Both A and B");
                else if (options.Count == 3) options.Add("None of the above");
                else options.Add($"Option {options.Count + 1}");
            }
            if (options.Count > 4)
            {
                options = options.Take(4).ToList();
            }

            // Correct answer index resolution
            int ansIdx = 0;
            var rawAns = q["correct_answer"] ?? q["answer"] ?? q["correct_option"];
            if (rawAns != null)
            {
                if (rawAns is JsonValue jVal && jVal.TryGetValue<int>(out int intVal))
                {
                    ansIdx = (intVal >= 0 && intVal <= 3) ? intVal : (intVal >= 1 && intVal <= 4 ? intVal - 1 : 0);
                }
                else
                {
                    var strVal = rawAns.ToString().Trim();
                    if (int.TryParse(strVal, out int parsedIdx))
                    {
                        ansIdx = (parsedIdx >= 0 && parsedIdx <= 3) ? parsedIdx : (parsedIdx >= 1 && parsedIdx <= 4 ? parsedIdx - 1 : 0);
                    }
                    else
                    {
                        // Check letter A/B/C/D
                        var upper = strVal.ToUpperInvariant();
                        if (upper == "A" || upper == "OPTION A" || upper == "0") ansIdx = 0;
                        else if (upper == "B" || upper == "OPTION B" || upper == "1") ansIdx = 1;
                        else if (upper == "C" || upper == "OPTION C" || upper == "2") ansIdx = 2;
                        else if (upper == "D" || upper == "OPTION D" || upper == "3") ansIdx = 3;
                        else
                        {
                            int matchIdx = options.FindIndex(o => o.Equals(strVal, StringComparison.OrdinalIgnoreCase));
                            if (matchIdx >= 0 && matchIdx <= 3) ansIdx = matchIdx;
                        }
                    }
                }
            }

            var topic = q["topic"]?.GetValue<string>() ?? "Core Concept";
            var explanation = q["explanation"]?.GetValue<string>() ?? $"Option {ansIdx + 1} is correct according to the video lesson.";

            normalizedList.Add(new
            {
                question = qText,
                options = options,
                correct_answer = ansIdx,
                answer = ansIdx,
                topic = topic.Trim(),
                explanation = explanation.Trim()
            });
        }

        if (!normalizedList.Any())
        {
            return GenerateFallbackQuiz(context, requestedCount);
        }

        return JsonSerializer.Serialize(new { questions = normalizedList });
    }

    private static string GenerateFallbackQuiz(string context, int count)
    {
        var questions = new List<object>();
        var cleanContext = context.Replace("NO_RELEVANT_VIDEO_CONTEXT", "").Trim();
        var lines = cleanContext
            .Split(new[] { '\n', '.', '?' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(l => l.Trim())
            .Where(l => l.Length > 25 && !l.StartsWith("VIDEO") && !l.StartsWith("TITLE") && !l.StartsWith("TRANSCRIPT"))
            .Distinct()
            .Take(Math.Max(5, count))
            .ToList();

        if (!lines.Any())
        {
            lines = new List<string>
            {
                "Computers process digital instructions to execute user tasks.",
                "Hardware components work in coordination with system software.",
                "Input devices translate user actions into digital signals.",
                "Storage devices retain data persistently for software execution.",
                "Network connections allow devices to exchange data and access web resources."
            };
        }

        for (int i = 0; i < Math.Min(lines.Count, Math.Max(5, count)); i++)
        {
            var line = lines[i];
            var qText = $"Which of the following statements is supported by the video content?";
            if (line.Length < 90)
            {
                qText = $"Based on the video lesson, which statement accurately describes: \"{line}\"?";
            }

            questions.Add(new
            {
                question = qText,
                options = new List<string>
                {
                    line,
                    "This concept is not relevant to modern computing systems.",
                    "Hardware functions completely independently without instruction.",
                    "None of the above statements are accurate."
                },
                correct_answer = 0,
                answer = 0,
                topic = "Video Knowledge Check",
                explanation = $"According to the video lesson: {line}"
            });
        }

        return JsonSerializer.Serialize(new { questions = questions });
    }
}
