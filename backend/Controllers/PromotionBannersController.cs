using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Controllers;

[ApiController]
[Route("banners")]
[Route("api/banners")]
public class PromotionBannersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<PromotionBannersController> _logger;
    private readonly string _bannersDirectory;

    public PromotionBannersController(AppDbContext db, ILogger<PromotionBannersController> logger)
    {
        _db = db;
        _logger = logger;
        _bannersDirectory = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "banners");
        if (!Directory.Exists(_bannersDirectory))
        {
            Directory.CreateDirectory(_bannersDirectory);
        }
    }

    private (int UserId, string Role)? TryGetCurrentUser()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("user_id")?.Value
            ?? User.FindFirst("sub")?.Value;

        if (!int.TryParse(sub, out int userId))
        {
            return null;
        }

        var role = User.FindFirst(ClaimTypes.Role)?.Value
            ?? User.FindFirst("role")?.Value
            ?? "student";

        return (userId, role);
    }

    private (int UserId, string Role) GetCurrentUser()
    {
        var user = TryGetCurrentUser();
        if (user == null)
        {
            throw new UnauthorizedAccessException("Not authenticated.");
        }
        return user.Value;
    }

    /// <summary>
    /// Returns active banners for learners, or all banners for admins.
    /// </summary>
    [HttpGet("")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBanners()
    {
        var currentUser = TryGetCurrentUser();
        bool isAdmin = currentUser.HasValue && currentUser.Value.Role.Equals("admin", StringComparison.OrdinalIgnoreCase);

        var query = _db.PromotionBanners.AsQueryable();

        if (!isAdmin)
        {
            query = query.Where(b => b.IsActive);
        }

        var banners = await query
            .OrderBy(b => b.DisplayOrder)
            .ThenByDescending(b => b.CreatedAt)
            .ToListAsync();

        return Ok(banners);
    }

    /// <summary>
    /// Admin creates a new promotional banner with an uploaded image.
    /// </summary>
    [HttpPost("")]
    [Authorize]
    [RequestSizeLimit(50_000_000)] // 50 MB max
    public async Task<IActionResult> CreateBanner(
        [FromForm] IFormFile? image,
        [FromForm] string? title,
        [FromForm] string? subtitle,
        [FromForm] string? discountTag,
        [FromForm] string? targetUrl,
        [FromForm(Name = "target_url")] string? targetUrlSnake,
        [FromForm] int? displayOrder)
    {
        var (userId, role) = GetCurrentUser();
        if (!role.Equals("admin", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var bannerTitle = !string.IsNullOrWhiteSpace(title) ? title.Trim() : "Promotional Banner";
        var resolvedTargetUrl = !string.IsNullOrWhiteSpace(targetUrl) ? targetUrl.Trim() : targetUrlSnake?.Trim();

        if (image == null || image.Length == 0)
        {
            return BadRequest(new { error = "Banner image is required." });
        }

        var allowedExts = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"
        };

        var ext = Path.GetExtension(image.FileName);
        if (string.IsNullOrWhiteSpace(ext) || !allowedExts.Contains(ext))
        {
            return BadRequest(new { error = "Invalid image file format. Supported: JPG, PNG, WebP, GIF, SVG." });
        }

        var safeFileName = $"{Guid.NewGuid():N}_{Path.GetFileName(image.FileName)}";
        var targetPath = Path.Combine(_bannersDirectory, safeFileName);

        using (var stream = new FileStream(targetPath, FileMode.Create))
        {
            await image.CopyToAsync(stream);
        }

        var relativeImageUrl = $"/banners/image/{safeFileName}";

        var banner = new PromotionBanner
        {
            Title = bannerTitle,
            Subtitle = string.IsNullOrWhiteSpace(subtitle) ? null : subtitle.Trim(),
            DiscountTag = string.IsNullOrWhiteSpace(discountTag) ? null : discountTag.Trim().ToUpperInvariant(),
            ImageUrl = relativeImageUrl,
            TargetUrl = resolvedTargetUrl,
            IsActive = true,
            DisplayOrder = displayOrder ?? 0,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _db.PromotionBanners.Add(banner);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {UserId} created promotion banner #{BannerId}: {Title}", userId, banner.Id, banner.Title);

        return Ok(banner);
    }

    /// <summary>
    /// Admin deletes a promotional banner.
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteBanner(int id)
    {
        var (_, role) = GetCurrentUser();
        if (!role.Equals("admin", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var banner = await _db.PromotionBanners.FindAsync(id);
        if (banner == null)
        {
            return NotFound(new { error = "Banner not found." });
        }

        // Clean up physical file
        if (!string.IsNullOrWhiteSpace(banner.ImageUrl) && banner.ImageUrl.StartsWith("/banners/image/"))
        {
            try
            {
                var fileName = Path.GetFileName(banner.ImageUrl);
                var fullPath = Path.Combine(_bannersDirectory, fileName);
                if (System.IO.File.Exists(fullPath))
                {
                    System.IO.File.Delete(fullPath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete physical banner file for banner {BannerId}", id);
            }
        }

        _db.PromotionBanners.Remove(banner);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, id });
    }

    /// <summary>
    /// Admin toggles active status of a banner.
    /// </summary>
    [HttpPatch("{id:int}/toggle")]
    [Authorize]
    public async Task<IActionResult> ToggleBanner(int id)
    {
        var (_, role) = GetCurrentUser();
        if (!role.Equals("admin", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var banner = await _db.PromotionBanners.FindAsync(id);
        if (banner == null)
        {
            return NotFound(new { error = "Banner not found." });
        }

        banner.IsActive = !banner.IsActive;
        await _db.SaveChangesAsync();

        return Ok(banner);
    }

    /// <summary>
    /// Public endpoint to serve banner image.
    /// </summary>
    [HttpGet("/banners/image/{fileName}")]
    [HttpHead("/banners/image/{fileName}")]
    [AllowAnonymous]
    public IActionResult GetBannerImage(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName) || fileName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
        {
            return BadRequest();
        }

        var safeFileName = Path.GetFileName(fileName);
        var filePath = Path.Combine(_bannersDirectory, safeFileName);

        if (!System.IO.File.Exists(filePath))
        {
            return NotFound();
        }

        var ext = Path.GetExtension(safeFileName).ToLowerInvariant();
        var contentType = ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".svg" => "image/svg+xml",
            _ => "application/octet-stream"
        };

        Response.Headers["Cache-Control"] = "public, max-age=86400";
        return PhysicalFile(filePath, contentType, enableRangeProcessing: true);
    }
}
