using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Services;

public class KnowledgeProfileService : IKnowledgeProfileService
{
    private readonly AppDbContext _db;
    private static readonly TextInfo TextInfo = CultureInfo.InvariantCulture.TextInfo;

    public KnowledgeProfileService(AppDbContext db)
    {
        _db = db;
    }

    public string NormalizeTopicName(string rawTopic)
    {
        if (string.IsNullOrWhiteSpace(rawTopic))
        {
            return "General Computer Concepts";
        }

        var cleaned = rawTopic.Trim();

        if (Regex.IsMatch(cleaned, @"^topic\s+[a-z0-9]$", RegexOptions.IgnoreCase))
        {
            return "General Computer Concepts";
        }

        var lower = cleaned.ToLowerInvariant();
        if (lower.Contains("optical mouse") || lower.Contains("mouse sensor")) return "Optical Mouse Sensors";
        if (lower.Contains("storage sense")) return "Windows Storage Sense";
        if (lower.Contains("touch screen") || lower.Contains("touchscreen")) return "Touch Screen Navigation";
        if (lower.Contains("processor") || lower.Contains("cpu")) return "Processor Architecture";
        if (lower.Contains("memory") || lower.Contains("ram")) return "System Memory";
        if (lower.Contains("cleaning") || lower.Contains("maintenance")) return "Computer Maintenance";
        if (lower.Contains("button") || lower.Contains("port")) return "Computer Buttons & Ports";
        if (lower.Contains("application") || lower.Contains("app")) return "Software Applications";
        if (lower.Contains("slogan") || lower.Contains("gcf")) return "Digital Literacy Basics";

        if (cleaned.EndsWith("s", StringComparison.OrdinalIgnoreCase) && 
            !cleaned.EndsWith("ss", StringComparison.OrdinalIgnoreCase) && 
            cleaned.Length > 4)
        {
            cleaned = cleaned.Substring(0, cleaned.Length - 1);
        }

        return TextInfo.ToTitleCase(cleaned.ToLowerInvariant());
    }

