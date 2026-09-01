using VideoIntelligencePlatform.Backend.DTOs;

namespace VideoIntelligencePlatform.Backend.Services;

public class ChunkMatch
{
    public int ChunkId { get; set; }
    public int ChunkIndex { get; set; }
    public int VideoId { get; set; }
    public string VideoTitle { get; set; } = string.Empty;
    public string Filename { get; set; } = string.Empty;
    public int TranscriptId { get; set; }
    public double StartTime { get; set; }
    public double EndTime { get; set; }
    public string Text { get; set; } = string.Empty;
    public double Score { get; set; }
}

public class MentionOccurrence
{
    public int VideoId { get; set; }
    public string VideoTitle { get; set; } = string.Empty;
    public double StartTime { get; set; }
    public double EndTime { get; set; }
    public string TimestampStr { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

public class SearchResult
{
    public string Query { get; set; } = string.Empty;
    public List<ChunkMatch> Matches { get; set; } = new();
    public string Context { get; set; } = string.Empty;
    public List<SourceDto> Sources { get; set; } = new();
    public bool IsMentionQuestion { get; set; }
    public List<MentionOccurrence> MentionOccurrences { get; set; } = new();
}

public interface ISearchService
{
    Task<SearchResult> SearchAsync(string query, int userId, List<int>? videoIds = null, int? courseId = null);
    Task<List<ChunkMatch>> SearchChunksRawAsync(string query, int userId, List<int>? videoIds = null, int? courseId = null, int topK = 20);
    string FormatSecondsToTimestamp(double seconds);
    bool IsMentionQuestion(string question);
}
