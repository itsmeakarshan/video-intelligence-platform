# Database Audit Report

## 1. Schema Overview

The database is an SQLite database (`backend/video_intelligence.db`) managed via SQLAlchemy models and Alembic migrations.

### Table Definitions & Column Types

#### `users`
- `id` (Integer, Primary Key, Index)
- `name` (String(100), Non-nullable)
- `email` (String(255), Unique, Non-nullable, Index)
- `password_hash` (String(255), Non-nullable)
- `created_at` (DateTime, Non-nullable, Default: `datetime.utcnow`)

#### `videos`
- `id` (Integer, Primary Key, Index)
- `user_id` (Integer, Foreign Key `users.id`, Non-nullable, Index)
- `filename` (String(255), Non-nullable)
- `original_filename` (String(255), Non-nullable)
- `file_path` (String(500), Non-nullable)
- `file_size` (Integer, Non-nullable)
- `status` (String(50), Non-nullable, Default: `uploaded`)
- `progress` (Float, Default: 0)
- `current_step` (String(100), Default: `Waiting...`)
- `created_at` (DateTime, Non-nullable, Default: `datetime.utcnow`)

#### `quiz_attempts`
- `id` (Integer, Primary Key, Index)
- `user_id` (Integer, Foreign Key `users.id`, Non-nullable, Index)
- `video_id` (Integer, Foreign Key `videos.id`, Nullable, Index) - *Legacy single video ID parameter; NULL for multi-video quizzes*
- `score` (Integer, Non-nullable)
- `total_questions` (Integer, Non-nullable)
- `percentage` (Float, Non-nullable)
- `difficulty` (String(20), Non-nullable)
- `created_at` (DateTime, Non-nullable, Default: `datetime.utcnow`)

#### `quiz_attempt_videos`
- `id` (Integer, Primary Key, Index)
- `quiz_attempt_id` (Integer, Foreign Key `quiz_attempts.id` ON DELETE CASCADE, Non-nullable, Index)
- `video_id` (Integer, Foreign Key `videos.id` ON DELETE CASCADE, Non-nullable, Index)

---

## 2. Entity Relationships & Ownership Rules

```
User (1)
  ├──> Video (0..N) [FK: videos.user_id -> users.id]
  └──> QuizAttempt (0..N) [FK: quiz_attempts.user_id -> users.id]
           └──> QuizAttemptVideo (1..N) [FK: quiz_attempt_id -> quiz_attempts.id]
                    └──> Video [FK: video_id -> videos.id]
```

### Ownership Isolation Rules
1. **Video Ownership:** Each `Video` record belongs to exactly one `User` via `user_id`.
2. **QuizAttempt Ownership:** Each `QuizAttempt` record belongs to exactly one `User` via `user_id`.
3. **Multi-Video Associations:** A `QuizAttempt` can reference one or multiple videos via `quiz_attempt_videos`. Backend validation guarantees that every `video_id` in `quiz_attempt_videos` belongs to the `user_id` of the `QuizAttempt`.

---

## 3. Database Statistics Audit (Synthetic Development Dataset)

- **Total Users:** 97
- **Total Videos:** 295
- **Total Quiz Attempts:** 668
- **Total Quiz Attempt Video Associations:** 877
- **Multi-Video Quizzes:** Supported via `quiz_attempt_videos` table.
- **Difficulty Levels:** `Easy`, `Medium`, `Hard`.
- **Performance Metrics:** `score` (integer), `total_questions` (integer), `percentage` (float: 0.0 to 100.0).

---

## 4. Multi-User & Security Considerations for ML Extraction
- Data extraction MUST strictly extract per-user chronological sequences ordered by `created_at` or `id`.
- Model inferences MUST be scoped strictly to the authenticated `user_id` obtained from JWT token validation.
- Raw database credentials and user credentials (`password_hash`) are excluded from ML datasets.
