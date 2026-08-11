# Phase 1 — Feature Distribution & OOD Risk Audit Report

**Cohort Analyzed:** Clean Learner Dataset (95 users, 636 feature instances).
**User Isolation:** Users 1 and 2 strictly excluded.

## 1. Feature Set Definitions for Ablation

| Feature Set Name | Count | Description | Key Removals |
| :--- | ---: | :--- | :--- |
| **A_CURRENT** | 52 | Full existing feature pipeline | None |
| **B_NO_FREQUENCY** | 51 | Removes single OOD linear outlier `attempt_frequency` | `attempt_frequency` |
| **C_NO_FREQUENCY_AND_RATE** | 45 | Removes all rate/velocity window features | `attempt_frequency`, `attempts_last_7d/14d/30d`, `avg_days_between`, `time_gap_std`, `total_video_interactions` |
| **D_CORE_LEARNING** | 38 | Pure domain performance & learning progression features | All timing, frequency, and test-execution speed artifacts |

## 2. Top High OOD-Risk & Artificial Test Behavior Features

| Feature | Category | Mean | Std | 95th Pct | Max | Skewness | Target Corr | Risk Rationale |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| `consecutive_passes` | Domain Learning | 0.3632 | 0.955 | 3.0 | 6.0 | 3.1482 | 0.6236 | High variance / OOD extrapolation sensitivity |
| `total_passes` | Domain Learning | 0.4057 | 0.9971 | 3.0 | 6.0 | 3.0201 | 0.6232 | High variance / OOD extrapolation sensitivity |
| `total_previous_video_interactions` | Timing/Frequency | 3.9843 | 2.1414 | 8.0 | 9.0 | 0.3274 | 0.5281 | High variance / OOD extrapolation sensitivity |
| `attempts_last_30_days` | Timing/Frequency | 3.9544 | 2.099 | 8.0 | 9.0 | 0.2941 | 0.5226 | High variance / OOD extrapolation sensitivity |
| `attempts_last_14_days` | Timing/Frequency | 2.9906 | 1.3375 | 5.0 | 7.0 | 0.1837 | 0.381 | High variance / OOD extrapolation sensitivity |
| `time_gap_std` | Timing/Frequency | 1.2899 | 1.1723 | 3.1532 | 4.4489 | 0.3577 | 0.296 | High variance / OOD extrapolation sensitivity |
| `attempts_last_7_days` | Timing/Frequency | 1.6226 | 0.9924 | 3.0 | 5.0 | 0.2201 | 0.1796 | High variance / OOD extrapolation sensitivity |
| `average_days_between_attempts` | Timing/Frequency | 2.767 | 1.6942 | 5.3375 | 7.4167 | 0.1458 | 0.1656 | High variance / OOD extrapolation sensitivity |
| `attempt_frequency` | Timing/Frequency | 0.3092 | 0.1023 | 0.48 | 0.6713 | 0.6854 | 0.0794 | High variance / OOD extrapolation sensitivity |
| `consecutive_declines` | Domain Learning | 0.2264 | 0.5134 | 1.0 | 4.0 | 2.6485 | -0.0484 | High variance / OOD extrapolation sensitivity |

## 3. Full Feature Distribution Table

