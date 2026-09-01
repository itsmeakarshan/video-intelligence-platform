using Microsoft.AspNetCore.Http;
using VideoIntelligencePlatform.Backend.DTOs;
using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Services;

public interface IVideoService
{
    Task<VideoResponseDto> SaveVideoAsync(IFormFile file, int userId, int? courseId = null);
    Task<VideoResponseDto> SaveDownloadedVideoAsync(string filePath, string originalFilename, int userId, int? courseId = null);
    Task<List<VideoResponseDto>> GetAllVideosAsync(int userId, int? courseId = null);
    Task<(string FilePath, string ContentType, string OriginalFilename)?> GetVideoFileAsync(int videoId, int userId);
    Task<bool> DeleteVideoAsync(int videoId, int userId);
}
