using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VideoIntelligencePlatform.Backend.Models;

[Table("quiz_attempts")]
public class QuizAttempt
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("video_id")]
    public int? VideoId { get; set; }

    [Column("score")]
    public int Score { get; set; }

    [Column("total_questions")]
    public int TotalQuestions { get; set; }

    [Column("percentage")]
    public double Percentage { get; set; }

    [Column("difficulty")]
    [MaxLength(20)]
    public string Difficulty { get; set; } = "Medium";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("UserId")]
    public User? User { get; set; }

    [ForeignKey("VideoId")]
    public Video? Video { get; set; }

    public List<QuizAttemptVideo> QuizAttemptVideos { get; set; } = new();
    public List<QuizAttemptQuestion> Questions { get; set; } = new();
}
