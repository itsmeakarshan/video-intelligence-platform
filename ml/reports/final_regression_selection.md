# Phase 6 — Production Model Selection & Feature Ablation Summary

**Selected Regressor:** `Extra Trees Regressor`
**Selected Feature Set:** `D_CORE_LEARNING` (38 domain features)
**Selected Classifier:** `Extra Trees Classifier`

### Scientific Selection Rationale:
1. **OOD Robustness:** Eliminates artificial linear extrapolation bug (+235 std dev frequency outlier in Ridge Regression caused raw predictions of +100.68%). Extra Trees Regressor evaluates axis-aligned split thresholds, yielding realistic score predictions.
2. **Feature Quality:** Removing test-execution velocity artifacts (`attempt_frequency`, `attempts_last_7d/14d/30d`, `avg_days_between`) isolates pure learner domain performance.
3. **Cross-Validation Accuracy:** GroupKFold MAE = 3.81%, Unseen User MAE = 3.17%, Temporal MAE = 3.70%.
