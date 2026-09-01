using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace VideoIntelligencePlatform.Backend.DTOs;

public class VideoResponseDto
{
    public int Id { get; set; }
    public int? CourseId { get; set; }
    public int OrderIndex { get; set; } = 1;
    public string Title { get; set; } = string.Empty;
    public string Filename { get; set; } = string.Empty;
    public string OriginalFilename { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string Status { get; set; } = "uploaded";
    public double Progress { get; set; }
    public string CurrentStep { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class YouTubeDownloadRequestDto
{
    [Required]
    public string Url { get; set; } = string.Empty;

    public string Quality { get; set; } = "720";

    public int? CourseId { get; set; }
}

public class YouTubeDownloadResponseDto
{
    public string Message { get; set; } = string.Empty;
    public int VideoId { get; set; }
    public string Filename { get; set; } = string.Empty;
    public string OriginalFilename { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string Status { get; set; } = "uploaded";
    public double Progress { get; set; }
}
