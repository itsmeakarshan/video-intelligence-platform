from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PromotionBannerDto(BaseModel):
    id: int
    title: str
    subtitle: Optional[str] = None
    discount_tag: Optional[str] = None
    image_url: str
    target_url: Optional[str] = None
    is_active: bool = True
    display_order: int = 0
    created_by_user_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
