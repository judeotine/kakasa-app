from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .model_service import MsenteModelService, ModelServiceError
from .schemas import BorrowerRequest, PredictionResponse

MODEL_PATH = str(Path(__file__).resolve().parent.parent / "models" / "msente_xgboost_model.joblib")

service: Optional[MsenteModelService] = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global service
    service = MsenteModelService(MODEL_PATH)
    yield


app = FastAPI(title="Msente Debt-Stress Risk API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": service is not None,
        "model_name": service.model_name if service else None,
        "model_version": service.model_version if service else None,
        "threshold": service.threshold if service else None,
    }


@app.post("/api/debt-stress/predict", response_model=PredictionResponse)
def predict(request: BorrowerRequest):
    if service is None:
        raise HTTPException(status_code=503, detail="Model service is not ready")
    try:
        return service.predict(request.model_dump())
    except ModelServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
