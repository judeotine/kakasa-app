from typing import List
from pydantic import BaseModel, Field


class BorrowerRequest(BaseModel):
    age: int = Field(ge=18, le=100)
    employment_type: int
    monthly_income: float
    monthly_inflows: List[float]
    avg_monthly_outflow: float
    avg_balance: float
    active_loans_count: int
    missed_payments_6m: int
    loan_amount: float
    repayment_amount: float
    loan_term_days: int
    collateral_value: float = 0.0


class CalculatedFeatures(BaseModel):
    income_stability_score: float
    income_stability_confidence: str
    avg_monthly_inflow: float
    loan_cost_percentage: float
    repayment_to_income_ratio: float
    repayment_to_inflow_ratio: float


class PredictionResponse(BaseModel):
    risk_probability: float
    risk_level: str
    debt_stress_prediction: int
    prediction_label: str
    threshold_used: float
    risk_reasons: List[str]
    calculated_features: CalculatedFeatures
    message: str
