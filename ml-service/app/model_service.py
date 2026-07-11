from pathlib import Path
from typing import Any, Dict, List

import joblib
import pandas as pd

from .income_stability import compute_income_stability
from .risk import build_risk_reasons, risk_level, risk_message

REQUIRED_KEYS: List[str] = ["model", "preprocessor", "threshold", "model_input_features"]
VALID_EMPLOYMENT = {0, 1, 2, 3, 4}


class ModelServiceError(Exception):
    pass


class MsenteModelService:
    def __init__(self, model_path: str):
        path = Path(model_path)
        if not path.exists():
            raise ModelServiceError(f"Model file not found at {model_path}")
        try:
            package = joblib.load(path)
        except Exception as exc:
            raise ModelServiceError(f"Corrupted or unreadable model package: {exc}") from exc

        missing = [key for key in REQUIRED_KEYS if key not in package]
        if missing:
            raise ModelServiceError(f"Model package is missing required keys: {missing}")

        self.model = package["model"]
        self.preprocessor = package["preprocessor"]
        self.threshold = float(package["threshold"])
        self.feature_order = list(package["model_input_features"])
        self.employment_mapping = package.get("employment_mapping", {})
        self.model_name = package.get("model_name", "Msente Debt Stress XGBoost")
        self.model_version = package.get("model_version", "unknown")

    def _validate(self, payload: Dict[str, Any]) -> None:
        if payload["employment_type"] not in VALID_EMPLOYMENT:
            raise ModelServiceError("employment_type must be one of 0, 1, 2, 3 or 4")
        inflows = payload["monthly_inflows"]
        if len(inflows) < 3:
            raise ModelServiceError("At least three months of monthly_inflows are required")
        if any(value < 0 for value in inflows):
            raise ModelServiceError("monthly_inflows cannot be negative")
        if payload["monthly_income"] <= 0:
            raise ModelServiceError("monthly_income must be greater than zero")
        if payload["loan_amount"] <= 0:
            raise ModelServiceError("loan_amount must be greater than zero")
        if payload["repayment_amount"] <= 0:
            raise ModelServiceError("repayment_amount must be greater than zero")
        if payload["repayment_amount"] < payload["loan_amount"]:
            raise ModelServiceError("repayment_amount cannot be less than loan_amount")
        if payload["loan_term_days"] <= 0:
            raise ModelServiceError("loan_term_days must be greater than zero")
        for field in ("active_loans_count", "missed_payments_6m", "collateral_value"):
            if payload[field] < 0:
                raise ModelServiceError(f"{field} cannot be negative")

    def predict(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._validate(payload)

        try:
            stability, confidence, _months, avg_inflow = compute_income_stability(payload["monthly_inflows"])
        except ValueError as exc:
            raise ModelServiceError(str(exc)) from exc
        if avg_inflow <= 0:
            raise ModelServiceError("Average monthly inflow must be greater than zero")

        loan_amount = float(payload["loan_amount"])
        repayment = float(payload["repayment_amount"])
        income = float(payload["monthly_income"])

        loan_cost_percentage = ((repayment - loan_amount) / loan_amount) * 100
        repayment_to_income_ratio = repayment / income
        repayment_to_inflow_ratio = repayment / avg_inflow

        features: Dict[str, float] = {
            "age": float(payload["age"]),
            "employment_type": int(payload["employment_type"]),
            "monthly_income": income,
            "income_stability_score": stability,
            "avg_monthly_inflow": avg_inflow,
            "avg_monthly_outflow": float(payload["avg_monthly_outflow"]),
            "avg_balance": float(payload["avg_balance"]),
            "active_loans_count": int(payload["active_loans_count"]),
            "missed_payments_6m": int(payload["missed_payments_6m"]),
            "loan_amount": loan_amount,
            "repayment_amount": repayment,
            "loan_cost_percentage": loan_cost_percentage,
            "repayment_to_income_ratio": repayment_to_income_ratio,
            "repayment_to_inflow_ratio": repayment_to_inflow_ratio,
            "loan_term_days": float(payload["loan_term_days"]),
            "collateral_value": float(payload["collateral_value"]),
        }

        try:
            frame = pd.DataFrame([[features[column] for column in self.feature_order]], columns=self.feature_order)
        except KeyError as exc:
            raise ModelServiceError(f"Feature ordering mismatch, missing column {exc}") from exc

        try:
            processed = self.preprocessor.transform(frame)
        except Exception as exc:
            raise ModelServiceError(f"Preprocessing failed: {exc}") from exc

        try:
            probability = float(self.model.predict_proba(processed)[0, 1])
        except Exception as exc:
            raise ModelServiceError(f"Prediction failed: {exc}") from exc

        prediction = int(probability >= self.threshold)
        level = risk_level(probability)

        return {
            "risk_probability": round(probability * 100, 2),
            "risk_level": level,
            "debt_stress_prediction": prediction,
            "prediction_label": "Debt Stress" if prediction == 1 else "Safer Loan",
            "threshold_used": self.threshold,
            "risk_reasons": build_risk_reasons(features),
            "calculated_features": {
                "income_stability_score": stability,
                "income_stability_confidence": confidence,
                "avg_monthly_inflow": avg_inflow,
                "loan_cost_percentage": round(loan_cost_percentage, 2),
                "repayment_to_income_ratio": round(repayment_to_income_ratio, 4),
                "repayment_to_inflow_ratio": round(repayment_to_inflow_ratio, 4),
            },
            "message": risk_message(level),
        }
