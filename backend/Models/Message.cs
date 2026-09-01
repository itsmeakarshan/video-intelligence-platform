using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VideoIntelligencePlatform.Backend.Models;

[Table("messages")]
public class Message
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("conversation_id")]
    [MaxLength(36)]
    public string ConversationId { get; set; } = string.Empty;

    [Column("role")]
    [MaxLength(20)]
    public string Role { get; set; } = string.Empty;

    [Column("text")]
    public string Text { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("ConversationId")]
    public Conversation? Conversation { get; set; }
}
