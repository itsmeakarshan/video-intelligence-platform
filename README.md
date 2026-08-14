# 🎥 Video Intelligence Platform & ML Engineering Hub

An AI-powered video learning platform which predicts User's next quiz Score and Gives Recommendations in the form of Youtube Video Links based on weak topics. Users can Uplaod any lenghth video and chat with AI about the video like which topic is where in the video and the ai gives exact timestamps with jump to timestamp button. Just need to Upload and then Process the video/videos.

## 🚀 Key Features

User can Ask Questions related to the processed video and Ai will give accurate answers with exact timestamps.

User can upload from device or can download from Youtube as there is a feature where user can paste youtube link and video gets downloaded.

User can User the Feature of Ai notes or Ai summary of uploaded video and can download them in PDF format.

User can take quizzes on the uploaded video and the ai will give score and weak topic detection.

User can get youtube video recommendations based on his weak topics.

User can view his knowledge profile based on the quizzes he has taken.

---

## 🔬 Data Science & Machine Learning Engineering Rigor

### 1. Data Safety & Cohort Methodology
- **Production User Protection**: Real application Users 1 and 2 and their historical quiz attempts are strictly preserved in the SQLite database (`backend/video_intelligence.db`) and **EXCLUDED** from ML dataset extraction, feature engineering, model training, and evaluation.
- **Learner Cohort**: Users 3–103 (95 clean modeling learners, 636 leak-free attempt instances).
- **Outlier Learner Detection**: EDA independently evaluated learner-level behavioral consistency. 6 high-variance learners were objectively excluded from modeling and documented. They remain intact in the SQLite database.

### 2. Leak-Free Feature Engineering
- **38 `D_CORE_LEARNING` Features:** Computed strictly from prior attempt history ($1 \dots N-1$) to eliminate target leakage.
- Features capture performance moving averages, score variance, recent vs long-term trends, difficulty deltas, and video interaction depth.
- Automated leakage tests (`ml/src/leakage_test.py`) verify 100% temporal isolation and target exclusion.

### 3. Regression Model Benchmarks (Next Quiz Score Forecast)
Target: `next_percentage` (0.0% – 100.0%)

| Model / Baseline | GroupKFold MAE | GroupKFold R² | Unseen User MAE | Temporal MAE |
| :--- | :---: | :---: | :---: | :---: |
| **Historical Mean (Baseline)** | 9.31% | 0.277 | 10.21% | 10.57% |
| **Most Recent Score (Baseline)** | 5.27% | 0.739 | 5.14% | 5.15% |
| **Recent 3-Attempt Avg (Baseline)** | 7.00% | 0.587 | 7.40% | 7.38% |
| **Random Forest Regressor** | 3.89% | 0.854 | 3.29% | 3.78% |
| **Gradient Boosting Regressor** | 3.85% | 0.855 | 3.23% | 3.67% |
| **Extra Trees Regressor (Production v4.0)** | **3.80%** | **0.861** | **3.13%** | **3.60%** |

### 4. Explainability & Uncertainty Calibration
- **SHAP TreeExplainer**: Calculates exact local feature attributions for individual forecasts and global importance across the dataset. Top model drivers: Previous Quiz Score (2.48%), Personal Best Score (1.69%), EWMA Smooth (1.66%), 2-Quiz Score Average (1.46%).
- **Split Conformal Prediction**: 5-Fold GroupKFold OOF residual quantile calibration. Target coverage: **90.0%**; Empirical OOF coverage: **89.9%** ($\pm 7.8\%$ score-point prediction margin).

### 5. Vector Search RAG Retrieval Benchmarks
* **Recall@1:** 88.0%
* **Recall@3:** 96.0%
* **Recall@5:** 98.0%
* **MRR (Mean Reciprocal Rank):** 0.920

### 6. Automated MLOps & Data Quality Audit
* **Data Quality Checks:** Missing values (0), duplicates (0), score range bounds (0-100%), user isolation (100% ENFORCED).
* **Drift Monitoring:** Distribution checks and production model drift tracking (`/ml/drift`).

---

## ⚙️ Installation & Setup Guide

For step-by-step installation instructions, Docker container deployment, environment setup, and local running instructions, please see the dedicated setup guide:

👉 **[SETUP.md](SETUP.md)**

---

## ⚡ How to Reproduce Model Training & Evaluation

Notebooks are located at:
- `ml/notebooks/01_learner_data_eda.ipynb`
- `ml/notebooks/02_feature_engineering.ipynb`
- `ml/notebooks/02_model_comparison_and_evaluation.ipynb`
- `ml/notebooks/04_model_explainability_and_uncertainty.ipynb`

---

## 📸 Application Routes

* **`/` (Learner Dashboard):** Video player, RAG Chat, AI Notes, YouTube Downloader, Learner Forecast, Knowledge Profile.
* **`/quiz`:** Interactive video quiz, score evaluation, weak-topic detection, personalized YouTube recommendations.
* **`/ml-performance`:** Recruiter & Data Science Portfolio Dashboard displaying empirical baseline tables, calibration charts, GroupKFold/Temporal splits, RAG recall, and MLOps audit metrics.

---

## 👨‍💻 Author

**Akarshan Rasyal**
akarshanrasyal4@gmail.com
