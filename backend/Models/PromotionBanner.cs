using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VideoIntelligencePlatform.Backend.Models;

[Table("promotion_banners")]
public class PromotionBanner
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("title")]
    [MaxLength(250)]
    public string Title { get; set; } = string.Empty;

    [Column("subtitle")]
    [MaxLength(500)]
    public string? Subtitle { get; set; }

    [Column("discount_tag")]
    [MaxLength(100)]
    public string? DiscountTag { get; set; }

    [Column("image_url")]
    [MaxLength(500)]
    public string ImageUrl { get; set; } = string.Empty;

    [Column("target_url")]
    [MaxLength(500)]
    public string? TargetUrl { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("display_order")]
    public int DisplayOrder { get; set; } = 0;

    [Column("created_by_user_id")]
    public int? CreatedByUserId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
