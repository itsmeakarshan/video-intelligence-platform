import random
from datetime import datetime, timedelta

from app.db.database import SessionLocal
from app.models.user import User
from app.models.quiz_attempt import QuizAttempt

SEED = 42
random.seed(SEED)

NEW_USERS = 103
START_USER_ID = 98
END_USER_ID = 200

# Existing videos from the database will be reused.
# We do NOT create fake video records.
IMPROVING_USERS = 93
NOISY_USERS = 10

db = SessionLocal()

try:
    # ------------------------------------------------------------
    # SAFETY CHECKS
    # ------------------------------------------------------------
    user_count = db.query(User).count()
    attempt_count = db.query(QuizAttempt).count()

    print(f"Current users: {user_count}")
    print(f"Current attempts: {attempt_count}")

    if user_count != 97:
        raise RuntimeError(
            f"STOP: expected exactly 97 existing users, found {user_count}."
        )

    existing_ids = {
        row[0]
        for row in db.query(User.id)
        .filter(User.id >= START_USER_ID, User.id <= END_USER_ID)
        .all()
    }

    if existing_ids:
        raise RuntimeError(
            f"STOP: user IDs already exist: {sorted(existing_ids)}"
        )

    videos = db.query(QuizAttempt.video_id).distinct().all()
    video_ids = [v[0] for v in videos if v[0] is not None]

    if not video_ids:
        raise RuntimeError(
            "STOP: no existing video IDs were found in QuizAttempt."
        )

    print(f"Existing video IDs available: {len(video_ids)}")

    # ------------------------------------------------------------
    # HELPER: realistic trajectory
    # ------------------------------------------------------------
    def improving_scores():
        """
        Predominantly improving learner.

        Scores generally increase, but with realistic variation.
        We intentionally do NOT create perfectly monotonic sequences.
        """
        attempts = random.randint(6, 10)

        start = random.randint(30, 65)

        # Learner-specific learning rate
        learning_rate = random.uniform(3.0, 7.0)

        scores = []

        current = float(start)

        for i in range(attempts):
            if i == 0:
                score = current
            else:
                # Learning effect + realistic noise
                change = learning_rate + random.gauss(0, 4.5)

                # Occasional temporary setback
                if random.random() < 0.15:
                    change -= random.uniform(4, 10)

                current += change
                score = current

            score = max(15, min(95, score))
            scores.append(round(score, 1))

        return scores

    def noisy_scores():
        """
        Deliberately inconsistent learner trajectory.

        These are NOT automatically removed.
        EDA will decide whether they should be excluded.
        """
        attempts = random.randint(6, 10)

        current = random.uniform(35, 75)

        scores = []

        for i in range(attempts):
            if i == 0:
                score = current
            else:
                # Large unpredictable changes
                score = random.uniform(15, 90)

            score = max(10, min(95, score))
            scores.append(round(score, 1))

        return scores

    # ------------------------------------------------------------
    # Convert percentage into realistic quiz score
    # ------------------------------------------------------------
    def score_to_questions(percentage):
        total_questions = random.choice([5, 10, 10, 10, 15])

        # Convert percentage to integer correct answers
        score = round((percentage / 100) * total_questions)

        score = max(0, min(total_questions, score))

        actual_percentage = (score / total_questions) * 100

        return score, total_questions, round(actual_percentage, 1)

    # ------------------------------------------------------------
    # Create users
    # ------------------------------------------------------------
    users_to_create = []
    attempts_to_create = []

    base_date = datetime.now() - timedelta(days=180)

    for index in range(NEW_USERS):

        user_id = START_USER_ID + index

        if index < IMPROVING_USERS:
            cohort = "improving"
            scores = improving_scores()
        else:
            cohort = "noisy"
            scores = noisy_scores()

        name = f"Synthetic Learner {user_id}"
        email = f"synthetic.learner{user_id}@example.test"

        user = User(
            id=user_id,
            name=name,
            email=email,
            password_hash="SYNTHETIC_DATA_ONLY",
            created_at=base_date + timedelta(
                days=random.randint(0, 120)
            ),
        )

        users_to_create.append(user)

        # Each learner starts at a slightly different time.
        current_time = user.created_at + timedelta(
            hours=random.randint(6, 48)
        )

        for attempt_index, percentage in enumerate(scores):

            if attempt_index > 0:

                # Realistic gap between attempts
                gap_days = random.choice([
                    1, 1, 2, 2, 3, 4, 5, 7, 10
                ])

                gap_hours = random.randint(0, 12)

                current_time += timedelta(
                    days=gap_days,
                    hours=gap_hours
                )

            difficulty = random.choices(
                ["Easy", "Medium", "Hard"],
                weights=[25, 55, 20],
                k=1,
            )[0]

            score, total_questions, actual_percentage = (
                score_to_questions(percentage)
            )

            video_id = random.choice(video_ids)

            attempt = QuizAttempt(
                user_id=user_id,
                video_id=video_id,
                score=score,
                total_questions=total_questions,
                percentage=actual_percentage,
                difficulty=difficulty,
                created_at=current_time,
            )

            attempts_to_create.append(attempt)

    # ------------------------------------------------------------
    # PREVIEW BEFORE COMMIT
    # ------------------------------------------------------------
    print("\n========== PREVIEW ==========")
    print(f"New users: {len(users_to_create)}")
    print(f"New attempts: {len(attempts_to_create)}")
    print(f"Improving learners: {IMPROVING_USERS}")
    print(f"Noisy learners: {NOISY_USERS}")

    print("\nSample improving trajectories:")

    for i in range(3):
        user_id = START_USER_ID + i

        user_attempts = [
            a for a in attempts_to_create
            if a.user_id == user_id
        ]

        print(
            f"User {user_id}: "
            + " → ".join(
                f"{a.percentage:.0f}%"
                for a in user_attempts
            )
        )

    print("\nSample noisy trajectories:")

    for i in range(3):
        user_id = START_USER_ID + IMPROVING_USERS + i

        user_attempts = [
            a for a in attempts_to_create
            if a.user_id == user_id
        ]

        print(
            f"User {user_id}: "
            + " → ".join(
                f"{a.percentage:.0f}%"
                for a in user_attempts
            )
        )

    # ------------------------------------------------------------
    # INSERT
    # ------------------------------------------------------------
    print("\nInserting synthetic users and attempts...")

    db.add_all(users_to_create)
    db.flush()

    db.add_all(attempts_to_create)
    db.commit()

    # ------------------------------------------------------------
    # VALIDATION
    # ------------------------------------------------------------
    final_users = db.query(User).count()
    final_attempts = db.query(QuizAttempt).count()

    inserted_users = final_users - user_count
    inserted_attempts = final_attempts - attempt_count

    print("\n========== INSERTION COMPLETE ==========")
    print(f"Users before: {user_count}")
    print(f"Users after:  {final_users}")
    print(f"New users:    {inserted_users}")

    print(f"\nAttempts before: {attempt_count}")
    print(f"Attempts after:  {final_attempts}")
    print(f"New attempts:    {inserted_attempts}")

    if inserted_users != NEW_USERS:
        raise RuntimeError(
            f"Unexpected user count: expected {NEW_USERS}, "
            f"inserted {inserted_users}"
        )

    print("\nDatabase insertion successful.")
    print("Existing 97 users were preserved.")
    print("EDA/model training has NOT been performed yet.")

except Exception:
    db.rollback()
    print("\nERROR: transaction rolled back.")
    raise

finally:
    db.close()
