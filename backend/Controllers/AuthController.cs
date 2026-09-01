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
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuthService _authService;

    public AuthController(AppDbContext db, IAuthService authService)
    {
        _db = db;
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] UserRegisterDto request)
    {
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

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] UserLoginDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user == null || !_authService.VerifyPassword(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { detail = "Invalid email or password." });
        }

        var token = _authService.CreateAccessToken(user.Id, user.Role);

        return Ok(new TokenResponseDto
        {
            AccessToken = token,
            TokenType = "bearer",
            User = new UserResponseDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role
            }
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("user_id")?.Value
            ?? User.FindFirst("sub")?.Value;

        if (!int.TryParse(sub, out var userId))
        {
            return Unauthorized(new { detail = "Not authenticated." });
        }

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { detail = "User not found." });
        }

        return Ok(new UserResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role
        });
    }
}
