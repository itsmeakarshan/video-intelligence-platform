import sys
import os
import unittest

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../"))
PROJECT_ROOT = os.path.abspath(os.path.join(BACKEND_DIR, "../"))
os.chdir(BACKEND_DIR)

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_db
from app.models.user import User
from app.models.video import Video
from app.routes.auth import create_access_token
from app.services.youtube_recommendation_service import (
    calculate_relevance_score,
    rank_and_filter_recommendations,
    build_contextual_query,
    MIN_RELEVANCE_THRESHOLD
)


class TestPersonalisedRecommendations(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = next(get_db())
        cls.user1 = cls.db.query(User).filter(User.id == 1).first()
        cls.user2 = cls.db.query(User).filter(User.id == 2).first()

        cls.token1 = create_access_token(user_id=cls.user1.id)
        cls.token2 = create_access_token(user_id=cls.user2.id)

        cls.headers1 = {"Authorization": f"Bearer {cls.token1}"}
        cls.headers2 = {"Authorization": f"Bearer {cls.token2}"}

        cls.v1 = cls.db.query(Video).filter(Video.user_id == cls.user1.id).first()
        cls.v2 = cls.db.query(Video).filter(Video.user_id == cls.user2.id).first()

    def test_touch_screen_scrolling_vs_scratch_and_unity(self):
        """Test A: Touch screen scrolling accepts touch gestures and REJECTS Scratch & Unity game scrolling."""
        topic = "Touch Screen Scrolling"
        video_context = "Mac OS X Basics"
        sample_q = "In the Mac OS X Basics video, how is the movement of pushing content up and down on a page described?"
        corr_ans = "It may seem awkward at first, but it is how many touch screen devices work."
        expl = "Mac OS X scrolling mimics touch screen content pushing."

        good_cand = {
            "youtube_video_id": "g1",
            "title": "Mac OS X Touch Screen Scrolling & Trackpad Gestures Explained",
            "description": "Tutorial explaining touch screen scrolling and trackpad navigation on Mac OS X."
        }

        bad_scratch = {
            "youtube_video_id": "b1",
            "title": "Simple Background Scrolling Tutorial - Scratch",
            "description": "Learn how to code background scrolling in Scratch game development."
        }

        bad_unity = {
            "youtube_video_id": "b2",
            "title": "Scrolling and scrollbars in Unity - Unity UI tutorial",
            "description": "How to implement UI scrollbars and canvas scrolling in Unity game engine."
        }

        good_score = calculate_relevance_score(good_cand, topic, video_context, sample_q, corr_ans, expl)
        scratch_score = calculate_relevance_score(bad_scratch, topic, video_context, sample_q, corr_ans, expl)
        unity_score = calculate_relevance_score(bad_unity, topic, video_context, sample_q, corr_ans, expl)

        self.assertGreaterEqual(good_score, MIN_RELEVANCE_THRESHOLD, "Touch screen scrolling candidate must pass Hard Relevance Gate (>= 5.0).")
        self.assertLess(scratch_score, MIN_RELEVANCE_THRESHOLD, "Scratch game scrolling candidate must be heavily penalized and rejected.")
        self.assertLess(unity_score, MIN_RELEVANCE_THRESHOLD, "Unity UI scrolling candidate must be heavily penalized and rejected.")

    def test_web_browser_basics_vs_browser_development(self):
        """Test B: Web browser basics accepts Chrome/Safari navigation and REJECTS C++ browser engine development."""
        topic = "Web Browser Uses"
        video_context = "Web Browser Basics"
        sample_q = "What can you use a web browser for?"
        corr_ans = "Using a web browser to visit websites or check email."
        expl = "Web browsers allow navigating web pages and accessing email."

        good_cand = {
            "youtube_video_id": "g2",
            "title": "Web Browser Basics: How to Visit Websites & Use Chrome & Safari",
            "description": "Beginner guide to using web browsers for visiting websites and checking email."
        }

        bad_dev = {
            "youtube_video_id": "b3",
            "title": "Build a Web Browser Engine in C++ from Scratch",
            "description": "Advanced browser architecture and V8 engine compiler development."
        }

        good_score = calculate_relevance_score(good_cand, topic, video_context, sample_q, corr_ans, expl)
        dev_score = calculate_relevance_score(bad_dev, topic, video_context, sample_q, corr_ans, expl)

        self.assertGreaterEqual(good_score, MIN_RELEVANCE_THRESHOLD)
        self.assertLess(dev_score, MIN_RELEVANCE_THRESHOLD)

    def test_desktop_computer_setup_vs_overclocking(self):
        """Test C: Desktop computer setup accepts PC setup and REJECTS liquid nitrogen overclocking."""
        topic = "Desktop Computer Setup"
        video_context = "Computer Basics"
        sample_q = "How do you connect peripherals when setting up a desktop computer?"
        corr_ans = "Plugging in the monitor, keyboard, and mouse."
        expl = "Connect monitor and peripherals to desktop computer tower."

        good_cand = {
            "youtube_video_id": "g3",
            "title": "How to Set Up a Desktop Computer - Connecting Monitor & Cables",
            "description": "Step-by-step PC hardware setup tutorial for desktop computer peripherals."
        }

        bad_oc = {
            "youtube_video_id": "b4",
            "title": "Extreme CPU Overclocking Record with Liquid Nitrogen",
            "description": "Pushing Intel CPU frequencies with liquid nitrogen cooling and BIOS flashing."
        }

        good_score = calculate_relevance_score(good_cand, topic, video_context, sample_q, corr_ans, expl)
        oc_score = calculate_relevance_score(bad_oc, topic, video_context, sample_q, corr_ans, expl)

        self.assertGreaterEqual(good_score, MIN_RELEVANCE_THRESHOLD)
        self.assertLess(oc_score, MIN_RELEVANCE_THRESHOLD)

    def test_applications_vs_mobile_app_dev(self):
        """Test D: Applications concept accepts office document creation and REJECTS iOS/Android mobile app dev."""
        topic = "Applications"
        video_context = "Computer Basics"
        sample_q = "What are computer applications used for?"
        corr_ans = "Apps can be used to create documents and spreadsheets."
        expl = "Word processors and office applications allow creating documents."

        good_cand = {
            "youtube_video_id": "g4",
            "title": "Computer Applications Basics: Using Software to Create Documents",
            "description": "Learn how computer office applications help create documents and files."
        }

        bad_dev = {
            "youtube_video_id": "b5",
            "title": "iOS App Development with SwiftUI in Xcode for Beginners",
            "description": "Learn mobile app development using Swift, SwiftUI and Xcode for iOS."
        }

        good_score = calculate_relevance_score(good_cand, topic, video_context, sample_q, corr_ans, expl)
        dev_score = calculate_relevance_score(bad_dev, topic, video_context, sample_q, corr_ans, expl)

        self.assertGreaterEqual(good_score, MIN_RELEVANCE_THRESHOLD)
        self.assertLess(dev_score, MIN_RELEVANCE_THRESHOLD)

    def test_no_relevant_results_returns_empty_and_message(self):
        """Test 8: If no candidates pass Hard Relevance Gate, returns empty list and appropriate message."""
        weak_topics = [{"topic": "Touch Screen Scrolling", "incorrect_count": 1, "sample_question": "Mac OS scrolling"}]
        candidates = {
            "Touch Screen Scrolling": [
                {"youtube_video_id": "b1", "title": "Simple Background Scrolling Tutorial - Scratch", "description": "Scratch game dev"},
                {"youtube_video_id": "b2", "title": "Scrolling in Unity UI", "description": "Unity game dev"}
            ]
        }

        recs = rank_and_filter_recommendations(weak_topics, candidates, video_context="Mac OS X Basics", max_total=5)
        self.assertEqual(len(recs), 0, "No low-scoring off-domain candidates should pass the Hard Relevance Gate.")

    def test_perfect_score_no_weaknesses(self):
        """User with 100% score gets no weak topics message."""
        payload = {
            "video_ids": [self.v1.id],
            "score": 2,
            "total_questions": 2,
            "difficulty": "Medium",
            "questions": [
                {
                    "question_index": 0,
                    "question_text": "What is CPU?",
                    "selected_answer": 0,
                    "correct_answer": 0,
                    "is_correct": True,
                    "topic": "Processor Architecture",
                    "explanation": "CPU executes instructions."
                },
                {
                    "question_index": 1,
                    "question_text": "What is RAM?",
                    "selected_answer": 1,
                    "correct_answer": 1,
                    "is_correct": True,
                    "topic": "System Memory",
                    "explanation": "RAM stores volatile data."
                }
            ]
        }

        resp = self.client.post("/quiz-attempts", json=payload, headers=self.headers1)
        self.assertEqual(resp.status_code, 201)
        attempt_id = resp.json()["id"]

        rec_resp = self.client.get(f"/quiz-attempts/{attempt_id}/recommendations", headers=self.headers1)
        self.assertEqual(rec_resp.status_code, 200)
        rec_data = rec_resp.json()

        self.assertEqual(len(rec_data["weak_topics"]), 0)
        self.assertIn("Great work", rec_data["message"])

    def test_user_data_isolation(self):
        """Test 10: User A cannot access User B's recommendations."""
        payload = {
            "video_ids": [self.v1.id],
            "score": 0,
            "total_questions": 1,
            "difficulty": "Medium",
            "questions": [
                {
                    "question_index": 0,
                    "question_text": "Test question?",
                    "selected_answer": 1,
                    "correct_answer": 0,
                    "is_correct": False,
                    "topic": "User Isolation Test",
                    "explanation": "Test."
                }
            ]
        }

        resp = self.client.post("/quiz-attempts", json=payload, headers=self.headers1)
        attempt_id = resp.json()["id"]

        rec_resp = self.client.get(f"/quiz-attempts/{attempt_id}/recommendations", headers=self.headers2)
        self.assertEqual(rec_resp.status_code, 200)
        rec_data = rec_resp.json()
        self.assertEqual(rec_data["message"], "Access denied.")
        self.assertEqual(len(rec_data["recommendations"]), 0)


if __name__ == "__main__":
    unittest.main()
