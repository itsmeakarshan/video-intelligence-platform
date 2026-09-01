using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.DTOs;
using VideoIntelligencePlatform.Backend.Models;
using YoutubeExplode;
using YoutubeExplode.Common;

namespace VideoIntelligencePlatform.Backend.Services;

public class YouTubeRecommendationService : IYouTubeRecommendationService
{
    private readonly AppDbContext _db;
    private readonly string? _youtubeApiKey;
    private readonly HttpClient _httpClient;
    private readonly YoutubeClient _youtubeClient = new();
    private readonly IKnowledgeProfileService _knowledgeProfileService;
    private readonly ILogger<YouTubeRecommendationService> _logger;

    private const double MinRelevanceThreshold = 5.0;

    private static readonly HashSet<string> EducationalKeywords = new(StringComparer.OrdinalIgnoreCase)
    {
        "tutorial", "explained", "guide", "how to", "basics", "course", "learn", "introduction", "mastery", "overview"
    };

    private class OffDomainRule
    {
        public string[] SourceIndicators { get; set; } = Array.Empty<string>();
        public string[] BadKeywords { get; set; } = Array.Empty<string>();
        public double Penalty { get; set; } = -25.0;
    }

    private static readonly List<OffDomainRule> OffDomainRules = new()
    {
        new OffDomainRule
        {
            SourceIndicators = new[] { "mac os x", "macos", "windows", "computer basics", "touch screen", "scrolling", "desktop", "operating system" },
            BadKeywords = new[] { "scratch", "unity", "unreal", "game maker", "godot", "game dev", "game background", "sprite", "game engine", "code tutorial", "css scrolling" },
            Penalty = -25.0
        },
        new OffDomainRule
        {
            SourceIndicators = new[] { "web browser", "browser", "internet", "visiting websites", "check email", "google chrome", "safari", "firefox" },
            BadKeywords = new[] { "browser engine", "chromium source code", "browser architecture", "v8 engine", "building a browser", "c++ browser", "browser security research" },
            Penalty = -25.0
        },
        new OffDomainRule
        {
            SourceIndicators = new[] { "desktop computer", "setup", "connecting", "peripherals", "monitor", "keyboard", "cables", "pc setup" },
            BadKeywords = new[] { "liquid nitrogen", "extreme overclocking", "bios flashing", "custom loop water cooling", "delidding", "overclocking record" },
            Penalty = -25.0
        },
        new OffDomainRule
        {
            SourceIndicators = new[] { "applications", "apps", "create documents", "word processing", "spreadsheet", "office apps" },
            BadKeywords = new[] { "flutter", "react native", "swiftui", "android studio", "xcode", "ios app development", "android app development", "mobile app dev" },
            Penalty = -25.0
        },
        new OffDomainRule
        {
            SourceIndicators = new[] { "computer", "pc", "graphics", "gpu", "hardware", "desktop", "case", "motherboard", "display" },
            BadKeywords = new[] { "led wall", "video wall", "vdwall", "led display processor", "stage led", "billboard", "hdp-601", "lvp605", "novastar", "colorlight", "video wall processor" },
            Penalty = -25.0
        },
        new OffDomainRule
        {
            SourceIndicators = new[] { "computer", "pc", "ram", "hardware", "bytes", "storage", "system memory" },
            BadKeywords = new[] { "psychology", "brain memory", "human memory", "cognitive", "dementia", "memorization", "neuroscience" },
            Penalty = -25.0
        },
        new OffDomainRule
        {
            SourceIndicators = new[] { "computer", "pc", "hard drive", "storage", "disk", "ssd", "hdd" },
            BadKeywords = new[] { "driving test", "car drive", "golf drive", "test drive", "driveway", "road test" },
            Penalty = -25.0
        },
        new OffDomainRule
        {
            SourceIndicators = new[] { "computer", "pc", "tower", "hardware", "chassis" },
            BadKeywords = new[] { "court case", "legal case", "lawyer", "iphone case", "phone case", "leather case", "briefcase" },
            Penalty = -25.0
        }
    };

    public YouTubeRecommendationService(
        AppDbContext db,
        IConfiguration configuration,
        HttpClient httpClient,
        IKnowledgeProfileService knowledgeProfileService,
        ILogger<YouTubeRecommendationService> logger)
    {
        _db = db;
        _httpClient = httpClient;
        _knowledgeProfileService = knowledgeProfileService;
        _logger = logger;
        _youtubeApiKey = configuration["YouTubeApiKey"] ?? Environment.GetEnvironmentVariable("YOUTUBE_API_KEY");
    }

