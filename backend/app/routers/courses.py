import os
import uuid
import re
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.course import Course
from app.models.course_enrollment import CourseEnrollment
from app.models.user import User
from app.models.video import Video
from app.schemas.course import (
    CourseListDto,
    CourseDetailDto,
    CourseCreateDto,
    CourseUpdateDto,
    CourseVideoDto,
    ReorderVideosDto,
    CourseVideoUpdateDto,
)
from app.services.auth_service import (
    get_current_user,
    get_current_user_optional,
    require_admin,
)

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("", response_model=List[CourseListDto])
def list_courses(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    courses = db.query(Course).order_by(Course.created_at.desc()).all()
    user_enrolled_course_ids = set()
    if current_user:
        enrollments = (
            db.query(CourseEnrollment.course_id)
            .filter(CourseEnrollment.user_id == current_user.id)
            .all()
        )
        user_enrolled_course_ids = {e[0] for e in enrollments}

    result = []
    for c in courses:
        videos = db.query(Video).filter(Video.course_id == c.id).all()
        completed_count = sum(1 for v in videos if v.status == "completed")

        is_enrolled = (
            (current_user.role == "admin")
            or (float(c.price or 0.0) <= 0.0)
            or (c.id in user_enrolled_course_ids)
        ) if current_user else (float(c.price or 0.0) <= 0.0)

        instructor = db.query(User).filter(User.id == c.user_id).first() if c.user_id else None

        result.append(
            CourseListDto(
                id=c.id,
                title=c.title,
                description=c.description or "",
                thumbnail_url=c.thumbnail_url,
                price=float(c.price or 0.0),
                is_enrolled=is_enrolled,
                user_id=c.user_id,
                user_name=instructor.name if instructor else "Instructor",
                video_count=len(videos),
                completed_video_count=completed_count,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )

    return result


@router.get("/{id}", response_model=CourseDetailDto)
def get_course_detail(
    id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    is_enrolled = False
    if current_user:
        if current_user.role == "admin" or float(course.price or 0.0) <= 0.0:
            is_enrolled = True
        else:
            enrollment = (
                db.query(CourseEnrollment)
                .filter(CourseEnrollment.course_id == id, CourseEnrollment.user_id == current_user.id)
                .first()
            )
            is_enrolled = enrollment is not None
    else:
        is_enrolled = float(course.price or 0.0) <= 0.0

    videos = (
        db.query(Video)
        .filter(Video.course_id == id)
        .order_by(Video.order_index.asc(), Video.created_at.asc())
        .all()
    )

    instructor = db.query(User).filter(User.id == course.user_id).first() if course.user_id else None

    return CourseDetailDto(
        id=course.id,
        title=course.title,
        description=course.description or "",
        thumbnail_url=course.thumbnail_url,
        price=float(course.price or 0.0),
        is_enrolled=is_enrolled,
        user_id=course.user_id,
        user_name=instructor.name if instructor else "Instructor",
        created_at=course.created_at,
        updated_at=course.updated_at,
        videos=[
            CourseVideoDto(
                id=v.id,
                course_id=v.course_id,
                order_index=v.order_index,
                title=v.title or v.original_filename or v.filename,
                filename=v.filename,
                original_filename=v.original_filename,
                status=v.status,
                progress=v.progress,
                current_step=v.current_step,
                file_size=v.file_size,
                created_at=v.created_at,
            )
            for v in videos
        ],
    )


@router.post("/{id}/enroll")
def enroll_course(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    existing = (
        db.query(CourseEnrollment)
        .filter(CourseEnrollment.course_id == id, CourseEnrollment.user_id == current_user.id)
        .first()
    )
    if existing:
        return {
            "success": True,
            "is_enrolled": True,
            "course_id": course.id,
            "course_title": course.title,
            "amount_paid": float(existing.amount_paid or 0.0),
            "message": "Already enrolled in this course.",
        }

    enrollment = CourseEnrollment(
        course_id=course.id,
        user_id=current_user.id,
        enrolled_at=datetime.utcnow(),
        amount_paid=float(course.price or 0.0),
    )
    db.add(enrollment)
    db.commit()

    return {
        "success": True,
        "is_enrolled": True,
        "course_id": course.id,
        "course_title": course.title,
        "amount_paid": float(course.price or 0.0),
        "message": f"Successfully enrolled in {course.title}!",
    }


@router.post("", response_model=CourseDetailDto, status_code=status.HTTP_201_CREATED)
def create_course(
    dto: CourseCreateDto,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    course = Course(
        title=dto.title.strip(),
        description=dto.description.strip() if dto.description else "",
        thumbnail_url=dto.thumbnail_url,
        price=dto.price,
        user_id=admin_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    return CourseDetailDto(
        id=course.id,
        title=course.title,
        description=course.description or "",
        thumbnail_url=course.thumbnail_url,
        price=float(course.price or 0.0),
        is_enrolled=True,
        user_id=course.user_id,
        user_name=admin_user.name,
        created_at=course.created_at,
        updated_at=course.updated_at,
        videos=[],
    )


@router.put("/{id}", response_model=CourseDetailDto)
def update_course(
    id: int,
    dto: CourseUpdateDto,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    if dto.title is not None:
        course.title = dto.title.strip()
    if dto.description is not None:
        course.description = dto.description.strip()
    if dto.thumbnail_url is not None:
        course.thumbnail_url = dto.thumbnail_url
    if dto.price is not None:
        course.price = dto.price

    course.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(course)

    return get_course_detail(id=course.id, current_user=admin_user, db=db)


@router.delete("/{id}")
def delete_course(
    id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    videos = db.query(Video).filter(Video.course_id == id).all()
    for v in videos:
        if v.file_path and os.path.exists(v.file_path):
            try:
                os.remove(v.file_path)
            except Exception:
                pass

    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully."}


@router.post("/upload-thumbnail")
async def upload_course_thumbnail(
    file: UploadFile = File(...),
    admin_user: User = Depends(require_admin),
):
    thumb_dir = Path(settings.THUMBNAILS_FOLDER)
    thumb_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "image.jpg").suffix
    if not ext:
        ext = ".jpg"
    unique_name = f"thumb_{uuid.uuid4().hex[:10]}{ext}"
    dest = thumb_dir / unique_name

    with open(dest, "wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)

    return {
        "filename": unique_name,
        "thumbnail_url": f"/courses/thumbnails/{unique_name}",
    }


@router.get("/thumbnails/{filename}")
def get_thumbnail(filename: str):
    clean_name = os.path.basename(filename)
    dest = Path(settings.THUMBNAILS_FOLDER) / clean_name
    if not dest.is_file():
        raise HTTPException(status_code=404, detail="Thumbnail not found.")
    return FileResponse(str(dest))


@router.put("/{id}/videos/reorder")
def reorder_videos(
    id: int,
    dto: ReorderVideosDto,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    for item in dto.video_orders:
        vid = db.query(Video).filter(Video.id == item.video_id, Video.course_id == id).first()
        if vid:
            vid.order_index = item.order_index
    db.commit()
    return {"message": "Video order updated successfully."}


@router.patch("/{id}/videos/{video_id}")
def update_course_video(
    id: int,
    video_id: int,
    dto: CourseVideoUpdateDto,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    vid = db.query(Video).filter(Video.id == video_id, Video.course_id == id).first()
    if not vid:
        raise HTTPException(status_code=404, detail="Video not found.")

    if dto.title is not None:
        vid.title = dto.title.strip()
    if dto.order_index is not None:
        vid.order_index = dto.order_index

    db.commit()
    return {"message": "Video updated successfully."}
