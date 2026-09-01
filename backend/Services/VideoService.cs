using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.DTOs;
using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Services;

public class VideoService : IVideoService
{
    private readonly AppDbContext _db;
    private readonly string _uploadFolder;

    public VideoService(AppDbContext db, IConfiguration configuration)
    {
        _db = db;
        _uploadFolder = configuration["UploadFolder"] ?? "uploads";
        Directory.CreateDirectory(_uploadFolder);
    }

    public static string SanitizeFilename(string filename)
    {
        var baseName = Path.GetFileNameWithoutExtension(filename);
        var extension = Path.GetExtension(filename);

        var cleaned = Regex.Replace(baseName, @"[<>:""/\\|?*#%]", "");
        cleaned = Regex.Replace(cleaned, @"\s+", " ").Trim();

        if (string.IsNullOrWhiteSpace(cleaned))
        {
            cleaned = "video";
        }

        return $"{cleaned}{extension}";
    }

    public async Task<VideoResponseDto> SaveVideoAsync(IFormFile file, int userId, int? courseId = null)
    {
        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = ".mp4";
        }

        var filename = $"{Guid.NewGuid()}{extension}";
        var filepath = Path.Combine(_uploadFolder, filename);

        await using (var stream = new FileStream(filepath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var fileInfo = new FileInfo(filepath);

        int nextOrder = 1;
        if (courseId.HasValue)
        {
            var maxOrder = await _db.Videos
                .Where(v => v.CourseId == courseId.Value)
                .Select(v => (int?)v.OrderIndex)
                .MaxAsync();
            nextOrder = (maxOrder ?? 0) + 1;
        }

        var video = new Video
        {
            UserId = userId,
            CourseId = courseId,
            OrderIndex = nextOrder,
            Title = file.FileName,
            Filename = filename,
            OriginalFilename = file.FileName,
            FilePath = filepath,
            FileSize = fileInfo.Length,
            Status = "queued",
            Progress = 0,
            CurrentStep = "Waiting in queue...",
            CreatedAt = DateTime.UtcNow
        };

        _db.Videos.Add(video);
        await _db.SaveChangesAsync();

        return MapToDto(video);
    }

    public async Task<VideoResponseDto> SaveDownloadedVideoAsync(string filePath, string originalFilename, int userId, int? courseId = null)
    {
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException("Downloaded video file was not found.", filePath);
        }

        var safeFilename = SanitizeFilename(Path.GetFileName(filePath));
        var safeFilePath = Path.Combine(_uploadFolder, safeFilename);

        if (!string.Equals(Path.GetFullPath(filePath), Path.GetFullPath(safeFilePath), StringComparison.OrdinalIgnoreCase))
        {
            if (File.Exists(safeFilePath))
            {
                safeFilename = $"{Guid.NewGuid()}_{safeFilename}";
                safeFilePath = Path.Combine(_uploadFolder, safeFilename);
            }
            File.Move(filePath, safeFilePath);
        }

        var fileInfo = new FileInfo(safeFilePath);

        int nextOrder = 1;
        if (courseId.HasValue)
        {
            var maxOrder = await _db.Videos
                .Where(v => v.CourseId == courseId.Value)
                .Select(v => (int?)v.OrderIndex)
                .MaxAsync();
            nextOrder = (maxOrder ?? 0) + 1;
        }

        var video = new Video
        {
            UserId = userId,
            CourseId = courseId,
            OrderIndex = nextOrder,
            Title = originalFilename,
            Filename = Path.GetFileName(safeFilePath),
            OriginalFilename = originalFilename,
            FilePath = safeFilePath,
            FileSize = fileInfo.Length,
            Status = "uploaded",
            Progress = 0,
            CurrentStep = "Waiting...",
            CreatedAt = DateTime.UtcNow
        };

        _db.Videos.Add(video);
        await _db.SaveChangesAsync();

        return MapToDto(video);
    }

    public async Task<List<VideoResponseDto>> GetAllVideosAsync(int userId, int? courseId = null)
    {
        var query = _db.Videos.AsQueryable();

        if (courseId.HasValue)
        {
            query = query.Where(v => v.CourseId == courseId.Value).OrderBy(v => v.OrderIndex).ThenBy(v => v.Id);
        }
        else
        {
            query = query.OrderByDescending(v => v.Id);
        }

        var videos = await query.ToListAsync();
        return videos.Select(MapToDto).ToList();
    }

    public async Task<(string FilePath, string ContentType, string OriginalFilename)?> GetVideoFileAsync(int videoId, int userId)
    {
        var video = await _db.Videos
            .FirstOrDefaultAsync(v => v.Id == videoId);

        if (video == null || !File.Exists(video.FilePath))
        {
            return null;
        }

        var contentType = GetContentType(video.FilePath);
        return (video.FilePath, contentType, video.OriginalFilename);
    }

    public async Task<bool> DeleteVideoAsync(int videoId, int userId)
    {
        var video = await _db.Videos.FirstOrDefaultAsync(v => v.Id == videoId);
        if (video == null)
        {
            return false;
        }

        try
        {
            if (File.Exists(video.FilePath))
            {
                File.Delete(video.FilePath);
            }
        }
        catch
        {
            // Ignore physical deletion errors
        }

        _db.Videos.Remove(video);
        await _db.SaveChangesAsync();
        return true;
    }

    private static string GetContentType(string filePath)
    {
        var ext = Path.GetExtension(filePath).ToLowerInvariant();
        return ext switch
        {
            ".mp4" => "video/mp4",
            ".webm" => "video/webm",
            ".mov" => "video/quicktime",
            ".avi" => "video/x-msvideo",
            ".mkv" => "video/x-matroska",
            ".m4v" => "video/mp4",
            _ => "application/octet-stream"
        };
    }

    private static VideoResponseDto MapToDto(Video video)
    {
        return new VideoResponseDto
        {
            Id = video.Id,
            CourseId = video.CourseId,
            OrderIndex = video.OrderIndex,
            Title = !string.IsNullOrWhiteSpace(video.Title) ? video.Title : (video.OriginalFilename ?? video.Filename),
            Filename = video.Filename,
            OriginalFilename = video.OriginalFilename,
            FilePath = video.FilePath,
            FileSize = video.FileSize,
            Status = video.Status,
            Progress = video.Progress,
            CurrentStep = video.CurrentStep,
            CreatedAt = video.CreatedAt
        };
    }
}
