using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VideoIntelligencePlatform.Backend.Models;

[Table("quiz_attempt_questions")]
public class QuizAttemptQuestion
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("quiz_attempt_id")]
    public int QuizAttemptId { get; set; }

    [Column("question_index")]
    public int QuestionIndex { get; set; }

    [Column("question_text")]
    [MaxLength(500)]
    public string QuestionText { get; set; } = string.Empty;

    [Column("selected_answer")]
    public int SelectedAnswer { get; set; }

    [Column("correct_answer")]
    public int CorrectAnswer { get; set; }

    [Column("is_correct")]
    public bool IsCorrect { get; set; }

    [Column("topic")]
    [MaxLength(200)]
    public string Topic { get; set; } = "General Concept";

    [Column("explanation")]
    [MaxLength(1000)]
    public string? Explanation { get; set; }

    [ForeignKey("QuizAttemptId")]
    public QuizAttempt? QuizAttempt { get; set; }
}
