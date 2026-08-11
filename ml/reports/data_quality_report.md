# Phase 1 — Data Quality Audit Report

## 1. Audit Summary
- **Total Quiz Attempt Records:** 788
- **Duplicate Attempt IDs:** 0
- **Duplicate Rows:** 0
- **Missing User IDs:** 0
- **Missing Attempt IDs:** 0

---

## 2. Value Bound & Relational Integrity Verification
- **Impossible Percentage Scores (<0% or >100%):** 0
- **Scores Exceeding Total Questions (`score > total_questions`):** 0
- **Invalid Difficulties:** 0
- **Future / Invalid Timestamps:** 0
- **Orphaned `quiz_attempt_videos` Records:** 0
- **User/Video Ownership Mismatches (`qa.user_id != video.user_id`):** 0
- **Users with Non-Chronological Timestamps:** 0

---

## 3. Data Cleaning & Selection Rationale
- **Valid Dataset Count:** All 788 records satisfied strict schema and relational checks.
- **Usable Supervised Learning Instances:** 101 users have >= 2 attempts, producing 571 target prediction rows for attempt N >= 2.
- **Cleaning Action:** 0 rows removed due to corruption; dataset schema is 100% clean and coherent.
