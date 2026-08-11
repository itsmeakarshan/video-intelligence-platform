# Final Machine Learning System Evaluation Report (`ml/reports/final_model_evaluation.md`)

## 1. Executive Summary & Dataset Disclosure
- **Platform Component:** Video Intelligence Platform Machine Learning System.
- **Dataset Context:** Synthetic development dataset created for multi-user pilot testing (Users 3–103).
- **Users 1 & 2 Excluded:** Confirmed 0 attempts from Users 1 & 2 in training dataset.
- **Total Users Evaluated:** 95 users.
- **Usable Supervised Instances:** 636 attempts (for attempt $N \ge 2$). Attempt 1 records are reserved strictly as historical context to prevent leakage.

---

## 2. Regression Task — Next Quiz Score Percentage Prediction

Target variable: `next_percentage` (Float, 0.0% – 100.0%).
Selected Production Model: **Ridge Regression** (`Ridge(alpha=10.0, random_state=42)`).

### Regression Evaluation Summary Table

| Model | GroupKFold MAE (%) | GroupKFold R² | Unseen User MAE (%) | Unseen User R² | Temporal MAE (%) | Temporal R² |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Historical Mean Baseline** | 9.31 | 0.277 | 10.21 | 0.152 | 10.57 | 0.336 |
| **Most Recent Score Baseline** | 5.27 | 0.739 | 5.14 | 0.759 | 5.15 | 0.818 |
| **Recent 3-Attempt Avg Baseline** | 7.00 | 0.587 | 7.40 | 0.560 | 7.38 | 0.671 |
| **Ridge Regression** | 3.62 | 0.868 | 3.04 | 0.917 | 3.21 | 0.925 |
| **Random Forest Regressor** | 3.89 | 0.854 | 3.29 | 0.904 | 3.78 | 0.903 |
| **Gradient Boosting Regressor** | 3.85 | 0.855 | 3.23 | 0.908 | 3.67 | 0.908 |
| **HistGradientBoosting Regressor** | 3.84 | 0.855 | 3.22 | 0.906 | 3.76 | 0.906 |
| **Extra Trees Regressor** | 3.81 | 0.858 | 3.17 | 0.911 | 3.70 | 0.907 |

*Selection Rationale:* **Ridge Regression** achieved the most consistent out-of-sample performance across all 3 independent evaluation strategies without overfitting.

---

## 3. Classification Task — Next Quiz Pass/Fail Prediction

Target variable: `next_pass` = 1 if `next_percentage >= 70%` else 0.
Selected Production Model: **Extra Trees Classifier** (`ExtraTreesClassifier(n_estimators=100, max_depth=6, random_state=42)`).

### Classification Evaluation Summary Table

| Model | GroupKFold Acc | GroupKFold F1 | GroupKFold ROC-AUC | Brier Score | Unseen Acc | Unseen ROC-AUC | Temporal Acc | Temporal ROC-AUC |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Majority Class Baseline** | 0.745 | 0.000 | 0.500 | 0.2547 | 0.736 | 0.500 | 0.664 | 0.500 |
| **Historical Pass Rate Baseline** | 0.780 | 0.243 | 0.817 | 0.1671 | 0.767 | 0.836 | 0.742 | 0.888 |
| **Logistic Regression** | 0.910 | 0.819 | 0.964 | 0.0664 | 0.907 | 0.981 | 0.922 | 0.978 |
| **Calibrated Logistic Regression** | 0.901 | 0.794 | 0.964 | 0.0655 | 0.907 | 0.981 | 0.898 | 0.982 |
| **Random Forest Classifier** | 0.914 | 0.820 | 0.965 | 0.0650 | 0.938 | 0.979 | 0.938 | 0.972 |
| **Gradient Boosting Classifier** | 0.906 | 0.802 | 0.961 | 0.0717 | 0.938 | 0.981 | 0.906 | 0.966 |
| **Extra Trees Classifier** | 0.914 | 0.817 | 0.969 | 0.0626 | 0.922 | 0.982 | 0.922 | 0.982 |

*Selection Rationale:* **Extra Trees Classifier** achieved the top ROC-AUC (0.969) and best probability calibration (Brier Score: 0.0626).

---

## 4. Temporal Evaluation Methodology Disclosure

- **Strategy:** Global Chronological 80/20 Holdout.
- **Train Window:** 2026-03-03 23:14:09.067829 to 2026-07-12 00:14:09.067191 (508 attempts).
- **Test Window:** 2026-07-12 12:14:09.066732 to 2026-09-13 05:14:09.066066 (128 attempts).
- **Constraint Verified:** `max(train_timestamp)` < `min(test_timestamp)`.
- **Note on Learner History Sparsity:** Because learner trajectories vary in length, global temporal splitting places later attempts from earlier learners into the train set and early attempts from late-joining learners into the test set.

---

## 5. Verification Summary

- **Users 1 & 2 Excluded:** PASSED
- **Zero Target Leakage:** PASSED
- **Independent Evaluation Splits:** PASSED
