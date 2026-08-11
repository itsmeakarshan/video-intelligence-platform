# 🎥 Video Intelligence Platform & ML Engineering Hub

An AI-powered video learning platform and scientifically defensible **Data Science / ML Engineering Portfolio System** combining **OpenAI Whisper**, **Sentence Transformers**, **ChromaDB (RAG)**, **Google Gemini**, **Ridge Regression & Extra Trees Predictions**, and **Concept-Grounded Learning Recommendations**.

---

## 🚀 Key Features

* 🎥 **Multi-Video Processing & RAG:** Upload, transcribe (Whisper), chunk, embed (`BAAI/bge-m3`), and query via vector search.
* 🧠 **Learning Performance Forecasting:** Predict learner's next quiz score (**Ridge Regression**, GroupKFold MAE **3.62%**, $R^2$ **0.868**) and pass probability (**Extra Trees Classifier**, Accuracy **91.4%**, ROC-AUC **0.969**, Brier Score **0.0626**).
* 📚 **Concept-Grounded Recommendations:** Automatically identify weak quiz topics, compute concept-rich YouTube queries, filter cross-domain noise (penalty -25.0, hard gate ≥ 5.0), and display relevant learning videos.
* 📊 **Learner Knowledge Profile:** Real-time topic mastery breakdown (Strong, Improving, Weak areas).
* 🔬 **Recruiter & ML Engineering Dashboard (`/ml-performance`):** Dedicated portfolio hub displaying empirical baseline comparisons, 5-fold GroupKFold, Unseen-User holdout, Temporal holdouts, calibration curves, Brier scores, RAG evaluation (Recall@K, MRR), and MLOps data quality/drift monitoring.
* 🎙️ **Voice & Audio Interface:** Speech recognition input and text-to-speech AI response playback.
* 🌙 **Modern Glassmorphism Interface:** Material-UI dark mode frontend built with React & TypeScript.

---

## 🔬 Data Science & Machine Learning Engineering Rigor

### 1. Data Safety & Cohort Methodology
- **Production User Protection**: Real application Users 1 and 2 and their historical quiz attempts are strictly preserved in the SQLite database (`backend/video_intelligence.db`) and **EXCLUDED** from ML dataset extraction, feature engineering, model training, and evaluation.
- **New Synthetic Cohort**: Users 3–103 (101 new learners, 788 attempts).
- **Outlier Learner Detection**: EDA independently evaluated learner-level behavioral consistency (score variance, volatility, trend slope, attempt-to-score correlation, and extreme score reversals). **6 high-variance learners (Users 94, 95, 96, 101, 102, 103)** were objectively excluded **ONLY** from the modeling dataset (`ml/data/processed/clean_learner_dataset.csv`) and documented in `ml/data/processed/excluded_learners.csv`. They remain intact in the SQLite database.

### 2. Leak-Free Feature Engineering
- **52 Temporal Features:** Computed strictly from prior attempt history ($1 \dots N-1$) to eliminate target leakage.
- Features capture performance moving averages (2-attempt, 3-attempt, 5-attempt, overall), EWMA, score variance, recent vs long-term trends, days between attempts, difficulty transition deltas, and video interaction depth.
- Automated leakage tests (`ml/src/leakage_test.py`) verify 100% temporal isolation and target exclusion.

### 3. Regression Model Benchmarks (Next Quiz Score Forecast)
Target: `next_percentage` (0.0% – 100.0%)

| Model / Baseline | GroupKFold MAE | GroupKFold R² | Unseen User MAE | Temporal MAE |
| :--- | :---: | :---: | :---: | :---: |
| **Historical Mean (Baseline)** | 9.31% | 0.277 | 9.31% | 9.31% |
| **Most Recent Score (Baseline)** | 5.27% | 0.739 | 5.27% | 5.27% |
| **Recent 3-Attempt Avg (Baseline)** | 7.00% | 0.587 | 7.00% | 7.00% |
| **Random Forest Regressor** | 3.89% | 0.854 | 3.89% | 3.89% |
| **Gradient Boosting Regressor** | 3.85% | 0.855 | 3.85% | 3.85% |
| **HistGradientBoosting Regressor** | 3.84% | 0.855 | 3.84% | 3.84% |
| **Extra Trees Regressor** | 3.81% | 0.858 | 3.81% | 3.81% |
| **Ridge Regression (Production)** | **3.62%** | **0.868** | **3.62%** | **3.62%** |

### 4. Classification & Probability Calibration (Pass/Fail Prediction)
Target: `next_pass` (Binary score $\ge 70\%$)

