using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Data;
using VideoIntelligencePlatform.Backend.DTOs;
using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Services;

public class SearchService : ISearchService
{
    private readonly AppDbContext _db;
    private const int MaxContextMatches = 12;
    private const double OverlapThreshold = 0.70;

    private static readonly string[] MentionPatterns = new[]
    {
        @"\bwhere in the video\b",
        @"\bwhen in the video\b",
        @"\bat what timestamp\b",
        @"\bwhat timestamp\b",
        @"\bhow many times\b",
        @"\bexact timestamp\b",
        @"\bwhere is .* mentioned\b",
        @"\bwhen is .* mentioned\b"
    };

    public SearchService(AppDbContext db)
    {
        _db = db;
    }

    public string FormatSecondsToTimestamp(double seconds)
    {
        int totalSec = (int)Math.Round(seconds);
        int hrs = totalSec / 3600;
        int mins = (totalSec % 3600) / 60;
        int secs = totalSec % 60;

        if (hrs > 0)
        {
            return $"{hrs}:{mins:D2}:{secs:D2}";
        }
        return $"{mins}:{secs:D2}";
    }

    public bool IsMentionQuestion(string question)
    {
        if (string.IsNullOrWhiteSpace(question)) return false;
        var q = question.ToLower().Trim();
        return MentionPatterns.Any(p => Regex.IsMatch(q, p, RegexOptions.IgnoreCase));
    }

    public async Task<List<ChunkMatch>> SearchChunksRawAsync(string query, int userId, List<int>? videoIds = null, int? courseId = null, int topK = 20)
    {
        var cleanQuery = query.ToLower().Trim();
        var queryTokens = Regex.Matches(cleanQuery, @"\b[\w-]{2,}\b")
            .Select(m => m.Value.ToLower())
            .Distinct()
            .ToList();

        if (!queryTokens.Any())
        {
            queryTokens = cleanQuery.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToList();
        }

        var chunksQuery = _db.TranscriptChunks
            .Include(c => c.Transcript)
                .ThenInclude(t => t!.Video)
            .Where(c => c.Transcript != null && c.Transcript.Video != null);

        if (courseId.HasValue)
        {
            chunksQuery = chunksQuery.Where(c => c.Transcript!.Video!.CourseId == courseId.Value);
        }

        if (videoIds != null && videoIds.Any())
        {
            var validIds = videoIds.Distinct().ToList();
            chunksQuery = chunksQuery.Where(c => validIds.Contains(c.Transcript!.VideoId));
        }

        var chunks = await chunksQuery.ToListAsync();

        if (!chunks.Any())
        {
            return new List<ChunkMatch>();
        }

        var scoredList = new List<ChunkMatch>();

        foreach (var chunk in chunks)
        {
            var textLower = chunk.Text.ToLower();
            double score = 0.0;

            if (textLower.Contains(cleanQuery))
            {
                score += 15.0;
            }

            foreach (var token in queryTokens)
            {
                int count = Regex.Matches(textLower, $@"\b{Regex.Escape(token)}\b").Count;
                if (count > 0)
                {
                    score += 2.0 + Math.Log(1 + count);
                }
                else if (textLower.Contains(token))
                {
                    score += 0.8;
                }
            }

            if (score > 0.0)
            {
                var video = chunk.Transcript?.Video;
                var title = video?.OriginalFilename ?? video?.Filename ?? $"Video_{video?.Id}";

                scoredList.Add(new ChunkMatch
                {
                    ChunkId = chunk.Id,
                    ChunkIndex = chunk.ChunkIndex,
                    TranscriptId = chunk.TranscriptId,
                    VideoId = chunk.Transcript?.VideoId ?? 0,
                    VideoTitle = title,
                    Filename = video?.Filename ?? string.Empty,
                    StartTime = chunk.StartTime,
                    EndTime = chunk.EndTime,
                    Text = chunk.Text,
                    Score = score
                });
            }
        }

        return scoredList
            .OrderByDescending(c => c.Score)
            .Take(topK)
            .ToList();
    }

    private static double OverlapRatio(ChunkMatch a, ChunkMatch b)
    {
        double overlapStart = Math.Max(a.StartTime, b.StartTime);
        double overlapEnd = Math.Min(a.EndTime, b.EndTime);
        double overlap = Math.Max(0.0, overlapEnd - overlapStart);

        double durationA = Math.Max(0.001, a.EndTime - a.StartTime);
        double durationB = Math.Max(0.001, b.EndTime - b.StartTime);
        double smallerDuration = Math.Min(durationA, durationB);

        return overlap / smallerDuration;
    }

    private static List<ChunkMatch> SelectContextMatches(List<ChunkMatch> matches)
    {
        if (!matches.Any()) return new List<ChunkMatch>();

        var selected = new List<ChunkMatch>();
        var seenChunkIds = new HashSet<int>();

        foreach (var match in matches)
        {
            if (seenChunkIds.Contains(match.ChunkId)) continue;
            seenChunkIds.Add(match.ChunkId);

            bool tooSimilar = false;
            foreach (var existing in selected)
            {
                if (match.VideoId != existing.VideoId) continue;

                if (OverlapRatio(match, existing) >= OverlapThreshold)
                {
                    tooSimilar = true;
                    break;
                }
            }

            if (tooSimilar) continue;

            selected.Add(match);
            if (selected.Count >= MaxContextMatches) break;
        }

        return selected;
    }

