# Phase 3 — Feature Audit Report

## Audit Matrix for Existing Feature Set

| Feature Name | Available Before Target? | Risk of Future Leakage | Variance & Utility | Redundancy Assessment | Semantic Validity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `attempt_order_by_user` | Yes | Zero | High | Low (Sequence index) | Valid |
| `previous_score` | Yes | Zero | High | Moderate (Correlated with `previous_percentage`) | Valid |
| `previous_percentage` | Yes | Zero | High | High (Primary score metric) | Valid |
| `previous_2_attempt_avg` | Yes | Zero | High | Low (Short-term trend) | Valid |
| `previous_3_attempt_avg` | Yes | Zero | High | Low (Medium-term trend) | Valid |
| `overall_previous_avg` | Yes | Zero | High | High (Baseline mean) | Valid |
| `recent_score_trend` | Yes | Zero | High | Low (Momentum indicator) | Valid |
| `score_std` | Yes | Zero | High | Low (Consistency indicator) | Valid |
| `previous_attempt_count` | Yes | Zero | High | Identical to `attempt_order_by_user - 1` | Redundant |
| `days_since_previous_attempt` | Yes | Zero | High | Low (Recency gap) | Valid |
| `days_since_first_attempt` | Yes | Zero | High | Low (Tenure duration) | Valid |
| `previous_easy_count` | Yes | Zero | Moderate | Low (Difficulty history) | Valid |
| `previous_medium_count` | Yes | Zero | Moderate | Low (Difficulty history) | Valid |
| `previous_hard_count` | Yes | Zero | Moderate | Low (Difficulty history) | Valid |
| `previous_hard_ratio` | Yes | Zero | Moderate | Low (Difficulty exposure) | Valid |
| `difficulty_easy` | Yes | Zero | Moderate | One-hot target difficulty | Valid |
| `difficulty_medium` | Yes | Zero | Moderate | One-hot target difficulty | Valid |
| `difficulty_hard` | Yes | Zero | Moderate | One-hot target difficulty | Valid |
| `unique_videos_seen_before_attempt` | Yes | Zero | High | Low (Content diversity) | Valid |
| `previous_video_count` | Yes | Zero | Moderate | Low (Multi-video context) | Valid |

---

## Key Recommendations for Feature Expansion
1. Add long-term and exponential/windowed moving statistics (`previous_5_attempt_avg`, `median_previous_score`, `best_previous_score`, `worst_previous_score`, `score_range`).
2. Add engagement & recency windows (`attempts_last_7_days`, `attempts_last_14_days`, `attempts_last_30_days`, `average_days_between_attempts`).
3. Add difficulty-conditioned historical performance (`previous_average_easy_score`, `previous_average_medium_score`, `previous_average_hard_score`).
4. Prune perfectly collinear duplicate features during feature selection.
