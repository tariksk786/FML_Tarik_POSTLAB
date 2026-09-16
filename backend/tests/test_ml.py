"""
Automated Unit and Integration Tests for VehicleSense Backend ML Engine
"""
import sys
import os
import numpy as np
import pandas as pd

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.schemas import FEATURE_COLUMNS, CLASS_MAP, TrainConfigRequest
from app.data_manager import DataManager
from app.ml_engine import MLEngine


def test_data_manager_loading_and_summary():
    print("Test 1: Testing DataManager loading & summaries...")
    dm = DataManager()
    assert dm.df is not None, "DataFrame should not be None"
    assert len(dm.df) == 846, f"Expected 846 instances, got {len(dm.df)}"
    assert len(FEATURE_COLUMNS) == 18, "Expected 18 feature columns"
    
    summary = dm.get_summary()
    assert summary.total_rows == 846
    assert summary.feature_count == 18
    assert set(summary.class_distribution.keys()) == {"bus", "van", "saab", "opel"}
    print("  -> Passed. Dataset loaded with 846 rows and all 18 features.")


def test_ml_training_and_evaluation():
    print("Test 2: Testing ML Pipeline Training, Cross-Validation & Test Evaluation...")
    dm = DataManager()
    engine = MLEngine()
    config = TrainConfigRequest(k=5, metric="euclidean", weights="uniform", test_size=0.20)
    
    res = engine.train_and_evaluate(dm.clean_df, dm.fingerprint, config)
    assert res.status == "success"
    assert res.train_samples + res.test_samples == 846
    assert 0.0 < res.test_accuracy <= 1.0, f"Invalid accuracy: {res.test_accuracy}"
    assert len(res.cv_curve) > 0, "CV curve points missing"
    assert len(res.per_class_metrics) == 4, "Expected 4 class metrics"
    assert len(res.confusion_matrix) == 4, "Expected 4x4 confusion matrix"
    print(f"  -> Passed. Test Accuracy: {res.test_accuracy * 100:.2f}%, CV Folds: {res.cv_folds}")


def test_prediction_and_neighbor_agreement():
    print("Test 3: Testing Prediction and Neighbor Extraction...")
    dm = DataManager()
    engine = MLEngine()
    config = TrainConfigRequest(k=5, metric="euclidean", weights="uniform")
    engine.train_and_evaluate(dm.clean_df, dm.fingerprint, config)
    
    # Take a sample from the test set
    test_sample = engine.test_df.iloc[0]
    feat_dict = {f: float(test_sample[f]) for f in FEATURE_COLUMNS}
    
    pred_res = engine.predict_sample(feat_dict, include_neighbors=True)
    assert pred_res.predicted_class in CLASS_MAP
    assert len(pred_res.neighbors) == 5, f"Expected 5 neighbors, got {len(pred_res.neighbors)}"
    assert sum(pred_res.vote_shares.values()) > 99.0, "Vote shares should sum to ~100%"
    assert pred_res.latency_ms >= 0.0
    print(f"  -> Passed. Predicted class: {pred_res.predicted_display}, Neighbors: {len(pred_res.neighbors)}")


def test_zero_distance_voting_agreement():
    print("Test 4: Testing Distance-weighted Zero-distance voting agreement with scikit-learn...")
    dm = DataManager()
    engine = MLEngine()
    # Train with distance weighting
    config = TrainConfigRequest(k=5, metric="euclidean", weights="distance")
    engine.train_and_evaluate(dm.clean_df, dm.fingerprint, config)
    
    # Query with an exact training instance (distance must be 0.0)
    train_row = engine.train_df.iloc[10]
    exact_feats = {f: float(train_row[f]) for f in FEATURE_COLUMNS}
    true_class = train_row["Class"]
    
    pred_res = engine.predict_sample(exact_feats, include_neighbors=True)
    assert pred_res.is_zero_distance is True, "Exact match should have is_zero_distance=True"
    assert pred_res.predicted_class == true_class, f"Expected {true_class}, got {pred_res.predicted_class}"
    # The zero distance neighbor must have vote_weight = 1.0 (or 100% of the vote)
    zero_neighbors = [n for n in pred_res.neighbors if n.distance <= 1e-6]
    assert len(zero_neighbors) >= 1
    assert pred_res.vote_shares[true_class] == 100.0, "Zero-distance neighbor should receive 100% vote share"
    print("  -> Passed. Zero-distance voting perfectly matches scikit-learn convention.")


def test_median_imputation_and_ood():
    print("Test 5: Testing Median Imputation and Out-of-Distribution Heuristic...")
    dm = DataManager()
    engine = MLEngine()
    config = TrainConfigRequest(k=5, metric="euclidean", weights="uniform")
    engine.train_and_evaluate(dm.clean_df, dm.fingerprint, config)
    
    # Sample with missing (None) values in some features
    sample_with_none = {f: float(dm.clean_df[f].median()) for f in FEATURE_COLUMNS}
    sample_with_none["Comp"] = None
    sample_with_none["Circ"] = None
    
    pred_res = engine.predict_sample(sample_with_none)
    assert pred_res.predicted_class in CLASS_MAP, "Imputer should allow prediction with missing features"
    
    # Extreme outlier values (OOD test)
    outlier_feats = {f: 99999.0 for f in FEATURE_COLUMNS}
    ood_res = engine.predict_sample(outlier_feats)
    assert ood_res.is_ood is True, "Outlier should be flagged as Out-of-Distribution"
    assert ood_res.ood_reason is not None
    print(f"  -> Passed. Imputation works; OOD flagged (Threshold: {ood_res.ood_threshold}, Query dist: {ood_res.mean_scaled_distance})")


def test_model_persistence_and_held_out_examples():
    print("Test 6: Testing Model Persistence and Blind Held-out Test Examples...")
    dm = DataManager()
    engine = MLEngine()
    config = TrainConfigRequest(k=7, metric="manhattan", weights="uniform")
    engine.train_and_evaluate(dm.clean_df, dm.fingerprint, config)
    
    # Reload into a fresh engine instance
    new_engine = MLEngine()
    loaded = new_engine.load_model_bundle(dm.fingerprint)
    assert loaded is True, "Model bundle should load successfully"
    assert new_engine.config["k"] == 7
    assert new_engine.config["metric"] == "manhattan"
    
    held_out = new_engine.get_held_out_examples(count_per_class=2)
    assert len(held_out) == 8, f"Expected 8 held-out examples (2 per class), got {len(held_out)}"
    assert held_out[0].sample_label.startswith("Blind Test Sample"), "Label must be blind"
    print(f"  -> Passed. Persisted model reloaded, {len(held_out)} blind held-out test examples generated.")


if __name__ == "__main__":
    print("Running VehicleSense Backend Test Suite...")
    test_data_manager_loading_and_summary()
    test_ml_training_and_evaluation()
    test_prediction_and_neighbor_agreement()
    test_zero_distance_voting_agreement()
    test_median_imputation_and_ood()
    test_model_persistence_and_held_out_examples()
    print("\nALL BACKEND ML TESTS PASSED SUCCESSFULLY!")
