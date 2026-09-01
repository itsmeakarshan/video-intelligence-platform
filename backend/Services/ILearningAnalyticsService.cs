namespace VideoIntelligencePlatform.Backend.Services;

public interface ILearningAnalyticsService
{
    Task<object> ComputeLearningGainAsync(int userId);
    Task<object> GetAbExperimentSummaryAsync();
}
