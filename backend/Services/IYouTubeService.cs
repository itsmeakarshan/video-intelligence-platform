namespace VideoIntelligencePlatform.Backend.Services;

public interface IYouTubeService
{
    Task<(string FilePath, string Title)> DownloadVideoAsync(string url, string quality = "720");
}
