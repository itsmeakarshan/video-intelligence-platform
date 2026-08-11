import random
from datetime import timedelta

from app.db.database import SessionLocal
from app.models.user import User
from app.models.quiz_attempt import QuizAttempt

SEED = 20260811
random.seed(SEED)

START_USER_ID = 3
END_USER_ID = 103

TOTAL_NEW_USERS = 101
IMPROVING_USERS = 91
NOISY_USERS = 10

db = SessionLocal()

try:
    # ------------------------------------------------------------
    # SAFETY CHECK
    # ------------------------------------------------------------
    existing_users = db.query(User).count()

    if existing_users != 2:
        raise RuntimeError(
            f"STOP: expected exactly 2 existing users, found {existing_users}."
        )

    if db.query(User).filter(User.id.between(3, 103)).count() != 0:
        raise RuntimeError(
            "STOP: users 3-103 already exist."
        )

    video_rows = (
        db.query(QuizAttempt.video_id)
        .filter(QuizAttempt.video_id.isnot(None))
        .distinct()
        .all()
    )

    video_ids = [row[0] for row in video_rows]

    if not video_ids:
        raise RuntimeError(
            "STOP: no existing video IDs available."
        )

    print("Existing users:", existing_users)
    print("Existing videos available:", len(video_ids))

    # ------------------------------------------------------------
    # REALISTIC SCORE GENERATORS
    # ------------------------------------------------------------

    # Use larger quizzes so percentages have more resolution.
    TOTAL_OPTIONS = [20, 25, 30, 40, 50]

    def make_quiz_result(target_percentage):
        """
        Convert a continuous target percentage into a mathematically
        valid score / total_questions / percentage combination.
        """

        total = random.choice(TOTAL_OPTIONS)

        # Add tiny realistic measurement noise before rounding.
        target = target_percentage + random.gauss(0, 0.7)

        target = max(5, min(95, target))

        score = round((target / 100) * total)

        score = max(1, min(total - 1, score))

        percentage = round((score / total) * 100, 2)

        return score, total, percentage

    def improving_trajectory():
        """
        Predominantly improving learner.

        Positive long-term trend but realistic short-term variation.
        """

        attempts = random.randint(6, 10)

        starting_ability = random.uniform(32, 62)

        # Individual learning rate.
        learning_rate = random.uniform(2.5, 5.5)

        current = starting_ability

        trajectory = []

        for i in range(attempts):

            if i > 0:

                # Main learning effect.
                change = learning_rate

                # Human-like random variation.
                change += random.gauss(0, 3.0)

                # Occasional setback.
                if random.random() < 0.16:
                    change -= random.uniform(3, 8)

                current += change

            current = max(15, min(90, current))

            trajectory.append(current)

        # Make sure the overall trajectory genuinely improves.
        if trajectory[-1] <= trajectory[0] + 8:
            boost = random.uniform(10, 18)

            for i in range(len(trajectory)):
                trajectory[i] += boost * (i / (len(trajectory) - 1))

            trajectory = [
                min(90, max(15, x))
                for x in trajectory
            ]

        return trajectory

    def noisy_trajectory():
        """
        Highly inconsistent learner.

        These learners are intentionally retained in the raw dataset.
        EDA will later determine whether they should be excluded.
        """

        attempts = random.randint(6, 10)

        current = random.uniform(30, 75)

        trajectory = []

        for i in range(attempts):

            if i == 0:
                score = current
            else:
                # Large unpredictable movement.
                score = random.uniform(15, 90)

                # Occasionally create extreme jumps.
                if random.random() < 0.25:
                    score += random.choice([
                        random.uniform(-15, -5),
                        random.uniform(5, 15),
                    ])

            score = max(10, min(92, score))

            trajectory.append(score)

        return trajectory

    # ------------------------------------------------------------
    # CREATE NEW USERS
    # ------------------------------------------------------------

    users = []
    attempts = []

    improving_histories = {}
    noisy_histories = {}

    for offset in range(TOTAL_NEW_USERS):

        user_id = START_USER_ID + offset

        is_noisy = offset >= IMPROVING_USERS

        if is_noisy:
            trajectory = noisy_trajectory()
            cohort = "noisy"
            noisy_histories[user_id] = trajectory
        else:
            trajectory = improving_trajectory()
            cohort = "improving"
            improving_histories[user_id] = trajectory

        user = User(
            id=user_id,
            name=f"Synthetic Learner {user_id}",
            email=f"synthetic.learner{user_id}@example.test",
            password_hash="SYNTHETIC_DATA_ONLY",
        )

        users.append(user)

        # Give each learner a different starting point in time.
        current_time = __import__('datetime').datetime.now() - timedelta(
            days=random.randint(30, 180),
            hours=random.randint(1, 12),
        )

        for attempt_index, target_percentage in enumerate(trajectory):

            if attempt_index == 0:
                current_time = current_time + timedelta(
                    days=random.randint(1, 30),
                    hours=random.randint(1, 12),
                )
            else:
                current_time = current_time + timedelta(
                    days=random.choice([1, 1, 2, 2, 3, 4, 5, 7]),
                    hours=random.randint(1, 10),
                )

            difficulty = random.choices(
                ["Easy", "Medium", "Hard"],
                weights=[25, 55, 20],
                k=1,
            )[0]

            # Harder quizzes slightly reduce expected performance.
            difficulty_adjustment = {
                "Easy": 3,
                "Medium": 0,
                "Hard": -5,
            }[difficulty]

            adjusted_target = target_percentage + difficulty_adjustment

            score, total, percentage = make_quiz_result(
                adjusted_target
            )

            video_id = random.choice(video_ids)

            attempt = QuizAttempt(
                user_id=user_id,
                video_id=video_id,
                score=score,
                total_questions=total,
                percentage=percentage,
                difficulty=difficulty,
                created_at=current_time,
            )

            attempts.append(attempt)

    # ------------------------------------------------------------
    # PREVIEW
    # ------------------------------------------------------------

    print("\n==============================")
    print("NEW DATASET PREVIEW")
    print("==============================")

    print("New users:", len(users))
    print("New attempts:", len(attempts))
    print("Improving learners:", IMPROVING_USERS)
    print("Noisy learners:", NOISY_USERS)

    print("\nImproving learner examples:")

    for user_id in list(improving_histories.keys())[:5]:
        values = improving_histories[user_id]
        print(
            f"User {user_id}: "
            + " → ".join(f"{x:.0f}%" for x in values)
        )

    print("\nNoisy learner examples:")

    for user_id in list(noisy_histories.keys())[:5]:
        values = noisy_histories[user_id]
        print(
            f"User {user_id}: "
            + " → ".join(f"{x:.0f}%" for x in values)
        )

    # ------------------------------------------------------------
    # INSERT
    # ------------------------------------------------------------

    db.add_all(users)
    db.flush()

    db.add_all(attempts)
    db.commit()

    # ------------------------------------------------------------
    # VALIDATE
    # ------------------------------------------------------------

    final_users = db.query(User).count()
    final_attempts = db.query(QuizAttempt).count()

    print("\n==============================")
    print("INSERTION COMPLETE")
    print("==============================")

    print("Total users:", final_users)
    print("Total attempts:", final_attempts)
    print("New users:", len(users))
    print("New attempts:", len(attempts))

    if final_users != 103:
        raise RuntimeError(
            f"Unexpected final user count: {final_users}"
        )

    print("\nSUCCESS")
    print("Users 1 and 2 were preserved.")
    print("New users 3-103 inserted.")
    print("EDA/model training has NOT been performed.")

except Exception:
    db.rollback()
    raise

finally:
    db.close()
