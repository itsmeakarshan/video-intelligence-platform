using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.DTOs;
using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Controllers;

[ApiController]
[Route("courses")]
public class CoursesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<CoursesController> _logger;
    private readonly string _thumbnailsDirectory;

    public CoursesController(AppDbContext db, ILogger<CoursesController> logger)
    {
        _db = db;
        _logger = logger;
        _thumbnailsDirectory = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "thumbnails");
        if (!Directory.Exists(_thumbnailsDirectory))
        {
            Directory.CreateDirectory(_thumbnailsDirectory);
        }
    }

    private (int UserId, string Role) GetCurrentUser()
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

        return (userId, role);
    }

    [HttpGet("")]
    [Authorize]
    public async Task<IActionResult> ListCourses()
    {
        var (userId, role) = GetCurrentUser();
        bool isAdmin = role.Equals("admin", StringComparison.OrdinalIgnoreCase);

        var enrolledCourseIds = new HashSet<int>();
        if (!isAdmin)
        {
            enrolledCourseIds = (await _db.CourseEnrollments
                .Where(e => e.UserId == userId)
                .Select(e => e.CourseId)
                .ToListAsync())
                .ToHashSet();
        }

        var courses = await _db.Courses
            .Include(c => c.User)
            .Include(c => c.Videos)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var result = courses.Select(c => new CourseListDto
        {
            Id = c.Id,
            Title = c.Title,
            Description = c.Description,
            ThumbnailUrl = c.ThumbnailUrl,
            Price = c.Price,
            IsEnrolled = isAdmin || enrolledCourseIds.Contains(c.Id),
            UserId = c.UserId,
            UserName = c.User?.Name ?? "Instructor",
            VideoCount = c.Videos.Count,
            CompletedVideoCount = c.Videos.Count(v => v.Status == "completed"),
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt
        }).ToList();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetCourse(int id)
    {
        var (userId, role) = GetCurrentUser();
        bool isAdmin = role.Equals("admin", StringComparison.OrdinalIgnoreCase);

        var course = await _db.Courses
            .Include(c => c.User)
            .Include(c => c.Videos)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course == null)
        {
            return NotFound(new { detail = "Course not found." });
        }

        bool isEnrolled = isAdmin || await _db.CourseEnrollments.AnyAsync(e => e.CourseId == id && e.UserId == userId);

        var orderedVideos = course.Videos
            .OrderBy(v => v.OrderIndex)
            .ThenBy(v => v.Id)
            .Select(v => new CourseVideoDto
            {
                Id = v.Id,
                CourseId = v.CourseId,
                OrderIndex = v.OrderIndex,
                Title = !string.IsNullOrWhiteSpace(v.Title) ? v.Title : (v.OriginalFilename ?? v.Filename),
                Filename = v.Filename,
                OriginalFilename = v.OriginalFilename,
                Status = v.Status,
                Progress = v.Progress,
                CurrentStep = v.CurrentStep,
                FileSize = v.FileSize,
                CreatedAt = v.CreatedAt
            }).ToList();

        var result = new CourseDetailDto
        {
            Id = course.Id,
            Title = course.Title,
            Description = course.Description,
            ThumbnailUrl = course.ThumbnailUrl,
            Price = course.Price,
            IsEnrolled = isEnrolled,
            UserId = course.UserId,
            UserName = course.User?.Name ?? "Instructor",
            CreatedAt = course.CreatedAt,
            UpdatedAt = course.UpdatedAt,
            Videos = orderedVideos
        };

        return Ok(result);
    }

    [HttpPost("{id:int}/enroll")]
    [Authorize]
    public async Task<IActionResult> EnrollCourse(int id)
    {
        var (userId, role) = GetCurrentUser();

        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course == null)
        {
            return NotFound(new { detail = "Course not found." });
        }

        var existingEnrollment = await _db.CourseEnrollments
            .FirstOrDefaultAsync(e => e.CourseId == id && e.UserId == userId);

        if (existingEnrollment != null)
        {
            return Ok(new
            {
                success = true,
                is_enrolled = true,
                course_id = course.Id,
                course_title = course.Title,
                amount_paid = existingEnrollment.AmountPaid,
                message = $"You are already enrolled in {course.Title}."
            });
        }

        var enrollment = new CourseEnrollment
        {
            CourseId = id,
            UserId = userId,
            EnrolledAt = DateTime.UtcNow,
            AmountPaid = course.Price
        };

        _db.CourseEnrollments.Add(enrollment);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User #{UserId} enrolled in Course #{CourseId} ({Title}) with fee £{Price:F2}", userId, course.Id, course.Title, course.Price);

        return Ok(new
        {
            success = true,
            is_enrolled = true,
            course_id = course.Id,
            course_title = course.Title,
            amount_paid = course.Price,
            message = course.Price > 0
                ? $"Successfully enrolled in {course.Title}. Amount £{course.Price:F2} processed."
                : $"Successfully enrolled in {course.Title} for free."
        });
    }

    [HttpPost("")]
    [Authorize]
    public async Task<IActionResult> CreateCourse([FromBody] CourseCreateDto request)
    {
        var (userId, role) = GetCurrentUser();
        if (role != "admin")
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Only instructors and administrators can create courses." });
        }

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { detail = "Course title is required." });
        }

        var course = new Course
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            ThumbnailUrl = request.ThumbnailUrl?.Trim(),
            Price = Math.Max(0m, request.Price),
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Courses.Add(course);
        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, new CourseDetailDto
        {
            Id = course.Id,
            Title = course.Title,
            Description = course.Description,
            ThumbnailUrl = course.ThumbnailUrl,
            Price = course.Price,
            IsEnrolled = true,
            UserId = course.UserId,
            UserName = User.Identity?.Name ?? "Instructor",
            CreatedAt = course.CreatedAt,
            UpdatedAt = course.UpdatedAt,
            Videos = new List<CourseVideoDto>()
        });
    }

    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<IActionResult> UpdateCourse(int id, [FromBody] CourseUpdateDto request)
    {
        var (userId, role) = GetCurrentUser();
        if (role != "admin")
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Only instructors and administrators can update courses." });
        }

        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course == null)
        {
            return NotFound(new { detail = "Course not found." });
        }

        if (request.Title != null)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new { detail = "Course title cannot be empty." });
            }
            course.Title = request.Title.Trim();
        }

        if (request.Description != null)
        {
            course.Description = request.Description.Trim();
        }

        if (request.ThumbnailUrl != null)
        {
            course.ThumbnailUrl = request.ThumbnailUrl.Trim();
        }

        if (request.Price.HasValue)
        {
            course.Price = Math.Max(0m, request.Price.Value);
        }

        course.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = course.Id,
            title = course.Title,
            description = course.Description,
            thumbnail_url = course.ThumbnailUrl,
            price = course.Price,
            updated_at = course.UpdatedAt
        });
    }

    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteCourse(int id)
    {
        var (userId, role) = GetCurrentUser();
        if (role != "admin")
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Only instructors and administrators can delete courses." });
        }

        var course = await _db.Courses
            .Include(c => c.Videos)
                .ThenInclude(v => v.Transcripts)
                    .ThenInclude(t => t.Segments)
            .Include(c => c.Videos)
                .ThenInclude(v => v.Transcripts)
                    .ThenInclude(t => t.Chunks)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course == null)
        {
            return NotFound(new { detail = "Course not found." });
        }

        // Delete all physical video files from disk
        if (course.Videos != null && course.Videos.Any())
        {
            foreach (var v in course.Videos)
            {
                var candidates = new[]
                {
                    Path.IsPathRooted(v.FilePath) ? v.FilePath : null,
                    Path.GetFullPath(v.FilePath),
                    Path.Combine(Directory.GetCurrentDirectory(), v.FilePath),
                    Path.Combine(Directory.GetCurrentDirectory(), "backend", v.FilePath),
                    Path.Combine(AppContext.BaseDirectory, v.FilePath),
                    Path.Combine(Directory.GetCurrentDirectory(), "uploads", Path.GetFileName(v.FilePath)),
                    Path.Combine(Directory.GetCurrentDirectory(), "backend", "uploads", Path.GetFileName(v.FilePath)),
                    Path.Combine(Directory.GetCurrentDirectory(), "..", "backend", "uploads", Path.GetFileName(v.FilePath)),
                    Path.Combine(Directory.GetCurrentDirectory(), "..", "uploads", Path.GetFileName(v.FilePath))
                };
                foreach (var c in candidates)
                {
                    if (!string.IsNullOrEmpty(c) && System.IO.File.Exists(c))
                    {
                        try { System.IO.File.Delete(c); } catch { }
                    }
                }
            }
        }

        // Delete thumbnail file from disk if local
        if (!string.IsNullOrEmpty(course.ThumbnailUrl) && !course.ThumbnailUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            var thumbCandidates = new[]
            {
                course.ThumbnailUrl,
                Path.Combine(Directory.GetCurrentDirectory(), course.ThumbnailUrl),
                Path.Combine(Directory.GetCurrentDirectory(), "uploads", Path.GetFileName(course.ThumbnailUrl)),
                Path.Combine(Directory.GetCurrentDirectory(), "backend", "uploads", Path.GetFileName(course.ThumbnailUrl)),
                Path.Combine(Directory.GetCurrentDirectory(), "..", "backend", "uploads", Path.GetFileName(course.ThumbnailUrl))
            };
            foreach (var tc in thumbCandidates)
            {
                if (System.IO.File.Exists(tc))
                {
                    try { System.IO.File.Delete(tc); } catch { }
                }
            }
        }

        _db.Courses.Remove(course);
        await _db.SaveChangesAsync();

        return Ok(new { detail = "Course, all video files, and associated records deleted successfully." });
    }

    [HttpPost("upload-thumbnail")]
    [Authorize]
    public async Task<IActionResult> UploadThumbnail(IFormFile? file)
    {
        var (userId, role) = GetCurrentUser();
        if (role != "admin")
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Only instructors and administrators can upload course thumbnails." });
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { detail = "No image file provided." });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif" };
        if (!allowedExtensions.Contains(ext))
        {
            return BadRequest(new { detail = "Invalid image file type. Supported formats: JPG, PNG, WEBP, GIF, AVIF." });
        }

        // Limit size to 10MB
        if (file.Length > 10 * 1024 * 1024)
        {
            return BadRequest(new { detail = "Thumbnail image size cannot exceed 10MB." });
        }

        var uniqueFilename = $"{Guid.NewGuid():N}{ext}";
        var savePath = Path.Combine(_thumbnailsDirectory, uniqueFilename);

        using (var stream = new FileStream(savePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var relativeUrl = $"/courses/thumbnails/{uniqueFilename}";
        return Ok(new
        {
            filename = uniqueFilename,
            thumbnail_url = relativeUrl
        });
    }

    [HttpGet("thumbnails/{filename}")]
    public IActionResult GetThumbnail(string filename)
    {
        var safeFilename = Path.GetFileName(filename);
        var candidates = new[]
        {
            Path.Combine(_thumbnailsDirectory, safeFilename),
            Path.Combine(Directory.GetCurrentDirectory(), "uploads", "thumbnails", safeFilename),
            Path.Combine(Directory.GetCurrentDirectory(), "backend", "uploads", "thumbnails", safeFilename),
            Path.Combine(Directory.GetCurrentDirectory(), "seed_uploads", "thumbnails", safeFilename),
            Path.Combine(Directory.GetCurrentDirectory(), "backend", "seed_uploads", "thumbnails", safeFilename),
            Path.Combine(AppContext.BaseDirectory, "uploads", "thumbnails", safeFilename),
            Path.Combine(AppContext.BaseDirectory, "seed_uploads", "thumbnails", safeFilename),
            Path.Combine("/app/backend/uploads/thumbnails", safeFilename),
            Path.Combine("/app/backend/seed_uploads/thumbnails", safeFilename),
            Path.Combine("/app/uploads/thumbnails", safeFilename)
        };

        var filePath = candidates.FirstOrDefault(System.IO.File.Exists);

        if (string.IsNullOrEmpty(filePath) || !System.IO.File.Exists(filePath))
        {
            return NotFound(new { detail = "Thumbnail image not found." });
        }

        var ext = Path.GetExtension(filePath).ToLowerInvariant();
        var contentType = ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".avif" => "image/avif",
            _ => "application/octet-stream"
        };

        return PhysicalFile(filePath, contentType);
    }

    [HttpPut("{id:int}/videos/reorder")]
    [Authorize]
    public async Task<IActionResult> ReorderCourseVideos(int id, [FromBody] ReorderVideosDto request)
    {
        var (userId, role) = GetCurrentUser();
        if (role != "admin")
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Only instructors and administrators can reorder course videos." });
        }

        var course = await _db.Courses
            .Include(c => c.Videos)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course == null)
        {
            return NotFound(new { detail = "Course not found." });
        }

        foreach (var orderItem in request.VideoOrders)
        {
            var vid = course.Videos.FirstOrDefault(v => v.Id == orderItem.VideoId);
            if (vid != null)
            {
                vid.OrderIndex = orderItem.OrderIndex;
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { detail = "Course videos reordered successfully." });
    }

    [HttpPatch("{id:int}/videos/{videoId:int}")]
    [Authorize]
    public async Task<IActionResult> UpdateCourseVideo(int id, int videoId, [FromBody] CourseVideoUpdateDto request)
    {
        var (userId, role) = GetCurrentUser();
        if (role != "admin")
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Only instructors and administrators can edit course videos." });
        }

        var video = await _db.Videos.FirstOrDefaultAsync(v => v.Id == videoId && v.CourseId == id);
        if (video == null)
        {
            return NotFound(new { detail = "Video not found in this course." });
        }

        if (request.Title != null)
        {
            video.Title = request.Title.Trim();
        }

        if (request.OrderIndex.HasValue)
        {
            video.OrderIndex = request.OrderIndex.Value;
        }

        await _db.SaveChangesAsync();
        return Ok(new
        {
            id = video.Id,
            course_id = video.CourseId,
            order_index = video.OrderIndex,
            title = !string.IsNullOrWhiteSpace(video.Title) ? video.Title : (video.OriginalFilename ?? video.Filename)
        });
    }
}
