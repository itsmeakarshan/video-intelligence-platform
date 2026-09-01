using System.ComponentModel.DataAnnotations;

namespace VideoIntelligencePlatform.Backend.DTOs;

public class VideoSimpleDto
{
    public int Id { get; set; }
    public string Filename { get; set; } = string.Empty;
    public string OriginalFilename { get; set; } = string.Empty;
}

public class QuestionResultCreateDto
{
    public int QuestionIndex { get; set; }

    [Required]
    public string QuestionText { get; set; } = string.Empty;

    public int SelectedAnswer { get; set; }
    public int CorrectAnswer { get; set; }
    public bool IsCorrect { get; set; }
    public string Topic { get; set; } = "General Concept";
    public string? Explanation { get; set; }
}

public class QuizAttemptCreateDto
{
    public List<int>? VideoIds { get; set; }
    public int? VideoId { get; set; }

    [Range(0, int.MaxValue)]
    public int Score { get; set; }

    [Range(1, int.MaxValue)]
    public int TotalQuestions { get; set; }

    [Required]
    [MaxLength(20)]
    public string Difficulty { get; set; } = "Medium";

    public List<QuestionResultCreateDto>? Questions { get; set; }
}

public class QuizAttemptResponseDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int AttemptNumber { get; set; }
    public int Score { get; set; }
    public int TotalQuestions { get; set; }
    public double Percentage { get; set; }
    public string Difficulty { get; set; } = "Medium";
    public DateTime CreatedAt { get; set; }
    public int? VideoId { get; set; }
    public int? CourseId { get; set; }
    public string? CourseTitle { get; set; }
    public List<VideoSimpleDto> Videos { get; set; } = new();
}

public class WeakTopicDto
{
    public string Topic { get; set; } = string.Empty;
    public int IncorrectCount { get; set; }
}

public class YouTubeRecommendationDto
{
    public string Topic { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string YoutubeVideoId { get; set; } = string.Empty;
    public string ThumbnailUrl { get; set; } = string.Empty;
    public string ChannelName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

public class RecommendationResponseDto
{
    public int AttemptId { get; set; }
    public List<WeakTopicDto> WeakTopics { get; set; } = new();
    public List<YouTubeRecommendationDto> Recommendations { get; set; } = new();
    public string? Message { get; set; }
}
