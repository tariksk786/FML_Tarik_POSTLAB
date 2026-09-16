"""
End-to-End API Verification Script for VehicleSense
"""
import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000/api"

def run_checks():
    print("1. Checking /health...")
    with urllib.request.urlopen(f"{BASE_URL}/health") as resp:
        health = json.loads(resp.read().decode("utf-8"))
        print(f"   Status: {health['status']}, Model trained: {health['is_model_trained']}")
        assert health["status"] == "healthy"

    print("2. Checking /dataset/summary...")
    with urllib.request.urlopen(f"{BASE_URL}/dataset/summary") as resp:
        summary = json.loads(resp.read().decode("utf-8"))
        print(f"   Total rows: {summary['total_rows']}, Features: {summary['feature_count']}")
        assert summary["total_rows"] == 846
        assert summary["feature_count"] == 18

    print("3. Checking /model/train (K=5, Euclidean, Distance-weighted)...")
    payload = {"k": 5, "metric": "euclidean", "weights": "distance", "test_size": 0.20}
    req = urllib.request.Request(
        f"{BASE_URL}/model/train",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        train_res = json.loads(resp.read().decode("utf-8"))
        acc = train_res["test_accuracy"] * 100
        diff = train_res["scaling_comparison"]["observed_difference"] * 100
        print(f"   Test Accuracy: {acc:.1f}%, Observed Scaling Difference: {diff:+.1f}%")
        assert train_res["active_k"] == 5
        assert len(train_res["confusion_matrix"]) == 4

    print("4. Checking /model/held-out-examples...")
    with urllib.request.urlopen(f"{BASE_URL}/model/held-out-examples") as resp:
        examples = json.loads(resp.read().decode("utf-8"))
        print(f"   Held-out blind test examples retrieved: {len(examples)}")
        assert len(examples) > 0
        first_ex = examples[0]
        print(f"   Example sample label: '{first_ex['sample_label']}' (true class: {first_ex['true_class']})")

    print("5. Checking /model/predict with first held-out example...")
    pred_payload = {"features": first_ex["features"], "include_neighbors": True}
    req = urllib.request.Request(
        f"{BASE_URL}/model/predict",
        data=json.dumps(pred_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        pred = json.loads(resp.read().decode("utf-8"))
        print(f"   Predicted class: {pred['predicted_display']}, Match: {pred['predicted_class'] == first_ex['true_class']}")
        print(f"   Top Vote Share: {pred['vote_shares'][pred['predicted_class']]}%")
        print(f"   Neighbors retrieved: {len(pred['neighbors'])}")
        assert len(pred["neighbors"]) == 5

    print("\nALL END-TO-END API VERIFICATIONS PASSED!")

if __name__ == "__main__":
    run_checks()
