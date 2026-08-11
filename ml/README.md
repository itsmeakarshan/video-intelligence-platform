# Video Intelligence Platform — Machine Learning Component (`ml/`)

This directory contains the machine learning pipelines for predicting future quiz performance (regression) and pass/fail likelihood (classification) in the Video Intelligence Platform.

---

## 1. Tasks & Formulations
1. **Regression Task (Score Prediction):** Predicts `next_percentage` (Float, 0.0% – 100.0%).
2. **Classification Task (Pass/Fail Prediction):** Predicts `is_pass` = 1 if `next_percentage >= 70%` else 0.

---

## 2. Directory Structure
```
ml/
├── data/
│   ├── raw/
│   │   └── quiz_attempts.csv                   # Raw extracted quiz attempt records
│   └── processed/
│       └── featured_quiz_attempts.csv          # Leak-free feature matrix (571 instances)
├── notebooks/
│   ├── 01_eda.ipynb                            # Exploratory Data Analysis notebook
│   └── 02_feature_engineering.ipynb            # Feature engineering & leakage audit notebook
├── src/
│   ├── data_loader.py                          # Read-only database extraction
│   ├── features.py                             # Leak-free temporal feature generator
│   ├── audit_dataset.py                        # Data quality & synthetic audit generator
│   ├── train_and_evaluate_v2.py                # Regression training & evaluation pipeline
│   ├── train_and_evaluate_classifier.py        # Classification training & evaluation pipeline
│   ├── resolve_classifier_selection.py         # Classifier model selection resolver
│   ├── predict.py                              # ScorePredictor & PassClassifier inference engine
│   ├── leakage_test.py                         # Automated leakage testing suite
│   └── test_end_to_end.py                      # Integration test suite
├── models/
│   ├── best_regression_model.joblib            # Production Gradient Boosting regressor
│   ├── best_classifier.joblib                  # Production Logistic Regression classifier
│   ├── pipeline_meta.joblib                    # Regression metadata & feature columns
│   ├── classification_meta.joblib              # Classification metadata & threshold
│   └── scaler.joblib                           # StandardScaler artifact
├── reports/
│   ├── data_quality_report.md                  # Data quality audit report
│   ├── synthetic_data_audit.md                 # Synthetic dataset audit report
│   ├── feature_audit.md                        # Feature availability & leakage audit
│   ├── final_model_evaluation.md               # Final regression & classification report
│   ├── model_comparison.csv                    # Evaluation comparison matrix
│   └── feature_importance.png                  # Production feature importance visualization
└── README.md                                   # Project documentation
```

---

## 3. Evaluation Summary Tables

### Regression (Next Quiz Score Percentage)
| Strategy | Split | Samples | MAE (%) | RMSE (%) | R² |
| :--- | :--- | ---: | ---: | ---: | ---: |
| **GroupKFold CV** | 5-fold by user | 571 | 4.890 ± 0.241 | 6.018 ± 0.371 | 0.8243 ± 0.0222 |
| **Unseen-user** | 25% user holdout | 154 | 4.890 | 6.018 | 0.8243 |
| **Temporal** | future attempt holdout | 195 | 5.412 | 6.698 | 0.7145 |

### Classification (Pass/Fail Prediction, Target >= 70%)
| Strategy | Split | Samples | Accuracy | Precision | Recall | F1 | ROC-AUC |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **GroupKFold CV** | 5-fold by user | 571 | 0.9041 ± 0.0361 | 0.9054 | 0.9310 | 0.9169 | 0.9617 |
| **Unseen-user** | 25% user holdout | 154 | 0.8896 | 0.9167 | 0.9252 | 0.9209 | 0.9570 |
| **Temporal** | future attempt holdout | 195 | 0.8359 | 0.9618 | 0.8235 | 0.8873 | 0.9350 |

---

## 4. API Endpoints
- `GET /ml/prediction?difficulty=Medium` — Returns score regression forecast.
- `GET /ml/pass-prediction?difficulty=Medium` — Returns pass/fail classification probability.
- Both endpoints require JWT Authentication and enforce strict user data isolation (`current_user.id`).
