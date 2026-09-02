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
[Route("")]
[Authorize]
public class CourseSkillsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAiService _aiService;

    public CourseSkillsController(AppDbContext db, IAiService aiService)
    {
        _db = db;
        _aiService = aiService;
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }

    private bool IsAdmin()
    {
        return User.IsInRole("admin");
    }

    // =========================================================================
    // 1. Generate Course Skills with AI (Admin Only)
    // =========================================================================
    [HttpPost("courses/{courseId}/skills/generate")]
    public async Task<IActionResult> GenerateSkills(int courseId)
    {
        if (!IsAdmin())
        {
            return Forbid("Only administrators can generate course skills.");
        }

        try
        {
            var skills = await _aiService.ExtractCourseSkillsAsync(courseId);
            return Ok(new
            {
                message = $"Successfully generated {skills.Count} skills for the course.",
                skills = skills
            });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { detail = "Course not found." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { detail = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { detail = $"Failed to generate skills: {ex.Message}" });
        }
    }

    // =========================================================================
    // 2. Get Course Skills
    // =========================================================================
    [HttpGet("courses/{courseId}/skills")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCourseSkills(int courseId)
    {
        var skills = await _db.CourseSkills
            .Where(s => s.CourseId == courseId)
            .OrderBy(s => s.OrderIndex)
            .Select(s => new CourseSkillDto
            {
                Id = s.Id,
                CourseId = s.CourseId,
                Name = s.Name,
                Description = s.Description,
                Category = s.Category,
                OrderIndex = s.OrderIndex,
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();

        return Ok(skills);
    }

    // =========================================================================
    // 3. Create Custom Course Skill (Admin Only)
    // =========================================================================
    [HttpPost("courses/{courseId}/skills")]
    public async Task<IActionResult> CreateSkill(int courseId, [FromBody] CourseSkillCreateDto request)
    {
        if (!IsAdmin())
        {
            return Forbid("Only administrators can add skills.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { detail = "Skill name is required." });
        }

        var course = await _db.Courses.FindAsync(courseId);
        if (course == null)
        {
            return NotFound(new { detail = "Course not found." });
        }

        var maxOrder = await _db.CourseSkills
            .Where(s => s.CourseId == courseId)
            .Select(s => (int?)s.OrderIndex)
            .MaxAsync() ?? 0;

        var skill = new CourseSkill
        {
            CourseId = courseId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Category = string.IsNullOrWhiteSpace(request.Category) ? "Core Concepts" : request.Category.Trim(),
            OrderIndex = request.OrderIndex ?? (maxOrder + 1),
            CreatedAt = DateTime.UtcNow
        };

        _db.CourseSkills.Add(skill);
        await _db.SaveChangesAsync();

        return Ok(new CourseSkillDto
        {
            Id = skill.Id,
            CourseId = skill.CourseId,
            Name = skill.Name,
            Description = skill.Description,
            Category = skill.Category,
            OrderIndex = skill.OrderIndex,
            CreatedAt = skill.CreatedAt
        });
    }

    // =========================================================================
    // 4. Update Course Skill (Admin Only)
    // =========================================================================
    [HttpPut("courses/{courseId}/skills/{skillId}")]
    public async Task<IActionResult> UpdateSkill(int courseId, int skillId, [FromBody] CourseSkillUpdateDto request)
    {
        if (!IsAdmin())
        {
            return Forbid("Only administrators can edit skills.");
        }

        var skill = await _db.CourseSkills.FirstOrDefaultAsync(s => s.Id == skillId && s.CourseId == courseId);
        if (skill == null)
        {
            return NotFound(new { detail = "Skill not found." });
        }

        if (!string.IsNullOrWhiteSpace(request.Name)) skill.Name = request.Name.Trim();
        if (request.Description != null) skill.Description = request.Description.Trim();
        if (!string.IsNullOrWhiteSpace(request.Category)) skill.Category = request.Category.Trim();
        if (request.OrderIndex.HasValue) skill.OrderIndex = request.OrderIndex.Value;

        await _db.SaveChangesAsync();

        return Ok(new CourseSkillDto
        {
            Id = skill.Id,
            CourseId = skill.CourseId,
            Name = skill.Name,
            Description = skill.Description,
            Category = skill.Category,
            OrderIndex = skill.OrderIndex,
            CreatedAt = skill.CreatedAt
        });
    }

    // =========================================================================
    // 5. Delete Course Skill (Admin Only)
    // =========================================================================
    [HttpDelete("courses/{courseId}/skills/{skillId}")]
    public async Task<IActionResult> DeleteSkill(int courseId, int skillId)
    {
        if (!IsAdmin())
        {
            return Forbid("Only administrators can delete skills.");
        }

        var skill = await _db.CourseSkills.FirstOrDefaultAsync(s => s.Id == skillId && s.CourseId == courseId);
        if (skill == null)
        {
            return NotFound(new { detail = "Skill not found." });
        }

        _db.CourseSkills.Remove(skill);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Skill successfully deleted." });
    }

    // =========================================================================
    // 6. Get Student Mastery Profile for a Course
    // =========================================================================
    [HttpGet("courses/{courseId}/mastery")]
    public async Task<IActionResult> GetStudentCourseMastery(int courseId)
    {
        var userId = GetCurrentUserId();
        var profile = await BuildStudentCourseMasteryProfileAsync(userId, courseId);
        if (profile == null)
        {
            return NotFound(new { detail = "Course not found." });
        }
        return Ok(profile);
    }

    // =========================================================================
    // 7. Get Specific Student Mastery for Course (Admin Only)
    // =========================================================================
    [HttpGet("admin/users/{userId}/course-mastery/{courseId}")]
    public async Task<IActionResult> GetUserCourseMasteryAsAdmin(int userId, int courseId)
    {
        if (!IsAdmin())
        {
            return Forbid("Only administrators can inspect student mastery profiles.");
        }

        var profile = await BuildStudentCourseMasteryProfileAsync(userId, courseId);
        if (profile == null)
        {
            return NotFound(new { detail = "Course or student not found." });
        }
        return Ok(profile);
    }

    // =========================================================================
    // 8. Class-Wide Course Mastery Summary (Admin Only)
    // =========================================================================
    [HttpGet("courses/{courseId}/admin/mastery-summary")]
    public async Task<IActionResult> GetCourseAdminMasterySummary(int courseId)
    {
        if (!IsAdmin())
        {
            return Forbid("Only administrators can access class mastery summary.");
        }

        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
        if (course == null)
        {
            return NotFound(new { detail = "Course not found." });
        }

        var skills = await _db.CourseSkills
            .Where(s => s.CourseId == courseId)
            .OrderBy(s => s.OrderIndex)
            .ToListAsync();

        var enrollments = await _db.CourseEnrollments
            .Include(e => e.User)
            .Where(e => e.CourseId == courseId)
            .ToListAsync();

        var attempts = await _db.QuizAttempts
            .Include(q => q.Questions)
            .Include(q => q.QuizAttemptVideos)
            .Include(q => q.Video)
            .Where(q => (q.Video != null && q.Video.CourseId == courseId) ||
                        q.QuizAttemptVideos.Any(qv => qv.Video != null && qv.Video.CourseId == courseId))
            .ToListAsync();

        var totalQuizzes = attempts.Count;
        var avgScore = totalQuizzes > 0 ? Math.Round(attempts.Average(a => a.Percentage), 1) : 0.0;

        // Group attempts by user
        var attemptsByUser = attempts.GroupBy(a => a.UserId).ToDictionary(g => g.Key, g => g.ToList());

        // Gather all enrolled students (and any students who took quizzes in this course)
        var studentIds = enrollments.Select(e => e.UserId).Union(attemptsByUser.Keys).Distinct().ToList();
        var students = await _db.Users.Where(u => studentIds.Contains(u.Id) && u.Role != "admin").ToListAsync();

        // Compute individual student mastery summaries
        var studentMasteryRows = new List<CourseAdminStudentMasteryRowDto>();
        var skillPerformanceMap = skills.ToDictionary(
            s => s.Id, 
            s => new { Skill = s, MasteredUsers = new HashSet<int>(), NeedsPracticeUsers = new HashSet<int>(), TotalScores = new List<double>() }
        );

        foreach (var student in students)
        {
            attemptsByUser.TryGetValue(student.Id, out var userAttempts);
            var userQuestions = userAttempts != null 
                ? userAttempts.SelectMany(a => a.Questions).ToList() 
                : new List<QuizAttemptQuestion>();

            int masteredSkillsCount = 0;
            double userAvgScore = userAttempts != null && userAttempts.Any() 
                ? Math.Round(userAttempts.Average(a => a.Percentage), 1) 
                : 0.0;

            foreach (var skill in skills)
            {
                var skillQuestions = userQuestions
                    .Where(q => MatchesSkill(q.Topic, skill.Name))
                    .ToList();

                if (skillQuestions.Any())
                {
                    int correct = skillQuestions.Count(q => q.IsCorrect);
                    double pct = Math.Round(((double)correct / skillQuestions.Count) * 100.0, 1);
                    skillPerformanceMap[skill.Id].TotalScores.Add(pct);

                    if (pct >= 80.0)
                    {
                        masteredSkillsCount++;
                        skillPerformanceMap[skill.Id].MasteredUsers.Add(student.Id);
                    }
                    else
                    {
                        skillPerformanceMap[skill.Id].NeedsPracticeUsers.Add(student.Id);
                    }
                }
            }

            studentMasteryRows.Add(new CourseAdminStudentMasteryRowDto
            {
                UserId = student.Id,
                StudentName = student.Name,
                StudentEmail = student.Email,
                QuizzesTaken = userAttempts?.Count ?? 0,
                MasteredSkillsCount = masteredSkillsCount,
                TotalSkillsCount = skills.Count,
                OverallPercentage = userAvgScore,
                LastQuizAt = userAttempts?.OrderByDescending(a => a.CreatedAt).FirstOrDefault()?.CreatedAt
            });
        }

        var skillStats = skills.Select(s =>
        {
            var stat = skillPerformanceMap[s.Id];
            double avgMastery = stat.TotalScores.Any() ? Math.Round(stat.TotalScores.Average(), 1) : 0.0;
            return new CourseAdminSkillStatDto
            {
                SkillId = s.Id,
                SkillName = s.Name,
                Category = s.Category,
                AverageMastery = avgMastery,
                StudentsMasteredCount = stat.MasteredUsers.Count,
                StudentsNeedingPracticeCount = stat.NeedsPracticeUsers.Count,
                TotalTestedStudents = stat.TotalScores.Count
            };
        }).ToList();

        return Ok(new CourseAdminMasterySummaryDto
        {
            CourseId = course.Id,
            CourseTitle = course.Title,
            TotalStudentsEnrolled = students.Count,
            TotalQuizzesAttempted = totalQuizzes,
            AverageScore = avgScore,
            SkillSummaries = skillStats,
            StudentMasteries = studentMasteryRows.OrderByDescending(s => s.MasteredSkillsCount).ToList()
        });
    }

    // =========================================================================
    // 8a. Platform-Wide Mastery Summary (Admin Only)
    // =========================================================================
    [HttpGet("admin/mastery-summary")]
    public async Task<IActionResult> GetOverallAdminMasterySummary([FromQuery] int? courseId)
    {
        if (!IsAdmin())
        {
            return Forbid("Only administrators can access class mastery summary.");
        }

        if (courseId.HasValue && courseId.Value > 0)
        {
            return await GetCourseAdminMasterySummary(courseId.Value);
        }

        var skills = await _db.CourseSkills
            .OrderBy(s => s.CourseId).ThenBy(s => s.OrderIndex)
            .ToListAsync();

        var enrollments = await _db.CourseEnrollments
            .Include(e => e.User)
            .ToListAsync();

        var attempts = await _db.QuizAttempts
            .Include(q => q.Questions)
            .Include(q => q.QuizAttemptVideos)
            .Include(q => q.Video)
            .ToListAsync();

        var totalQuizzes = attempts.Count;
        var avgScore = totalQuizzes > 0 ? Math.Round(attempts.Average(a => a.Percentage), 1) : 0.0;

        var attemptsByUser = attempts.GroupBy(a => a.UserId).ToDictionary(g => g.Key, g => g.ToList());
        var studentIds = enrollments.Select(e => e.UserId).Union(attemptsByUser.Keys).Distinct().ToList();
        var students = await _db.Users.Where(u => studentIds.Contains(u.Id) && u.Role != "admin").ToListAsync();

        var studentMasteryRows = new List<CourseAdminStudentMasteryRowDto>();
        var skillPerformanceMap = skills.ToDictionary(
            s => s.Id, 
            s => new { Skill = s, MasteredUsers = new HashSet<int>(), NeedsPracticeUsers = new HashSet<int>(), TotalScores = new List<double>() }
        );

        foreach (var student in students)
        {
            attemptsByUser.TryGetValue(student.Id, out var userAttempts);
            var userQuestions = userAttempts != null 
                ? userAttempts.SelectMany(a => a.Questions).ToList() 
                : new List<QuizAttemptQuestion>();

            int masteredSkillsCount = 0;
            double userAvgScore = userAttempts != null && userAttempts.Any() 
                ? Math.Round(userAttempts.Average(a => a.Percentage), 1) 
                : 0.0;

            foreach (var skill in skills)
            {
                var skillQuestions = userQuestions
                    .Where(q => MatchesSkill(q.Topic, skill.Name))
                    .ToList();

                if (skillQuestions.Any())
                {
                    int correct = skillQuestions.Count(q => q.IsCorrect);
                    double pct = Math.Round(((double)correct / skillQuestions.Count) * 100.0, 1);
                    skillPerformanceMap[skill.Id].TotalScores.Add(pct);

                    if (pct >= 80.0)
                    {
                        masteredSkillsCount++;
                        skillPerformanceMap[skill.Id].MasteredUsers.Add(student.Id);
                    }
                    else
                    {
                        skillPerformanceMap[skill.Id].NeedsPracticeUsers.Add(student.Id);
                    }
                }
            }

            studentMasteryRows.Add(new CourseAdminStudentMasteryRowDto
            {
                UserId = student.Id,
                StudentName = student.Name,
                StudentEmail = student.Email,
                QuizzesTaken = userAttempts?.Count ?? 0,
                MasteredSkillsCount = masteredSkillsCount,
                TotalSkillsCount = skills.Count,
                OverallPercentage = userAvgScore,
                LastQuizAt = userAttempts?.OrderByDescending(a => a.CreatedAt).FirstOrDefault()?.CreatedAt
            });
        }

        var skillStats = skills.Select(s =>
        {
            var stat = skillPerformanceMap[s.Id];
            double avgMastery = stat.TotalScores.Any() ? Math.Round(stat.TotalScores.Average(), 1) : 0.0;
            return new CourseAdminSkillStatDto
            {
                SkillId = s.Id,
                SkillName = s.Name,
                Category = s.Category,
                AverageMastery = avgMastery,
                StudentsMasteredCount = stat.MasteredUsers.Count,
                StudentsNeedingPracticeCount = stat.NeedsPracticeUsers.Count,
                TotalTestedStudents = stat.TotalScores.Count
            };
        }).ToList();

        return Ok(new CourseAdminMasterySummaryDto
        {
            CourseId = 0,
            CourseTitle = "All Courses (Overall Overview)",
            TotalStudentsEnrolled = students.Count,
            TotalQuizzesAttempted = totalQuizzes,
            AverageScore = avgScore,
            SkillSummaries = skillStats,
            StudentMasteries = studentMasteryRows.OrderByDescending(s => s.MasteredSkillsCount).ThenByDescending(s => s.QuizzesTaken).ToList()
        });
    }

    // =========================================================================
    // Helper: Build Student Course Mastery Profile
    // =========================================================================
    private async Task<CourseMasteryProfileDto?> BuildStudentCourseMasteryProfileAsync(int userId, int courseId)
    {
        Course? course = null;
        if (courseId > 0)
        {
            course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
            if (course == null) return null;
        }
        else
        {
            var userCourseId = await _db.QuizAttempts
                .Where(q => q.UserId == userId && q.Video != null && q.Video.CourseId > 0)
                .Select(q => q.Video!.CourseId)
                .FirstOrDefaultAsync();

            if (userCourseId == 0)
            {
                userCourseId = await _db.CourseSkills.Select(s => s.CourseId).FirstOrDefaultAsync();
            }

            course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == userCourseId) ?? await _db.Courses.FirstOrDefaultAsync();
            if (course == null) return null;
            courseId = course.Id;
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        var userName = user?.Name ?? "Student";

        var skills = await _db.CourseSkills
            .Where(s => s.CourseId == courseId)
            .OrderBy(s => s.OrderIndex)
            .ToListAsync();

        var questions = await _db.QuizAttemptQuestions
            .Include(q => q.QuizAttempt)
                .ThenInclude(qa => qa.Video)
            .Include(q => q.QuizAttempt)
                .ThenInclude(qa => qa.QuizAttemptVideos)
                    .ThenInclude(qv => qv.Video)
            .Where(q => q.QuizAttempt != null && 
                        q.QuizAttempt.UserId == userId &&
                        ((q.QuizAttempt.Video != null && q.QuizAttempt.Video.CourseId == courseId) ||
                         q.QuizAttempt.QuizAttemptVideos.Any(qv => qv.Video != null && qv.Video.CourseId == courseId)))
            .ToListAsync();

        var skillDtos = new List<CourseSkillMasteryDto>();
        int masteredCount = 0;
        int needsPracticeCount = 0;
        int unassessedCount = 0;
        double totalPctSum = 0.0;
        int testedSkillsCount = 0;

        foreach (var s in skills)
        {
            var matchedQuestions = questions
                .Where(q => MatchesSkill(q.Topic, s.Name))
                .ToList();

            int total = matchedQuestions.Count;
            int correct = matchedQuestions.Count(q => q.IsCorrect);
            double pct = total > 0 ? Math.Round(((double)correct / total) * 100.0, 1) : 0.0;

            string status;
            if (total == 0)
            {
                status = "Unassessed";
                unassessedCount++;
            }
            else if (pct >= 80.0)
            {
                status = "Mastered";
                masteredCount++;
                totalPctSum += pct;
                testedSkillsCount++;
            }
            else
            {
                status = "Needs Practice";
                needsPracticeCount++;
                totalPctSum += pct;
                testedSkillsCount++;
            }

            skillDtos.Add(new CourseSkillMasteryDto
            {
                SkillId = s.Id,
                SkillName = s.Name,
                Category = s.Category,
                Description = s.Description,
                QuestionsAttempted = total,
                QuestionsCorrect = correct,
                MasteryPercentage = pct,
                Status = status
            });
        }

        double overall = testedSkillsCount > 0 
            ? Math.Round(totalPctSum / testedSkillsCount, 1) 
            : 0.0;

        return new CourseMasteryProfileDto
        {
            CourseId = course.Id,
            CourseTitle = course.Title,
            UserId = userId,
            UserName = userName,
            OverallMasteryPercentage = overall,
            TotalSkills = skills.Count,
            MasteredCount = masteredCount,
            NeedsPracticeCount = needsPracticeCount,
            UnassessedCount = unassessedCount,
            Skills = skillDtos
        };
    }

    public static bool MatchesSkill(string? questionTopic, string skillName)
    {
        if (string.IsNullOrWhiteSpace(questionTopic) || string.IsNullOrWhiteSpace(skillName))
        {
            return false;
        }

        var q = questionTopic.Trim().ToLowerInvariant();
        var s = skillName.Trim().ToLowerInvariant();

        // 1. Direct exact or substring match
        if (q == s || q.Contains(s) || s.Contains(q)) return true;

        // 2. Token overlap: If significant words match
        var stopWords = new HashSet<string> { "and", "or", "the", "in", "of", "to", "for", "with", "a", "an", "basics", "concepts", "fundamentals" };
        var sWords = s.Split(new[] { ' ', '-', '/', '&' }, StringSplitOptions.RemoveEmptyEntries)
                      .Where(w => w.Length > 3 && !stopWords.Contains(w))
                      .ToList();
        var qWords = q.Split(new[] { ' ', '-', '/', '&' }, StringSplitOptions.RemoveEmptyEntries)
                      .Where(w => w.Length > 3 && !stopWords.Contains(w))
                      .ToList();

        if (sWords.Any(sw => qWords.Any(qw => qw == sw || qw.Contains(sw) || sw.Contains(qw))))
        {
            return true;
        }

        // 3. Domain semantic mapping for curriculum topics
        var topicMappings = new Dictionary<string, string[]>
        {
            ["computer data manipulation"] = new[] { "memory", "storage", "solid state", "binary", "data" },
            ["hardware and software distinction"] = new[] { "hardware basics", "system software", "distinction", "differentiation" },
            ["operating system identification"] = new[] { "operating system", "system software", "os" },
            ["server and network operations"] = new[] { "server", "network", "power delivery" },
            ["desktop hardware configuration"] = new[] { "input devices", "hardware basics", "desktop", "configuration" },
            ["laptop integration and portability"] = new[] { "laptop", "portability", "power delivery" },
            ["ergonomic workspace design"] = new[] { "workspace ergonomics", "workspace safety", "ergonomic" },
            ["monitor and vision optimization"] = new[] { "display interfaces", "monitor", "vision", "display" },
            ["fatigue and clutter management"] = new[] { "health & posture", "workspace safety", "fatigue", "clutter", "posture" }
        };

        foreach (var kvp in topicMappings)
        {
            if (s.Contains(kvp.Key) || kvp.Key.Contains(s))
            {
                if (kvp.Value.Any(keyword => q.Contains(keyword)))
                {
                    return true;
                }
            }
        }

        return false;
    }
}