| Feature | Mean | Std | Min | Median (p50) | 95th Pct | Max | Target Corr |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `previous_score` | 18.8538 | 7.7402 | 6.0 | 17.0 | 34.0 | 44.0 | 0.5108 |
| `previous_percentage` | 56.3241 | 12.9563 | 26.67 | 56.0 | 80.0 | 93.33 | 0.8979 |
| `previous_2_attempt_avg` | 54.8999 | 12.2396 | 28.0 | 54.125 | 76.75 | 90.0 | 0.9007 |
| `previous_3_attempt_avg` | 53.7071 | 11.6361 | 28.0 | 53.2767 | 74.5417 | 89.11 | 0.8909 |
| `previous_5_attempt_avg` | 52.0717 | 10.5002 | 28.0 | 51.145 | 70.0 | 85.0 | 0.8603 |
| `overall_previous_avg` | 51.2749 | 9.6866 | 28.0 | 50.4588 | 66.8457 | 77.375 | 0.8372 |
| `median_previous_score` | 51.2077 | 9.8712 | 28.0 | 50.0 | 66.7525 | 80.0 | 0.8154 |
| `best_previous_score` | 57.5972 | 12.8154 | 28.0 | 56.0 | 80.0 | 93.33 | 0.8882 |
| `worst_previous_score` | 45.0892 | 8.4763 | 26.67 | 45.0 | 60.0 | 70.0 | 0.5612 |
| `score_range` | 12.5081 | 10.0755 | 0.0 | 11.0 | 30.8725 | 53.0 | 0.6576 |
| `score_std` | 5.3495 | 3.8272 | 0.0 | 5.2257 | 11.8491 | 18.6266 | 0.6096 |
| `ewma_03` | 52.0352 | 10.4623 | 28.0 | 51.4588 | 69.6353 | 83.178 | 0.8652 |
| `ewma_05` | 53.9663 | 11.5785 | 28.0 | 53.3975 | 74.1335 | 88.3955 | 0.8967 |
| `recent_score_trend` | 2.8485 | 5.655 | -20.0 | 2.0 | 12.5 | 32.0 | 0.2153 |
| `long_term_score_trend` | 9.7842 | 10.9858 | -27.5 | 8.33 | 30.0 | 53.0 | 0.6552 |
| `recent_vs_overall_average` | 3.6249 | 4.5333 | -8.25 | 2.1942 | 12.4451 | 21.625 | 0.643 |
| `improvement_from_first_attempt` | 9.7842 | 10.9858 | -27.5 | 8.33 | 30.0 | 53.0 | 0.6552 |
| `rolling_slope_3` | 2.3975 | 3.2192 | -11.0 | 2.0 | 8.0 | 12.0 | 0.4113 |
| `rolling_slope_5` | 2.358 | 2.7532 | -8.0 | 2.0005 | 7.05 | 11.335 | 0.5032 |
| `consecutive_improvements` | 1.228 | 1.4352 | 0.0 | 1.0 | 4.0 | 7.0 | 0.4101 |
| `consecutive_declines` | 0.2264 | 0.5134 | 0.0 | 0.0 | 1.0 | 4.0 | -0.0484 |
| `total_passes` | 0.4057 | 0.9971 | 0.0 | 0.0 | 3.0 | 6.0 | 0.6232 |
| `total_failures` | 3.5786 | 1.8928 | 0.0 | 3.0 | 7.0 | 9.0 | 0.2691 |
| `historical_pass_rate` | 0.0704 | 0.1637 | 0.0 | 0.0 | 0.4583 | 1.0 | 0.575 |
| `recent_3_pass_rate` | 0.1182 | 0.2723 | 0.0 | 0.0 | 1.0 | 1.0 | 0.6382 |
| `consecutive_passes` | 0.3632 | 0.955 | 0.0 | 0.0 | 3.0 | 6.0 | 0.6236 |
| `consecutive_failures` | 2.8616 | 2.2251 | 0.0 | 3.0 | 7.0 | 9.0 | -0.2211 |
| `attempt_order_by_user` | 4.9843 | 2.1414 | 2.0 | 5.0 | 9.0 | 10.0 | 0.5281 |
| `total_previous_attempts` | 3.9843 | 2.1414 | 1.0 | 4.0 | 8.0 | 9.0 | 0.5281 |
| `attempts_last_7_days` | 1.6226 | 0.9924 | 0.0 | 2.0 | 3.0 | 5.0 | 0.1796 |
| `attempts_last_14_days` | 2.9906 | 1.3375 | 1.0 | 3.0 | 5.0 | 7.0 | 0.381 |
| `attempts_last_30_days` | 3.9544 | 2.099 | 1.0 | 4.0 | 8.0 | 9.0 | 0.5226 |
| `average_days_between_attempts` | 2.767 | 1.6942 | 0.0 | 2.7958 | 5.3375 | 7.4167 | 0.1656 |
| `time_gap_std` | 1.2899 | 1.1723 | 0.0 | 1.2341 | 3.1532 | 4.4489 | 0.296 |
| `days_since_previous_attempt` | 3.1961 | 2.002 | 1.0417 | 2.3542 | 7.2604 | 7.4167 | -0.0305 |
| `days_since_first_attempt` | 12.9499 | 8.0514 | 1.0417 | 11.8125 | 27.5625 | 42.0 | 0.429 |
| `attempt_frequency` | 0.3092 | 0.1023 | 0.1188 | 0.2968 | 0.48 | 0.6713 | 0.0794 |
| `previous_easy_count` | 1.022 | 0.9911 | 0.0 | 1.0 | 3.0 | 4.0 | 0.2155 |
| `previous_medium_count` | 2.0079 | 1.4036 | 0.0 | 2.0 | 5.0 | 6.0 | 0.4056 |
| `previous_hard_count` | 0.9544 | 0.9942 | 0.0 | 1.0 | 3.0 | 5.0 | 0.35 |
| `previous_hard_ratio` | 0.2341 | 0.2526 | 0.0 | 0.2 | 0.6667 | 1.0 | 0.1135 |
| `previous_average_easy_score` | 52.7761 | 10.8757 | 28.0 | 52.0 | 70.5 | 80.75 | 0.7782 |
| `previous_average_medium_score` | 51.7496 | 10.2329 | 28.0 | 51.225 | 67.0829 | 81.6 | 0.8208 |
| `previous_average_hard_score` | 48.9898 | 10.0797 | 26.67 | 48.0 | 66.3327 | 78.0 | 0.7159 |
| `difficulty_transition_delta` | 0.0079 | 1.0 | -2.0 | 0.0 | 2.0 | 2.0 | -0.17 |
| `difficulty_easy` | 0.2657 | 0.4421 | 0.0 | 0.0 | 1.0 | 1.0 | 0.1485 |
| `difficulty_medium` | 0.511 | 0.5003 | 0.0 | 1.0 | 1.0 | 1.0 | 0.0617 |
| `difficulty_hard` | 0.2233 | 0.4168 | 0.0 | 0.0 | 1.0 | 1.0 | -0.2316 |
| `unique_videos_seen` | 2.1384 | 0.7569 | 1.0 | 2.0 | 3.0 | 3.0 | 0.3907 |
| `total_previous_video_interactions` | 3.9843 | 2.1414 | 1.0 | 4.0 | 8.0 | 9.0 | 0.5281 |
| `repeated_video_ratio` | 0.3585 | 0.2431 | 0.0 | 0.4 | 0.6667 | 0.8333 | 0.434 |
| `number_of_videos_in_recent_attempts` | 1.0 | 0.0 | 1.0 | 1.0 | 1.0 | 1.0 | 0.0 |
