using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VideoIntelligencePlatform.Backend.Models;

[Table("transcript_chunks")]
public class TranscriptChunk
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("transcript_id")]
    public int TranscriptId { get; set; }

    [Column("chunk_index")]
    public int ChunkIndex { get; set; }

    [Column("start_time")]
    public double StartTime { get; set; }

    [Column("end_time")]
    public double EndTime { get; set; }

    [Column("text")]
    public string Text { get; set; } = string.Empty;

    [Column("embedding_created")]
    public bool EmbeddingCreated { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("TranscriptId")]
    public Transcript? Transcript { get; set; }
}
