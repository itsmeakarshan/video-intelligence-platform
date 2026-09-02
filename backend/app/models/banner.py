from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database import Base


class PromotionBanner(Base):
    __tablename__ = "promotion_banners"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(250), nullable=False)
    subtitle = Column(String(500), nullable=True)
    discount_tag = Column(String(100), nullable=True)
    image_url = Column(String(500), nullable=False)
    target_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    display_order = Column(Integer, nullable=False, default=0)
    created_by_user_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
