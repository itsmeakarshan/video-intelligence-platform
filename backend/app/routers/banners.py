import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.banner import PromotionBanner
from app.models.user import User
from app.schemas.banner import PromotionBannerDto
from app.services.auth_service import get_current_user_optional, require_admin

router = APIRouter(tags=["Promotion Banners"])


@router.get("/banners", response_model=List[PromotionBannerDto])
@router.get("/api/banners", response_model=List[PromotionBannerDto])
def list_banners(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    query = db.query(PromotionBanner)
    if not current_user or current_user.role != "admin":
        query = query.filter(PromotionBanner.is_active == True)

    banners = query.order_by(PromotionBanner.display_order.asc(), PromotionBanner.created_at.desc()).all()
    return [
        PromotionBannerDto(
            id=b.id,
            title=b.title,
            subtitle=b.subtitle,
            discount_tag=b.discount_tag,
            image_url=b.image_url,
            target_url=b.target_url,
            is_active=b.is_active,
            display_order=b.display_order,
            created_by_user_id=b.created_by_user_id,
            created_at=b.created_at,
        )
        for b in banners
    ]


@router.post("/banners", response_model=PromotionBannerDto, status_code=status.HTTP_201_CREATED)
async def create_banner(
    image: UploadFile = File(...),
    title: str = Form(...),
    subtitle: Optional[str] = Form(None),
    discount_tag: Optional[str] = Form(None),
    target_url: Optional[str] = Form(None),
    display_order: int = Form(0),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    banner_dir = Path(settings.BANNERS_FOLDER)
    banner_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(image.filename or "banner.jpg").suffix
    if not ext:
        ext = ".jpg"
    unique_name = f"banner_{uuid.uuid4().hex[:10]}{ext}"
    dest = banner_dir / unique_name

    with open(dest, "wb") as f:
        while True:
            chunk = await image.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)

    image_url = f"/banners/image/{unique_name}"

    banner = PromotionBanner(
        title=title.strip(),
        subtitle=subtitle.strip() if subtitle else None,
        discount_tag=discount_tag.strip() if discount_tag else None,
        image_url=image_url,
        target_url=target_url.strip() if target_url else None,
        is_active=True,
        display_order=display_order,
        created_by_user_id=admin_user.id,
        created_at=datetime.utcnow(),
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)

    return PromotionBannerDto(
        id=banner.id,
        title=banner.title,
        subtitle=banner.subtitle,
        discount_tag=banner.discount_tag,
        image_url=banner.image_url,
        target_url=banner.target_url,
        is_active=banner.is_active,
        display_order=banner.display_order,
        created_by_user_id=banner.created_by_user_id,
        created_at=banner.created_at,
    )


@router.delete("/banners/{id}")
def delete_banner(
    id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    banner = db.query(PromotionBanner).filter(PromotionBanner.id == id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found.")

    if banner.image_url:
        f_name = os.path.basename(banner.image_url)
        dest = Path(settings.BANNERS_FOLDER) / f_name
        if dest.is_file():
            try:
                os.remove(dest)
            except Exception:
                pass

    db.delete(banner)
    db.commit()
    return {"message": "Banner deleted successfully."}


@router.patch("/banners/{id}/toggle")
def toggle_banner(
    id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    banner = db.query(PromotionBanner).filter(PromotionBanner.id == id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found.")

    banner.is_active = not banner.is_active
    db.commit()
    return {"is_active": banner.is_active}


@router.get("/banners/image/{file_name}")
@router.head("/banners/image/{file_name}")
def get_banner_image(file_name: str):
    clean_name = os.path.basename(file_name)
    dest = Path(settings.BANNERS_FOLDER) / clean_name
    if not dest.is_file():
        raise HTTPException(status_code=404, detail="Banner image not found.")
    return FileResponse(str(dest))