    private async Task<List<ChunkMatch>> RefineTimestampsAsync(List<ChunkMatch> matches, string query)
    {
        var refined = new List<ChunkMatch>();
        var queryTokens = Regex.Matches(query.ToLower(), @"\b[\w-]{2,}\b")
            .Select(m => m.Value.ToLower())
            .ToList();

        foreach (var match in matches)
        {
            var copy = new ChunkMatch
            {
                ChunkId = match.ChunkId,
                ChunkIndex = match.ChunkIndex,
                TranscriptId = match.TranscriptId,
                VideoId = match.VideoId,
                VideoTitle = match.VideoTitle,
                Filename = match.Filename,
                StartTime = match.StartTime,
                EndTime = match.EndTime,
                Text = match.Text,
                Score = match.Score
            };

            var segments = await _db.TranscriptSegments
                .Where(s => s.TranscriptId == match.TranscriptId &&
                            s.EndTime >= match.StartTime - 2.0 &&
                            s.StartTime <= match.EndTime + 2.0)
                .OrderBy(s => s.SegmentIndex)
                .ToListAsync();

            if (segments.Any() && queryTokens.Any())
            {
                TranscriptSegment? bestSegment = null;
                double bestSegScore = -1.0;

                foreach (var seg in segments)
                {
                    var segText = seg.Text.ToLower();
                    double segScore = 0.0;

                    foreach (var token in queryTokens)
                    {
                        if (segText.Contains(token))
                        {
                            segScore += 1.0;
                        }
                    }

                    if (segScore > bestSegScore)
                    {
                        bestSegScore = segScore;
                        bestSegment = seg;
                    }
                }

                if (bestSegment != null && bestSegScore > 0)
                {
                    copy.StartTime = bestSegment.StartTime;
                    copy.EndTime = bestSegment.EndTime;
                }
            }

            refined.Add(copy);
        }

        return refined;
    }

    private List<MentionOccurrence> ClusterMentionOccurrences(List<ChunkMatch> matches)
    {
        if (!matches.Any()) return new List<MentionOccurrence>();

        var sorted = matches.OrderBy(m => m.StartTime).ToList();
        var clusters = new List<MentionOccurrence>();

        foreach (var m in sorted)
        {
            var text = m.Text.Trim();
            if (string.IsNullOrWhiteSpace(text)) continue;

            bool merged = false;
            foreach (var c in clusters)
            {
                if (c.VideoId == m.VideoId && Math.Abs(m.StartTime - c.StartTime) <= 60.0)
                {
                    c.EndTime = Math.Max(c.EndTime, m.EndTime);
                    c.Text += " " + text;
                    merged = true;
                    break;
                }
            }

            if (!merged)
            {
                clusters.Add(new MentionOccurrence
                {
                    VideoId = m.VideoId,
                    VideoTitle = m.VideoTitle,
                    StartTime = m.StartTime,
                    EndTime = m.EndTime,
                    TimestampStr = FormatSecondsToTimestamp(m.StartTime),
                    Text = text
                });
            }
        }

        return clusters;
    }

    public async Task<SearchResult> SearchAsync(string query, int userId, List<int>? videoIds = null, int? courseId = null)
    {
        var matches = await SearchChunksRawAsync(query, userId, videoIds, courseId, topK: 20);

        if (!matches.Any())
        {
            return new SearchResult
            {
                Query = query,
                Matches = new List<ChunkMatch>(),
                Context = "NO_RELEVANT_VIDEO_CONTEXT",
                Sources = new List<SourceDto>(),
                IsMentionQuestion = IsMentionQuestion(query),
                MentionOccurrences = new List<MentionOccurrence>()
            };
        }

        var selected = SelectContextMatches(matches);
        var refined = await RefineTimestampsAsync(selected, query);

        bool isMention = IsMentionQuestion(query);
        List<MentionOccurrence> mentionOccurrences = new();

        if (isMention)
        {
            mentionOccurrences = ClusterMentionOccurrences(refined);
        }

        var contextBlocks = new List<string>();
        var sources = new List<SourceDto>();

        for (int i = 0; i < refined.Count; i++)
        {
            var m = refined[i];
            if (string.IsNullOrWhiteSpace(m.Text)) continue;

            var formattedTs = $"{FormatSecondsToTimestamp(m.StartTime)} - {FormatSecondsToTimestamp(m.EndTime)}";

            var block = $@"SOURCE {i + 1}

VIDEO TITLE:
{m.VideoTitle}

VIDEO ID:
{m.VideoId}

SOURCE TIMESTAMP:
{m.StartTime:F2} - {m.EndTime:F2} ({formattedTs})

TRANSCRIPT:
{m.Text.Trim()}";

            contextBlocks.Add(block);

            sources.Add(new SourceDto
            {
                VideoId = m.VideoId,
                VideoTitle = m.VideoTitle,
                ChunkId = m.ChunkId,
                StartTime = m.StartTime,
                EndTime = m.EndTime
            });
        }

        var context = contextBlocks.Any()
            ? "\n\n" + string.Join("\n\n", contextBlocks) + "\n"
            : "NO_RELEVANT_VIDEO_CONTEXT";

        return new SearchResult
        {
            Query = query,
            Matches = refined,
            Context = context,
            Sources = sources,
            IsMentionQuestion = isMention,
            MentionOccurrences = mentionOccurrences
        };
    }
}
