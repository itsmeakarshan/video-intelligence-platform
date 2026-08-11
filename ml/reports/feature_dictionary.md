# Feature Dictionary & Data Leakage Prevention

## Overview
This document describes all features generated for predicting a user's next quiz percentage score.
All features for Attempt $N$ are computed **strictly from prior attempts ($1 \dots N-1$)** to eliminate target leakage.

---

## Target Definition
- **`next_percentage`** (Float, 0.0 - 100.0): The percentage score achieved on Attempt $N$. This is the primary target variable for machine learning regressor models.
- **`target_score`** (Integer): Raw points scored on Attempt $N$.

---

## Input Features

| Feature Name | Type | Description | Leakage Prevention Rule |
| :--- | :--- | :--- | :--- |
| `attempt_order_by_user` | Integer | Sequential order number ($N$) of the current quiz attempt for the user. | Known at attempt creation time. |
| `previous_score` | Float | Raw points scored on the immediately preceding attempt ($N-1$). | Derived from attempt $N-1$. |
| `previous_percentage` | Float | Percentage score on the immediately preceding attempt ($N-1$). | Derived from attempt $N-1$. |
| `previous_2_attempt_avg` | Float | Moving average percentage of the prior 2 attempts ($N-2, N-1$). | Derived from attempts $\le N-1$. |
| `previous_3_attempt_avg` | Float | Moving average percentage of the prior 3 attempts ($N-3, N-2, N-1$). | Derived from attempts $\le N-1$. |
| `overall_previous_avg` | Float | Historical mean percentage across all prior attempts ($1 \dots N-1$). | Derived from attempts $\le N-1$. |
| `recent_score_trend` | Float | Score momentum: `previous_percentage` minus percentage on attempt $N-2$. | Derived from attempts $\le N-1$. |
| `score_std` | Float | Standard deviation of percentage scores across all prior attempts ($1 \dots N-1$). | Derived from attempts $\le N-1$. |
| `previous_attempt_count` | Integer | Total number of completed prior attempts ($N-1$). | Derived from attempts $\le N-1$. |
| `days_since_previous_attempt` | Float | Days elapsed between current attempt timestamp and attempt $N-1$ timestamp. | Timestamp of attempt $N$ vs $N-1$. |
| `days_since_first_attempt` | Float | Days elapsed between current attempt timestamp and attempt 1 timestamp. | Timestamp of attempt $N$ vs 1. |
| `previous_easy_count` | Integer | Number of prior attempts taken at 'Easy' difficulty. | Derived from attempts $\le N-1$. |
| `previous_medium_count` | Integer | Number of prior attempts taken at 'Medium' difficulty. | Derived from attempts $\le N-1$. |
| `previous_hard_count` | Integer | Number of prior attempts taken at 'Hard' difficulty. | Derived from attempts $\le N-1$. |
| `previous_hard_ratio` | Float | Proportion of prior attempts taken at 'Hard' difficulty. | Derived from attempts $\le N-1$. |
| `current_difficulty` | String | Difficulty level of the current target quiz ('Easy', 'Medium', 'Hard'). | Selected by user before taking quiz. |
| `difficulty_easy` | Binary | One-hot indicator: 1 if current difficulty is 'Easy', else 0. | Selected prior to quiz. |
| `difficulty_medium` | Binary | One-hot indicator: 1 if current difficulty is 'Medium', else 0. | Selected prior to quiz. |
| `difficulty_hard` | Binary | One-hot indicator: 1 if current difficulty is 'Hard', else 0. | Selected prior to quiz. |
| `unique_videos_seen_before_attempt` | Integer | Count of distinct video IDs studied in all prior attempts. | Derived from attempts $\le N-1$. |
| `previous_video_count` | Integer | Number of videos included in attempt $N-1$. | Derived from attempt $N-1$. |

---

## Insufficient History Strategy
For Attempt 1 ($N=1$), zero prior history exists. Attempt 1 is used strictly as prior context to construct features for Attempt 2 and is excluded from target prediction rows.
