using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VideoIntelligencePlatform.Backend.Models;

[Table("courses")]
public class Course
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("title")]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Column("description")]
    [MaxLength(2000)]
    public string Description { get; set; } = string.Empty;

    [Column("thumbnail_url")]
    [MaxLength(500)]
    public string? ThumbnailUrl { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("price")]
    public decimal Price { get; set; } = 0.0m;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("UserId")]
    public User? User { get; set; }

    public ICollection<Video> Videos { get; set; } = new List<Video>();
    public ICollection<CourseEnrollment> Enrollments { get; set; } = new List<CourseEnrollment>();
}
