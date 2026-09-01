using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VideoIntelligencePlatform.Backend.Models;

[Table("instructor_chat_messages")]
public class InstructorChatMessage
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("channel_id")]
    public int ChannelId { get; set; }

    [ForeignKey(nameof(ChannelId))]
    public InstructorChatChannel? Channel { get; set; }

    [Column("sender_id")]
    public int SenderId { get; set; }

    [ForeignKey(nameof(SenderId))]
    public User? Sender { get; set; }

    [Column("sender_role")]
    [MaxLength(50)]
    public string SenderRole { get; set; } = "student"; // "student" or "admin"

    [Column("text")]
    public string Text { get; set; } = string.Empty;

    [Column("message_type")]
    [MaxLength(50)]
    public string MessageType { get; set; } = "text"; // "text", "image", "document", "voice", "video", "youtube"

    [Column("media_url")]
    [MaxLength(500)]
    public string? MediaUrl { get; set; }

    [Column("file_name")]
    [MaxLength(255)]
    public string? FileName { get; set; }

    [Column("file_size")]
    public long? FileSize { get; set; }

    [Column("extra_data")]
    public string? ExtraData { get; set; } // JSON metadata for YouTube links, video IDs, or durations

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