    private static string CleanSourceVideoTitle(string? title)
    {
        if (string.IsNullOrWhiteSpace(title)) return string.Empty;
        var cleaned = Regex.Replace(title, @"\.(mp4|mkv|avi|mov|webm)$", "", RegexOptions.IgnoreCase);
        cleaned = Regex.Replace(cleaned, @"[\-_]", " ");
        cleaned = Regex.Replace(cleaned, @"\b(720p|1080p|hd|4k|video|official|synthetic|user|\d+)\b", " ", RegexOptions.IgnoreCase);
        return Regex.Replace(cleaned, @"\s+", " ").Trim();
    }

    private string BuildContextualQuery(
        string topic,
        string videoContext = "",
        string sampleQuestion = "",
        string correctAnswer = "",
        string explanation = "",
        bool isFallback = false)
    {
        var topicClean = topic.Trim();
        var topicLower = topicClean.ToLowerInvariant();
        var combinedText = $"{videoContext} {sampleQuestion} {correctAnswer} {explanation}".ToLowerInvariant();

        string domainPrefix = string.Empty;
        if (combinedText.Contains("mac os") || combinedText.Contains("macos") || combinedText.Contains("mac"))
            domainPrefix = "mac os x";
        else if (combinedText.Contains("windows"))
            domainPrefix = "windows";
        else if (combinedText.Contains("web browser") || combinedText.Contains("browser"))
            domainPrefix = "web browser";
        else if (combinedText.Contains("computer") || combinedText.Contains("pc") || combinedText.Contains("hardware"))
            domainPrefix = "computer";
        else if (!string.IsNullOrWhiteSpace(videoContext))
        {
            var words = Regex.Replace(videoContext, @"[^a-zA-Z0-9\s]", "").Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(w => w.Length > 2).Take(2).ToList();
            if (words.Any()) domainPrefix = string.Join(" ", words);
        }

        string extraRefinement = string.Empty;
        if (topicLower.Contains("scrolling") || topicLower.Contains("scroll"))
            extraRefinement = "gestures page navigation";
        else if (topicLower.Contains("browser") || topicLower.Contains("web browser"))
            extraRefinement = "using internet navigation";
        else if (topicLower.Contains("desktop") || topicLower.Contains("setup"))
            extraRefinement = "pc hardware connection setup";
        else if (topicLower.Contains("application") || topicLower.Contains("apps"))
            extraRefinement = "creating documents office software";
        else if (topicLower == "video processor")
            extraRefinement = "graphics display";
        else if (topicLower == "memory")
            extraRefinement = "ram hardware";

        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(domainPrefix) && !topicLower.Contains(domainPrefix))
            parts.Add(domainPrefix);

        parts.Add(topicClean);

        if (!isFallback && !string.IsNullOrWhiteSpace(extraRefinement) && !topicLower.Contains(extraRefinement))
            parts.Add(extraRefinement);

        parts.Add("explained tutorial");

