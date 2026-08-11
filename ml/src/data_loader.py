"""
Data Loader Module for Video Intelligence Platform ML Pipeline.

Safe read-only extraction from SQLite database (backend/video_intelligence.db).
Extracts quiz attempts, user attempt sequence numbering, associated video IDs,
difficulty levels, and scores into a raw pandas DataFrame / CSV file.
"""

import os
import sqlite3
import pandas as pd


DEFAULT_DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../backend/video_intelligence.db")
)
DEFAULT_OUTPUT_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../data/raw/quiz_attempts.csv")
)


def extract_quiz_attempts_data(
    db_path: str = DEFAULT_DB_PATH,
    output_path: str | None = None,
    metadata_path: str | None = None,
    is_synthetic_default: bool = 1
) -> pd.DataFrame:
    """
    Extracts quiz attempts for the new experimental cohort (Users 3-103) from SQLite.
    EXPLICITLY EXCLUDES User 1 and User 2 to prevent real user data contamination.
    """
    if output_path is None:
        output_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../data/raw/new_learner_dataset.csv")
        )
    if metadata_path is None:
        metadata_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../data/raw/dataset_metadata.json")
        )

    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database file not found at: {db_path}")

    # Open SQLite in read-only mode to guarantee data safety
    conn_uri = f"file:{os.path.abspath(db_path)}?mode=ro"
    conn = sqlite3.connect(conn_uri, uri=True)

    try:
        # Strictly query users 3 to 103 (the new synthetic cohort)
        attempts_query = """
            SELECT 
                qa.id AS attempt_id,
                qa.user_id,
                qa.video_id AS legacy_video_id,
                qa.score,
                qa.total_questions,
                qa.percentage,
                qa.difficulty,
                qa.created_at
            FROM quiz_attempts qa
            WHERE qa.user_id BETWEEN 3 AND 103
            ORDER BY qa.user_id ASC, qa.created_at ASC, qa.id ASC
        """
        df_attempts = pd.read_sql_query(attempts_query, conn)

        # Query video associations for new cohort attempts
        assoc_query = """
            SELECT qav.quiz_attempt_id, qav.video_id
            FROM quiz_attempt_videos qav
            JOIN quiz_attempts qa ON qa.id = qav.quiz_attempt_id
            WHERE qa.user_id BETWEEN 3 AND 103
            ORDER BY qav.quiz_attempt_id ASC, qav.video_id ASC
        """
        df_assoc = pd.read_sql_query(assoc_query, conn)

        # Check total users in DB for metadata
        user_count_query = "SELECT COUNT(*) FROM users"
        total_db_users = conn.execute(user_count_query).fetchone()[0]

    finally:
        conn.close()

    # Map video IDs per attempt
    assoc_map: dict[int, list[int]] = {}
    for _, row in df_assoc.iterrows():
        att_id = int(row["quiz_attempt_id"])
        vid_id = int(row["video_id"])
        assoc_map.setdefault(att_id, []).append(vid_id)

    # Consolidate video IDs for each attempt
    video_ids_col = []
    video_count_col = []

    for _, row in df_attempts.iterrows():
        att_id = int(row["attempt_id"])
        legacy_vid = row["legacy_video_id"]

        if att_id in assoc_map and len(assoc_map[att_id]) > 0:
            v_list = assoc_map[att_id]
        elif pd.notna(legacy_vid) and legacy_vid is not None:
            v_list = [int(legacy_vid)]
        else:
            v_list = []

        video_ids_str = ",".join(str(v) for v in v_list)
        video_ids_col.append(video_ids_str)
        video_count_col.append(len(v_list))

    df_attempts["video_ids"] = video_ids_col
    df_attempts["video_count"] = video_count_col
    df_attempts["is_synthetic"] = 1

    # Assign 1-based attempt sequence number per user
    df_attempts["attempt_order_by_user"] = (
        df_attempts.groupby("user_id").cumcount() + 1
    )

    # Reorder columns
    cols = [
        "attempt_id",
        "user_id",
        "attempt_order_by_user",
        "score",
        "total_questions",
        "percentage",
        "difficulty",
        "video_count",
        "video_ids",
        "created_at",
        "is_synthetic"
    ]
    df_attempts = df_attempts[cols]

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df_attempts.to_csv(output_path, index=False)
        print(f"Extracted {len(df_attempts)} new cohort quiz attempts to: {output_path}")

    # Document extraction metadata
    included_user_ids = sorted([int(uid) for uid in df_attempts["user_id"].unique()])
    metadata = {
        "extraction_date": pd.Timestamp.now().isoformat(),
        "total_database_users": total_db_users,
        "new_cohort_user_count": len(included_user_ids),
        "total_extracted_attempts": len(df_attempts),
        "included_user_ids": included_user_ids,
        "excluded_user_ids": [1, 2],
        "exclusion_reasons": {
            "1": "Real application user - excluded from synthetic model training dataset",
            "2": "Real application user - excluded from synthetic model training dataset"
        },
        "user_id_range": [min(included_user_ids) if included_user_ids else None, max(included_user_ids) if included_user_ids else None],
        "random_seed": 42
    }

    if metadata_path:
        os.makedirs(os.path.dirname(metadata_path), exist_ok=True)
        with open(metadata_path, "w") as f:
            import json
            json.dump(metadata, f, indent=2)
        print(f"Dataset extraction metadata written to: {metadata_path}")

    return df_attempts


if __name__ == "__main__":
    df = extract_quiz_attempts_data()
    print("Sample extracted data:")
    print(df.head(10))
    print("\nExtraction Summary:")
    print(f"Total rows: {len(df)}")
    print(f"Total unique users: {df['user_id'].nunique()}")
