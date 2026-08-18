# Video Intelligence Platform — Machine Learning Component (`ml/`)

This directory contains the machine learning pipelines for forecasting next quiz scores (regression) in the Video Intelligence Platform.


---

## 1. Task Formulation
**Next Quiz Score Regression:** Predicts `next_percentage` (Float, 0.0% – 100.0%) from historical quiz performance data using `ExtraTreesRegressor_v4.0`.

---

## 2. Directory Structure
```
ml/
├── data/
│   ├── raw/
│   │   └── new_learner_dataset.csv             # Raw extracted quiz attempt records
│   └── processed/
│       └── clean_learner_dataset.csv           # Cleaned learner dataset
├── notebooks/
│   ├── 01_learner_data_eda.ipynb               # Exploratory Data Analysis & Outlier Auditing
│   ├── 02_model_comparison_and_evaluation.ipynb # Model comparison & GroupKFold CV evaluation
│   └── 03_model_explainability_and_uncertainty.ipynb # SHAP attributions & Conformal prediction intervals
├── src/
│   ├── data_loader.py                          # Database extraction pipeline
│   ├── features.py                             # Feature generator & 38-feature D_CORE_LEARNING contract
│   ├── predict.py                              # ScorePredictor inference engine
│   ├── train_all_models.py                     # Comprehensive model training & selection pipeline
│   ├── evaluate.py                             # Model evaluation suite
│   ├── leakage_test.py                         # Automated target leakage testing suite
│   └── run_eda.py                              # Dataset statistical distribution audit
├── models/
│   ├── best_regression_model.joblib            # Production ExtraTreesRegressor_v4.0 artifact
│   ├── pipeline_meta.joblib                    # Pipeline metadata & feature contract
│   ├── regression_meta.joblib                  # Regression model metadata
│   └── scaler.joblib                           # StandardScaler artifact
├── reports/
│   ├── data_quality_report.json                # Data quality audit report
│   ├── final_regression_selection.json         # Production regression model selection rationale
│   ├── final_model_evaluation.md               # Final regression evaluation report
│   └── model_evaluation.json                   # Comprehensive ML Metrics Hub JSON payload
└── README.md                                   # Machine Learning documentation
```

---

## 3. Evaluation Summary (Next Quiz Score Percentage)

| Strategy | Split | Samples | MAE (%) | RMSE (%) | R² |
| :--- | :--- | ---: | ---: | ---: | ---: |
| **GroupKFold CV** | 5-fold by user | 636 | 3.80 | 4.96 | 0.861 |
| **Unseen-user** | 20% user holdout | 128 | 3.13 | 3.89 | 0.912 |
| **Temporal** | 80/20 chronological | 127 | 3.60 | 4.57 | 0.908 |

---

## 4. API Endpoint
- `GET /ml/prediction?difficulty=Medium` — Returns score percentage forecast (`predicted_percentage`, `historical_avg`, `recent_trend`, `attempt_count`).
- Requires JWT Authentication and enforces strict user data isolation.
