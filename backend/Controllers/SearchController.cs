using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VideoIntelligencePlatform.Backend.Services;

namespace VideoIntelligencePlatform.Backend.Controllers;

[ApiController]
[Route("search")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly ISearchService _searchService;

    public SearchController(ISearchService searchService)
    {
        _searchService = searchService;
    }

    private int GetCurrentUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("user_id")?.Value
            ?? User.FindFirst("sub")?.Value;

        if (int.TryParse(sub, out var id)) return id;
        throw new UnauthorizedAccessException("Not authenticated.");
    }

    [HttpGet("")]
    [HttpGet("/search/")]
    public async Task<IActionResult> Search([FromQuery] string query)
    {
        int userId = GetCurrentUserId();
        var results = await _searchService.SearchChunksRawAsync(query, userId);
        return Ok(new
        {
            query = query,
            matches = results
        });
    }
}
