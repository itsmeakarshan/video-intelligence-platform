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
[Route("admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuthService _authService;

    public AdminController(AppDbContext db, IAuthService authService)
    {
        _db = db;
        _authService = authService;
    }

    private int GetCurrentUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("user_id")?.Value
            ?? User.FindFirst("sub")?.Value;

        if (int.TryParse(sub, out var id)) return id;
        throw new UnauthorizedAccessException("Not authenticated.");
    }

    private bool IsAdminUser()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value 
            ?? User.FindFirst("role")?.Value;

        return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase);
    }

    [HttpGet("users")]
    public async Task<IActionResult> ListUsers([FromQuery] bool includeAdmins = false)
    {
        if (!IsAdminUser())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Administrator access required." });
        }

        var query = _db.Users
            .Include(u => u.QuizAttempts)
            .AsQueryable();

        if (!includeAdmins)
        {
            query = query.Where(u => u.Role == "student" || string.IsNullOrEmpty(u.Role));
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        var chatChannels = await _db.InstructorChatChannels.ToListAsync();
        var totalCourses = await _db.Courses.CountAsync();

        var result = users.Select(u =>
        {
            var userChannelCount = chatChannels.Where(c => c.StudentId == u.Id).Select(c => c.CourseId).Distinct().Count();
            var enrolledCount = userChannelCount > 0 ? userChannelCount : (u.Role == "admin" ? totalCourses : Math.Max(1, totalCourses));

            return new AdminUserListItemDto
            {
                Id = u.Id,
                Name = u.Name,
                Email = u.Email,
                Role = u.Role,
                CreatedAt = u.CreatedAt,
                EnrolledCoursesCount = enrolledCount,
                QuizAttemptCount = u.QuizAttempts.Count,
                LastScorePercentage = u.QuizAttempts.OrderByDescending(q => q.CreatedAt).FirstOrDefault()?.Percentage,
                AverageScorePercentage = u.QuizAttempts.Any() 
                    ? Math.Round(u.QuizAttempts.Average(q => q.Percentage), 1) 
                    : null
            };
        }).ToList();

        return Ok(result);
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] AdminCreateUserDto request)
    {
        if (!IsAdminUser())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Administrator access required." });
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var existingUser = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (existingUser != null)
        {
            return BadRequest(new { detail = "An account with this email already exists." });
        }

        var role = string.Equals(request.Role, "admin", StringComparison.OrdinalIgnoreCase) ? "admin" : "student";

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = _authService.HashPassword(request.Password),
            Role = role,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, new UserResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role
        });
    }

    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        if (!IsAdminUser())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Administrator access required." });
        }

        var currentUserId = GetCurrentUserId();
        if (id == currentUserId)
        {
            return BadRequest(new { detail = "You cannot delete your own active administrator account." });
        }

        var user = await _db.Users
            .Include(u => u.Videos)
            .Include(u => u.Conversations)
            .Include(u => u.QuizAttempts)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound(new { detail = "User not found." });
        }

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"User '{user.Name}' ({user.Email}) deleted successfully." });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetPlatformStats()
    {
        if (!IsAdminUser())
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { detail = "Administrator access required." });
        }

        var totalStudents = await _db.Users.CountAsync(u => u.Role == "student");
        var totalAdmins = await _db.Users.CountAsync(u => u.Role == "admin");
        var totalVideos = await _db.Videos.CountAsync();
        var completedVideos = await _db.Videos.CountAsync(v => v.Status == "completed");
        var totalQuizzes = await _db.QuizAttempts.CountAsync();
        var avgScoreRaw = totalQuizzes > 0 
            ? await _db.QuizAttempts.AverageAsync(q => q.Percentage) 
            : 0.0;

        return Ok(new AdminPlatformStatsDto
        {
            TotalStudents = totalStudents,
            TotalAdmins = totalAdmins,
            TotalVideos = totalVideos,
            CompletedVideos = completedVideos,
            TotalQuizAttempts = totalQuizzes,
            PlatformAverageScore = Math.Round(avgScoreRaw, 1)
        });
    }
}
