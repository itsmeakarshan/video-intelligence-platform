"""
Authoritative Single Feature Engineering Pipeline for Video Intelligence Platform.

Used identically across:
- Training (optimize_models.py, train_and_evaluate_comprehensive.py)
- Inference (predict.py, ml_prediction_service.py)

Guarantees:
1. Zero target leakage (attempt N features derived strictly from prior attempts 0 ... N-1).
2. Mathematically sound defaults for users with 1, 2, 3, 4, or 5+ attempts.
3. Strict 52-feature contract with exact ordering.
"""

import os
import pandas as pd
import numpy as np

CLEAN_DATA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../data/processed/clean_learner_dataset.csv")
)
RAW_DATA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../data/raw/new_learner_dataset.csv")
)
PROCESSED_DATA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../data/processed/featured_quiz_attempts.csv")
)

ALL_EXPANDED_FEATURE_COLUMNS = [
    # 1. Performance & Moving Averages (13)
    "previous_score",
    "previous_percentage",
    "previous_2_attempt_avg",
    "previous_3_attempt_avg",
    "previous_5_attempt_avg",
    "overall_previous_avg",
    "median_previous_score",
    "best_previous_score",
    "worst_previous_score",
    "score_range",
    "score_std",
    "ewma_03",
    "ewma_05",
    
    # 2. Trends, Slopes & Volatility (8)
    "recent_score_trend",
    "long_term_score_trend",
    "recent_vs_overall_average",
    "improvement_from_first_attempt",
    "rolling_slope_3",
    "rolling_slope_5",
    "consecutive_improvements",
    "consecutive_declines",
    
    # 3. Pass Behavior (6)
    "total_passes",
    "total_failures",
    "historical_pass_rate",
    "recent_3_pass_rate",
    "consecutive_passes",
    "consecutive_failures",
    
    # 4. Engagement & Timing (10)
    "attempt_order_by_user",
    "total_previous_attempts",
    "attempts_last_7_days",
    "attempts_last_14_days",
    "attempts_last_30_days",
    "average_days_between_attempts",
    "time_gap_std",
    "days_since_previous_attempt",
    "days_since_first_attempt",
    "attempt_frequency",
    
    # 5. Difficulty & Transitions (11)
    "previous_easy_count",
    "previous_medium_count",
    "previous_hard_count",
    "previous_hard_ratio",
    "previous_average_easy_score",
    "previous_average_medium_score",
    "previous_average_hard_score",
    "difficulty_transition_delta",
    "difficulty_easy",
    "difficulty_medium",
    "difficulty_hard",
    
    # 6. Content Features (4)
    "unique_videos_seen",
    "total_previous_video_interactions",
    "repeated_video_ratio",
    "number_of_videos_in_recent_attempts"
]

TARGET_COLUMN = "next_percentage"


