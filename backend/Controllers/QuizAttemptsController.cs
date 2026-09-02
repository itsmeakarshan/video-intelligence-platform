using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.DTOs;
using VideoIntelligencePlatform.Backend.Models;
using VideoIntelligencePlatform.Backend.Services;

namespace VideoIntelligencePlatform.Backend.Controllers;

[ApiController]
[Route("quiz-attempts")]
[Authorize]
public class QuizAttemptsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IYouTubeRecommendationService _recommendationService;
    private readonly IKnowledgeProfileService _knowledgeProfileService;
    private readonly ILearningAnalyticsService _learningAnalyticsService;

    public QuizAttemptsController(
        AppDbContext db,
        IYouTubeRecommendationService recommendationService,
        IKnowledgeProfileService knowledgeProfileService,
        ILearningAnalyticsService learningAnalyticsService)
    {
        _db = db;
        _recommendationService = recommendationService;
        _knowledgeProfileService = knowledgeProfileService;
        _learningAnalyticsService = learningAnalyticsService;
    }

    private int GetCurrentUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("user_id")?.Value
            ?? User.FindFirst("sub")?.Value;

        if (int.TryParse(sub, out var id)) return id;
        throw new UnauthorizedAccessException("Not authenticated.");
    }

    private bool IsAdminUser()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value 
            ?? User.FindFirst("role")?.Value;

        return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase);
    }

    [HttpPost("")]
    public async Task<IActionResult> CreateQuizAttempt([FromBody] QuizAttemptCreateDto request)
    {
        if (request.Score > request.TotalQuestions)
        {
            return UnprocessableEntity(new { detail = "Score cannot exceed total questions." });
        }

        var targetVideoIds = new List<int>();
        if (request.VideoIds != null && request.VideoIds.Any())
        {
            targetVideoIds.AddRange(request.VideoIds);
        }
        if (!targetVideoIds.Any() && request.VideoId.HasValue)
        {
            targetVideoIds.Add(request.VideoId.Value);
        }

        if (!targetVideoIds.Any())
        {
            return BadRequest(new { detail = "At least one video ID must be provided." });
        }

        var uniqueVideoIds = targetVideoIds.Distinct().ToList();
        var userId = GetCurrentUserId();

        var validVideos = await _db.Videos
            .Where(v => uniqueVideoIds.Contains(v.Id))
            .ToListAsync();

        if (!validVideos.Any())
        {
            return NotFound(new { detail = "Selected videos were not found." });
        }

        int? primaryVideoId = validVideos.Count == 1 ? validVideos[0].Id : (int?)null;

        var attempt = new QuizAttempt
        {
            UserId = userId,
            VideoId = primaryVideoId,
            Score = request.Score,
            TotalQuestions = request.TotalQuestions,
            Percentage = ((double)request.Score / request.TotalQuestions) * 100.0,
            Difficulty = request.Difficulty,
            CreatedAt = DateTime.UtcNow
        };

        _db.QuizAttempts.Add(attempt);
        await _db.SaveChangesAsync();

        foreach (var v in validVideos)
        {
            _db.QuizAttemptVideos.Add(new QuizAttemptVideo
            {
                QuizAttemptId = attempt.Id,
                VideoId = v.Id
            });
        }

        if (request.Questions != null && request.Questions.Any())
        {
            int? detectedCourseId = validVideos.FirstOrDefault(v => v.CourseId.HasValue)?.CourseId;
            List<CourseSkill>? courseSkills = null;
            if (detectedCourseId.HasValue)
            {
                courseSkills = await _db.CourseSkills
                    .Where(s => s.CourseId == detectedCourseId.Value)
                    .ToListAsync();
            }

            foreach (var q in request.Questions)
            {
                var assignedTopic = !string.IsNullOrWhiteSpace(q.Topic) ? q.Topic.Trim() : "General Concept";

                if (courseSkills != null && courseSkills.Any())
                {
                    var matchedSkill = courseSkills.FirstOrDefault(s =>
                        CourseSkillsController.MatchesSkill(assignedTopic, s.Name));

                    if (matchedSkill != null)
                    {
                        assignedTopic = matchedSkill.Name;
                    }
                }

                var qEntity = new QuizAttemptQuestion
                {
                    QuizAttemptId = attempt.Id,
                    QuestionIndex = q.QuestionIndex,
                    QuestionText = q.QuestionText.Length > 500 ? q.QuestionText.Substring(0, 500) : q.QuestionText,
                    SelectedAnswer = q.SelectedAnswer,
                    CorrectAnswer = q.CorrectAnswer,
                    IsCorrect = q.IsCorrect,
                    Topic = assignedTopic.Length > 200 ? assignedTopic.Substring(0, 200) : assignedTopic,
                    Explanation = q.Explanation != null && q.Explanation.Length > 1000 
                        ? q.Explanation.Substring(0, 1000) 
                        : q.Explanation
                };
                _db.QuizAttemptQuestions.Add(qEntity);
            }
        }

        await _db.SaveChangesAsync();

        int totalUserAttempts = await _db.QuizAttempts.CountAsync(q => q.UserId == userId);
        var course = validVideos.FirstOrDefault(v => v.Course != null)?.Course;
        if (course == null)
        {
            var cId = validVideos.FirstOrDefault(v => v.CourseId.HasValue)?.CourseId;
            if (cId.HasValue)
            {
                course = await _db.Courses.FindAsync(cId.Value);
            }
        }

        var response = new QuizAttemptResponseDto
        {
            Id = attempt.Id,
            UserId = attempt.UserId,
            AttemptNumber = totalUserAttempts,
            Score = attempt.Score,
            TotalQuestions = attempt.TotalQuestions,
            Percentage = attempt.Percentage,
            Difficulty = attempt.Difficulty,
            CreatedAt = attempt.CreatedAt,
            VideoId = attempt.VideoId,
            CourseId = course?.Id,
            CourseTitle = course?.Title,
            Videos = validVideos.Select(v => new VideoSimpleDto
            {
                Id = v.Id,
                Filename = v.Filename,
                OriginalFilename = v.OriginalFilename
            }).ToList()
        };

        return StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpGet("")]
    public async Task<IActionResult> ListQuizAttempts([FromQuery(Name = "course_id")] int? courseId = null)
    {
        var userId = GetCurrentUserId();

        var query = _db.QuizAttempts
            .Include(q => q.QuizAttemptVideos)
                .ThenInclude(qv => qv.Video)
                    .ThenInclude(v => v.Course)
            .Include(q => q.Video)
                .ThenInclude(v => v.Course)
            .Where(q => q.UserId == userId);

        if (courseId.HasValue)
        {
            query = query.Where(q =>
                (q.Video != null && q.Video.CourseId == courseId.Value) ||
                q.QuizAttemptVideos.Any(qv => qv.Video != null && qv.Video.CourseId == courseId.Value)
            );
        }

        var attempts = await query
            .OrderBy(q => q.CreatedAt)
            .ToListAsync();

        var response = attempts.Select((att, idx) =>
        {
            var vidList = att.QuizAttemptVideos.Select(qv => qv.Video).Where(v => v != null).ToList();
            if (!vidList.Any() && att.Video != null)
            {
                vidList.Add(att.Video);
            }

            var course = vidList.FirstOrDefault(v => v?.Course != null)?.Course ?? att.Video?.Course;

            return new QuizAttemptResponseDto
            {
                Id = att.Id,
                UserId = att.UserId,
                AttemptNumber = idx + 1,
                Score = att.Score,
                TotalQuestions = att.TotalQuestions,
                Percentage = att.Percentage,
                Difficulty = att.Difficulty,
                CreatedAt = att.CreatedAt,
                VideoId = att.VideoId,
                CourseId = course?.Id,
                CourseTitle = course?.Title,
                Videos = vidList.Select(v => new VideoSimpleDto
                {
                    Id = v!.Id,
                    Filename = v.Filename,
                    OriginalFilename = v.OriginalFilename
                }).ToList()
            };
        }).OrderByDescending(a => a.CreatedAt).ToList();

        return Ok(response);
    }

    [HttpGet("knowledge-profile")]
    public async Task<IActionResult> GetKnowledgeProfile(
        [FromQuery] int? userId = null,
        [FromQuery(Name = "course_id")] int? courseId = null)
    {
        var currentUserId = GetCurrentUserId();
        var targetUserId = currentUserId;

        if (userId.HasValue && userId.Value != currentUserId)
        {
            if (!IsAdminUser())
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Only administrators can view other users' learning profiles." });
            }
            targetUserId = userId.Value;
        }

        var profile = await _knowledgeProfileService.GetUserKnowledgeProfileAsync(targetUserId, courseId);
        return Ok(profile);
    }

    [HttpGet("learning-gain")]
    public async Task<IActionResult> GetLearningGain()
    {
        var userId = GetCurrentUserId();
        var analytics = await _learningAnalyticsService.ComputeLearningGainAsync(userId);
        return Ok(analytics);
    }

    [HttpGet("ab-experiment")]
    public async Task<IActionResult> GetAbExperiment()
    {
        var summary = await _learningAnalyticsService.GetAbExperimentSummaryAsync();
        return Ok(summary);
    }

    [HttpGet("{attemptId:int}/recommendations")]
    public async Task<IActionResult> GetRecommendations(int attemptId)
    {
        var userId = GetCurrentUserId();
        var recommendations = await _recommendationService.GetQuizAttemptRecommendationsAsync(attemptId, userId);
        return Ok(recommendations);
    }
}
