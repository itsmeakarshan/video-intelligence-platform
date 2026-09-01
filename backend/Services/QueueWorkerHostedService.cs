using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Services;

public class QueueWorkerHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<QueueWorkerHostedService> _logger;

    public QueueWorkerHostedService(IServiceProvider serviceProvider, ILogger<QueueWorkerHostedService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Background Queue Worker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var video = await db.Videos
                    .Where(v => v.Status == "queued")
                    .OrderBy(v => v.Id)
                    .FirstOrDefaultAsync(stoppingToken);

                if (video != null)
                {
                    await ProcessVideoAsync(video.Id, scope.ServiceProvider, stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in queue worker iteration.");
            }

            await Task.Delay(3000, stoppingToken);
        }

        _logger.LogInformation("Background Queue Worker stopped.");
    }

    private async Task ProcessVideoAsync(int videoId, IServiceProvider serviceProvider, CancellationToken stoppingToken)
    {
        var db = serviceProvider.GetRequiredService<AppDbContext>();
        var transcriptionService = serviceProvider.GetRequiredService<ITranscriptionService>();
        var chunkingService = serviceProvider.GetRequiredService<IChunkingService>();

        var video = await db.Videos.FindAsync(videoId);
        if (video == null) return;

        try
        {
            _logger.LogInformation("Processing video {VideoId} ({Filename})", video.Id, video.OriginalFilename);

            video.Status = "processing";
            video.Progress = 5;
            video.CurrentStep = "Preparing video...";
            await db.SaveChangesAsync(stoppingToken);

            void UpdateProgress(int percent, string step)
            {
                try
                {
                    video.Progress = percent;
                    video.CurrentStep = step;
                    db.SaveChanges();
                }
                catch { }
            }

            var transcriptionResult = await transcriptionService.TranscribeVideoAsync(video.FilePath, UpdateProgress);

            video.Progress = 40;
            video.CurrentStep = "Saving transcript...";
            await db.SaveChangesAsync(stoppingToken);

            var transcript = new Transcript
            {
                VideoId = video.Id,
                Language = transcriptionResult.Language,
                TranscriptText = transcriptionResult.FullText
            };

            db.Transcripts.Add(transcript);
            await db.SaveChangesAsync(stoppingToken);

            video.Progress = 45;
            video.CurrentStep = "Saving transcript segments...";
            await db.SaveChangesAsync(stoppingToken);

            int totalSegs = transcriptionResult.Segments.Count;
            for (int i = 0; i < totalSegs; i++)
            {
                var s = transcriptionResult.Segments[i];
                var seg = new TranscriptSegment
                {
                    TranscriptId = transcript.Id,
                    SegmentIndex = s.SegmentIndex,
                    StartTime = s.Start,
                    EndTime = s.End,
                    Text = s.Text,
                    CreatedAt = DateTime.UtcNow
                };
                db.TranscriptSegments.Add(seg);

                if (i % 10 == 0 || i == totalSegs - 1)
                {
                    int pct = (int)(45 + ((double)i / Math.Max(1, totalSegs)) * 10);
                    UpdateProgress(pct, $"Saving segment {i + 1}/{totalSegs}...");
                }
            }

            await db.SaveChangesAsync(stoppingToken);

            video.Progress = 55;
            video.CurrentStep = "Creating semantic chunks...";
            await db.SaveChangesAsync(stoppingToken);

            await chunkingService.CreateChunksAsync(transcript.Id, UpdateProgress);

            video.Progress = 75;
            video.CurrentStep = "Generating vector embeddings...";
            await db.SaveChangesAsync(stoppingToken);

            var chunks = await db.TranscriptChunks
                .Where(c => c.TranscriptId == transcript.Id)
                .ToListAsync(stoppingToken);

            foreach (var chunk in chunks)
            {
                chunk.EmbeddingCreated = true;
            }

            video.Progress = 100;
            video.CurrentStep = "Completed";
            video.Status = "completed";
            await db.SaveChangesAsync(stoppingToken);

            _logger.LogInformation("Successfully finished processing video {VideoId}", video.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process video {VideoId}", video.Id);
            try
            {
                video.Status = "failed";
                video.CurrentStep = ex.Message;
                await db.SaveChangesAsync(CancellationToken.None);
            }
            catch { }
        }
    }
}