def extract_features_from_prior_attempts(
    prior_attempts: list[dict],
    target_difficulty: str = "Medium",
    now_timestamp: pd.Timestamp | None = None
) -> dict:
    """
    Computes exact 52 leak-free feature dict for predicting performance on attempt N
    given prior attempts [0 ... N-1]. Handles 1, 2, 3, 4, and 5+ attempts seamlessly.
    """
    if len(prior_attempts) == 0:
        raise ValueError("Cannot extract features with 0 prior attempts. At least 1 prior attempt required.")

    # Sort chronologically
    sorted_priors = sorted(prior_attempts, key=lambda a: (a.get("created_at", ""), a.get("attempt_id", 0)))
    
    prior_pcts = [float(a["percentage"]) for a in sorted_priors]
    prior_scores = [float(a["score"]) for a in sorted_priors]
    prior_diffs = [a.get("difficulty", "Medium") for a in sorted_priors]

    if now_timestamp is None:
        now = pd.Timestamp.now()
    else:
        now = pd.to_datetime(now_timestamp)

    prior_times = [pd.to_datetime(a.get("created_at", now)) for a in sorted_priors]
    prior_times = [t.tz_localize(None) if hasattr(t, "tz_localize") and t.tzinfo is not None else t for t in prior_times]

    # 1. Performance & Moving Averages
    prev_score = prior_scores[-1]
    prev_pct = prior_pcts[-1]
    prev_2_avg = float(np.mean(prior_pcts[-2:]))
    prev_3_avg = float(np.mean(prior_pcts[-3:]))
    prev_5_avg = float(np.mean(prior_pcts[-5:]))
    overall_prev_avg = float(np.mean(prior_pcts))
    median_prev_score = float(np.median(prior_pcts))
    best_prev_score = float(np.max(prior_pcts))
    worst_prev_score = float(np.min(prior_pcts))
    score_range = best_prev_score - worst_prev_score
    score_std = float(np.std(prior_pcts, ddof=1)) if len(prior_pcts) > 1 else 0.0

    # EWMA
    alpha_03 = 0.3
    ewma_03 = prior_pcts[0]
    for p in prior_pcts[1:]:
        ewma_03 = alpha_03 * p + (1 - alpha_03) * ewma_03

    alpha_05 = 0.5
    ewma_05 = prior_pcts[0]
    for p in prior_pcts[1:]:
        ewma_05 = alpha_05 * p + (1 - alpha_05) * ewma_05

    # 2. Trends, Slopes & Volatility
    recent_trend = prior_pcts[-1] - prior_pcts[-2] if len(prior_pcts) >= 2 else 0.0
    long_term_trend = prior_pcts[-1] - prior_pcts[0]
    recent_vs_overall = prev_2_avg - overall_prev_avg
    improvement_from_first = prev_pct - prior_pcts[0]

    if len(prior_pcts) >= 3:
        x_3 = np.array([0, 1, 2])
        y_3 = np.array(prior_pcts[-3:])
        rolling_slope_3 = float(np.polyfit(x_3, y_3, 1)[0])
    else:
        rolling_slope_3 = 0.0

    if len(prior_pcts) >= 5:
        x_5 = np.array([0, 1, 2, 3, 4])
        y_5 = np.array(prior_pcts[-5:])
        rolling_slope_5 = float(np.polyfit(x_5, y_5, 1)[0])
    else:
        rolling_slope_5 = rolling_slope_3

    consec_improvements = 0
    for j in range(len(prior_pcts) - 1, 0, -1):
        if prior_pcts[j] > prior_pcts[j - 1]:
            consec_improvements += 1
        else:
            break

    consec_declines = 0
    for j in range(len(prior_pcts) - 1, 0, -1):
        if prior_pcts[j] < prior_pcts[j - 1]:
            consec_declines += 1
        else:
            break

    # 3. Pass Behavior Features
    prior_passes = [1 if p >= 70.0 else 0 for p in prior_pcts]
    total_passes = sum(prior_passes)
    total_failures = len(prior_passes) - total_passes
    historical_pass_rate = float(total_passes / len(prior_passes))
    recent_3_pass_rate = float(np.mean(prior_passes[-3:]))
    
    consec_passes = 0
    for j in range(len(prior_passes) - 1, -1, -1):
        if prior_passes[j] == 1:
            consec_passes += 1
        else:
            break

    consec_failures = 0
    for j in range(len(prior_passes) - 1, -1, -1):
        if prior_passes[j] == 0:
            consec_failures += 1
        else:
            break

    # 4. Engagement & Timing Features
    total_prev_attempts = len(sorted_priors)
    attempts_7d = sum(1 for t in prior_times if (now - t).total_seconds() <= 7 * 86400)
    attempts_14d = sum(1 for t in prior_times if (now - t).total_seconds() <= 14 * 86400)
    attempts_30d = sum(1 for t in prior_times if (now - t).total_seconds() <= 30 * 86400)

    time_gaps = [(prior_times[j] - prior_times[j - 1]).total_seconds() / 86400.0 for j in range(1, len(prior_times))]
    avg_days_between = float(np.mean(time_gaps)) if time_gaps else 0.0
    time_gap_std = float(np.std(time_gaps, ddof=1)) if len(time_gaps) > 1 else 0.0

    days_since_prev = max(0.0, (now - prior_times[-1]).total_seconds() / 86400.0)
    days_since_first = max(0.0, (now - prior_times[0]).total_seconds() / 86400.0)
    attempt_frequency = float(total_prev_attempts / (days_since_first + 1.0))

    # 5. Difficulty Features
    prev_easy_count = prior_diffs.count("Easy")
    prev_medium_count = prior_diffs.count("Medium")
    prev_hard_count = prior_diffs.count("Hard")
    prev_hard_ratio = prev_hard_count / total_prev_attempts if total_prev_attempts > 0 else 0.0

    easy_pcts = [prior_pcts[j] for j in range(len(prior_diffs)) if prior_diffs[j] == "Easy"]
    medium_pcts = [prior_pcts[j] for j in range(len(prior_diffs)) if prior_diffs[j] == "Medium"]
    hard_pcts = [prior_pcts[j] for j in range(len(prior_diffs)) if prior_diffs[j] == "Hard"]

    prev_avg_easy = float(np.mean(easy_pcts)) if easy_pcts else overall_prev_avg
    prev_avg_medium = float(np.mean(medium_pcts)) if medium_pcts else overall_prev_avg
    prev_avg_hard = float(np.mean(hard_pcts)) if hard_pcts else overall_prev_avg

    diff_weights = {"Easy": 1.0, "Medium": 2.0, "Hard": 3.0}
    target_diff_weight = diff_weights.get(target_difficulty, 2.0)
    prev_diff_weight = diff_weights.get(prior_diffs[-1], 2.0)
    diff_transition_delta = target_diff_weight - prev_diff_weight

    # 6. Content Features
    unique_vids = set()
    total_vid_interactions = 0
    for a in sorted_priors:
        v_count = a.get("video_count", 1)
        total_vid_interactions += v_count
        vids_raw = str(a.get("video_ids", ""))
        if vids_raw and vids_raw != "nan":
            for v in vids_raw.split(","):
                if v.strip():
                    unique_vids.add(v.strip())

    unique_videos_seen = len(unique_vids)
    repeated_video_ratio = float(1.0 - (unique_videos_seen / total_vid_interactions)) if total_vid_interactions > 0 else 0.0
    num_vids_recent = sorted_priors[-1].get("video_count", 1)

    f_dict = {
        "previous_score": prev_score,
        "previous_percentage": prev_pct,
        "previous_2_attempt_avg": prev_2_avg,
        "previous_3_attempt_avg": prev_3_avg,
        "previous_5_attempt_avg": prev_5_avg,
        "overall_previous_avg": overall_prev_avg,
        "median_previous_score": median_prev_score,
        "best_previous_score": best_prev_score,
        "worst_previous_score": worst_prev_score,
        "score_range": score_range,
        "score_std": score_std,
        "ewma_03": ewma_03,
        "ewma_05": ewma_05,
        "recent_score_trend": recent_trend,
        "long_term_score_trend": long_term_trend,
        "recent_vs_overall_average": recent_vs_overall,
        "improvement_from_first_attempt": improvement_from_first,
        "rolling_slope_3": rolling_slope_3,
        "rolling_slope_5": rolling_slope_5,
        "consecutive_improvements": consec_improvements,
        "consecutive_declines": consec_declines,
        "total_passes": total_passes,
        "total_failures": total_failures,
        "historical_pass_rate": historical_pass_rate,
        "recent_3_pass_rate": recent_3_pass_rate,
        "consecutive_passes": consec_passes,
        "consecutive_failures": consec_failures,
        "attempt_order_by_user": total_prev_attempts + 1,
        "total_previous_attempts": total_prev_attempts,
        "attempts_last_7_days": attempts_7d,
        "attempts_last_14_days": attempts_14d,
        "attempts_last_30_days": attempts_30d,
        "average_days_between_attempts": avg_days_between,
        "time_gap_std": time_gap_std,
        "days_since_previous_attempt": days_since_prev,
        "days_since_first_attempt": days_since_first,
        "attempt_frequency": attempt_frequency,
        "previous_easy_count": prev_easy_count,
        "previous_medium_count": prev_medium_count,
        "previous_hard_count": prev_hard_count,
        "previous_hard_ratio": prev_hard_ratio,
        "previous_average_easy_score": prev_avg_easy,
        "previous_average_medium_score": prev_avg_medium,
        "previous_average_hard_score": prev_avg_hard,
        "difficulty_transition_delta": diff_transition_delta,
        "difficulty_easy": 1 if target_difficulty == "Easy" else 0,
        "difficulty_medium": 1 if target_difficulty == "Medium" else 0,
        "difficulty_hard": 1 if target_difficulty == "Hard" else 0,
        "unique_videos_seen": unique_videos_seen,
        "total_previous_video_interactions": total_vid_interactions,
        "repeated_video_ratio": repeated_video_ratio,
        "number_of_videos_in_recent_attempts": num_vids_recent
    }

    return f_dict


