using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.DTOs;
using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Controllers;

[ApiController]
[Route("transcripts")]
[Authorize]
public class TranscriptsController : ControllerBase
{
    private readonly AppDbContext _db;

    public TranscriptsController(AppDbContext db)
    {
        _db = db;
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

    [HttpPost("{videoId:int}")]
    public async Task<IActionResult> CreateTranscript(int videoId)
    {
        var (userId, role) = GetCurrentUser();
        if (role != "admin")
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Only instructors and administrators can trigger video processing." });
        }

        var video = await _db.Videos.FirstOrDefaultAsync(v => v.Id == videoId);
        if (video == null)
        {
            return NotFound(new { detail = "Video not found." });
        }

        var existingTranscript = await _db.Transcripts
            .FirstOrDefaultAsync(t => t.VideoId == video.Id);

        if (existingTranscript != null)
        {
            return Ok(new { message = "Transcript already exists.", status = "completed" });
        }

        if (video.Status == "queued")
        {
            return Ok(new { message = "Video is already in queue.", status = "queued" });
        }

        if (video.Status == "processing")
        {
            return Ok(new { message = "Video is already processing.", status = "processing" });
        }

        if (video.Status == "completed")
        {
            return Ok(new { message = "Video already processed.", status = "completed" });
        }

        video.Status = "queued";
        video.Progress = 0;
        video.CurrentStep = "Waiting in queue...";
        await _db.SaveChangesAsync();

        return Ok(new { message = "Video added to processing queue.", status = "queued" });
    }

    [HttpGet("{videoId:int}")]
    public async Task<IActionResult> GetTranscript(int videoId)
    {
        var video = await _db.Videos.FirstOrDefaultAsync(v => v.Id == videoId);
        if (video == null)
        {
            return NotFound(new { detail = "Video not found." });
        }

        var transcript = await _db.Transcripts
            .FirstOrDefaultAsync(t => t.VideoId == videoId);

        if (transcript == null)
        {
            return NotFound(new { detail = "Transcript not found." });
        }

        return Ok(new TranscriptResponseDto
        {
            Id = transcript.Id,
            VideoId = transcript.VideoId,
            Language = transcript.Language,
            Transcript = transcript.TranscriptText,
            CreatedAt = video.CreatedAt
        });
    }

    [HttpGet("{videoId:int}/segments")]
    public async Task<IActionResult> GetSegments(int videoId)
    {
        var video = await _db.Videos.FirstOrDefaultAsync(v => v.Id == videoId);
        if (video == null)
        {
            return NotFound(new { detail = "Video not found." });
        }

        var transcript = await _db.Transcripts
            .FirstOrDefaultAsync(t => t.VideoId == videoId);

        if (transcript == null)
        {
            return NotFound(new { detail = "Transcript not found." });
        }

        var segments = await _db.TranscriptSegments
            .Where(s => s.TranscriptId == transcript.Id)
            .OrderBy(s => s.SegmentIndex)
            .Select(s => new TranscriptSegmentDto
            {
                Id = s.Id,
                TranscriptId = s.TranscriptId,
                SegmentIndex = s.SegmentIndex,
                StartTime = s.StartTime,
                EndTime = s.EndTime,
                Text = s.Text,
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();

        return Ok(segments);
    }
}
