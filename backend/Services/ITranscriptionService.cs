namespace VideoIntelligencePlatform.Backend.Services;

public class TranscriptionSegmentResult
{
    public int SegmentIndex { get; set; }
    public double Start { get; set; }
    public double End { get; set; }
    public string Text { get; set; } = string.Empty;
}

public class TranscriptionResult
{
    public string Language { get; set; } = "en";
    public string FullText { get; set; } = string.Empty;
    public List<TranscriptionSegmentResult> Segments { get; set; } = new();
}

public interface ITranscriptionService
{
    Task<string> PreprocessVideoToAudioAsync(string videoPath);
    Task<TranscriptionResult> TranscribeVideoAsync(string videoPath, Action<int, string>? progressCallback = null);
}
