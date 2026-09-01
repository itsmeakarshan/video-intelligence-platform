namespace VideoIntelligencePlatform.Backend.DTOs;

public class TranscriptResponseDto
{
    public int Id { get; set; }
    public int VideoId { get; set; }
    public string Language { get; set; } = "en";
    public string Transcript { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class TranscriptSegmentDto
{
    public int Id { get; set; }
    public int TranscriptId { get; set; }
    public int SegmentIndex { get; set; }
    public double StartTime { get; set; }
    public double EndTime { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
