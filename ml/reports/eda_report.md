# Exploratory Data Analysis (EDA) Report

## 1. Executive Summary
- **Total Quiz Attempts:** 668
- **Total Unique Users:** 97
- **Dataset Nature:** Synthetic development dataset simulating user quiz activity across various video topics and difficulties.

---

## 2. User Attempt Statistics
- **Mean Attempts per User:** 6.89
- **Median Attempts per User:** 7.0
- **Min / Max Attempts per User:** 1 / 10
- **Users with Only 1 Attempt (Insufficient History for Feature Lag):** 3 (3.1%)
- **Users with ≥2 Attempts (Usable for ML Target Prediction):** 94 (96.9%)
- **Users with ≥5 Attempts:** 94 (96.9%)

---

## 3. Quiz Performance Distribution
- **Mean Score Percentage:** 68.18%
- **Median Score Percentage:** 70.00%
- **Standard Deviation:** 15.92%
- **Min / Max Score Percentage:** 10.0% / 100.0%

### Difficulty Distribution
- **Medium:** 372 attempts (55.7%)
- **Hard:** 192 attempts (28.7%)
- **Easy:** 104 attempts (15.6%)

---

## 4. Multi-Video Quiz Participation
- **Single-Video Quizzes:** 459 attempts (68.7%)
- **Multi-Video Quizzes:** 209 attempts (31.3%)
- **Legacy/Unlinked Quizzes:** 0 attempts

---

## 5. Key Data Quality Findings & Handling Strategy
1. **Missing Values & Duplicates:** 0 duplicate attempt IDs; 0 missing values in core score fields.
2. **Lag Feature Constraint:** Attempt 1 for any user has 0 previous attempts, meaning lag-based historical features (e.g. `previous_score`, `overall_previous_avg`) cannot be computed for Attempt 1.
3. **Usable Training Instances:** Each user with $N$ attempts yields $N-1$ valid supervised learning samples where Attempt $N$ is the target and Attempts $1 \dots N-1$ form the feature context.
