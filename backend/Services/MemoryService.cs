using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Services;

public class MemoryService : IMemoryService
{
    private readonly AppDbContext _db;

    public MemoryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Conversation> GetOrCreateConversationAsync(int userId, string? conversationId, int? courseId = null)
    {
        if (!string.IsNullOrWhiteSpace(conversationId))
        {
            var conversation = await _db.Conversations
                .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);

            if (conversation != null)
            {
                if (courseId.HasValue && !conversation.CourseId.HasValue)
                {
                    conversation.CourseId = courseId.Value;
                    await _db.SaveChangesAsync();
                }
                return conversation;
            }
        }

        if (courseId.HasValue)
        {
            var existingCourseConv = await _db.Conversations
                .Where(c => c.UserId == userId && c.CourseId == courseId.Value)
                .OrderByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync();

            if (existingCourseConv != null)
            {
                return existingCourseConv;
            }
        }

        var newConv = new Conversation
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            CourseId = courseId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Conversations.Add(newConv);
        await _db.SaveChangesAsync();
        return newConv;
    }

    public async Task<Conversation?> GetCourseConversationAsync(int userId, int courseId)
    {
        return await _db.Conversations
            .Include(c => c.Messages)
            .Where(c => c.UserId == userId && c.CourseId == courseId)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<bool> ClearCourseConversationAsync(int userId, int courseId)
    {
        var convs = await _db.Conversations
            .Include(c => c.Messages)
            .Where(c => c.UserId == userId && c.CourseId == courseId)
            .ToListAsync();

        if (!convs.Any()) return false;

        foreach (var conv in convs)
        {
            _db.Messages.RemoveRange(conv.Messages);
            _db.Conversations.Remove(conv);
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<ChatHistoryMessage>> GetHistoryAsync(string conversationId, int userId, int maxHistory = 20)
    {
        var messages = await _db.Messages
            .Include(m => m.Conversation)
            .Where(m => m.ConversationId == conversationId && m.Conversation!.UserId == userId)
            .OrderByDescending(m => m.CreatedAt)
            .ThenByDescending(m => m.Id)
            .Take(maxHistory)
            .ToListAsync();

        return messages
            .OrderBy(m => m.CreatedAt)
            .Select(m => new ChatHistoryMessage { Role = m.Role, Text = m.Text })
            .ToList();
    }

    public async Task AddMessageAsync(string conversationId, int userId, string role, string text)
    {
        var conversation = await _db.Conversations
            .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);

        if (conversation == null) return;

        var message = new Message
        {
            ConversationId = conversationId,
            Role = role,
            Text = text,
            CreatedAt = DateTime.UtcNow
        };

        _db.Messages.Add(message);
        await _db.SaveChangesAsync();
    }
}
