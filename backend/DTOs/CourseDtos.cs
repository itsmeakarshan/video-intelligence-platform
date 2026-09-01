namespace VideoIntelligencePlatform.Backend.DTOs;

public class CourseVideoDto
{
    public int Id { get; set; }
    public int? CourseId { get; set; }
    public int OrderIndex { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Filename { get; set; } = string.Empty;
    public string OriginalFilename { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public double Progress { get; set; }
    public string CurrentStep { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CourseListDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public decimal Price { get; set; } = 0.0m;
    public bool IsEnrolled { get; set; } = false;
    public int? UserId { get; set; }
    public string? UserName { get; set; }
    public int VideoCount { get; set; }
    public int CompletedVideoCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CourseDetailDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public decimal Price { get; set; } = 0.0m;
    public bool IsEnrolled { get; set; } = false;
    public int? UserId { get; set; }
    public string? UserName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<CourseVideoDto> Videos { get; set; } = new();
}

public class CourseCreateDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public decimal Price { get; set; } = 0.0m;
}

public class CourseUpdateDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? ThumbnailUrl { get; set; }
    public decimal? Price { get; set; }
}

public class VideoOrderDto
{
    public int VideoId { get; set; }
    public int OrderIndex { get; set; }
}

public class ReorderVideosDto
{
    public List<VideoOrderDto> VideoOrders { get; set; } = new();
}

public class CourseVideoUpdateDto
{
    public string? Title { get; set; }
    public int? OrderIndex { get; set; }
}
