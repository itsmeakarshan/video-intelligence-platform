using VideoIntelligencePlatform.Backend.DTOs;

namespace VideoIntelligencePlatform.Backend.Services;

public interface IYouTubeRecommendationService
{
    Task<RecommendationResponseDto> GetQuizAttemptRecommendationsAsync(int attemptId, int userId);
}
