using System.Text.Json.Serialization;

namespace VideoIntelligencePlatform.Backend.DTOs;

public class CourseSkillDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("course_id")]
    public int CourseId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = "Core Concepts";

    [JsonPropertyName("order_index")]
    public int OrderIndex { get; set; } = 1;

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

public class CourseSkillCreateDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("order_index")]
    public int? OrderIndex { get; set; }
}

public class CourseSkillUpdateDto
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("order_index")]
    public int? OrderIndex { get; set; }
}

public class CourseSkillMasteryDto
{
    [JsonPropertyName("skill_id")]
    public int SkillId { get; set; }

    [JsonPropertyName("skill_name")]
    public string SkillName { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("questions_attempted")]
    public int QuestionsAttempted { get; set; }

    [JsonPropertyName("questions_correct")]
    public int QuestionsCorrect { get; set; }

    [JsonPropertyName("mastery_percentage")]
    public double MasteryPercentage { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "Unassessed"; // "Mastered", "Needs Practice", "Unassessed"
}

public class CourseMasteryProfileDto
{
    [JsonPropertyName("course_id")]
    public int CourseId { get; set; }

    [JsonPropertyName("course_title")]
    public string CourseTitle { get; set; } = string.Empty;

    [JsonPropertyName("user_id")]
    public int UserId { get; set; }

    [JsonPropertyName("user_name")]
    public string UserName { get; set; } = string.Empty;

    [JsonPropertyName("overall_mastery_percentage")]
    public double OverallMasteryPercentage { get; set; }

    [JsonPropertyName("total_skills")]
    public int TotalSkills { get; set; }

    [JsonPropertyName("mastered_count")]
    public int MasteredCount { get; set; }

    [JsonPropertyName("needs_practice_count")]
    public int NeedsPracticeCount { get; set; }

    [JsonPropertyName("unassessed_count")]
    public int UnassessedCount { get; set; }

    [JsonPropertyName("skills")]
    public List<CourseSkillMasteryDto> Skills { get; set; } = new();
}

public class CourseAdminSkillStatDto
{
    [JsonPropertyName("skill_id")]
    public int SkillId { get; set; }

    [JsonPropertyName("skill_name")]
    public string SkillName { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("average_mastery")]
    public double AverageMastery { get; set; }

    [JsonPropertyName("students_mastered_count")]
    public int StudentsMasteredCount { get; set; }

    [JsonPropertyName("students_needing_practice_count")]
    public int StudentsNeedingPracticeCount { get; set; }

    [JsonPropertyName("total_tested_students")]
    public int TotalTestedStudents { get; set; }
}

public class CourseAdminStudentMasteryRowDto
{
    [JsonPropertyName("user_id")]
    public int UserId { get; set; }

    [JsonPropertyName("student_name")]
    public string StudentName { get; set; } = string.Empty;

    [JsonPropertyName("student_email")]
    public string StudentEmail { get; set; } = string.Empty;

    [JsonPropertyName("quizzes_taken")]
    public int QuizzesTaken { get; set; }

    [JsonPropertyName("mastered_skills_count")]
    public int MasteredSkillsCount { get; set; }

    [JsonPropertyName("total_skills_count")]
    public int TotalSkillsCount { get; set; }

    [JsonPropertyName("overall_percentage")]
    public double OverallPercentage { get; set; }

    [JsonPropertyName("last_quiz_at")]
    public DateTime? LastQuizAt { get; set; }
}

public class CourseAdminMasterySummaryDto
{
    [JsonPropertyName("course_id")]
    public int CourseId { get; set; }

    [JsonPropertyName("course_title")]
    public string CourseTitle { get; set; } = string.Empty;

    [JsonPropertyName("total_students_enrolled")]
    public int TotalStudentsEnrolled { get; set; }

    [JsonPropertyName("total_quizzes_attempted")]
    public int TotalQuizzesAttempted { get; set; }

    [JsonPropertyName("average_score")]
    public double AverageScore { get; set; }

    [JsonPropertyName("skill_summaries")]
    public List<CourseAdminSkillStatDto> SkillSummaries { get; set; } = new();

    [JsonPropertyName("student_masteries")]
    public List<CourseAdminStudentMasteryRowDto> StudentMasteries { get; set; } = new();
}
