using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VideoIntelligencePlatform.Backend.Models;

[Table("quiz_attempt_videos")]
public class QuizAttemptVideo
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("quiz_attempt_id")]
    public int QuizAttemptId { get; set; }

    [Column("video_id")]
    public int VideoId { get; set; }

    [ForeignKey("QuizAttemptId")]
    public QuizAttempt? QuizAttempt { get; set; }

    [ForeignKey("VideoId")]
    public Video? Video { get; set; }
}
