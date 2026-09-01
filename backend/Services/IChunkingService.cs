namespace VideoIntelligencePlatform.Backend.Services;

public interface IChunkingService
{
    Task CreateChunksAsync(int transcriptId, Action<int, string>? progressCallback = null);
}
