using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VideoIntelligencePlatform.Backend.Models;

[Table("instructor_chat_channels")]
public class InstructorChatChannel
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("course_id")]
    public int CourseId { get; set; }

    [ForeignKey(nameof(CourseId))]
    public Course? Course { get; set; }

    [Column("student_id")]
    public int StudentId { get; set; }

    [ForeignKey(nameof(StudentId))]
    public User? Student { get; set; }

    [Column("instructor_id")]
    public int? InstructorId { get; set; }

    [ForeignKey(nameof(InstructorId))]
    public User? Instructor { get; set; }

    [Column("title")]
    [MaxLength(200)]
    public string Title { get; set; } = "Course Q&A & Doubts";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<InstructorChatMessage> Messages { get; set; } = new List<InstructorChatMessage>();
}
