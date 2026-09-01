using System.ComponentModel.DataAnnotations;

namespace VideoIntelligencePlatform.Backend.DTOs;

public class UserRegisterDto
{
    [Required]
    [MinLength(1)]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(128)]
    public string Password { get; set; } = string.Empty;

    public string? Role { get; set; } = "student";
}

public class UserLoginDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(1)]
    [MaxLength(128)]
    public string Password { get; set; } = string.Empty;
}

public class UserResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = "student";
}

public class TokenResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string TokenType { get; set; } = "bearer";
    public UserResponseDto User { get; set; } = new();
}

public class AdminCreateUserDto
{
    [Required]
    [MinLength(1)]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    [MaxLength(128)]
    public string Password { get; set; } = string.Empty;

    public string Role { get; set; } = "student";
}

public class AdminUserListItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = "student";
    public DateTime CreatedAt { get; set; }
    public int EnrolledCoursesCount { get; set; }
    public int QuizAttemptCount { get; set; }
    public double? LastScorePercentage { get; set; }
    public double? AverageScorePercentage { get; set; }
}

public class AdminPlatformStatsDto
{
    public int TotalStudents { get; set; }
    public int TotalAdmins { get; set; }
    public int TotalVideos { get; set; }
    public int CompletedVideos { get; set; }
    public int TotalQuizAttempts { get; set; }
    public double PlatformAverageScore { get; set; }
}
