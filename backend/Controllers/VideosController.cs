using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.DTOs;
using VideoIntelligencePlatform.Backend.Models;
using VideoIntelligencePlatform.Backend.Services;

namespace VideoIntelligencePlatform.Backend.Controllers;

[ApiController]
[Route("videos")]
public class VideosController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IVideoService _videoService;
    private readonly IAuthService _authService;

    public VideosController(AppDbContext db, IVideoService videoService, IAuthService authService)
    {
        _db = db;
        _videoService = videoService;
        _authService = authService;
    }

    private (int UserId, string Role) GetCurrentUser()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("user_id")?.Value
            ?? User.FindFirst("sub")?.Value;

        if (!int.TryParse(sub, out var id))
        {
            throw new UnauthorizedAccessException("Not authenticated.");
        }

        var role = User.FindFirst(ClaimTypes.Role)?.Value 
            ?? User.FindFirst("role")?.Value 
            ?? "student";

        return (id, role);
    }

    [HttpPost("upload")]
    [Authorize]
    public async Task<IActionResult> UploadVideo([FromForm] IFormFile file, [FromForm] int? courseId = null)
    {
        var (userId, role) = GetCurrentUser();
        if (role != "admin")
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Only instructors and administrators can upload videos." });
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { detail = "No file uploaded." });
        }

        var video = await _videoService.SaveVideoAsync(file, userId, courseId);
        return Ok(video);
    }

    [HttpGet("")]
    [Authorize]
    public async Task<IActionResult> ListVideos([FromQuery] int? courseId = null)
    {
        var (userId, role) = GetCurrentUser();

        var query = _db.Videos.AsQueryable();
        if (courseId.HasValue)
        {
            query = query.Where(v => v.CourseId == courseId.Value).OrderBy(v => v.OrderIndex).ThenBy(v => v.Id);
        }
        else
        {
            query = query.OrderByDescending(v => v.Id);
        }

        var videos = await query
            .Select(v => new VideoResponseDto
            {
                Id = v.Id,
                CourseId = v.CourseId,
                OrderIndex = v.OrderIndex,
                Title = !string.IsNullOrWhiteSpace(v.Title) ? v.Title : (v.OriginalFilename ?? v.Filename),
                Filename = v.Filename,
                OriginalFilename = v.OriginalFilename,
                FilePath = v.FilePath,
                FileSize = v.FileSize,
                Status = v.Status,
                Progress = v.Progress,
                CurrentStep = v.CurrentStep,
                CreatedAt = v.CreatedAt
            })
            .ToListAsync();

        return Ok(videos);
    }

    [HttpGet("{videoId:int}/file")]
    [HttpGet("{videoId:int}/stream")]
    public async Task<IActionResult> GetVideoFile(int videoId, [FromQuery(Name = "access_token")] string? accessToken)
    {
        int? userId = null;

        if (!string.IsNullOrWhiteSpace(accessToken))
        {
            userId = _authService.DecodeAccessToken(accessToken);
        }
        else if (User.Identity?.IsAuthenticated == true)
        {
            var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("user_id")?.Value
                ?? User.FindFirst("sub")?.Value;
            if (int.TryParse(sub, out int parsed)) userId = parsed;
        }

        if (!userId.HasValue)
        {
            return Unauthorized(new { detail = "Not authenticated." });
        }

        var video = await _db.Videos.FirstOrDefaultAsync(v => v.Id == videoId);
        if (video == null)
        {
            return NotFound(new { detail = "Video record not found in database." });
        }

        string? resolvedPath = null;
        var candidates = new[]
        {
            Path.IsPathRooted(video.FilePath) ? video.FilePath : null,
            Path.GetFullPath(video.FilePath),
            Path.Combine(Directory.GetCurrentDirectory(), video.FilePath),
            Path.Combine(Directory.GetCurrentDirectory(), "backend", video.FilePath),
            Path.Combine(AppContext.BaseDirectory, video.FilePath),
            Path.Combine(Directory.GetCurrentDirectory(), "uploads", Path.GetFileName(video.FilePath)),
            Path.Combine(Directory.GetCurrentDirectory(), "backend", "uploads", Path.GetFileName(video.FilePath)),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "backend", "uploads", Path.GetFileName(video.FilePath)),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "uploads", Path.GetFileName(video.FilePath))
        };

        foreach (var c in candidates)
        {
            if (!string.IsNullOrEmpty(c) && System.IO.File.Exists(c))
            {
                resolvedPath = Path.GetFullPath(c);
                break;
            }
        }

        if (string.IsNullOrEmpty(resolvedPath) || !System.IO.File.Exists(resolvedPath))
        {
            return NotFound(new { detail = $"Video file could not be located on disk: {video.FilePath}" });
        }

        var ext = Path.GetExtension(resolvedPath).ToLowerInvariant();
        var contentType = ext switch
        {
            ".mp4" => "video/mp4",
            ".webm" => "video/webm",
            ".mov" => "video/quicktime",
            ".avi" => "video/x-msvideo",
            ".mkv" => "video/x-matroska",
            _ => "video/mp4"
        };

        return PhysicalFile(resolvedPath, contentType, enableRangeProcessing: true);
    }

    [HttpGet("{videoId:int}/thumbnail")]
    public async Task<IActionResult> GetVideoThumbnail(int videoId, [FromQuery(Name = "access_token")] string? accessToken)
    {
        var video = await _db.Videos.FirstOrDefaultAsync(v => v.Id == videoId);
        if (video == null)
        {
            return NotFound(new { detail = "Video record not found in database." });
        }

        var thumbsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "thumbnails");
        if (!Directory.Exists(thumbsDir))
        {
            Directory.CreateDirectory(thumbsDir);
        }

        var thumbPath = Path.Combine(thumbsDir, $"video_{videoId}.jpg");
        if (System.IO.File.Exists(thumbPath) && new FileInfo(thumbPath).Length > 0)
        {
            return PhysicalFile(thumbPath, "image/jpeg");
        }

        // Locate video file on disk
        string? resolvedVideoPath = null;
        var candidates = new[]
        {
            Path.IsPathRooted(video.FilePath) ? video.FilePath : null,
            Path.GetFullPath(video.FilePath),
            Path.Combine(Directory.GetCurrentDirectory(), video.FilePath),
            Path.Combine(Directory.GetCurrentDirectory(), "backend", video.FilePath),
            Path.Combine(AppContext.BaseDirectory, video.FilePath),
            Path.Combine(Directory.GetCurrentDirectory(), "uploads", Path.GetFileName(video.FilePath)),
            Path.Combine(Directory.GetCurrentDirectory(), "backend", "uploads", Path.GetFileName(video.FilePath)),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "backend", "uploads", Path.GetFileName(video.FilePath)),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "uploads", Path.GetFileName(video.FilePath))
        };

        foreach (var c in candidates)
        {
            if (!string.IsNullOrEmpty(c) && System.IO.File.Exists(c))
            {
                resolvedVideoPath = Path.GetFullPath(c);
                break;
            }
        }

        if (!string.IsNullOrEmpty(resolvedVideoPath) && System.IO.File.Exists(resolvedVideoPath))
        {
            try
            {
                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "ffmpeg",
                    Arguments = $"-y -ss 00:00:03 -i \"{resolvedVideoPath}\" -vframes 1 -q:v 2 \"{thumbPath}\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using var proc = System.Diagnostics.Process.Start(psi);
                if (proc != null)
                {
                    await proc.WaitForExitAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[VideosController] Failed to generate thumbnail: {ex.Message}");
            }
        }

        if (System.IO.File.Exists(thumbPath) && new FileInfo(thumbPath).Length > 0)
        {
            return PhysicalFile(thumbPath, "image/jpeg");
        }

        return NotFound(new { detail = "Thumbnail could not be generated." });
    }

    [HttpDelete("{videoId:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteVideo(int videoId)
    {
        var (userId, role) = GetCurrentUser();
        if (role != "admin")
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Only instructors and administrators can delete videos." });
        }

        var video = await _db.Videos
            .Include(v => v.Transcripts)
                .ThenInclude(t => t.Segments)
            .Include(v => v.Transcripts)
                .ThenInclude(t => t.Chunks)
            .Include(v => v.QuizAttemptVideos)
            .FirstOrDefaultAsync(v => v.Id == videoId);

        if (video == null)
        {
            return NotFound(new { detail = "Video not found in database." });
        }

        // Delete physical file from all possible disk paths
        var candidates = new[]
        {
            Path.IsPathRooted(video.FilePath) ? video.FilePath : null,
            Path.GetFullPath(video.FilePath),
            Path.Combine(Directory.GetCurrentDirectory(), video.FilePath),
            Path.Combine(Directory.GetCurrentDirectory(), "backend", video.FilePath),
            Path.Combine(AppContext.BaseDirectory, video.FilePath),
            Path.Combine(Directory.GetCurrentDirectory(), "uploads", Path.GetFileName(video.FilePath)),
            Path.Combine(Directory.GetCurrentDirectory(), "backend", "uploads", Path.GetFileName(video.FilePath)),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "backend", "uploads", Path.GetFileName(video.FilePath)),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "uploads", Path.GetFileName(video.FilePath))
        };

        foreach (var c in candidates)
        {
            if (!string.IsNullOrEmpty(c) && System.IO.File.Exists(c))
            {
                try { System.IO.File.Delete(c); } catch { }
            }
        }

        // Delete child transcripts, segments, chunks, and quiz attempt links
        if (video.Transcripts != null && video.Transcripts.Any())
        {
            foreach (var t in video.Transcripts)
            {
                if (t.Segments != null && t.Segments.Any()) _db.TranscriptSegments.RemoveRange(t.Segments);
                if (t.Chunks != null && t.Chunks.Any()) _db.TranscriptChunks.RemoveRange(t.Chunks);
            }
            _db.Transcripts.RemoveRange(video.Transcripts);
        }

        if (video.QuizAttemptVideos != null && video.QuizAttemptVideos.Any())
        {
            _db.QuizAttemptVideos.RemoveRange(video.QuizAttemptVideos);
        }

        _db.Videos.Remove(video);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Video and all associated data completely deleted." });
    }
}
