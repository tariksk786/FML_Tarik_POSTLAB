"""
FastAPI Application Entrypoint for VehicleSense
Provides real ML endpoints, data management, CORS configuration, and error handlers.
"""
import os
import io
import time
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse

from .schemas import (
    PredictionRequest, PredictionResponse, TrainConfigRequest, TrainResponse,
    DatasetSummary, HeldOutExample, BatchPredictionResponse, BatchPredictionResult,
    FEATURE_COLUMNS, CLASS_MAP
)
from .data_manager import DataManager, DEFAULT_CSV_PATH
from .ml_engine import MLEngine
from .viva_qa import VIVA_QUESTIONS, DEMO_SCRIPT_STEPS

app = FastAPI(
    title="VehicleSense — Explainable KNN Classification API",
    description="Backend API for Fundamentals of Machine Learning PBL Project: Vehicle Type Classification using KNN",
    version="1.0.0"
)

# CORS configuration allowing local frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize singletons
data_mgr = DataManager()
ml_engine = MLEngine()

# Attempt to load or auto-train baseline model on startup
@app.on_event("startup")
def startup_event():
    global data_mgr, ml_engine
    try:
        # Check if saved model matches current dataset fingerprint
        if not ml_engine.load_model_bundle(data_mgr.fingerprint):
            print("Auto-training initial baseline KNN model (K=5, Euclidean, Uniform)...")
            ml_engine.train_and_evaluate(
                df=data_mgr.clean_df,
                fingerprint=data_mgr.fingerprint,
                config=TrainConfigRequest(k=5, metric="euclidean", weights="uniform", test_size=0.20)
            )
            print("Baseline model successfully trained and ready.")
    except Exception as e:
        print(f"Warning during startup model initialization: {e}")


@app.get("/api/health")
def health_check():
    is_trained = ml_engine.pipeline is not None
    return {
        "status": "healthy",
        "dataset_rows": len(data_mgr.clean_df) if data_mgr.clean_df is not None else 0,
        "dataset_fingerprint": data_mgr.fingerprint,
        "is_model_trained": is_trained,
        "active_config": ml_engine.config if is_trained else None
    }


@app.get("/api/dataset/summary", response_model=DatasetSummary)
def get_dataset_summary():
    is_trained = ml_engine.pipeline is not None
    return data_mgr.get_summary(
        is_model_trained=is_trained,
        active_model_config=ml_engine.config if is_trained else None
    )


@app.get("/api/dataset/rows")
def get_dataset_rows(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    class_filter: str = Query(None),
    search: str = Query(None)
):
    return data_mgr.get_paginated_rows(
        page=page,
        page_size=page_size,
        class_filter=class_filter,
        search=search
    )


@app.post("/api/dataset/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV file.")
    
    contents = await file.read()
    success, msg, report = data_mgr.load_from_bytes(contents, filename=file.filename)
    if not success:
        raise HTTPException(status_code=400, detail=msg)

    # Invalidate existing trained model because dataset changed
    ml_engine.invalidate_model()

    return {
        "status": "success",
        "message": msg,
        "report": report,
        "summary": data_mgr.get_summary(is_model_trained=False)
    }


@app.get("/api/dataset/download")
def download_dataset(template: bool = Query(False)):
    if template:
        # Create empty template CSV with the 18 features + Class
        template_df = pd.DataFrame(columns=FEATURE_COLUMNS + ["Class"])
        csv_data = template_df.to_csv(index=False).encode("utf-8")
        filename = "vehicle_input_template.csv"
    else:
        csv_data = data_mgr.get_csv_bytes()
        filename = "vehicle_dataset.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.post("/api/model/train", response_model=TrainResponse)
def train_model(config: TrainConfigRequest):
    if data_mgr.clean_df is None or len(data_mgr.clean_df) == 0:
        raise HTTPException(status_code=400, detail="No valid dataset is currently loaded.")

    try:
        response = ml_engine.train_and_evaluate(
            df=data_mgr.clean_df,
            fingerprint=data_mgr.fingerprint,
            config=config
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Training failed: {str(e)}")


@app.get("/api/model/status")
def get_model_status():
    if ml_engine.pipeline is None or ml_engine.last_train_response is None:
        return {"is_trained": False, "message": "Model has not been trained yet."}
    return {
        "is_trained": True,
        "last_train_response": ml_engine.last_train_response
    }


@app.post("/api/model/predict", response_model=PredictionResponse)
def predict_sample(req: PredictionRequest):
    if ml_engine.pipeline is None:
        raise HTTPException(status_code=400, detail="Model is not trained. Please train the model in Model Lab first.")

    try:
        res = ml_engine.predict_sample(req.features, include_neighbors=req.include_neighbors)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")


@app.post("/api/model/predict-batch", response_model=BatchPredictionResponse)
async def predict_batch(file: UploadFile = File(...)):
    if ml_engine.pipeline is None:
        raise HTTPException(status_code=400, detail="Model is not trained. Please train the model first.")

    contents = await file.read()
    try:
        try:
            df = pd.read_csv(io.BytesIO(contents), encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(contents), encoding="latin1")

        df.columns = [c.strip() for c in df.columns]

        # Verify all 18 features exist
        missing = [f for f in FEATURE_COLUMNS if f not in df.columns]
        if missing:
            raise HTTPException(status_code=400, detail=f"Batch CSV is missing required columns: {missing}")

        start_time = time.perf_counter()
        results: list[BatchPredictionResult] = []

        for idx, row in df.iterrows():
            feat_dict = {f: None if pd.isna(row[f]) else float(row[f]) for f in FEATURE_COLUMNS}
            pred_res = ml_engine.predict_sample(feat_dict, include_neighbors=False)
            results.append(BatchPredictionResult(
                row_id=int(idx) + 1,
                predicted_class=pred_res.predicted_class,
                predicted_display=pred_res.predicted_display,
                vote_shares=pred_res.vote_shares,
                features={f: float(row[f]) for f in FEATURE_COLUMNS if not pd.isna(row[f])}
            ))

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return BatchPredictionResponse(
            total_processed=len(results),
            results=results,
            latency_ms=elapsed_ms
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Batch prediction failed: {str(e)}")


@app.get("/api/model/held-out-examples")
def get_held_out_examples():
    """Returns neutral blind test examples from the held-out test split."""
    if ml_engine.pipeline is None:
        raise HTTPException(status_code=400, detail="Model is not trained. Please train the model first.")
    return ml_engine.get_held_out_examples(count_per_class=2)


@app.get("/api/viva-content")
def get_viva_content():
    return {
        "viva_questions": VIVA_QUESTIONS,
        "demo_steps": DEMO_SCRIPT_STEPS
    }