    public async Task<object> GetUserKnowledgeProfileAsync(int userId, int? courseId = null)
    {
        var targetUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        var attemptsQuery = _db.QuizAttempts
            .Include(q => q.QuizAttemptVideos)
                .ThenInclude(qv => qv.Video)
            .Include(q => q.Video)
            .Where(q => q.UserId == userId);

        if (courseId.HasValue)
        {
            attemptsQuery = attemptsQuery.Where(q =>
                (q.Video != null && q.Video.CourseId == courseId.Value) ||
                q.QuizAttemptVideos.Any(qv => qv.Video != null && qv.Video.CourseId == courseId.Value));
        }

        var totalAttempts = await attemptsQuery.CountAsync();

        var avgScoreRaw = totalAttempts > 0 
            ? await attemptsQuery.AverageAsync(q => q.Percentage) 
            : 0.0;
        var avgScore = Math.Round(avgScoreRaw, 1);

        var maxScoreRaw = totalAttempts > 0 
            ? await attemptsQuery.MaxAsync(q => q.Percentage) 
            : 0.0;
        var maxScore = Math.Round(maxScoreRaw, 1);

        var attempts = await attemptsQuery
            .OrderBy(q => q.CreatedAt)
            .ToListAsync();

        var attemptHistory = attempts.Select(att => new
        {
            attempt_id = att.Id.ToString(),
            quiz_id = (att.VideoId ?? att.Id).ToString(),
            timestamp = att.CreatedAt.ToString("o"),
            score_percentage = Math.Round(att.Percentage, 1),
            passed = att.Percentage >= 60.0,
            difficulty = TextInfo.ToTitleCase(att.Difficulty ?? "Medium"),
            topic = TextInfo.ToTitleCase(att.Difficulty ?? "General")
        }).ToList();

        var diffRows = await attemptsQuery
            .GroupBy(q => q.Difficulty)
            .Select(g => new
            {
                Difficulty = g.Key,
                AttemptsCount = g.Count(),
                AvgPercentage = g.Average(q => q.Percentage)
            })
            .ToListAsync();

        var diffMap = diffRows.ToDictionary(r => TextInfo.ToTitleCase(r.Difficulty ?? "Medium"), r => r, StringComparer.OrdinalIgnoreCase);

        var difficultyPerformance = new List<object>();
        foreach (var diff in new[] { "Easy", "Medium", "Hard" })
        {
            if (diffMap.TryGetValue(diff, out var row))
            {
                difficultyPerformance.Add(new
                {
                    difficulty = diff,
                    attempts_count = row.AttemptsCount,
                    avg_percentage = (double?)Math.Round(row.AvgPercentage, 1),
                    has_data = true
                });
            }
            else
            {
                difficultyPerformance.Add(new
                {
                    difficulty = diff,
                    attempts_count = 0,
                    avg_percentage = (double?)null,
                    has_data = false
                });
            }
        }

        var questionsQuery = _db.QuizAttemptQuestions
            .Include(q => q.QuizAttempt)
                .ThenInclude(qa => qa.Video)
            .Include(q => q.QuizAttempt)
                .ThenInclude(qa => qa.QuizAttemptVideos)
                    .ThenInclude(qv => qv.Video)
            .Where(q => q.QuizAttempt != null && q.QuizAttempt.UserId == userId);

        if (courseId.HasValue)
        {
            questionsQuery = questionsQuery.Where(q =>
                (q.QuizAttempt.Video != null && q.QuizAttempt.Video.CourseId == courseId.Value) ||
                q.QuizAttempt.QuizAttemptVideos.Any(qv => qv.Video != null && qv.Video.CourseId == courseId.Value));
        }

        var questions = await questionsQuery.ToListAsync();

        if (!questions.Any())
        {
            return new
            {
                has_data = totalAttempts > 0,
                total_quiz_attempts = totalAttempts,
                total_questions_answered = 0,
                overall_average_percentage = avgScore,
                average_quiz_score_percentage = avgScore,
                highest_score_percentage = maxScore,
                highest_quiz_score_percentage = maxScore,
                overall_mastery_percentage = avgScore,
                attempt_history = attemptHistory,
                topics_breakdown = new List<object>(),
                strong_areas = new List<object>(),
                improving_areas = new List<object>(),
                weak_areas = new List<object>(),
                strong_concepts = new List<string>(),
                weak_concepts = new List<string>(),
                concept_mastery = new List<object>(),
                difficulty_performance = difficultyPerformance,
                summary = new
                {
                    strong_count = 0,
                    improving_count = 0,
                    needs_review_count = 0
                },
                message = "Complete at least 1 quiz to build your personalized Knowledge Profile."
            };
        }

        var topicStats = new Dictionary<string, (int Correct, int Total)>();

        foreach (var q in questions)
        {
            var normTopic = NormalizeTopicName(q.Topic);
            if (!topicStats.TryGetValue(normTopic, out var stat))
            {
                stat = (0, 0);
            }
            stat.Total++;
            if (q.IsCorrect) stat.Correct++;
            topicStats[normTopic] = stat;
        }

        var topicsBreakdown = new List<dynamic>();
        var strongAreas = new List<dynamic>();
        var improvingAreas = new List<dynamic>();
        var weakAreas = new List<dynamic>();
        var strongConceptsList = new List<string>();
        var weakConceptsList = new List<string>();

        double totalMasterySum = 0.0;

        foreach (var (topicName, stat) in topicStats)
        {
            double masteryPct = Math.Round(((double)stat.Correct / stat.Total) * 100.0, 1);
            totalMasterySum += masteryPct;

            string confidence = stat.Total switch
            {
                < 3 => "Low (Limited Data)",
                < 7 => "Moderate",
                _ => "High"
            };

            string level;
            if (masteryPct >= 75.0)
            {
                level = "Strong";
                strongConceptsList.Add(topicName);
            }
            else if (masteryPct >= 60.0)
            {
                level = "Improving";
            }
            else
            {
                level = "Needs Review";
                weakConceptsList.Add(topicName);
            }

            var item = new
            {
                topic = topicName,
                concept = topicName,
                mastery_percentage = masteryPct,
                correct_count = stat.Correct,
                total_count = stat.Total,
                attempts_count = stat.Total,
                confidence = confidence,
                level = level
            };

            topicsBreakdown.Add(item);

            if (masteryPct >= 75.0) strongAreas.Add(item);
            else if (masteryPct >= 60.0) improvingAreas.Add(item);
            else weakAreas.Add(item);
        }

        topicsBreakdown = topicsBreakdown.OrderByDescending(x => (double)x.mastery_percentage).ToList();
        double overallMastery = topicStats.Any() ? Math.Round(totalMasterySum / topicStats.Count, 1) : 0.0;

        return new
        {
            has_data = true,
            user_id = userId.ToString(),
            user_name = targetUser?.Name,
            user_email = targetUser?.Email,
            user_role = targetUser?.Role,
            total_quiz_attempts = totalAttempts,
            total_questions_answered = questions.Count,
            overall_average_percentage = avgScore,
            average_quiz_score_percentage = avgScore,
            highest_score_percentage = maxScore,
            highest_quiz_score_percentage = maxScore,
            overall_mastery_percentage = overallMastery,
            attempt_history = attemptHistory,
            topics_breakdown = topicsBreakdown,
            strong_areas = strongAreas,
            improving_areas = improvingAreas,
            weak_areas = weakAreas,
            strong_concepts = strongConceptsList,
            weak_concepts = weakConceptsList,
            concept_mastery = topicsBreakdown,
            difficulty_performance = difficultyPerformance,
            summary = new
            {
                strong_count = strongAreas.Count,
                improving_count = improvingAreas.Count,
                needs_review_count = weakAreas.Count
            },
            message = (string?)null
        };
    }
}
