"""
Pydantic Schemas and Feature Definitions for VehicleSense
"""
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

# Canonical list of the 18 silhouette geometric features with exact published casing
FEATURE_COLUMNS = [
    "Comp", "Circ", "D.Circ", "Rad.Ra", "Pr.Axis.Ra", "Max.L.Ra",
    "Scat.Ra", "Elong", "Pr.Axis.Rect", "Max.L.Rect",
    "Sc.Var.Maxis", "Sc.Var.maxis", "Ra.Gyr",
    "Skew.Maxis", "Skew.maxis", "Kurt.maxis", "Kurt.Maxis",
    "Holl.Ra"
]

CLASS_MAP = {
    "bus": "Bus",
    "van": "Van",
    "saab": "Saab Car",
    "opel": "Opel Car"
}

FEATURE_METADATA = {
    "Comp": {
        "label": "Compactness",
        "description": "Ratio of squared perimeter to area: (average perimeter)² / area.",
        "group": "Shape & Circularity"
    },
    "Circ": {
        "label": "Circularity",
        "description": "Ratio of squared radius to area: (average radius)² / area.",
        "group": "Shape & Circularity"
    },
    "D.Circ": {
        "label": "Distance Circularity",
        "description": "Circularity weighted by distance to border: area / (average distance from border)².",
        "group": "Shape & Circularity"
    },
    "Rad.Ra": {
        "label": "Radius Ratio",
        "description": "Spread of radii from vehicle centroid: (max radius - min radius) / average radius.",
        "group": "Shape & Circularity"
    },
    "Pr.Axis.Ra": {
        "label": "Principal Axis Aspect Ratio",
        "description": "Ratio of minor axis to major axis of inertia ellipse.",
        "group": "Aspect Ratios"
    },
    "Max.L.Ra": {
        "label": "Max Length Aspect Ratio",
        "description": "Ratio of length perpendicular to max length over max length.",
        "group": "Aspect Ratios"
    },
    "Scat.Ra": {
        "label": "Scatter Ratio",
        "description": "Inertia about minor axis divided by inertia about major axis.",
        "group": "Rectangularity & Spread"
    },
    "Elong": {
        "label": "Elongatedness",
        "description": "Elongation metric: area / (shrink width)².",
        "group": "Rectangularity & Spread"
    },
    "Pr.Axis.Rect": {
        "label": "Principal Axis Rectangularity",
        "description": "Enclosing rectangle fill along principal axis: area / (length × width).",
        "group": "Rectangularity & Spread"
    },
    "Max.L.Rect": {
        "label": "Max Length Rectangularity",
        "description": "Enclosing rectangle fill aligned with maximum vehicle length.",
        "group": "Rectangularity & Spread"
    },
    "Sc.Var.Maxis": {
        "label": "Scaled Variance Along Major Axis",
        "description": "Second order central moment about minor axis normalized by area.",
        "group": "Moments & Variance"
    },
    "Sc.Var.maxis": {
        "label": "Scaled Variance Along Minor Axis",
        "description": "Second order central moment about major axis normalized by area.",
        "group": "Moments & Variance"
    },
    "Ra.Gyr": {
        "label": "Scaled Radius of Gyration",
        "description": "Sum of major and minor variance moments divided by area.",
        "group": "Moments & Variance"
    },
    "Skew.Maxis": {
        "label": "Skewness About Major Axis",
        "description": "Third order central moment along major axis divided by sigma_min³.",
        "group": "Skewness & Kurtosis"
    },
    "Skew.maxis": {
        "label": "Skewness About Minor Axis",
        "description": "Third order central moment along minor axis divided by sigma_maj³.",
        "group": "Skewness & Kurtosis"
    },
    "Kurt.maxis": {
        "label": "Kurtosis About Minor Axis",
        "description": "Fourth order moment about major axis normalized by sigma_min⁴.",
        "group": "Skewness & Kurtosis"
    },
    "Kurt.Maxis": {
        "label": "Kurtosis About Major Axis",
        "description": "Fourth order moment about minor axis normalized by sigma_maj⁴.",
        "group": "Skewness & Kurtosis"
    },
    "Holl.Ra": {
        "label": "Hollows Ratio",
        "description": "Ratio of area of hollows (indentations) to area of bounding polygon.",
        "group": "Skewness & Kurtosis"
    }
}


class PredictionRequest(BaseModel):
    features: Dict[str, Optional[float]]
    include_neighbors: bool = True


class NeighborDetail(BaseModel):
    rank: int
    train_index: int
    class_name: str
    display_name: str
    distance: float
    vote_weight: float
    vote_share_pct: float
    features: Dict[str, float]


class PredictionResponse(BaseModel):
    predicted_class: str
    predicted_display: str
    vote_shares: Dict[str, float]  # class -> percentage [0, 100]
    vote_counts: Dict[str, float]  # raw votes / weights
    is_zero_distance: bool
    neighbors: List[NeighborDetail]
    latency_ms: float
    explanation: str
    is_ood: bool
    ood_reason: Optional[str] = None
    mean_scaled_distance: float
    ood_threshold: float
    model_config_used: Dict[str, Any]


class TrainConfigRequest(BaseModel):
    k: int = Field(default=5, ge=1, le=25)
    metric: str = Field(default="euclidean")  # "euclidean" | "manhattan"
    weights: str = Field(default="uniform")   # "uniform" | "distance"
    test_size: float = Field(default=0.20, gt=0.05, lt=0.5)


class CVPoint(BaseModel):
    k: int
    mean_cv_accuracy: float
    std_cv_accuracy: float


class PerClassMetric(BaseModel):
    class_name: str
    display_name: str
    precision: float
    recall: float
    f1_score: float
    support: int


class ScalingComparisonResult(BaseModel):
    k: int
    metric: str
    scaled_cv_accuracy: float
    unscaled_cv_accuracy: float
    observed_difference: float
    explanation: str


class TrainResponse(BaseModel):
    status: str
    train_samples: int
    test_samples: int
    cv_folds: int
    active_k: int
    active_metric: str
    active_weights: str
    test_accuracy: float
    macro_precision: float
    macro_recall: float
    macro_f1: float
    per_class_metrics: List[PerClassMetric]
    confusion_matrix: List[List[int]]
    class_labels: List[str]
    class_displays: List[str]
    cv_curve: List[CVPoint]
    scaling_comparison: ScalingComparisonResult
    training_latency_ms: float
    dataset_fingerprint: str
    ood_threshold: float


class FeatureStat(BaseModel):
    name: str
    label: str
    description: str
    group: str
    min: float
    max: float
    mean: float
    std: float
    median: float
    missing_count: int


class DatasetSummary(BaseModel):
    total_rows: int
    feature_count: int
    class_distribution: Dict[str, int]
    class_displays: Dict[str, str]
    features_stats: List[FeatureStat]
    missing_values_count: int
    duplicate_count: int
    conflicting_labels_count: int
    dataset_fingerprint: str
    is_model_trained: bool
    active_model_config: Optional[Dict[str, Any]] = None
    data_source: str


class HeldOutExample(BaseModel):
    example_id: str
    sample_label: str  # e.g., "Blind Test Sample #1"
    features: Dict[str, float]
    true_class: str
    true_display: str


class BatchPredictionResult(BaseModel):
    row_id: int
    predicted_class: str
    predicted_display: str
    vote_shares: Dict[str, float]
    features: Dict[str, float]


class BatchPredictionResponse(BaseModel):
    total_processed: int
    results: List[BatchPredictionResult]
    latency_ms: float
