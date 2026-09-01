using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VideoIntelligencePlatform.Backend.Models;

[Table("transcripts")]
public class Transcript
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("video_id")]
    public int VideoId { get; set; }

    [Column("language")]
    [MaxLength(20)]
    public string Language { get; set; } = "en";

    [Column("transcript")]
    public string TranscriptText { get; set; } = string.Empty;

    [ForeignKey("VideoId")]
    public Video? Video { get; set; }

    public List<TranscriptSegment> Segments { get; set; } = new();
    public List<TranscriptChunk> Chunks { get; set; } = new();
}
