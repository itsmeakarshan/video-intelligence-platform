using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VideoIntelligencePlatform.Backend.Models;

[Table("videos")]
public class Video
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("filename")]
    [MaxLength(255)]
    public string Filename { get; set; } = string.Empty;

    [Column("original_filename")]
    [MaxLength(255)]
    public string OriginalFilename { get; set; } = string.Empty;

    [Column("file_path")]
    [MaxLength(500)]
    public string FilePath { get; set; } = string.Empty;

    [Column("file_size")]
    public long FileSize { get; set; }

    [Column("status")]
    [MaxLength(50)]
    public string Status { get; set; } = "uploaded";

    [Column("progress")]
    public double Progress { get; set; } = 0.0;

    [Column("current_step")]
    [MaxLength(100)]
    public string CurrentStep { get; set; } = "Waiting...";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("course_id")]
    public int? CourseId { get; set; }

    [Column("order_index")]
    public int OrderIndex { get; set; } = 1;

    [Column("title")]
    [MaxLength(255)]
    public string? Title { get; set; }

    [ForeignKey("UserId")]
    public User? User { get; set; }

    [ForeignKey("CourseId")]
    public Course? Course { get; set; }

    public List<Transcript> Transcripts { get; set; } = new();
    public List<QuizAttemptVideo> QuizAttemptVideos { get; set; } = new();
}
