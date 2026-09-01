using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Services;

public class ChunkingService : IChunkingService
{
    private readonly AppDbContext _db;
    private const int WindowSize = 3;

    public ChunkingService(AppDbContext db)
    {
        _db = db;
    }

    public async Task CreateChunksAsync(int transcriptId, Action<int, string>? progressCallback = null)
    {
        var existingChunks = await _db.TranscriptChunks
            .Where(c => c.TranscriptId == transcriptId)
            .ToListAsync();

        if (existingChunks.Any())
        {
            _db.TranscriptChunks.RemoveRange(existingChunks);
            await _db.SaveChangesAsync();
        }

        var segments = await _db.TranscriptSegments
            .Where(s => s.TranscriptId == transcriptId)
            .OrderBy(s => s.SegmentIndex)
            .ToListAsync();

        if (!segments.Any())
        {
            return;
        }

        int chunkIndex = 1;
        int totalChunks = Math.Max(1, segments.Count - WindowSize + 1);

        for (int i = 0; i <= segments.Count - WindowSize; i++)
        {
            var window = segments.Skip(i).Take(WindowSize).ToList();
            var text = string.Join(" ", window.Select(s => s.Text.Trim()));

            var chunk = new TranscriptChunk
            {
                TranscriptId = transcriptId,
                ChunkIndex = chunkIndex,
                StartTime = window.First().StartTime,
                EndTime = window.Last().EndTime,
                Text = text,
                EmbeddingCreated = false,
                CreatedAt = DateTime.UtcNow
            };

            _db.TranscriptChunks.Add(chunk);
            chunkIndex++;

            if (progressCallback != null && (i % 5 == 0 || i == totalChunks - 1))
            {
                int pct = (int)(70 + ((double)i / totalChunks) * 10);
                progressCallback(pct, $"Creating semantic chunk {chunkIndex - 1}/{totalChunks}...");
            }
        }

        await _db.SaveChangesAsync();
    }
}