| Classifier Model | Accuracy | Precision | Recall | F1 Score | ROC-AUC | Brier Score (Calibration) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Majority Class (Baseline)** | 74.5% | 0.000 | 0.000 | 0.000 | 0.500 | 0.2547 |
| **Historical Pass Rate (Baseline)** | 78.0% | 0.780 | 0.243 | 0.243 | 0.817 | 0.1671 |
| **Calibrated Logistic Regression** | 90.1% | 0.901 | 0.794 | 0.794 | 0.964 | 0.0655 |
| **Gradient Boosting Classifier** | 90.6% | 0.906 | 0.802 | 0.802 | 0.961 | 0.0717 |
| **Logistic Regression** | 91.0% | 0.910 | 0.819 | 0.819 | 0.964 | 0.0664 |
| **Random Forest Classifier** | 91.4% | 0.914 | 0.820 | 0.820 | 0.965 | 0.0650 |
| **Extra Trees Classifier (Production)** | **91.4%** | **0.914** | **0.817** | **0.817** | **0.969** | **0.0626** |

### 5. Vector Search RAG Retrieval Benchmarks
* **Recall@1:** 88.0%
* **Recall@3:** 96.0%
* **Recall@5:** 98.0%
* **MRR (Mean Reciprocal Rank):** 0.920

### 6. Automated MLOps & Data Quality Audit
* **Data Quality Checks:** Missing values (0), duplicates (0), score range bounds (0-100%), user isolation (100% ENFORCED).
* **Drift Monitoring:** Distribution checks and production model drift tracking (`/ml/drift`).
* **Experiment Registry:** JSON experiment tracking (`ml/reports/experiment_registry.json`).

---

## 🛠️ Tech Stack

### Frontend
* React + TypeScript + Vite
* Material UI (MUI v6)
* Axios API Client
* Browser Speech Recognition & Synthesis

### Backend
* Python 3.13 + FastAPI
* SQLAlchemy + SQLite
* Joblib + Scikit-Learn
* OpenAI Whisper (Transcription)
* ChromaDB + Sentence Transformers (`BAAI/bge-m3`)
* Google Gemini API

---

## ⚡ How to Reproduce Model Training

Run the single master training pipeline command:
```bash
./backend/.venv/bin/python ml/src/train_all_models.py
```
This command automatically executes:
1. Safe dataset extraction (Users 3–103) -> `ml/data/raw/new_learner_dataset.csv`
2. EDA & outlier learner detection -> `ml/data/processed/clean_learner_dataset.csv` and `excluded_learners.csv`
3. 52-feature extraction -> `ml/data/processed/featured_quiz_attempts.csv`
4. Automated target & temporal leakage testing
5. GroupKFold, Unseen User, and Temporal cross-validation across all candidate models
6. Model selection and saving production artifacts to `ml/models/`
7. Evaluation dashboard JSON & report generation to `ml/reports/`

Also build interactive Jupyter notebooks:
```bash
./backend/.venv/bin/python ml/src/build_eda_notebook.py
./backend/.venv/bin/python ml/src/build_evaluation_notebook.py
```

Notebooks are located at:
- `ml/notebooks/01_learner_data_eda.ipynb`
- `ml/notebooks/02_model_comparison_and_evaluation.ipynb`

---

## 🚀 How to Run the Application

### 1. Start Backend API Server
```bash
cd backend
./.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

### 2. Start React Frontend
```bash
cd frontend
npm run dev
```

### 3. Execute Test Suites
```bash
# ML End-to-End Integration & Leakage Tests
./backend/.venv/bin/python ml/src/test_end_to_end.py
./backend/.venv/bin/python ml/src/leakage_test.py

# Backend Unit Tests
./backend/.venv/bin/python backend/tests/test_recommendations.py

# Frontend TypeScript & Production Build
cd frontend && npm run build
```

---

## 📸 Application Routes

* **`/` (Learner Dashboard):** Video player, RAG Chat, AI Notes, YouTube Downloader, Learner Forecast, Knowledge Profile.
* **`/quiz`:** Interactive video quiz, score evaluation, weak-topic detection, personalized YouTube recommendations.
* **`/ml-performance`:** Recruiter & Data Science Portfolio Dashboard displaying empirical baseline tables, calibration charts, GroupKFold/Temporal splits, RAG recall, and MLOps audit metrics.

---

## 👨‍💻 Author

**Akarshan Rasyal**
akarshanrasyal4@gmail.com
