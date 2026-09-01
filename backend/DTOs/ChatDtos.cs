using System.ComponentModel.DataAnnotations;

namespace VideoIntelligencePlatform.Backend.DTOs;

public class ChatRequestDto
{
    [Required]
    public string Question { get; set; } = string.Empty;
    public string? ConversationId { get; set; }
    public List<int>? VideoIds { get; set; }
    public int? CourseId { get; set; }
}

public class SummaryRequestDto
{
    public List<int>? VideoIds { get; set; }
}

public class NotesRequestDto
{
    public List<int>? VideoIds { get; set; }
}

public class QuizRequestDto
{
    public List<int>? VideoIds { get; set; }
    public string Difficulty { get; set; } = "Medium";
    public int Questions { get; set; } = 10;
}

public class SourceDto
{
    public int? VideoId { get; set; }
    public string? VideoTitle { get; set; }
    public int? ChunkId { get; set; }
    public double StartTime { get; set; }
    public double EndTime { get; set; }
}

public class ChatResponseDto
{
    public string Answer { get; set; } = string.Empty;
    public List<SourceDto> Sources { get; set; } = new();
    public string? ConversationId { get; set; }
}

public class ChatMessageItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CourseConversationResponseDto
{
    public string? ConversationId { get; set; }
    public int CourseId { get; set; }
    public List<ChatMessageItemDto> Messages { get; set; } = new();
}

public class GeminiApiKeyUpdateDto
{
    [Required]
    public string ApiKey { get; set; } = string.Empty;
}

public class GeminiApiKeyTestDto
{
    public string? ApiKey { get; set; }
}

public class GeminiApiKeyStatusDto
{
    public bool Configured { get; set; }
    public string MaskedKey { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
}

public class GeminiApiKeyTestResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Model { get; set; }
}

