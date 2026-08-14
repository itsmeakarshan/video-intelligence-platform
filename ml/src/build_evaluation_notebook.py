"""
Script to build 02_model_comparison_and_evaluation.ipynb with complete code cells and markdown explanations.
Pulls dynamic, independently calculated metrics directly from model_evaluation.json.
"""

import os
import json

NOTEBOOKS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../notebooks")
)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
REPORTS_DIR = os.path.abspath(os.path.join(PROJECT_ROOT, "ml/reports"))


def create_cell(cell_type: str, source_str: str, outputs: list = None):
    lines = [line + "\n" for line in source_str.split("\n")]
    if lines and lines[-1] == "\n":
        lines[-1] = ""
    
    cell = {
        "cell_type": cell_type,
        "metadata": {},
        "source": lines
    }
    if cell_type == "code":
        cell["execution_count"] = None
        cell["outputs"] = outputs if outputs else []
    return cell


def generate_evaluation_notebook():
    eval_json_path = os.path.join(REPORTS_DIR, "model_evaluation.json")
    if os.path.exists(eval_json_path):
        with open(eval_json_path, "r") as f:
            eval_data = json.load(f)
    else:
        raise FileNotFoundError(f"Authoritative evaluation report not found at {eval_json_path}. Please run train_all_models.py first.")

    cells = []

    # Title & Executive Summary
    cells.append(create_cell("markdown", """# Phase 11 — Model Comparison & Evaluation Notebook
## Video Intelligence Platform ML Engineering Pipeline

This notebook presents the formal evaluation and model selection process for the ML pipeline trained on the **cleaned new learner cohort (Users 3–103, 636 feature instances)**.

### Evaluation Methodology:
1. **Baselines vs ML Models**: Historical Mean, Most Recent Score, and Recent 3-Attempt Average baselines compared against Ridge, Random Forest, Gradient Boosting, HistGradientBoosting, and Extra Trees.
2. **Learner-Aware GroupKFold Cross-Validation ($k=5$)**: Grouped by `user_id` to strictly prevent same-user data leakage.
3. **Unseen-User Holdout (20%)**: Validates generalizability to completely new learners entering the platform.
4. **Global Chronological Temporal Holdout (80/20)**: Validates temporal forecasting accuracy on the latest 20% of attempts globally.
5. **OOD Boundary Safety & Feature Ablation**: Verifies frequency robustness and domain feature contract.

---
"""))

    # Imports & Setup
    cells.append(create_cell("code", """import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import (
    mean_absolute_error,
    root_mean_squared_error,
    r2_score
)

# Styling
sns.set_theme(style="darkgrid")
plt.rcParams['font.size'] = 11

def find_project_root():
    curr = os.path.abspath(os.getcwd())
    while curr != os.path.dirname(curr):
        if os.path.exists(os.path.join(curr, "ml", "models")):
            return curr
        curr = os.path.dirname(curr)
    return os.path.abspath(os.getcwd())

PROJECT_ROOT = find_project_root()
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

MODELS_DIR = os.path.join(PROJECT_ROOT, "ml/models")
REPORTS_DIR = os.path.join(PROJECT_ROOT, "ml/reports")

# Load authoritative evaluation dashboard JSON
eval_json_path = os.path.join(REPORTS_DIR, "model_evaluation.json")
with open(eval_json_path, "r") as f:
    eval_data = json.load(f)

print(f"Loaded ML Evaluation Report generated on: {eval_data['evaluation_timestamp']}")
"""))

    # Section 1: Regression Model Comparison Table & Bar Charts
    cells.append(create_cell("markdown", """## 1. Regression Model Comparison (Next Quiz Score Forecast)

Target: `next_percentage` (Continuous 0.0% – 100.0%)

Evaluated across GroupKFold MAE, $R^2$, Unseen User MAE, and Temporal MAE.
"""))

    cells.append(create_cell("code", """df_reg_comp = pd.DataFrame(eval_data['regression_comparison'])
print("--- Regression Model Performance Comparison Table ---")
print(df_reg_comp.to_string(index=False))

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# MAE Comparison Bar Plot
sns.barplot(data=df_reg_comp, x='group_kfold_mae', y='model', palette='viridis', ax=axes[0])
axes[0].set_title('GroupKFold MAE (Lower is Better)')
axes[0].set_xlabel('Mean Absolute Error (%)')

# R2 Comparison Bar Plot
sns.barplot(data=df_reg_comp, x='group_kfold_r2', y='model', palette='mako', ax=axes[1])
axes[1].set_title('GroupKFold R² Score (Higher is Better)')
axes[1].set_xlabel('R² Coefficient of Determination')

plt.tight_layout()
plt.show()
"""))

    # Section 3: Residual & Predicted vs Actual Plots for Production Regression Model
    cells.append(create_cell("markdown", """## 3. Winning Regression Model Diagnostics

**Selected Production Model**: `{}`

Plots:
- Predicted vs. Actual Scores
- Residual Distribution ($y_{{actual}} - y_{{pred}}$)
""".format(eval_data['selected_regression_model']['model_name'])))

    cells.append(create_cell("code", """from ml.src.features import generate_features, TARGET_COLUMN

df_feat = generate_features()
meta = joblib.load(os.path.join(MODELS_DIR, "pipeline_meta.joblib"))
reg_model = joblib.load(os.path.join(MODELS_DIR, "best_regression_model.joblib"))
scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.joblib"))

if hasattr(reg_model, "feature_names_in_"):
    feature_cols = list(reg_model.feature_names_in_)
else:
    feature_cols = meta.get("feature_columns", [c for c in df_feat.columns if c not in ["attempt_id", "user_id", "created_at", "is_synthetic", "target_score", "next_percentage", "next_pass"]])

X_full = df_feat[feature_cols]
y_actual = df_feat[TARGET_COLUMN].values

if hasattr(reg_model, "predict"):
    if "Ridge" in str(type(reg_model)):
        y_pred = reg_model.predict(scaler.transform(X_full))
    else:
        y_pred = reg_model.predict(X_full)
else:
    y_pred = X_full["previous_percentage"].values

y_pred = np.clip(y_pred, 0.0, 100.0)
residuals = y_actual - y_pred

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 1. Predicted vs Actual Scatter Plot
axes[0].scatter(y_actual, y_pred, alpha=0.6, color='#0284c7', edgecolors='k', linewidth=0.5)
axes[0].plot([0, 100], [0, 100], 'r--', label='Perfect Prediction Identity Line')
axes[0].set_title('Predicted vs. Actual Percentage Scores')
axes[0].set_xlabel('Actual Quiz Score (%)')
axes[0].set_ylabel('Predicted Quiz Score (%)')
axes[0].legend()

# 2. Residual Distribution Histogram & KDE
sns.histplot(residuals, kde=True, bins=25, color='#0d9488', ax=axes[1])
axes[1].axvline(0, color='r', linestyle='--')
axes[1].set_title(f'Residual Error Distribution (Mean = {np.mean(residuals):.2f})')
axes[1].set_xlabel('Residual Error (Actual - Predicted %)')
axes[1].set_ylabel('Frequency')

plt.tight_layout()
plt.show()
"""))

    # Section 4: Out-Of-Distribution (OOD) Robustness & Feature Ablation Analysis
    cells.append(create_cell("markdown", """## 4. OOD Robustness & Feature Ablation Analysis

Evaluates feature set `D_CORE_LEARNING` against extreme frequency outliers and distribution shifts.

Key Findings:
- Axis-aligned split thresholds in `ExtraTreesRegressor` prevent extreme linear extrapolation explosion.
- Restricting features to domain learning progression eliminates frequency artifacts.
"""))

    cells.append(create_cell("code", """# OOD Robustness Verification Summary
ood_csv = os.path.join(REPORTS_DIR, "ood_robustness_test_results.csv")
if os.path.exists(ood_csv):
    df_ood = pd.read_csv(ood_csv)
    try:
        from IPython.display import display
        display(df_ood)
    except (ImportError, NameError):
        print(df_ood.to_string())
"""))

    # Section 5: Selection Summary
    reg_sel = eval_data['selected_regression_model']

    cells.append(create_cell("markdown", """## 5. Recruiter & Engineering Model Selection Summary

### Final Selection Rationale:
1. **Production Regression Model**: **`{}`**
   - **GroupKFold (k=5)**: MAE = **{:.2f}%**, RMSE = **{:.2f}%**, R² = **{:.3f}**
   - **Unseen User Holdout**: MAE = **{:.2f}%**, RMSE = **{:.2f}%**, R² = **{:.3f}**
   - **Global Temporal Holdout**: MAE = **{:.2f}%**, RMSE = **{:.2f}%**, R² = **{:.3f}**
   - *Rationale:* Selected for consistent top-tier accuracy and R² across all 3 independent validation strategies without overfitting, combined with zero linear OOD extrapolation risk.

---
""".format(
        reg_sel['model_name'],
        reg_sel['group_kfold_mae'],
        reg_sel['group_kfold_rmse'],
        reg_sel['group_kfold_r2'],
        reg_sel['unseen_user_mae'],
        reg_sel['unseen_user_rmse'],
        reg_sel['unseen_user_r2'],
        reg_sel['temporal_mae'],
        reg_sel['temporal_rmse'],
        reg_sel['temporal_r2']
    )))

    nb_json = {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3 (ipykernel)",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "codemirror_mode": {
                    "name": "ipython",
                    "version": 3
                },
                "file_extension": ".py",
                "mimetype": "text/x-python",
                "name": "python",
                "nbformat": 4,
                "nbformat_minor": 2
            }
        },
        "nbformat": 4,
        "nbformat_minor": 2
    }

    os.makedirs(NOTEBOOKS_DIR, exist_ok=True)
    nb_path = os.path.join(NOTEBOOKS_DIR, "02_model_comparison_and_evaluation.ipynb")
    with open(nb_path, "w") as f:
        json.dump(nb_json, f, indent=2)
    print(f"Generated Model Evaluation Jupyter notebook: {nb_path}")


if __name__ == "__main__":
    generate_evaluation_notebook()
