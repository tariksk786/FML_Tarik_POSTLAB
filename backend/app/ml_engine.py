"""
Machine Learning Engine for VehicleSense
Implements scikit-learn Pipeline (Median Imputation + StandardScaler + KNeighborsClassifier),
adaptive stratified cross-validation, exact neighbor extraction, zero-distance voting handling,
objective scaling comparison, and model persistence.
"""
import os
import time
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.model_selection import StratifiedKFold, train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report

from .schemas import (
    FEATURE_COLUMNS, CLASS_MAP, TrainConfigRequest, TrainResponse,
    PredictionResponse, NeighborDetail, CVPoint, PerClassMetric,
    ScalingComparisonResult, HeldOutExample
)

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
MODEL_FILE = os.path.join(MODELS_DIR, "active_model.joblib")


class MLEngine:
    def __init__(self):
        os.makedirs(MODELS_DIR, exist_ok=True)
        self.pipeline: Optional[Pipeline] = None
        self.unscaled_pipeline: Optional[Pipeline] = None
        self.config: Dict[str, Any] = {
            "k": 5,
            "metric": "euclidean",
            "weights": "uniform",
            "test_size": 0.20
        }
        self.dataset_fingerprint: str = ""
        self.train_df: Optional[pd.DataFrame] = None
        self.test_df: Optional[pd.DataFrame] = None
        self.train_indices: Optional[List[int]] = None
        self.test_indices: Optional[List[int]] = None
        self.ood_threshold: float = 5.0
        self.last_train_response: Optional[TrainResponse] = None
        self.classes: List[str] = list(CLASS_MAP.keys())

    def train_and_evaluate(
        self,
        df: pd.DataFrame,
        fingerprint: str,
        config: TrainConfigRequest
    ) -> TrainResponse:
        start_time = time.perf_counter()

        X = df[FEATURE_COLUMNS].copy()
        y = df["Class"].copy()

        # Check minimum class support
        class_counts = y.value_counts()
        min_class_count = class_counts.min()
        if min_class_count < 3:
            raise ValueError(
                f"Smallest class has only {min_class_count} samples. At least 3 samples per class are required."
            )

        # Stratified 80:20 Train / Test Split
        indices = np.arange(len(df))
        X_train, X_test, y_train, y_test, train_idx, test_idx = train_test_split(
            X, y, indices,
            test_size=config.test_size,
            stratify=y,
            random_state=42
        )

        n_train = len(X_train)
        train_class_counts = y_train.value_counts()
        min_train_class_count = train_class_counts.min()

        # Dynamic cross-validation folds adapted to smallest class
        n_splits = min(5, int(min_train_class_count))
        if n_splits < 2:
            n_splits = 2

        # Filter valid K values for cross validation (must not exceed single fold training size)
        fold_train_size = n_train - int(np.ceil(n_train / n_splits))
        candidate_ks = [1, 3, 5, 7, 9, 11, 15]
        valid_ks = [k for k in candidate_ks if k <= fold_train_size]
        if not valid_ks:
            valid_ks = [1]

        active_k = config.k
        if active_k > fold_train_size:
            active_k = max(valid_ks)

        # Build pipeline: SimpleImputer (median) -> StandardScaler -> KNeighborsClassifier
        metric_p = 1 if config.metric.lower() == "manhattan" else 2
        knn_estimator = KNeighborsClassifier(
            n_neighbors=active_k,
            weights=config.weights,
            metric=config.metric.lower(),
            p=metric_p
        )

        pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("knn", knn_estimator)
        ])

        # Stratified Cross-Validation on Training partition across valid K values
        cv_curve: List[CVPoint] = []
        cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)

        for k_val in valid_ks:
            fold_knn = KNeighborsClassifier(
                n_neighbors=k_val,
                weights=config.weights,
                metric=config.metric.lower(),
                p=metric_p
            )
            fold_pipe = Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
                ("knn", fold_knn)
            ])
            scores = cross_val_score(fold_pipe, X_train, y_train, cv=cv, scoring="accuracy")
            cv_curve.append(CVPoint(
                k=k_val,
                mean_cv_accuracy=round(float(np.mean(scores)), 4),
                std_cv_accuracy=round(float(np.std(scores)), 4)
            ))

        # Fit main pipeline exclusively on the 80% training set
        pipeline.fit(X_train, y_train)

        # Educational comparison: Scaled vs Unscaled KNN on identical training folds
        unscaled_pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("knn", KNeighborsClassifier(
                n_neighbors=active_k,
                weights=config.weights,
                metric=config.metric.lower(),
                p=metric_p
            ))
        ])
        unscaled_pipe.fit(X_train, y_train)

        scaled_cv_score = next(p.mean_cv_accuracy for p in cv_curve if p.k == active_k)
        unscaled_scores = cross_val_score(unscaled_pipe, X_train, y_train, cv=cv, scoring="accuracy")
        unscaled_cv_score = round(float(np.mean(unscaled_scores)), 4)
        observed_diff = round(scaled_cv_score - unscaled_cv_score, 4)

        scaling_expl = (
            f"At K={active_k} ({config.metric}), StandardScaler achieved {scaled_cv_score * 100:.1f}% CV accuracy "
            f"versus {unscaled_cv_score * 100:.1f}% unscaled (observed difference: {observed_diff * 100:+.1f}%). "
            f"Standardization prevents large-scale geometric features (such as Sc.Var.maxis) from artificially "
            f"dominating smaller ratio features (such as Max.L.Ra)."
        )

        # Held-out Test Set Evaluation (Unbiased final evaluation)
        y_test_pred = pipeline.predict(X_test)
        test_acc = round(float(accuracy_score(y_test, y_test_pred)), 4)
        macro_prec = round(float(precision_score(y_test, y_test_pred, average="macro", zero_division=0)), 4)
        macro_rec = round(float(recall_score(y_test, y_test_pred, average="macro", zero_division=0)), 4)
        macro_f1 = round(float(f1_score(y_test, y_test_pred, average="macro", zero_division=0)), 4)

        # Per-class metrics
        unique_labels = sorted(list(CLASS_MAP.keys()))
        rep = classification_report(y_test, y_test_pred, labels=unique_labels, output_dict=True, zero_division=0)
        per_class: List[PerClassMetric] = []
        for lbl in unique_labels:
            m = rep.get(lbl, {"precision": 0.0, "recall": 0.0, "f1-score": 0.0, "support": 0})
            per_class.append(PerClassMetric(
                class_name=lbl,
                display_name=CLASS_MAP[lbl],
                precision=round(float(m["precision"]), 4),
                recall=round(float(m["recall"]), 4),
                f1_score=round(float(m["f1-score"]), 4),
                support=int(m["support"])
            ))

        # Confusion Matrix
        cm = confusion_matrix(y_test, y_test_pred, labels=unique_labels).tolist()

        # Compute Baseline Training Neighbor Distances for OOD Heuristic
        # Exclude self by querying active_k + 1 neighbors and discarding self (distance 0)
        transformed_train = pipeline.named_steps["scaler"].transform(
            pipeline.named_steps["imputer"].transform(X_train)
        )
        fitted_knn = pipeline.named_steps["knn"]
        train_distances, _ = fitted_knn.kneighbors(transformed_train, n_neighbors=active_k + 1)
        # Exclude column 0 (self at distance ~0)
        other_distances = train_distances[:, 1:]
        mean_base_dist = float(np.mean(other_distances))
        std_base_dist = float(np.std(other_distances))
        self.ood_threshold = round(mean_base_dist + 3.0 * std_base_dist, 3)

        # Store state
        self.pipeline = pipeline
        self.unscaled_pipeline = unscaled_pipe
        self.config = {
            "k": active_k,
            "metric": config.metric.lower(),
            "weights": config.weights.lower(),
            "test_size": config.test_size
        }
        self.dataset_fingerprint = fingerprint
        self.train_df = df.iloc[train_idx].copy().reset_index(drop=True)
        self.test_df = df.iloc[test_idx].copy().reset_index(drop=True)
        self.train_indices = train_idx.tolist()
        self.test_indices = test_idx.tolist()

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        self.last_train_response = TrainResponse(
            status="success",
            train_samples=len(X_train),
            test_samples=len(X_test),
            cv_folds=n_splits,
            active_k=active_k,
            active_metric=config.metric,
            active_weights=config.weights,
            test_accuracy=test_acc,
            macro_precision=macro_prec,
            macro_recall=macro_rec,
            macro_f1=macro_f1,
            per_class_metrics=per_class,
            confusion_matrix=cm,
            class_labels=unique_labels,
            class_displays=[CLASS_MAP[l] for l in unique_labels],
            cv_curve=cv_curve,
            scaling_comparison=ScalingComparisonResult(
                k=active_k,
                metric=config.metric,
                scaled_cv_accuracy=scaled_cv_score,
                unscaled_cv_accuracy=unscaled_cv_score,
                observed_difference=observed_diff,
                explanation=scaling_expl
            ),
            training_latency_ms=elapsed_ms,
            dataset_fingerprint=fingerprint,
            ood_threshold=self.ood_threshold
        )

        # Persist model bundle
        self.save_model_bundle()

        return self.last_train_response

    def predict_sample(self, features_dict: Dict[str, Any], include_neighbors: bool = True) -> PredictionResponse:
        if self.pipeline is None or self.train_df is None:
            raise ValueError("No active model is trained. Please train the model first.")

        start_time = time.perf_counter()

        # Arrange features into DataFrame in exact column order
        input_data = {}
        for feat in FEATURE_COLUMNS:
            val = features_dict.get(feat, None)
            input_data[feat] = [np.nan if val is None else float(val)]
        input_df = pd.DataFrame(input_data)

        # Preprocess input using imputer + scaler
        imputer = self.pipeline.named_steps["imputer"]
        scaler = self.pipeline.named_steps["scaler"]
        knn = self.pipeline.named_steps["knn"]

        imputed_vec = imputer.transform(input_df)
        scaled_vec = scaler.transform(imputed_vec)

        # Retrieve K nearest neighbors from the training partition
        k = self.config["k"]
        weights_mode = self.config["weights"]
        distances, neighbor_indices = knn.kneighbors(scaled_vec, n_neighbors=k)
        
        dists = distances[0]
        n_idxs = neighbor_indices[0]

        # Zero-distance check: handle exact matches mathematically matching scikit-learn
        zero_mask = (dists <= 1e-12)
        has_zero_distance = bool(np.any(zero_mask))

        vote_weights: List[float] = []
        if weights_mode == "distance":
            if has_zero_distance:
                # If exact matches exist, scikit-learn gives weight only to the zero-distance neighbors, shared equally
                num_zeros = int(np.sum(zero_mask))
                for is_z in zero_mask:
                    vote_weights.append(1.0 / num_zeros if is_z else 0.0)
            else:
                # Standard distance weighting w_i = 1 / d_i
                inv_dists = 1.0 / dists
                sum_inv = float(np.sum(inv_dists))
                vote_weights = (inv_dists / sum_inv).tolist()
        else:
            # Uniform weighting
            vote_weights = [1.0 / k] * k

        # Aggregate votes per class
        class_vote_totals: Dict[str, float] = {c: 0.0 for c in CLASS_MAP.keys()}
        neighbor_details: List[NeighborDetail] = []

        for rank, (d, train_i, w) in enumerate(zip(dists, n_idxs, vote_weights), 1):
            train_row = self.train_df.iloc[train_i]
            cls = train_row["Class"]
            class_vote_totals[cls] += w

            feat_vals = {f: float(train_row[f]) for f in FEATURE_COLUMNS}
            neighbor_details.append(NeighborDetail(
                rank=rank,
                train_index=int(train_i),
                class_name=cls,
                display_name=CLASS_MAP[cls],
                distance=round(float(d), 4),
                vote_weight=round(float(w), 4),
                vote_share_pct=round(float(w * 100), 2),
                features=feat_vals
            ))

        # Model prediction using fitted pipeline
        predicted_class = str(self.pipeline.predict(input_df)[0])
        predicted_display = CLASS_MAP.get(predicted_class, predicted_class)

        # Vote shares in percentage
        total_weight = sum(class_vote_totals.values())
        if total_weight > 0:
            vote_shares = {c: round((v / total_weight) * 100, 2) for c, v in class_vote_totals.items()}
        else:
            vote_shares = {c: 0.0 for c in CLASS_MAP.keys()}

        # Explanation generation matching voting method
        counts_per_class = {}
        for nd in neighbor_details:
            counts_per_class[nd.display_name] = counts_per_class.get(nd.display_name, 0) + 1

        top_classes_summary = ", ".join(f"{count} {cls}" for cls, count in counts_per_class.items())

        if weights_mode == "uniform":
            expl = (
                f"Among the {k} nearest training examples ({top_classes_summary}), uniform voting assigns equal weight (1/{k}) to each neighbor. "
                f"{predicted_display} secured the majority vote share ({vote_shares[predicted_class]}%), leading to the classification."
            )
        else:
            if has_zero_distance:
                expl = (
                    f"An exact geometric match (distance = 0.0) was found in the training data. "
                    f"Under distance-weighted voting, zero-distance neighbors receive 100% of voting weight, predicting {predicted_display}."
                )
            else:
                expl = (
                    f"Distance-weighted voting assigns weights proportional to the reciprocal of scaled distance (1/d). "
                    f"Although neighboring types include {top_classes_summary}, the closest training vehicles belong to {predicted_display}, "
                    f"accumulating the highest weighted vote share ({vote_shares[predicted_class]}%)."
                )

        # OOD Check (experimental heuristic)
        mean_scaled_d = round(float(np.mean(dists)), 3)
        is_ood = mean_scaled_d > self.ood_threshold
        ood_reason = None
        if is_ood:
            ood_reason = (
                f"Experimental Heuristic: Average scaled distance ({mean_scaled_d}) exceeds the baseline training threshold "
                f"({self.ood_threshold}). The input vehicle features may fall outside the normal training distribution."
            )

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return PredictionResponse(
            predicted_class=predicted_class,
            predicted_display=predicted_display,
            vote_shares=vote_shares,
            vote_counts={c: round(v, 4) for c, v in class_vote_totals.items()},
            is_zero_distance=has_zero_distance,
            neighbors=neighbor_details if include_neighbors else [],
            latency_ms=elapsed_ms,
            explanation=expl,
            is_ood=is_ood,
            ood_reason=ood_reason,
            mean_scaled_distance=mean_scaled_d,
            ood_threshold=self.ood_threshold,
            model_config_used=self.config
        )

    def get_held_out_examples(self, count_per_class: int = 2) -> List[HeldOutExample]:
        """Returns held-out test examples with neutral blind labels (e.g. 'Test Sample #1')."""
        if self.test_df is None or len(self.test_df) == 0:
            return []

        examples: List[HeldOutExample] = []
        sample_num = 1
        
        # Select balanced samples across classes from held-out test set
        for cls in sorted(list(CLASS_MAP.keys())):
            cls_samples = self.test_df[self.test_df["Class"] == cls]
            selected = cls_samples.head(count_per_class)
            for _, row in selected.iterrows():
                feat_dict = {f: float(row[f]) for f in FEATURE_COLUMNS}
                examples.append(HeldOutExample(
                    example_id=f"test_sample_{sample_num}",
                    sample_label=f"Blind Test Sample #{sample_num}",
                    features=feat_dict,
                    true_class=cls,
                    true_display=CLASS_MAP[cls]
                ))
                sample_num += 1

        return examples

    def save_model_bundle(self):
        bundle = {
            "pipeline": self.pipeline,
            "unscaled_pipeline": self.unscaled_pipeline,
            "config": self.config,
            "dataset_fingerprint": self.dataset_fingerprint,
            "train_df": self.train_df,
            "test_df": self.test_df,
            "train_indices": self.train_indices,
            "test_indices": self.test_indices,
            "ood_threshold": self.ood_threshold,
            "last_train_response": self.last_train_response
        }
        joblib.dump(bundle, MODEL_FILE)

    def load_model_bundle(self, current_fingerprint: str) -> bool:
        if not os.path.exists(MODEL_FILE):
            return False
        try:
            bundle = joblib.load(MODEL_FILE)
            # Invalidate if dataset fingerprint does not match
            if bundle.get("dataset_fingerprint") != current_fingerprint:
                return False
            self.pipeline = bundle.get("pipeline")
            self.unscaled_pipeline = bundle.get("unscaled_pipeline")
            self.config = bundle.get("config", self.config)
            self.dataset_fingerprint = bundle.get("dataset_fingerprint", "")
            self.train_df = bundle.get("train_df")
            self.test_df = bundle.get("test_df")
            self.train_indices = bundle.get("train_indices")
            self.test_indices = bundle.get("test_indices")
            self.ood_threshold = bundle.get("ood_threshold", 5.0)
            self.last_train_response = bundle.get("last_train_response")
            return True
        except Exception:
            return False

    def invalidate_model(self):
        self.pipeline = None
        self.unscaled_pipeline = None
        self.train_df = None
        self.test_df = None
        self.last_train_response = None
        if os.path.exists(MODEL_FILE):
            os.remove(MODEL_FILE)
