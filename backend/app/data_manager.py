"""
Dataset Manager for VehicleSense
Handles CSV validation, missing value policy, duplicate/leakage prevention,
dataset statistics, and persistence.
"""
import os
import hashlib
import io
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List, Optional
from .schemas import FEATURE_COLUMNS, CLASS_MAP, FEATURE_METADATA, FeatureStat, DatasetSummary

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DEFAULT_CSV_PATH = os.path.join(DATA_DIR, "vehicle.csv")


class DataManager:
    def __init__(self, csv_path: str = DEFAULT_CSV_PATH):
        self.csv_path = csv_path
        self.df: Optional[pd.DataFrame] = None
        self.clean_df: Optional[pd.DataFrame] = None
        self.fingerprint: str = ""
        self.data_source_description: str = (
            "Statlog (Vehicle Silhouettes) Benchmark Dataset, Turing Institute (JP Siebert 1987), "
            "matching Kaggle schema 'anairamcosta/vehicle-csv'. 18 silhouette geometric features across 4 classes."
        )
        self.load_dataset()

    def load_dataset(self, csv_path: Optional[str] = None):
        if csv_path:
            self.csv_path = csv_path
        if not os.path.exists(self.csv_path):
            raise FileNotFoundError(f"Dataset CSV not found at {self.csv_path}")

        raw_df = pd.read_csv(self.csv_path)
        self._process_dataframe(raw_df)

    def load_from_bytes(self, content_bytes: bytes, filename: str = "uploaded.csv") -> Tuple[bool, str, Dict[str, Any]]:
        """Validate and load uploaded CSV bytes."""
        try:
            # Try reading as CSV with utf-8 or latin1
            try:
                raw_df = pd.read_csv(io.BytesIO(content_bytes), encoding="utf-8")
            except UnicodeDecodeError:
                raw_df = pd.read_csv(io.BytesIO(content_bytes), encoding="latin1")

            validation_err = self.validate_raw_dataframe(raw_df)
            if validation_err:
                return False, validation_err, {}

            # Process and save as active dataset
            self.data_source_description = f"User uploaded CSV: {filename}"
            clean_df, report = self._process_dataframe(raw_df)
            
            # Save to disk as active custom dataset
            uploaded_path = os.path.join(DATA_DIR, "active_dataset.csv")
            clean_df.to_csv(uploaded_path, index=False)
            self.csv_path = uploaded_path

            return True, "Dataset successfully loaded and validated.", report
        except Exception as e:
            return False, f"Failed to parse CSV: {str(e)}", {}

    def validate_raw_dataframe(self, df: pd.DataFrame) -> Optional[str]:
        """Strict validation of columns, casing, types, and values."""
        df_cols = [c.strip() for c in df.columns]
        
        # Check target column
        target_candidates = [c for c in df_cols if c.lower() == "class"]
        if not target_candidates:
            return "Missing required target column 'Class'. Found columns: " + ", ".join(df_cols[:5]) + "..."

        target_col = target_candidates[0]

        # Check all 18 feature columns (preserve exact case-sensitive names)
        missing_features = []
        for feat in FEATURE_COLUMNS:
            if feat not in df_cols:
                missing_features.append(feat)

        if missing_features:
            return (
                f"Missing required feature columns: {missing_features}. "
                f"Note: Column names are case-sensitive (e.g. Sc.Var.Maxis vs Sc.Var.maxis)."
            )

        # Check for non-empty dataframe
        if len(df) < 20:
            return f"Dataset has too few records ({len(df)} rows). A minimum of 20 labelled rows is required."

        # Target label check
        classes = df[target_col].dropna().astype(str).str.lower().str.strip().unique()
        unknown_classes = [c for c in classes if c not in CLASS_MAP]
        if unknown_classes:
            return f"Unknown class labels found: {unknown_classes}. Supported classes: {list(CLASS_MAP.keys())}."

        # Check if any class has fewer than 3 examples
        class_counts = df[target_col].astype(str).str.lower().str.strip().value_counts()
        for cls, count in class_counts.items():
            if count < 3:
                return f"Class '{cls}' has only {count} samples. Each class requires at least 3 samples for stratified validation."

        # Check for inf / -inf or unparseable text in feature columns
        for feat in FEATURE_COLUMNS:
            series = df[feat]
            # Check for non-numeric unparseable strings
            numeric_series = pd.to_numeric(series, errors="coerce")
            # If all are NaN in a column
            if numeric_series.dropna().empty:
                return f"Feature column '{feat}' is completely empty or contains no numeric data."

            # Check for infinity
            if np.isinf(numeric_series).any():
                return f"Feature column '{feat}' contains invalid infinite (inf / -inf) values."

        return None

    def _process_dataframe(self, raw_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Cleans, validates types, identifies duplicates and conflicting labels."""
        # Trim column whitespace
        raw_df.columns = [c.strip() for c in raw_df.columns]
        
        # Standardize target column name to 'Class'
        target_col = [c for c in raw_df.columns if c.lower() == "class"][0]
        
        # Filter and reorder exact columns
        df = pd.DataFrame()
        for feat in FEATURE_COLUMNS:
            # Convert to float, coercing invalid values to NaN (allowed for median imputation)
            df[feat] = pd.to_numeric(raw_df[feat], errors="coerce")
        
        # Standardize class column: lowercase and stripped
        df["Class"] = raw_df[target_col].astype(str).str.lower().str.strip()

        # Reject rows where Class is empty or invalid
        df = df[df["Class"].isin(CLASS_MAP.keys())].copy()

        # Check duplicate feature vectors
        feature_duplicates = df.duplicated(subset=FEATURE_COLUMNS, keep=False)
        duplicate_count = int(df.duplicated(subset=FEATURE_COLUMNS + ["Class"]).sum())

        # Check conflicting labels (identical features, different Class)
        conflicting_mask = df.duplicated(subset=FEATURE_COLUMNS, keep=False) & ~df.duplicated(subset=FEATURE_COLUMNS + ["Class"], keep=False)
        conflicting_count = int(conflicting_mask.sum())

        # Deduplicate exact duplicates (identical features and identical class) to prevent split leakage
        df = df.drop_duplicates(subset=FEATURE_COLUMNS + ["Class"]).reset_index(drop=True)

        self.df = df
        self.clean_df = df.copy()

        # Compute deterministic fingerprint (hash)
        repr_bytes = df.to_csv(index=False).encode("utf-8")
        self.fingerprint = hashlib.sha256(repr_bytes).hexdigest()[:16]

        report = {
            "total_rows": len(df),
            "duplicate_count": duplicate_count,
            "conflicting_count": conflicting_count,
            "fingerprint": self.fingerprint
        }
        return df, report

    def get_summary(self, is_model_trained: bool = False, active_model_config: Optional[Dict[str, Any]] = None) -> DatasetSummary:
        if self.df is None:
            raise ValueError("No dataset loaded.")

        class_counts = self.df["Class"].value_counts().to_dict()
        missing_count = int(self.df[FEATURE_COLUMNS].isna().sum().sum())

        feature_stats = []
        for feat in FEATURE_COLUMNS:
            meta = FEATURE_METADATA.get(feat, {"label": feat, "description": "", "group": "General"})
            s = self.df[feat]
            feature_stats.append(FeatureStat(
                name=feat,
                label=meta["label"],
                description=meta["description"],
                group=meta["group"],
                min=float(s.min()) if not s.dropna().empty else 0.0,
                max=float(s.max()) if not s.dropna().empty else 0.0,
                mean=round(float(s.mean()), 2) if not s.dropna().empty else 0.0,
                std=round(float(s.std()), 2) if not s.dropna().empty else 0.0,
                median=round(float(s.median()), 2) if not s.dropna().empty else 0.0,
                missing_count=int(s.isna().sum())
            ))

        return DatasetSummary(
            total_rows=len(self.df),
            feature_count=len(FEATURE_COLUMNS),
            class_distribution=class_counts,
            class_displays=CLASS_MAP,
            features_stats=feature_stats,
            missing_values_count=missing_count,
            duplicate_count=int(self.df.duplicated(subset=FEATURE_COLUMNS).sum()),
            conflicting_labels_count=0,
            dataset_fingerprint=self.fingerprint,
            is_model_trained=is_model_trained,
            active_model_config=active_model_config,
            data_source=self.data_source_description
        )

    def get_paginated_rows(
        self,
        page: int = 1,
        page_size: int = 20,
        class_filter: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        if self.df is None:
            return {"rows": [], "total": 0, "page": 1, "total_pages": 0}

        sub_df = self.df.copy()
        
        if class_filter and class_filter in CLASS_MAP:
            sub_df = sub_df[sub_df["Class"] == class_filter]

        if search:
            search_str = search.lower().strip()
            # Match class name or index
            mask = sub_df["Class"].str.contains(search_str)
            for feat in FEATURE_COLUMNS[:5]:
                mask = mask | sub_df[feat].astype(str).str.contains(search_str)
            sub_df = sub_df[mask]

        total = len(sub_df)
        total_pages = max(1, (total + page_size - 1) // page_size)
        page = max(1, min(page, total_pages))

        start_idx = (page - 1) * page_size
        end_idx = min(start_idx + page_size, total)

        page_records = []
        for idx, row in sub_df.iloc[start_idx:end_idx].iterrows():
            rec = {
                "id": int(idx),
                "Class": row["Class"],
                "ClassDisplay": CLASS_MAP.get(row["Class"], row["Class"])
            }
            for feat in FEATURE_COLUMNS:
                val = row[feat]
                rec[feat] = None if pd.isna(val) else float(val)
            page_records.append(rec)

        return {
            "rows": page_records,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }

    def get_csv_bytes(self) -> bytes:
        if self.df is None:
            return b""
        return self.df.to_csv(index=False).encode("utf-8")
