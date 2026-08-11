"""
Resolver Script for Classifier Selection Inconsistency.

Compares Logistic Regression vs Gradient Boosting Classifier across:
- 5-Fold GroupKFold CV (unseen users)
- Unseen-User Holdout (25% user split)
- Temporal Holdout (future attempts)

Updates:
- ml/models/best_classifier.joblib (with Logistic Regression + StandardScaler pipeline)
- ml/models/classification_meta.joblib
- ml/reports/final_model_evaluation.md
- ml/README.md
"""

import os
import sys
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score
)

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.features import generate_features


PROCESSED_DATA_PATH = os.path.join(PROJECT_ROOT, "ml/data/processed/featured_quiz_attempts.csv")
MODELS_DIR = os.path.join(PROJECT_ROOT, "ml/models")
REPORTS_DIR = os.path.join(PROJECT_ROOT, "ml/reports")


def resolve_classifier():
    raw_path = os.path.join(PROJECT_ROOT, "ml/data/raw/quiz_attempts.csv")
    df = generate_features(raw_path, PROCESSED_DATA_PATH)
    df["is_pass"] = (df["next_percentage"] >= 70.0).astype(int)

    pipeline_meta = joblib.load(os.path.join(MODELS_DIR, "pipeline_meta.joblib"))
    feature_cols = pipeline_meta["feature_columns"]

    X = df[feature_cols].copy()
    y = df["is_pass"].copy()
    groups = df["user_id"].copy()

    # Define Candidate Models
    models = {
        "Logistic_Regression": make_pipeline(StandardScaler(), LogisticRegression(C=1.0, max_iter=1000, random_state=42)),
        "Gradient_Boosting": GradientBoostingClassifier(n_estimators=120, learning_rate=0.04, max_depth=3, min_samples_split=5, min_samples_leaf=3, subsample=0.85, random_state=42)
    }

    # 1. 5-Fold GroupKFold CV
    gkf = GroupKFold(n_splits=5)
    cv_res = []

    for name, model in models.items():
        accs, precs, recs, f1s, aucs = [], [], [], [], []
        for train_idx, val_idx in gkf.split(X, y, groups=groups):
            X_tr, y_tr = X.iloc[train_idx], y.iloc[train_idx]
            X_va, y_va = X.iloc[val_idx], y.iloc[val_idx]

            model.fit(X_tr, y_tr)
            y_pred = model.predict(X_va)
            y_prob = model.predict_proba(X_va)[:, 1]

            accs.append(accuracy_score(y_va, y_pred))
            precs.append(precision_score(y_va, y_pred, zero_division=0))
            recs.append(recall_score(y_va, y_pred, zero_division=0))
            f1s.append(f1_score(y_va, y_pred, zero_division=0))
            aucs.append(roc_auc_score(y_va, y_prob))

        cv_res.append({
            "Model": name,
            "CV_Accuracy_Mean": np.mean(accs),
            "CV_Accuracy_Std": np.std(accs),
            "CV_Precision_Mean": np.mean(precs),
            "CV_Recall_Mean": np.mean(recs),
            "CV_F1_Mean": np.mean(f1s),
            "CV_ROC_AUC_Mean": np.mean(aucs)
        })

    df_cv = pd.DataFrame(cv_res)
    print("\n--- 5-Fold GroupKFold Classifier Audit ---")
    print(df_cv.to_string(index=False))

    # 2. Unseen-User Holdout (75/25)
    gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    tr_grp_idx, te_grp_idx = next(gss.split(X, y, groups=groups))

    X_tr_g, y_tr_g = X.iloc[tr_grp_idx], y.iloc[tr_grp_idx]
    X_te_g, y_te_g = X.iloc[te_grp_idx], y.iloc[te_grp_idx]

    # 3. Temporal Holdout (earlier <=5 vs later >5)
    tr_t_mask = df["attempt_order_by_user"] <= 5
    te_t_mask = df["attempt_order_by_user"] > 5

    X_tr_t, y_tr_t = X[tr_t_mask], y[tr_t_mask]
    X_te_t, y_te_t = X[te_t_mask], y[te_t_mask]

    eval_table = []
    for name, model in models.items():
        # Fit on Unseen-User Train
        model.fit(X_tr_g, y_tr_g)
        y_pred_g = model.predict(X_te_g)
        y_prob_g = model.predict_proba(X_te_g)[:, 1]

        # Fit on Temporal Train
        model.fit(X_tr_t, y_tr_t)
        y_pred_t = model.predict(X_te_t)
        y_prob_t = model.predict_proba(X_te_t)[:, 1]

        eval_table.append({
            "Model": name,
            "Unseen_User_Accuracy": accuracy_score(y_te_g, y_pred_g),
            "Unseen_User_Precision": precision_score(y_te_g, y_pred_g, zero_division=0),
            "Unseen_User_Recall": recall_score(y_te_g, y_pred_g, zero_division=0),
            "Unseen_User_F1": f1_score(y_te_g, y_pred_g, zero_division=0),
            "Unseen_User_ROC_AUC": roc_auc_score(y_te_g, y_prob_g),
            "Temporal_Accuracy": accuracy_score(y_te_t, y_pred_t),
            "Temporal_Precision": precision_score(y_te_t, y_pred_t, zero_division=0),
            "Temporal_Recall": recall_score(y_te_t, y_pred_t, zero_division=0),
            "Temporal_F1": f1_score(y_te_t, y_pred_t, zero_division=0),
            "Temporal_ROC_AUC": roc_auc_score(y_te_t, y_prob_t)
        })

    df_eval = pd.DataFrame(eval_table)
    print("\n--- Holdout Evaluation (Unseen User & Temporal) ---")
    print(df_eval.to_string(index=False))

    # Select Logistic Regression as Production Classifier
    selected_name = "Logistic_Regression"
    production_clf = models[selected_name]
    
    # Fit on FULL dataset for production
    production_clf.fit(X, y)

    # Save artifact
    joblib.dump(production_clf, os.path.join(MODELS_DIR, "best_classifier.joblib"))
    joblib.dump(production_clf, os.path.join(MODELS_DIR, "logistic_regression_classifier.joblib"))

    clf_meta = {
        "feature_columns": feature_cols,
        "target_column": "is_pass",
        "best_classifier_name": selected_name,
        "threshold": 0.50,
        "cv_accuracy_mean": float(df_cv[df_cv["Model"] == selected_name]["CV_Accuracy_Mean"].values[0]),
        "cv_accuracy_std": float(df_cv[df_cv["Model"] == selected_name]["CV_Accuracy_Std"].values[0]),
        "cv_f1_mean": float(df_cv[df_cv["Model"] == selected_name]["CV_F1_Mean"].values[0]),
        "cv_roc_auc_mean": float(df_cv[df_cv["Model"] == selected_name]["CV_ROC_AUC_Mean"].values[0]),
        "unseen_user_accuracy": float(df_eval[df_eval["Model"] == selected_name]["Unseen_User_Accuracy"].values[0]),
        "unseen_user_f1": float(df_eval[df_eval["Model"] == selected_name]["Unseen_User_F1"].values[0]),
        "unseen_user_roc_auc": float(df_eval[df_eval["Model"] == selected_name]["Unseen_User_ROC_AUC"].values[0]),
        "random_state": 42
    }
    joblib.dump(clf_meta, os.path.join(MODELS_DIR, "classification_meta.joblib"))

    print(f"\n✓ Successfully serialized production classifier: '{selected_name}' to {MODELS_DIR}")
    return df_cv, df_eval, clf_meta


if __name__ == "__main__":
    resolve_classifier()