def generate_features(
    input_path: str | None = None,
    output_path: str | None = PROCESSED_DATA_PATH
) -> pd.DataFrame:
    """
    Reads clean quiz attempts (or raw if clean missing) and generates the 52-feature matrix for training.
    """
    if input_path is None:
        input_path = CLEAN_DATA_PATH if os.path.exists(CLEAN_DATA_PATH) else RAW_DATA_PATH

    df = pd.read_csv(input_path)
    # Explicitly exclude Users 1 and 2 from modeling feature dataset
    df = df[~df["user_id"].isin([1, 2])].reset_index(drop=True)
    df["created_at"] = pd.to_datetime(df["created_at"])
    df = df.sort_values(["user_id", "created_at", "attempt_id"]).reset_index(drop=True)

    processed_rows = []

    for user_id, user_group in df.groupby("user_id"):
        user_attempts = user_group.to_dict("records")
        num_attempts = len(user_attempts)

        if num_attempts < 2:
            continue

        for i in range(1, num_attempts):
            curr_attempt = user_attempts[i]
            prior_attempts = user_attempts[:i]

            attempt_id = curr_attempt["attempt_id"]
            curr_difficulty = curr_attempt["difficulty"]
            target_percentage = float(curr_attempt["percentage"])
            target_score = int(curr_attempt["score"])
            curr_time = pd.to_datetime(curr_attempt["created_at"])
            is_synthetic = curr_attempt.get("is_synthetic", 1)

            f_dict = extract_features_from_prior_attempts(
                prior_attempts=prior_attempts,
                target_difficulty=curr_difficulty,
                now_timestamp=curr_time
            )

            row = {
                "attempt_id": attempt_id,
                "user_id": user_id,
                "created_at": curr_time,
                "is_synthetic": is_synthetic,
                "target_score": target_score,
                "next_percentage": target_percentage,
                "next_pass": 1 if target_percentage >= 70.0 else 0
            }
            row.update(f_dict)
            processed_rows.append(row)

    df_featured = pd.DataFrame(processed_rows)

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df_featured.to_csv(output_path, index=False)
        print(f"Generated expanded feature matrix with {len(df_featured)} rows to: {output_path}")

    return df_featured


if __name__ == "__main__":
    generate_features()
