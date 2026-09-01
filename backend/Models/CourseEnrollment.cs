using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VideoIntelligencePlatform.Backend.Models;

[Table("course_enrollments")]
public class CourseEnrollment
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("course_id")]
    public int CourseId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("enrolled_at")]
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;

    [Column("amount_paid")]
    public decimal AmountPaid { get; set; } = 0.0m;

    [ForeignKey("CourseId")]
    public Course? Course { get; set; }

    [ForeignKey("UserId")]
    public User? User { get; set; }
}
