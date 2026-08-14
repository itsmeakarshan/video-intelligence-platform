# Final Machine Learning System Evaluation Report (`ml/reports/final_model_evaluation.md`)

## 1. Executive Summary & Dataset Disclosure
- **Platform Component:** Video Intelligence Platform Machine Learning System.
- **Core Purpose:** Predict the learner's next quiz score percentage from historical performance data.
- **Authoritative Production Model:** `ExtraTreesRegressor_v4.0`.
- **Feature Contract:** `D_CORE_LEARNING` (38 leak-free domain learning features).
- **Clean Learners Cohort:** 95 clean learners (Users 3–103; Users 1 and 2 excluded).
- **Total Quiz Attempt Records:** 636 leak-free modeling instances.
- **Outlier & OOD Policy:** Axis-aligned decision boundaries prevent linear extrapolation explosion on extreme frequency outliers.

---

## 2. Regression Task — Next Quiz Score Percentage Prediction

Target variable: `next_percentage` (Float, 0.0% – 100.0%).
Production Model: **ExtraTreesRegressor_v4.0** (`ExtraTreesRegressor(n_estimators=100, max_depth=6, random_state=42)`).

### Regression Evaluation Summary Table

| Strategy | Split | Samples | MAE (%) | RMSE (%) | R² |
| :--- | :--- | ---: | ---: | ---: | ---: |
| **GroupKFold CV** | 5-fold by user | 636 | 3.80 | 4.96 | 0.861 |
| **Unseen-user** | 20% user holdout | 128 | 3.13 | 3.89 | 0.912 |
| **Temporal** | 80/20 chronological | 127 | 3.60 | 4.57 | 0.908 |

*Baseline Comparison:* Simple Historical Average Baseline achieved GroupKFold CV MAE of 9.31% and $R^2$ of 0.277. The ExtraTreesRegressor model achieves a net improvement of **-5.51% MAE** and **+0.584 $R^2$**.

---

## 3. Top Predictive Features (Feature Importance)
1. **`overall_previous_avg`** — Cumulative historical quiz average percentage.
2. **`previous_percentage`** — Immediate prior score percentage.
3. **`previous_2_attempt_avg`** — Short-term moving average.
4. **`recent_score_trend`** — Score delta between attempt $N-1$ and $N-2$.
5. **`attempt_order_by_user`** — Learner tenure and attempt sequence order.

---

## 4. Summary Statement

> *"Architected a leakage-safe Extra Trees regression pipeline (`ExtraTreesRegressor_v4.0`) to forecast future learner quiz scores on a video-intelligence platform, achieving a GroupKFold MAE of 3.80%, Unseen-User MAE of 3.13%, and R² of 0.861 across 38 domain learning features."*
