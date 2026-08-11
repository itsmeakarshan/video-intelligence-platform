# Model Evaluation & Comparison Report

## 1. Executive Summary
- **Primary Goal:** Predict a learner's future quiz percentage score (`next_percentage`).
- **Total Usable Supervised Instances:** 571 attempts across 94 users.
- **Evaluated Models:** Historical Average Baseline, Linear Regression (Ridge), Random Forest, Gradient Boosting, XGBoost.

---

## 2. Evaluation Strategies
1. **Temporal Evaluation (Within-User Future Attempts):**
   - **Training Set:** Attempts 2–5 per user (earlier chronological history, N = 376).
   - **Test Set:** Attempts >5 per user (later chronological history, N = 195).
   - **Purpose:** Answers "Can we predict future performance for learners we've already observed?"

2. **User/Group Evaluation (Generalization to Unseen Learners):**
   - **Training Set:** 75% of users (N = 417 attempts).
   - **Test Set:** 25% completely unseen users (N = 154 attempts).
   - **Purpose:** Answers "Can the model generalize to brand new learners joining the platform?"

---

## 3. Performance Metrics Comparison Table

```
                      Model       Evaluation_Strategy  Train_Size  Test_Size   MAE   RMSE     R2
Historical_Average_Baseline Temporal (Later Attempts)         376        195 9.314 11.068 0.2195
Historical_Average_Baseline User_Group (Unseen Users)         417        154 7.796  9.650 0.5449
          Linear_Regression Temporal (Later Attempts)         376        195 5.537  6.792 0.7061
          Linear_Regression User_Group (Unseen Users)         417        154 5.435  6.685 0.7816
              Random_Forest Temporal (Later Attempts)         376        195 6.268  7.486 0.6430
              Random_Forest User_Group (Unseen Users)         417        154 5.149  6.309 0.8055
          Gradient_Boosting Temporal (Later Attempts)         376        195 6.122  7.455 0.6460
          Gradient_Boosting User_Group (Unseen Users)         417        154 5.098  6.367 0.8019
                    XGBoost Temporal (Later Attempts)         376        195 6.183  7.427 0.6486
                    XGBoost User_Group (Unseen Users)         417        154 5.115  6.429 0.7980
```

---

- `previous_2_attempt_avg` (Importance: 0.6334)
- `previous_3_attempt_avg` (Importance: 0.2035)
- `overall_previous_avg` (Importance: 0.0454)
- `days_since_first_attempt` (Importance: 0.0237)
- `days_since_previous_attempt` (Importance: 0.0203)
