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
5. **Probability Calibration**: Brier Score, Log Loss, and reliability calibration curves for Pass/Fail probability estimation.

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
    r2_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    roc_curve,
    precision_recall_curve,
    brier_score_loss
)
from sklearn.calibration import calibration_curve

# Styling
sns.set_theme(style="darkgrid")
plt.rcParams['font.size'] = 11

PROJECT_ROOT = os.path.abspath(os.path.join(os.getcwd(), "../../"))
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

    # Section 2: Classification Model Comparison Table & Charts
    cells.append(create_cell("markdown", """## 2. Classification Model Comparison (Pass/Fail Probability $\\ge 70\\%$)

Target: `next_pass` (Binary: 1 if `next_percentage >= 70%` else 0)

Evaluated across Accuracy, F1 Score, ROC-AUC, and Brier Calibration Score.
"""))

    cells.append(create_cell("code", """df_clf_comp = pd.DataFrame(eval_data['classification_comparison'])
print("--- Classification Model Performance Comparison Table ---")
print(df_clf_comp.to_string(index=False))

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# ROC-AUC Comparison
sns.barplot(data=df_clf_comp, x='roc_auc', y='model', palette='magma', ax=axes[0])
axes[0].set_title('ROC-AUC Score (Higher is Better)')
axes[0].set_xlabel('Area Under ROC Curve')
axes[0].set_xlim(0.4, 1.0)

# Brier Calibration Score Comparison
sns.barplot(data=df_clf_comp, x='brier_score', y='model', palette='rocket_r', ax=axes[1])
axes[1].set_title('Brier Score / Probability Calibration (Lower is Better)')
axes[1].set_xlabel('Brier Score Loss')

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

    cells.append(create_cell("code", """from ml.src.features import generate_features, ALL_EXPANDED_FEATURE_COLUMNS, TARGET_COLUMN

df_feat = generate_features()
X_full = df_feat[ALL_EXPANDED_FEATURE_COLUMNS]
y_actual = df_feat[TARGET_COLUMN].values

# Load production regression model
reg_model = joblib.load(os.path.join(MODELS_DIR, "best_regression_model.joblib"))
scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.joblib"))

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

    # Section 4: ROC & PR Curves for Production Classifier
    cells.append(create_cell("markdown", """## 4. Winning Classifier Diagnostics & Calibration Curves

**Selected Production Classifier**: `{}`

Plots:
- ROC Curve & PR-AUC Curve
- Reliability Probability Calibration Curve
""".format(eval_data['selected_classification_model']['model_name'])))

    cells.append(create_cell("code", """y_clf_actual = df_feat["next_pass"].values

clf_model = joblib.load(os.path.join(MODELS_DIR, "best_classifier.joblib"))

if "Logistic" in str(type(clf_model)) or "Calibrated" in str(type(clf_model)):
    probs_pass = clf_model.predict_proba(scaler.transform(X_full))[:, 1]
else:
    probs_pass = clf_model.predict_proba(X_full)[:, 1]

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 1. ROC Curve
fpr, tpr, _ = roc_curve(y_clf_actual, probs_pass)
auc_val = roc_auc_score(y_clf_actual, probs_pass)
axes[0].plot(fpr, tpr, color='#2563eb', lw=2, label=f'ROC Curve (AUC = {auc_val:.3f})')
axes[0].plot([0, 1], [0, 1], 'k--', lw=1)
axes[0].set_title('Receiver Operating Characteristic (ROC) Curve')
axes[0].set_xlabel('False Positive Rate')
axes[0].set_ylabel('True Positive Rate')
axes[0].legend()

# 2. Reliability Calibration Curve
prob_true, prob_pred = calibration_curve(y_clf_actual, probs_pass, n_bins=8, strategy='uniform')
brier_val = brier_score_loss(y_clf_actual, probs_pass)

axes[1].plot(prob_pred, prob_true, "s-", color='#16a34a', label=f'Classifier Calibration (Brier = {brier_val:.4f})')
axes[1].plot([0, 1], [0, 1], "k:", label="Perfectly Calibrated")
axes[1].set_title('Probability Reliability Calibration Curve')
axes[1].set_xlabel('Mean Predicted Pass Probability')
axes[1].set_ylabel('Fraction of Positives')
axes[1].legend()

plt.tight_layout()
plt.show()
"""))

    # Section 5: Selection Summary
    reg_sel = eval_data['selected_regression_model']
    clf_sel = eval_data['selected_classification_model']

    cells.append(create_cell("markdown", """## 5. Recruiter & Engineering Model Selection Summary

### Final Selection Rationale:
1. **Regression Model**: **`{}`**
   - **GroupKFold (k=5)**: MAE = **{:.2f}%**, RMSE = **{:.2f}%**, R² = **{:.3f}**
   - **Unseen User Holdout**: MAE = **{:.2f}%**, RMSE = **{:.2f}%**, R² = **{:.3f}**
   - **Global Temporal Holdout**: MAE = **{:.2f}%**, RMSE = **{:.2f}%**, R² = **{:.3f}**
   - *Rationale:* Selected for consistent top-tier accuracy and R² across all 3 independent validation strategies without overfitting.

2. **Classification Model**: **`{}`**
   - **GroupKFold (k=5)**: Accuracy = **{:.1f}%**, F1 = **{:.3f}**, ROC-AUC = **{:.3f}**
   - **Unseen User Holdout**: Accuracy = **{:.1f}%**, ROC-AUC = **{:.3f}**
   - **Global Temporal Holdout**: Accuracy = **{:.1f}%**, ROC-AUC = **{:.3f}**
   - **Calibration**: Brier Score = **{:.4f}**
   - *Rationale:* Selected for top ROC-AUC score and calibrated pass-probability outputs for quiz results UI.

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
        reg_sel['temporal_r2'],
        clf_sel['model_name'],
        clf_sel['accuracy'] * 100,
        clf_sel['f1_score'],
        clf_sel['roc_auc'],
        eval_data['split_evaluations']['unseen_user_holdout']['classification']['accuracy'] * 100,
        eval_data['split_evaluations']['unseen_user_holdout']['classification']['roc_auc'],
        eval_data['split_evaluations']['temporal_holdout']['classification']['accuracy'] * 100,
        eval_data['split_evaluations']['temporal_holdout']['classification']['roc_auc'],
        clf_sel['brier_score']
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
