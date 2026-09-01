using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VideoIntelligencePlatform.Backend.DTOs;
using VideoIntelligencePlatform.Backend.Services;

namespace VideoIntelligencePlatform.Backend.Controllers;

[ApiController]
[Route("youtube")]
[Authorize]
public class YouTubeController : ControllerBase
{
    private readonly IYouTubeService _youtubeService;
    private readonly IVideoService _videoService;

    public YouTubeController(IYouTubeService youtubeService, IVideoService videoService)
    {
        _youtubeService = youtubeService;
        _videoService = videoService;
    }

    private (int UserId, string Role) GetCurrentUser()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("user_id")?.Value
            ?? User.FindFirst("sub")?.Value;

        if (!int.TryParse(sub, out var id)) throw new UnauthorizedAccessException("Not authenticated.");

        var role = User.FindFirst(ClaimTypes.Role)?.Value 
            ?? User.FindFirst("role")?.Value 
            ?? "student";

        return (id, role);
    }

    [HttpPost("download")]
    public async Task<IActionResult> Download([FromBody] YouTubeDownloadRequestDto request)
    {
        var (userId, role) = GetCurrentUser();
        if (role != "admin")
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Only instructors and administrators can import YouTube videos." });
        }

        if (string.IsNullOrWhiteSpace(request.Url))
        {
            return BadRequest(new { detail = "YouTube URL is required." });
        }

        var url = request.Url.Trim();
        if (!url.Contains("youtube.com/") && !url.Contains("youtu.be/"))
        {
            return BadRequest(new { detail = "Please enter a valid YouTube URL." });
        }

        var allowedQualities = new HashSet<string> { "360", "480", "720", "1080" };
        if (!allowedQualities.Contains(request.Quality))
        {
            return BadRequest(new { detail = "Invalid video quality selected." });
        }

        try
        {
            var (filePath, title) = await _youtubeService.DownloadVideoAsync(url, request.Quality);
            var video = await _videoService.SaveDownloadedVideoAsync(filePath, title, userId, request.CourseId);

            return Ok(new YouTubeDownloadResponseDto
            {
                Message = "YouTube video downloaded and added successfully.",
                VideoId = video.Id,
                Filename = video.Filename,
                OriginalFilename = video.OriginalFilename,
                FilePath = video.FilePath,
                FileSize = video.FileSize,
                Status = video.Status,
                Progress = video.Progress
            });
        }
        catch (Exception ex)
        {
            var msg = ex.Message;
            if (msg.Contains("403") || msg.Contains("blocked") || msg.Contains("Forbidden"))
            {
                return StatusCode(StatusCodes.Status502BadGateway, new { detail = "YouTube blocked the download request (HTTP 403). Please try again later." });
            }
            if (msg.Contains("private") || msg.Contains("unavailable") || msg.Contains("age-restricted"))
            {
                return StatusCode(StatusCodes.Status422UnprocessableEntity, new { detail = msg });
            }

            return BadRequest(new { detail = msg });
        }
    }
}