        return string.Join(" ", parts);
    }

    private async Task<List<YouTubeRecommendationDto>> SearchYouTubeAsync(string query, int maxResults = 6)
    {
        if (!string.IsNullOrWhiteSpace(_youtubeApiKey))
        {
            try
            {
                var encoded = Uri.EscapeDataString(query);
                var url = $"https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults={maxResults}&q={encoded}&key={_youtubeApiKey}";
                var response = await _httpClient.GetStringAsync(url);
                using var doc = JsonDocument.Parse(response);

                var list = new List<YouTubeRecommendationDto>();
                if (doc.RootElement.TryGetProperty("items", out var items))
                {
                    foreach (var item in items.EnumerateArray())
                    {
                        var vId = item.GetProperty("id").GetProperty("videoId").GetString();
                        var snippet = item.GetProperty("snippet");
                        if (!string.IsNullOrWhiteSpace(vId))
                        {
                            list.Add(new YouTubeRecommendationDto
                            {
                                YoutubeVideoId = vId,
                                Title = snippet.GetProperty("title").GetString() ?? string.Empty,
                                ChannelName = snippet.GetProperty("channelTitle").GetString() ?? "YouTube",
                                Description = snippet.GetProperty("description").GetString() ?? string.Empty,
                                ThumbnailUrl = $"https://i.ytimg.com/vi/{vId}/mqdefault.jpg",
                                Url = $"https://www.youtube.com/watch?v={vId}"
                            });
                        }
                    }
                }
                if (list.Any()) return list;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "YouTube API search failed for '{Query}'", query);
            }
        }

        // Native YoutubeExplode search fallback
        try
        {
            var results = new List<YouTubeRecommendationDto>();
            int count = 0;
            await foreach (var video in _youtubeClient.Search.GetVideosAsync(query))
            {
                var vId = video.Id.Value;
                results.Add(new YouTubeRecommendationDto
                {
                    YoutubeVideoId = vId,
                    Title = video.Title,
                    ChannelName = video.Author.ChannelTitle,
                    Description = $"Learn more about {video.Title}.",
                    ThumbnailUrl = video.Thumbnails.OrderByDescending(t => t.Resolution.Area).FirstOrDefault()?.Url 
                        ?? $"https://i.ytimg.com/vi/{vId}/mqdefault.jpg",
                    Url = video.Url
                });
                count++;
                if (count >= maxResults) break;
            }
            return results;
        }

        catch (Exception ex)
        {
            _logger.LogWarning(ex, "YoutubeExplode search failed for '{Query}'", query);
            return new List<YouTubeRecommendationDto>();
        }
    }

    private double CalculateRelevanceScore(
        YouTubeRecommendationDto video,
        string topic,
        string videoContext,
        string sampleQuestion,
        string correctAnswer,
        string explanation)
    {
        double score = 0.0;
        var titleLower = video.Title.ToLowerInvariant();
        var descLower = video.Description.ToLowerInvariant();
        var combinedVideoText = $"{titleLower} {descLower}";

        var topicLower = topic.ToLowerInvariant();
        var topicWords = topicLower.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();

        // 1. Topic word matching in title
        var matchedTitleWords = topicWords.Count(w => titleLower.Contains(w));
        score += ((double)matchedTitleWords / Math.Max(topicWords.Count, 1)) * 3.0;

        // 2. Educational keyword matching
        foreach (var kw in EducationalKeywords)
        {
            if (titleLower.Contains(kw))
            {
                score += 1.5;
                break;
            }
        }

        // 3. Topic word matching in description
        foreach (var w in topicWords)
        {
            if (descLower.Contains(w)) score += 0.5;
        }

        // 4. Learning Concept Alignment
        var combinedConceptText = $"{videoContext} {sampleQuestion} {correctAnswer} {explanation}".ToLowerInvariant();
        var stopwords = new HashSet<string> { "in", "the", "video", "how", "is", "of", "and", "on", "a", "page", "described", "what", "does", "to", "for", "it", "with", "this", "or", "an", "be", "are" };
        var conceptWords = Regex.Replace(combinedConceptText, @"[^a-zA-Z0-9\s]", "")
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 3 && !stopwords.Contains(w))
            .ToHashSet();

        var matchedConcept = conceptWords.Count(cw => titleLower.Contains(cw));
        score += matchedConcept * 2.5;

        // 5. Source Domain Match Boost
        var domainTerms = new[] { "mac", "macos", "macbook", "windows", "computer", "pc", "graphics", "gpu", "hardware", "storage", "browser", "internet", "desktop" };
        var matchedDomain = domainTerms.Count(dt => combinedConceptText.Contains(dt) && titleLower.Contains(dt));
        score += matchedDomain * 3.0;

        // 6. Off-domain cross-disambiguation penalties
        foreach (var rule in OffDomainRules)
        {
            bool isSourceInDomain = rule.SourceIndicators.Any(ind => combinedConceptText.Contains(ind));
            if (isSourceInDomain)
            {
                foreach (var badKw in rule.BadKeywords)
                {
                    if (combinedVideoText.Contains(badKw))
                    {
                        score += rule.Penalty;
                        break;
                    }
                }
            }
        }

        return score;
    }

    public async Task<RecommendationResponseDto> GetQuizAttemptRecommendationsAsync(int attemptId, int userId)
    {
        var attempt = await _db.QuizAttempts
            .Include(q => q.QuizAttemptVideos)
                .ThenInclude(qv => qv.Video)
            .Include(q => q.Video)
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Id == attemptId);

        if (attempt == null)
        {
            return new RecommendationResponseDto
            {
                AttemptId = attemptId,
                Message = "Quiz attempt not found."
            };
        }

        if (attempt.UserId != userId)
        {
            return new RecommendationResponseDto
            {
                AttemptId = attemptId,
                Message = "Access denied."
            };
        }

        var videoContext = string.Empty;
        var firstVid = attempt.QuizAttemptVideos.FirstOrDefault()?.Video ?? attempt.Video;
        if (firstVid != null)
        {
            videoContext = CleanSourceVideoTitle(firstVid.OriginalFilename ?? firstVid.Filename);
        }

        var questions = attempt.Questions.OrderBy(q => q.QuestionIndex).ToList();
        if (!questions.Any())
        {
            return new RecommendationResponseDto
            {
                AttemptId = attemptId,
                Message = "No question data found for this attempt."
            };
        }

        var incorrectQuestions = questions.Where(q => !q.IsCorrect).ToList();
        if (!incorrectQuestions.Any())
        {
            return new RecommendationResponseDto
            {
                AttemptId = attemptId,
                Message = "Great work! You didn't have any clear weak areas in this quiz."
            };
        }

        var topicData = new Dictionary<string, (int Count, string SampleQuestion, string CorrectAnswer, string Explanation)>();

        foreach (var q in incorrectQuestions)
        {
            var topicClean = _knowledgeProfileService.NormalizeTopicName(q.Topic);
            if (!topicData.TryGetValue(topicClean, out var val))
            {
                val = (0, q.QuestionText, q.CorrectAnswer.ToString(), q.Explanation ?? string.Empty);
            }
            val.Count++;
            topicData[topicClean] = val;
        }

        var sortedWeakTopics = topicData
            .OrderByDescending(t => t.Value.Count)
            .Select(t => new
            {
                Topic = t.Key,
                Count = t.Value.Count,
                t.Value.SampleQuestion,
                t.Value.CorrectAnswer,
                t.Value.Explanation
            })
            .ToList();

        var topWeakTopics = sortedWeakTopics.Take(3).ToList();
        var seenVideoIds = new HashSet<string>();
        var finalRecommendations = new List<YouTubeRecommendationDto>();

        foreach (var tInfo in topWeakTopics)
        {
            var query = BuildContextualQuery(tInfo.Topic, videoContext, tInfo.SampleQuestion, tInfo.CorrectAnswer, tInfo.Explanation, false);
            var candidates = await SearchYouTubeAsync(query, maxResults: 6);

            if (candidates.Count < 2)
            {
                var fallbackQuery = BuildContextualQuery(tInfo.Topic, videoContext, tInfo.SampleQuestion, tInfo.CorrectAnswer, tInfo.Explanation, true);
                if (fallbackQuery != query)
                {
                    var fallbackCandidates = await SearchYouTubeAsync(fallbackQuery, maxResults: 6);
                    foreach (var fc in fallbackCandidates)
                    {
                        if (candidates.All(c => c.YoutubeVideoId != fc.YoutubeVideoId))
                        {
                            candidates.Add(fc);
                        }
                    }
                }
            }

            var scored = new List<(double Score, YouTubeRecommendationDto Video)>();
            foreach (var cand in candidates)
            {
                if (seenVideoIds.Contains(cand.YoutubeVideoId)) continue;

                var relScore = CalculateRelevanceScore(cand, tInfo.Topic, videoContext, tInfo.SampleQuestion, tInfo.CorrectAnswer, tInfo.Explanation);
                if (relScore >= MinRelevanceThreshold)
                {
                    scored.Add((relScore, cand));
                }
            }

            scored = scored.OrderByDescending(x => x.Score).ToList();

            int picked = 0;
            foreach (var (_, cand) in scored)
            {
                seenVideoIds.Add(cand.YoutubeVideoId);
                cand.Topic = tInfo.Topic;
                finalRecommendations.Add(cand);
                picked++;

                if (finalRecommendations.Count >= 6 || picked >= 2) break;
            }

            if (finalRecommendations.Count >= 6) break;
        }

        var cleanWeakTopics = sortedWeakTopics.Select(w => new WeakTopicDto
        {
            Topic = w.Topic,
            IncorrectCount = w.Count
        }).ToList();

        string? message = !finalRecommendations.Any() 
            ? "No highly relevant videos were found for this topic yet." 
            : null;

        return new RecommendationResponseDto
        {
            AttemptId = attemptId,
            WeakTopics = cleanWeakTopics,
            Recommendations = finalRecommendations,
            Message = message
        };
    }
}
