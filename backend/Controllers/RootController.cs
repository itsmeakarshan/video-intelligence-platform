using Microsoft.AspNetCore.Mvc;

namespace VideoIntelligencePlatform.Backend.Controllers;

[ApiController]
[Route("")]
public class RootController : ControllerBase
{
    [HttpGet("")]
    public IActionResult GetRoot()
    {
        return Ok(new { message = "Video Intelligence Platform API" });
    }
}
