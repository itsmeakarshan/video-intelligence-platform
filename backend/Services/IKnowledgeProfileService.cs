namespace VideoIntelligencePlatform.Backend.Services;

public interface IKnowledgeProfileService
{
    Task<object> GetUserKnowledgeProfileAsync(int userId, int? courseId = null);
    string NormalizeTopicName(string rawTopic);
}
