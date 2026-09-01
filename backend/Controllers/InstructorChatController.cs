using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Controllers;

[ApiController]
[Route("instructor-chat")]
[Authorize]
public class InstructorChatController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<InstructorChatController> _logger;
    private readonly string _chatMediaDirectory;

    public InstructorChatController(AppDbContext db, ILogger<InstructorChatController> logger)
    {
        _db = db;
        _logger = logger;
        _chatMediaDirectory = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "chat_media");
        if (!Directory.Exists(_chatMediaDirectory))
        {
            Directory.CreateDirectory(_chatMediaDirectory);
        }
    }

    private (int UserId, string Role, string Name) GetCurrentUser()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            throw new UnauthorizedAccessException("Not authenticated.");
        }

        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("user_id")?.Value
            ?? User.FindFirst("sub")?.Value;

        if (!int.TryParse(sub, out int userId))
        {
            throw new UnauthorizedAccessException("Invalid user identity.");
        }

        var role = User.FindFirst(ClaimTypes.Role)?.Value
            ?? User.FindFirst("role")?.Value
            ?? "student";

        var name = User.FindFirst(ClaimTypes.Name)?.Value
            ?? User.FindFirst("name")?.Value
            ?? "User";

        return (userId, role, name);
    }

    [HttpGet("channels")]
    public async Task<IActionResult> GetChannels([FromQuery] int? courseId = null)
    {
        var (userId, role, _) = GetCurrentUser();

        if (role.Equals("admin", StringComparison.OrdinalIgnoreCase))
        {
            // Admin sees channels across all their courses or all courses
            var query = _db.InstructorChatChannels
                .Include(c => c.Course)
                .Include(c => c.Student)
                .Include(c => c.Instructor)
                .Include(c => c.Messages)
                .AsQueryable();

            if (courseId.HasValue)
            {
                query = query.Where(c => c.CourseId == courseId.Value);
            }

            var channels = await query
                .Include(c => c.Course)
                    .ThenInclude(co => co.User)
                .OrderByDescending(c => c.UpdatedAt)
                .ToListAsync();

            var result = channels.Select(c =>
            {
                var lastMsg = c.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
                var instructorName = c.Instructor?.Name ?? c.Course?.User?.Name ?? "Course Admin";
                return new
                {
                    id = c.Id,
                    course_id = c.CourseId,
                    course_title = c.Course?.Title ?? "General Course",
                    student_id = c.StudentId,
                    student_name = c.Student?.Name ?? "Student",
                    student_email = c.Student?.Email ?? "",
                    instructor_id = c.InstructorId ?? c.Course?.UserId,
                    instructor_name = instructorName,
                    title = c.Title,
                    last_message = lastMsg?.Text ?? (lastMsg != null ? $"[{lastMsg.MessageType}]" : "No messages yet"),
                    last_message_type = lastMsg?.MessageType ?? "text",
                    last_message_at = lastMsg?.CreatedAt ?? c.CreatedAt,
                    created_at = c.CreatedAt,
                    updated_at = c.UpdatedAt
                };
            }).ToList();

            return Ok(result);
        }
        else
        {
            // Student sees a single unified doubt channel with their instructor (no per-course splitting)
            var channel = await _db.InstructorChatChannels
                .Include(c => c.Course)
                    .ThenInclude(co => co.User)
                .Include(c => c.Instructor)
                .Include(c => c.Student)
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.StudentId == userId);

            if (channel == null)
            {
                var defaultCourse = await _db.Courses.OrderBy(c => c.Id).FirstOrDefaultAsync();
                channel = new InstructorChatChannel
                {
                    CourseId = defaultCourse?.Id ?? 3,
                    StudentId = userId,
                    InstructorId = defaultCourse?.UserId ?? 2,
                    Title = "Instructor Doubts & Q&A",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.InstructorChatChannels.Add(channel);
                await _db.SaveChangesAsync();
            }

            var lastMsg = channel.Messages?.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
            var instructorName = channel.Instructor?.Name ?? channel.Course?.User?.Name ?? "Administrator";

            var result = new[]
            {
                new
                {
                    id = channel.Id,
                    course_id = channel.CourseId,
                    course_title = "Direct Instructor Chat",
                    student_id = channel.StudentId,
                    student_name = channel.Student?.Name ?? "Me",
                    student_email = channel.Student?.Email ?? "",
                    instructor_id = channel.InstructorId,
                    instructor_name = instructorName,
                    title = "Instructor Doubts & Q&A",
                    last_message = lastMsg?.Text ?? (lastMsg != null ? $"[{lastMsg.MessageType}]" : "Start asking doubts..."),
                    last_message_type = lastMsg?.MessageType ?? "text",
                    last_message_at = lastMsg?.CreatedAt ?? channel.CreatedAt,
                    created_at = channel.CreatedAt,
                    updated_at = channel.UpdatedAt
                }
            };

            return Ok(result);
        }
    }

    [HttpPost("channels")]
    public async Task<IActionResult> CreateOrGetChannel([FromBody] CreateChannelRequest request)
    {
        var (userId, role, _) = GetCurrentUser();

        var course = await _db.Courses.FindAsync(request.CourseId);
        if (course == null)
        {
            return NotFound(new { error = "Course not found." });
        }

        int studentId = role.Equals("student", StringComparison.OrdinalIgnoreCase) 
            ? userId 
            : (request.StudentId ?? userId);

        var channel = await _db.InstructorChatChannels
            .Include(c => c.Course)
            .Include(c => c.Student)
            .Include(c => c.Instructor)
            .FirstOrDefaultAsync(c => c.CourseId == request.CourseId && c.StudentId == studentId);

        if (channel == null)
        {
            channel = new InstructorChatChannel
            {
                CourseId = request.CourseId,
                StudentId = studentId,
                InstructorId = course.UserId,
                Title = string.IsNullOrWhiteSpace(request.Title) ? $"{course.Title} - Q&A" : request.Title.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.InstructorChatChannels.Add(channel);
            await _db.SaveChangesAsync();
        }

        return Ok(new
        {
            id = channel.Id,
            course_id = channel.CourseId,
            course_title = course.Title,
            student_id = channel.StudentId,
            student_name = channel.Student?.Name ?? "Student",
            instructor_id = channel.InstructorId,
            instructor_name = channel.Instructor?.Name ?? "Instructor",
            title = channel.Title,
            created_at = channel.CreatedAt,
            updated_at = channel.UpdatedAt
        });
    }

    [HttpGet("channels/{channelId:int}/messages")]
    public async Task<IActionResult> GetMessages(int channelId)
    {
        var (userId, role, _) = GetCurrentUser();

        var channel = await _db.InstructorChatChannels.FindAsync(channelId);
        if (channel == null)
        {
            return NotFound(new { error = "Channel not found." });
        }

        // Students can only access their own channel
        if (!role.Equals("admin", StringComparison.OrdinalIgnoreCase) && channel.StudentId != userId)
        {
            return Forbid();
        }

        var messages = await _db.InstructorChatMessages
            .Include(m => m.Sender)
            .Where(m => m.ChannelId == channelId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();

        var result = messages.Select(m => new
        {
            id = m.Id,
            channel_id = m.ChannelId,
            sender_id = m.SenderId,
            sender_name = m.Sender?.Name ?? (m.SenderRole == "admin" ? "Instructor" : "Student"),
            sender_role = m.SenderRole,
            text = m.Text,
            message_type = m.MessageType,
            media_url = m.MediaUrl,
            file_name = m.FileName,
            file_size = m.FileSize,
            extra_data = m.ExtraData,
            created_at = m.CreatedAt
        }).ToList();

        return Ok(result);
    }

    [HttpPost("channels/{channelId:int}/messages")]
    public async Task<IActionResult> SendMessage(int channelId, [FromBody] SendMessageRequest request)
    {
        var (userId, role, _) = GetCurrentUser();

        var channel = await _db.InstructorChatChannels.FindAsync(channelId);
        if (channel == null)
        {
            return NotFound(new { error = "Channel not found." });
        }

        if (!role.Equals("admin", StringComparison.OrdinalIgnoreCase) && channel.StudentId != userId)
        {
            return Forbid();
        }

        var messageType = string.IsNullOrWhiteSpace(request.MessageType) ? "text" : request.MessageType.Trim().ToLowerInvariant();

        var message = new InstructorChatMessage
        {
            ChannelId = channelId,
            SenderId = userId,
            SenderRole = role.Equals("admin", StringComparison.OrdinalIgnoreCase) ? "admin" : "student",
            Text = request.Text ?? string.Empty,
            MessageType = messageType,
            MediaUrl = request.MediaUrl,
            FileName = request.FileName,
            FileSize = request.FileSize,
            ExtraData = request.ExtraData,
            CreatedAt = DateTime.UtcNow
        };

        _db.InstructorChatMessages.Add(message);
        channel.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);

        return Ok(new
        {
            id = message.Id,
            channel_id = message.ChannelId,
            sender_id = message.SenderId,
            sender_name = user?.Name ?? (message.SenderRole == "admin" ? "Instructor" : "Student"),
            sender_role = message.SenderRole,
            text = message.Text,
            message_type = message.MessageType,
            media_url = message.MediaUrl,
            file_name = message.FileName,
            file_size = message.FileSize,
            extra_data = message.ExtraData,
            created_at = message.CreatedAt
        });
    }

    [HttpDelete("messages/{messageId:int}")]
    public async Task<IActionResult> DeleteMessage(int messageId)
    {
        var (userId, role, _) = GetCurrentUser();

        var message = await _db.InstructorChatMessages
            .Include(m => m.Channel)
            .FirstOrDefaultAsync(m => m.Id == messageId);

        if (message == null)
        {
            return NotFound(new { error = "Message not found." });
        }

        bool isAdmin = role.Equals("admin", StringComparison.OrdinalIgnoreCase);
        if (!isAdmin && message.SenderId != userId)
        {
            return Forbid();
        }

        // Clean up physical file if it exists
        if (!string.IsNullOrWhiteSpace(message.MediaUrl) && message.MediaUrl.StartsWith("/instructor-chat/media/"))
        {
            try
            {
                var fileName = Path.GetFileName(message.MediaUrl);
                var fullPath = Path.Combine(_chatMediaDirectory, fileName);
                if (System.IO.File.Exists(fullPath))
                {
                    System.IO.File.Delete(fullPath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete physical chat media file for message {MessageId}", messageId);
            }
        }

        _db.InstructorChatMessages.Remove(message);
        if (message.Channel != null)
        {
            message.Channel.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        return Ok(new { success = true, message_id = messageId });
    }

    [HttpPost("channels/{channelId:int}/upload")]
    [RequestSizeLimit(100_000_000)] // 100 MB max
    public async Task<IActionResult> UploadMedia(int channelId, [FromForm] IFormFile file, [FromForm] string? messageType, [FromForm] string? text, [FromForm] string? extraData)
    {
        var (userId, role, _) = GetCurrentUser();

        var channel = await _db.InstructorChatChannels.FindAsync(channelId);
        if (channel == null)
        {
            return NotFound(new { error = "Channel not found." });
        }

        if (!role.Equals("admin", StringComparison.OrdinalIgnoreCase) && channel.StudentId != userId)
        {
            return Forbid();
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { error = "No file was uploaded." });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var uniqueFileName = $"{Guid.NewGuid():N}{ext}";
        var physicalPath = Path.Combine(_chatMediaDirectory, uniqueFileName);

        using (var stream = new FileStream(physicalPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Determine message type if not provided
        var determinedType = messageType?.ToLowerInvariant() ?? "document";
        if (string.IsNullOrWhiteSpace(messageType))
        {
            if (new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg" }.Contains(ext))
            {
                determinedType = "image";
            }
            else if (new[] { ".mp3", ".wav", ".webm", ".ogg", ".m4a", ".aac" }.Contains(ext))
            {
                determinedType = "voice";
            }
            else if (new[] { ".mp4", ".mov", ".mkv", ".webm" }.Contains(ext))
            {
                determinedType = "video";
            }
            else
            {
                determinedType = "document";
            }
        }

        var mediaUrl = $"/instructor-chat/media/{uniqueFileName}";

        var message = new InstructorChatMessage
        {
            ChannelId = channelId,
            SenderId = userId,
            SenderRole = role.Equals("admin", StringComparison.OrdinalIgnoreCase) ? "admin" : "student",
            Text = text ?? string.Empty,
            MessageType = determinedType,
            MediaUrl = mediaUrl,
            FileName = file.FileName,
            FileSize = file.Length,
            ExtraData = extraData,
            CreatedAt = DateTime.UtcNow
        };

        _db.InstructorChatMessages.Add(message);
        channel.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);

        return Ok(new
        {
            id = message.Id,
            channel_id = message.ChannelId,
            sender_id = message.SenderId,
            sender_name = user?.Name ?? (message.SenderRole == "admin" ? "Instructor" : "Student"),
            sender_role = message.SenderRole,
            text = message.Text,
            message_type = message.MessageType,
            media_url = message.MediaUrl,
            file_name = message.FileName,
            file_size = message.FileSize,
            extra_data = message.ExtraData,
            created_at = message.CreatedAt
        });
    }

    [HttpGet("media/{fileName}")]
    [HttpHead("media/{fileName}")]
    [AllowAnonymous]
    public IActionResult GetChatMedia(string fileName)
    {
        // Sanitize fileName to prevent directory traversal
        var safeFileName = Path.GetFileName(fileName);
        var fullPath = Path.Combine(_chatMediaDirectory, safeFileName);

        if (!System.IO.File.Exists(fullPath))
        {
            return NotFound();
        }

        var ext = Path.GetExtension(safeFileName).ToLowerInvariant();
        var contentType = ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".svg" => "image/svg+xml",
            ".webm" => "audio/webm",
            ".wav" => "audio/wav",
            ".mp3" => "audio/mpeg",
            ".ogg" => "audio/ogg",
            ".m4a" => "audio/mp4",
            ".mp4" => "video/mp4",
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".txt" => "text/plain",
            ".zip" => "application/zip",
            _ => "application/octet-stream"
        };

        Response.Headers.Append("Accept-Ranges", "bytes");
        return PhysicalFile(fullPath, contentType, enableRangeProcessing: true);
    }
}

public class CreateChannelRequest
{
    public int CourseId { get; set; }
    public int? StudentId { get; set; }
    public string? Title { get; set; }
}

public class SendMessageRequest
{
    public string? Text { get; set; }
    public string? MessageType { get; set; } // "text", "video", "youtube", "image", "document", "voice"
    public string? MediaUrl { get; set; }
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    public string? ExtraData { get; set; }
}
