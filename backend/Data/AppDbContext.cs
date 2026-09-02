using Microsoft.EntityFrameworkCore;
using VideoIntelligencePlatform.Backend.Models;

namespace VideoIntelligencePlatform.Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Video> Videos => Set<Video>();
    public DbSet<Transcript> Transcripts => Set<Transcript>();
    public DbSet<TranscriptSegment> TranscriptSegments => Set<TranscriptSegment>();
    public DbSet<TranscriptChunk> TranscriptChunks => Set<TranscriptChunk>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<QuizAttempt> QuizAttempts => Set<QuizAttempt>();
    public DbSet<QuizAttemptVideo> QuizAttemptVideos => Set<QuizAttemptVideo>();
    public DbSet<QuizAttemptQuestion> QuizAttemptQuestions => Set<QuizAttemptQuestion>();
    public DbSet<InstructorChatChannel> InstructorChatChannels => Set<InstructorChatChannel>();
    public DbSet<InstructorChatMessage> InstructorChatMessages => Set<InstructorChatMessage>();
    public DbSet<PromotionBanner> PromotionBanners => Set<PromotionBanner>();
    public DbSet<CourseEnrollment> CourseEnrollments => Set<CourseEnrollment>();
    public DbSet<CourseSkill> CourseSkills => Set<CourseSkill>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User indexes
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Course relationships
        modelBuilder.Entity<Course>()
            .HasOne(c => c.User)
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        // CourseEnrollment relationships & index
        modelBuilder.Entity<CourseEnrollment>()
            .HasIndex(e => new { e.CourseId, e.UserId })
            .IsUnique();

        modelBuilder.Entity<CourseEnrollment>()
            .HasOne(e => e.Course)
            .WithMany(c => c.Enrollments)
            .HasForeignKey(e => e.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CourseEnrollment>()
            .HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // CourseSkill relationships
        modelBuilder.Entity<CourseSkill>()
            .HasOne(s => s.Course)
            .WithMany(c => c.Skills)
            .HasForeignKey(s => s.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        // Video relationships
        modelBuilder.Entity<Video>()
            .HasOne(v => v.User)
            .WithMany(u => u.Videos)
            .HasForeignKey(v => v.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Video>()
            .HasOne(v => v.Course)
            .WithMany(c => c.Videos)
            .HasForeignKey(v => v.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        // Transcript relationships
        modelBuilder.Entity<Transcript>()
            .HasOne(t => t.Video)
            .WithMany(v => v.Transcripts)
            .HasForeignKey(t => t.VideoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TranscriptSegment>()
            .HasOne(s => s.Transcript)
            .WithMany(t => t.Segments)
            .HasForeignKey(s => s.TranscriptId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TranscriptChunk>()
            .HasOne(c => c.Transcript)
            .WithMany(t => t.Chunks)
            .HasForeignKey(c => c.TranscriptId)
            .OnDelete(DeleteBehavior.Cascade);

        // Conversation relationships
        modelBuilder.Entity<Conversation>()
            .HasOne(c => c.User)
            .WithMany(u => u.Conversations)
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Conversation>()
            .HasOne(c => c.Course)
            .WithMany()
            .HasForeignKey(c => c.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Message>()
            .HasOne(m => m.Conversation)
            .WithMany(c => c.Messages)
            .HasForeignKey(m => m.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        // QuizAttempt relationships
        modelBuilder.Entity<QuizAttempt>()
            .HasOne(q => q.User)
            .WithMany(u => u.QuizAttempts)
            .HasForeignKey(q => q.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuizAttempt>()
            .HasOne(q => q.Video)
            .WithMany()
            .HasForeignKey(q => q.VideoId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<QuizAttemptVideo>()
            .HasOne(qv => qv.QuizAttempt)
            .WithMany(q => q.QuizAttemptVideos)
            .HasForeignKey(qv => qv.QuizAttemptId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuizAttemptVideo>()
            .HasOne(qv => qv.Video)
            .WithMany(v => v.QuizAttemptVideos)
            .HasForeignKey(qv => qv.VideoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuizAttemptQuestion>()
            .HasOne(qq => qq.QuizAttempt)
            .WithMany(q => q.Questions)
            .HasForeignKey(qq => qq.QuizAttemptId)
            .OnDelete(DeleteBehavior.Cascade);

        // InstructorChat relationships
        modelBuilder.Entity<InstructorChatChannel>()
            .HasOne(c => c.Course)
            .WithMany()
            .HasForeignKey(c => c.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<InstructorChatChannel>()
            .HasOne(c => c.Student)
            .WithMany()
            .HasForeignKey(c => c.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<InstructorChatChannel>()
            .HasOne(c => c.Instructor)
            .WithMany()
            .HasForeignKey(c => c.InstructorId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<InstructorChatMessage>()
            .HasOne(m => m.Channel)
            .WithMany(c => c.Messages)
            .HasForeignKey(m => m.ChannelId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<InstructorChatMessage>()
            .HasOne(m => m.Sender)
            .WithMany()
            .HasForeignKey(m => m.SenderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SystemSetting>(entity =>
        {
            entity.ToTable("system_settings");
            entity.HasKey(s => s.Key);
            entity.Property(s => s.Key).HasColumnName("key");
            entity.Property(s => s.Value).HasColumnName("value");
            entity.Property(s => s.UpdatedAt).HasColumnName("updated_at");
        });
    }
}
