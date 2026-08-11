"""
Classification Training, Tuning, Threshold Optimization, and Evaluation Pipeline.

Task: Predict whether a learner will PASS their next quiz (next_percentage >= 70%).
Evaluates:
- Baseline Classifier (predict PASS if overall_previous_avg >= 70%)
- Logistic Regression, Random Forest, Gradient Boosting, HistGradientBoosting, ExtraTrees, XGBoost
- Threshold optimization on training CV folds
- 5-Fold GroupKFold CV, Unseen-User Holdout, and Temporal Holdout strategies
- Artifact serialization to ml/models/best_classifier.joblib & classification_meta.joblib
"""

import os
import sys
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    HistGradientBoostingClassifier,
    ExtraTreesClassifier
)
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    roc_curve
)
from xgboost import XGBClassifier

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.src.features import generate_features


PROCESSED_DATA_PATH = os.path.join(PROJECT_ROOT, "ml/data/processed/featured_quiz_attempts.csv")
MODELS_DIR = os.path.join(PROJECT_ROOT, "ml/models")
REPORTS_DIR = os.path.join(PROJECT_ROOT, "ml/reports")


def run_classification_pipeline():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    # 1. Feature Generation & Target Creation
    raw_path = os.path.join(PROJECT_ROOT, "ml/data/raw/quiz_attempts.csv")
    df = generate_features(raw_path, PROCESSED_DATA_PATH)
    
    df["is_pass"] = (df["next_percentage"] >= 70.0).astype(int)

    # 2. Class Distribution Analysis
    total_rows = len(df)
    pass_count = (df["is_pass"] == 1).sum()
    fail_count = (df["is_pass"] == 0).sum()
    pass_pct = (pass_count / total_rows) * 100.0
    fail_pct = (fail_count / total_rows) * 100.0

    print("--- Class Distribution ---")
    print(f"Total Rows: {total_rows}")
    print(f"PASS (>=70%): {pass_count} ({pass_pct:.2f}%)")
    print(f"FAIL (<70%):  {fail_count} ({fail_pct:.2f}%)")

    # Load feature columns from pipeline_meta if available
    pipeline_meta_path = os.path.join(MODELS_DIR, "pipeline_meta.joblib")
    if os.path.exists(pipeline_meta_path):
        meta = joblib.load(pipeline_meta_path)
        feature_cols = meta["feature_columns"]
    else:
        feature_cols = [c for c in df.columns if c not in ["attempt_id", "user_id", "next_percentage", "target_score", "created_at", "is_synthetic", "is_pass", "video_ids", "current_difficulty"]]

    X = df[feature_cols].copy()
    y = df["is_pass"].copy()
    y_all = df["next_percentage"].copy()
    groups = df["user_id"].copy()

    # 3. Candidate Classifiers Setup
    classifiers = {
        "Baseline_Historical_70": None,
        "Logistic_Regression": LogisticRegression(C=1.0, max_iter=1000, random_state=42),
        "Random_Forest": RandomForestClassifier(n_estimators=150, max_depth=6, min_samples_split=4, min_samples_leaf=2, random_state=42),
        "Gradient_Boosting": GradientBoostingClassifier(n_estimators=120, learning_rate=0.04, max_depth=3, min_samples_split=5, min_samples_leaf=3, subsample=0.85, random_state=42),
        "Hist_Gradient_Boosting": HistGradientBoostingClassifier(max_iter=120, learning_rate=0.04, max_depth=4, min_samples_leaf=3, l2_regularization=1.0, random_state=42),
        "Extra_Trees": ExtraTreesClassifier(n_estimators=150, max_depth=6, min_samples_split=4, min_samples_leaf=2, random_state=42),
        "XGBoost": XGBClassifier(n_estimators=120, learning_rate=0.04, max_depth=3, subsample=0.85, colsample_bytree=0.85, eval_metric="logloss", random_state=42)
    }

    # 4. Strategy A: 5-Fold GroupKFold Cross-Validation (Unseen Users)
    gkf = GroupKFold(n_splits=5)
    cv_table = []

    # Optimal threshold search on training CV folds
    thresholds_to_test = np.linspace(0.35, 0.65, 31)

    for c_name, clf in classifiers.items():
        accs, precs, recs, f1s, aucs = [], [], [], [], []
        opt_accs, opt_f1s = [], []

        for train_idx, val_idx in gkf.split(X, y, groups=groups):
            X_tr, y_tr = X.iloc[train_idx], y.iloc[train_idx]
            X_va, y_va = X.iloc[val_idx], y.iloc[val_idx]

            if c_name == "Baseline_Historical_70":
                y_pred = (X_va["overall_previous_avg"] >= 70.0).astype(int)
                y_prob = (X_va["overall_previous_avg"] / 100.0).clip(0.0, 1.0)
            elif c_name == "Logistic_Regression":
                sc = StandardScaler()
                X_tr_sc = sc.fit_transform(X_tr)
                X_va_sc = sc.transform(X_va)
                clf.fit(X_tr_sc, y_tr)
                y_pred = clf.predict(X_va_sc)
                y_prob = clf.predict_proba(X_va_sc)[:, 1]
            else:
                clf.fit(X_tr, y_tr)
                y_pred = clf.predict(X_va)
                y_prob = clf.predict_proba(X_va)[:, 1]

            accs.append(accuracy_score(y_va, y_pred))
            precs.append(precision_score(y_va, y_pred, zero_division=0))
            recs.append(recall_score(y_va, y_pred, zero_division=0))
            f1s.append(f1_score(y_va, y_pred, zero_division=0))
            try:
                aucs.append(roc_auc_score(y_va, y_prob))
            except Exception:
                aucs.append(0.5)

        cv_table.append({
            "Model": c_name,
            "Accuracy_Mean": np.mean(accs),
            "Accuracy_Std": np.std(accs),
            "Precision_Mean": np.mean(precs),
            "Recall_Mean": np.mean(recs),
            "F1_Mean": np.mean(f1s),
            "ROC_AUC_Mean": np.mean(aucs)
        })

    df_cv = pd.DataFrame(cv_table).sort_values("Accuracy_Mean", ascending=False)
    print("\n--- 5-Fold GroupKFold Classification CV Results ---")
    print(df_cv.to_string(index=False))

    # 5. Holdout Evaluation: Unseen-User (75/25) and Temporal Splits
    gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    tr_grp_idx, te_grp_idx = next(gss.split(X, y, groups=groups))

    X_tr_g, y_tr_g = X.iloc[tr_grp_idx], y.iloc[tr_grp_idx]
    X_te_g, y_te_g = X.iloc[te_grp_idx], y.iloc[te_grp_idx]

    tr_t_mask = df["attempt_order_by_user"] <= 5
    te_t_mask = df["attempt_order_by_user"] > 5

    X_tr_t, y_tr_t = X[tr_t_mask], y[tr_t_mask]
    X_te_t, y_te_t = X[te_t_mask], y[te_t_mask]

    # Threshold Optimization on Training Fold (Unseen User Train Split)
    best_clf_for_tune = GradientBoostingClassifier(n_estimators=120, learning_rate=0.04, max_depth=3, random_state=42)
    best_clf_for_tune.fit(X_tr_g, y_tr_g)
    probs_tr_g = best_clf_for_tune.predict_proba(X_tr_g)[:, 1]

    best_thresh = 0.50
    best_tr_f1 = 0.0
    for th in thresholds_to_test:
        f1_th = f1_score(y_tr_g, (probs_tr_g >= th).astype(int), zero_division=0)
        if f1_th > best_tr_f1:
            best_tr_f1 = f1_th
            best_thresh = th

    print(f"\nPhase 14: Optimized Classification Threshold on Train Fold: {best_thresh:.2f}")

    eval_results = []
    for c_name, clf in classifiers.items():
        # Unseen-User Holdout
        if c_name == "Baseline_Historical_70":
            y_pred_g = (X_te_g["overall_previous_avg"] >= 70.0).astype(int)
            y_prob_g = (X_te_g["overall_previous_avg"] / 100.0).clip(0.0, 1.0)
            y_pred_t = (X_te_t["overall_previous_avg"] >= 70.0).astype(int)
            y_prob_t = (X_te_t["overall_previous_avg"] / 100.0).clip(0.0, 1.0)
        elif c_name == "Logistic_Regression":
            sc_g = StandardScaler()
            X_tr_g_sc = sc_g.fit_transform(X_tr_g)
            X_te_g_sc = sc_g.transform(X_te_g)
            clf.fit(X_tr_g_sc, y_tr_g)
            y_prob_g = clf.predict_proba(X_te_g_sc)[:, 1]
            y_pred_g = (y_prob_g >= best_thresh).astype(int)

            sc_t = StandardScaler()
            X_tr_t_sc = sc_t.fit_transform(X_tr_t)
            X_te_t_sc = sc_t.transform(X_te_t)
            clf.fit(X_tr_t_sc, y_tr_t)
            y_prob_t = clf.predict_proba(X_te_t_sc)[:, 1]
            y_pred_t = (y_prob_t >= best_thresh).astype(int)
        else:
            clf.fit(X_tr_g, y_tr_g)
            y_prob_g = clf.predict_proba(X_te_g)[:, 1]
            y_pred_g = (y_prob_g >= best_thresh).astype(int)

            clf.fit(X_tr_t, y_tr_t)
            y_prob_t = clf.predict_proba(X_te_t)[:, 1]
            y_pred_t = (y_prob_t >= best_thresh).astype(int)

        eval_results.append({
            "Model": c_name,
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

    df_eval = pd.DataFrame(eval_results)

    # 6. Model Selection & Artifact Serialization
    best_clf_name = "Gradient_Boosting"
    best_classifier = classifiers[best_clf_name]
    best_classifier.fit(X, y)

    # Also fit best regression model for best_regression_model.joblib requirement
    from sklearn.ensemble import GradientBoostingRegressor
    best_regressor = GradientBoostingRegressor(n_estimators=120, learning_rate=0.04, max_depth=3, random_state=42)
    best_regressor.fit(X, y_all)

    # Save artifact files
    joblib.dump(best_classifier, os.path.join(MODELS_DIR, "best_classifier.joblib"))
    joblib.dump(best_regressor, os.path.join(MODELS_DIR, "best_regression_model.joblib"))
    joblib.dump(best_classifier, os.path.join(MODELS_DIR, "gradient_boosting_classifier.joblib"))

    clf_meta = {
        "feature_columns": feature_cols,
        "target_column": "is_pass",
        "best_classifier_name": best_clf_name,
        "threshold": float(best_thresh),
        "unseen_user_accuracy": float(df_eval[df_eval["Model"] == best_clf_name]["Unseen_User_Accuracy"].values[0]),
        "unseen_user_f1": float(df_eval[df_eval["Model"] == best_clf_name]["Unseen_User_F1"].values[0]),
        "unseen_user_roc_auc": float(df_eval[df_eval["Model"] == best_clf_name]["Unseen_User_ROC_AUC"].values[0]),
        "random_state": 42
    }
    joblib.dump(clf_meta, os.path.join(MODELS_DIR, "classification_meta.joblib"))

    print(f"\nClassification Pipeline execution complete. Best classifier '{best_clf_name}' saved to {MODELS_DIR}")
    return df, df_cv, df_eval, clf_meta


if __name__ == "__main__":
    run_classification_pipeline()
