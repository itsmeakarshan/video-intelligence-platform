using System.Diagnostics;
using YoutubeExplode;
using YoutubeExplode.Converter;
using YoutubeExplode.Videos.Streams;

namespace VideoIntelligencePlatform.Backend.Services;

public class YouTubeService : IYouTubeService
{
    private readonly string _uploadFolder;
    private readonly YoutubeClient _youtubeClient = new();

    public YouTubeService(IConfiguration configuration)
    {
        _uploadFolder = configuration["UploadFolder"] ?? "uploads";
        Directory.CreateDirectory(_uploadFolder);
    }

    public async Task<(string FilePath, string Title)> DownloadVideoAsync(string url, string quality = "720")
    {
        url = url.Trim();
        if (string.IsNullOrWhiteSpace(url))
        {
            throw new ArgumentException("YouTube URL is required.");
        }

        if (!url.Contains("youtube.com/") && !url.Contains("youtu.be/"))
        {
            throw new ArgumentException("Please enter a valid YouTube URL.");
        }

        try
        {
            var video = await _youtubeClient.Videos.GetAsync(url);
            var title = VideoService.SanitizeFilename(video.Title);
            if (title.Length > 150)
            {
                title = title.Substring(0, 150);
            }

            var outputFilePath = Path.Combine(_uploadFolder, $"{title}.mp4");

            var streamManifest = await _youtubeClient.Videos.Streams.GetManifestAsync(video.Id);

            int targetHeight = quality switch
            {
                "360" => 360,
                "480" => 480,
                "1080" => 1080,
                _ => 720
            };

            var videoStreamInfo = streamManifest.GetVideoStreams()
                .Where(s => s.Container == Container.Mp4)
                .OrderByDescending(s => s.VideoQuality.MaxHeight <= targetHeight)
                .ThenByDescending(s => s.VideoQuality.MaxHeight)
                .FirstOrDefault() ?? streamManifest.GetVideoStreams().GetWithHighestVideoQuality();

            var audioStreams = streamManifest.GetAudioStreams().ToList();
            // YouTube serves dubbed audio tracks (e.g. Polish, Spanish, German) as separate Opus/AAC streams with language tags.
            // Standard original English audio track on YouTube is served without non-English language tags or with lang=en (typically itag 140 Mp4/AAC).
            var audioStreamInfo = audioStreams.FirstOrDefault(a => 
                    (a.Url.Contains("lang%3Den") || a.Url.Contains("lang=en")) && 
                    !a.Url.Contains("lang%3Dpl") && !a.Url.Contains("lang%3Des") && !a.Url.Contains("lang%3Dde") && !a.Url.Contains("lang%3Dfr") && !a.Url.Contains("lang%3Dhi"))
                ?? audioStreams.FirstOrDefault(a => a.Container == Container.Mp4 && !a.Url.Contains("lang%3D") && !a.Url.Contains("lang="))
                ?? audioStreams.FirstOrDefault(a => a.Container == Container.Mp4)
                ?? audioStreams.FirstOrDefault(a => !a.Url.Contains("lang%3D") && !a.Url.Contains("lang="))
                ?? audioStreams.OrderBy(a => a.Bitrate).FirstOrDefault()
                ?? audioStreams.FirstOrDefault();

            if (videoStreamInfo != null && audioStreamInfo != null)
            {
                var streamInfos = new IStreamInfo[] { audioStreamInfo, videoStreamInfo };
                await _youtubeClient.Videos.DownloadAsync(streamInfos, new ConversionRequestBuilder(outputFilePath).Build());
            }
            else
            {
                var muxedStream = streamManifest.GetMuxedStreams().GetWithHighestVideoQuality();
                if (muxedStream != null)
                {
                    await _youtubeClient.Videos.Streams.DownloadAsync(muxedStream, outputFilePath);
                }
                else
                {
                    throw new InvalidOperationException("No suitable video stream found.");
                }
            }

            return (outputFilePath, video.Title);
        }
        catch (Exception) when (TryYtDlpFallback(url, quality, out var result))
        {
            return result;
        }
    }

    private bool TryYtDlpFallback(string url, string quality, out (string FilePath, string Title) result)
    {
        result = default;
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "yt-dlp",
                Arguments = $"--no-playlist -f \"bestvideo[height<={quality}]+bestaudio[language=en]/bestvideo[height<={quality}]+bestaudio[language=en-US]/bestvideo[height<={quality}]+bestaudio[language^=en]/bestvideo[height<={quality}]+bestaudio/best\" --merge-output-format mp4 -o \"{_uploadFolder}/%(title)s.%(ext)s\" \"{url}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null) return false;

            process.WaitForExit(60000);
            if (process.ExitCode == 0)
            {
                var files = Directory.GetFiles(_uploadFolder, "*.mp4");
                if (files.Length > 0)
                {
                    var latest = files.OrderByDescending(File.GetCreationTimeUtc).First();
                    result = (latest, Path.GetFileNameWithoutExtension(latest));
                    return true;
                }
            }
            return false;
        }
        catch
        {
            return false;
        }
    }
}
