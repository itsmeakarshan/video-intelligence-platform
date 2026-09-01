using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Services;

public interface IAuthService
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
    string CreateAccessToken(int userId, string role = "student");
    (int? UserId, string? Role) DecodeAccessTokenWithRole(string token);
    int? DecodeAccessToken(string token);
}
