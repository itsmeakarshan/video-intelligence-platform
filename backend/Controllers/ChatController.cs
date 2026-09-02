using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VideoIntelligencePlatform.Backend.DTOs;
using VideoIntelligencePlatform.Backend.Services;

namespace VideoIntelligencePlatform.Backend.Controllers;

[ApiController]
[Route("chat")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly IAiService _aiService;
    private readonly IMemoryService _memoryService;
    private readonly IGeminiService _geminiService;

    public ChatController(IAiService aiService, IMemoryService memoryService, IGeminiService geminiService)
    {
        _aiService = aiService;
        _memoryService = memoryService;
        _geminiService = geminiService;
    }

    private int GetCurrentUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("user_id")?.Value
            ?? User.FindFirst("sub")?.Value;

        if (int.TryParse(sub, out var id)) return id;
        throw new UnauthorizedAccessException("Not authenticated.");
    }

    [HttpPost("")]
    public async Task<IActionResult> Chat([FromBody] ChatRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
        {
            return BadRequest(new { detail = "Question is required." });
        }

        var userId = GetCurrentUserId();
        var response = await _aiService.ChatWithAiAsync(request.Question, userId, request.ConversationId, request.VideoIds, request.CourseId);
        return Ok(response);
    }

    [HttpPost("stream")]
    public async Task ChatStream([FromBody] ChatRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
        {
            Response.StatusCode = 400;
            await Response.WriteAsync("Question is required.", cancellationToken);
            return;
        }

        var userId = GetCurrentUserId();
        var conversation = await _memoryService.GetOrCreateConversationAsync(userId, request.ConversationId, request.CourseId);
        var convId = conversation.Id;

        Response.ContentType = "text/plain; charset=utf-8";
        Response.Headers.Append("x-conversation-id", convId);

        try
        {
            await foreach (var chunk in _aiService.ChatWithAiStreamAsync(request.Question, userId, convId, request.VideoIds, request.CourseId, cancellationToken))
            {
                var bytes = Encoding.UTF8.GetBytes(chunk);
                await Response.Body.WriteAsync(bytes, 0, bytes.Length, cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Client closed stream
        }
    }

    [HttpGet("course/{courseId:int}")]
    public async Task<IActionResult> GetCourseConversation(int courseId)
    {
        var userId = GetCurrentUserId();
        var conv = await _memoryService.GetCourseConversationAsync(userId, courseId);
        if (conv == null)
        {
            return Ok(new CourseConversationResponseDto
            {
                ConversationId = null,
                CourseId = courseId,
                Messages = new List<ChatMessageItemDto>()
            });
        }

        var result = new CourseConversationResponseDto
        {
            ConversationId = conv.Id,
            CourseId = courseId,
            Messages = conv.Messages
                .OrderBy(m => m.CreatedAt)
                .Select(m => new ChatMessageItemDto
                {
                    Id = m.Id.ToString(),
                    Role = m.Role.ToLower(),
                    Text = m.Text,
                    CreatedAt = m.CreatedAt
                }).ToList()
        };

        return Ok(result);
    }

    [HttpDelete("course/{courseId:int}")]
    public async Task<IActionResult> ClearCourseConversation(int courseId)
    {
        var userId = GetCurrentUserId();
        var cleared = await _memoryService.ClearCourseConversationAsync(userId, courseId);
        return Ok(new { success = true, cleared, detail = "Course chat history cleared." });
    }

    [HttpPost("summary")]
    public async Task<IActionResult> Summary([FromBody] SummaryRequestDto request)
    {
        var userId = GetCurrentUserId();
        var response = await _aiService.SummaryWithAiAsync(userId, request.VideoIds);
        return Ok(response);
    }

    [HttpPost("notes")]
    public async Task<IActionResult> Notes([FromBody] NotesRequestDto request)
    {
        var userId = GetCurrentUserId();
        var response = await _aiService.NotesWithAiAsync(userId, request.VideoIds);
        return Ok(response);
    }

    [HttpPost("quiz")]
    public async Task<IActionResult> Quiz([FromBody] QuizRequestDto request)
    {
        var userId = GetCurrentUserId();
        var response = await _aiService.QuizWithAiAsync(userId, request.Difficulty, request.Questions, request.VideoIds, request.CourseId);
        return Ok(response);
    }

    [HttpGet("api-key")]
    [AllowAnonymous]
    public IActionResult GetApiKeyStatus()
    {
        var masked = _geminiService.GetMaskedApiKey();
        return Ok(new GeminiApiKeyStatusDto
        {
            Configured = !string.IsNullOrWhiteSpace(masked),
            MaskedKey = masked,
            Model = "gemini-3.5-flash"
        });
    }

    [HttpPost("api-key")]
    [AllowAnonymous]
    public IActionResult UpdateApiKey([FromBody] GeminiApiKeyUpdateDto request)
    {
        if (string.IsNullOrWhiteSpace(request.ApiKey))
        {
            return BadRequest(new { detail = "API key cannot be empty." });
        }

        var updated = _geminiService.UpdateApiKey(request.ApiKey);
        if (!updated)
        {
            return BadRequest(new { detail = "Failed to update API key." });
        }

        return Ok(new
        {
            success = true,
            maskedKey = _geminiService.GetMaskedApiKey(),
            message = "Gemini API key updated successfully."
        });
    }

    [HttpPost("api-key/test")]
    [AllowAnonymous]
    public async Task<IActionResult> TestApiKey([FromBody] GeminiApiKeyTestDto request)
    {
        var (success, message, model) = await _geminiService.TestApiKeyAsync(request.ApiKey);
        return Ok(new GeminiApiKeyTestResultDto
        {
            Success = success,
            Message = message,
            Model = model
        });
    }

    [HttpDelete("api-key")]
    [AllowAnonymous]
    public IActionResult DeleteApiKey()
    {
        _geminiService.RemoveApiKey();
        return Ok(new { success = true, message = "Gemini API key removed." });
    }
}

