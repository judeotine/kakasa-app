import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.income_stability import compute_income_stability
from app.main import app
from app.model_service import MsenteModelService, ModelServiceError

MODEL_PATH = str(Path(__file__).resolve().parent.parent / "models" / "msente_xgboost_model.joblib")

EXPECTED_ORDER = [
    "age", "employment_type", "monthly_income", "income_stability_score",
    "avg_monthly_inflow", "avg_monthly_outflow", "avg_balance", "active_loans_count",
    "missed_payments_6m", "loan_amount", "repayment_amount", "loan_cost_percentage",
    "repayment_to_income_ratio", "repayment_to_inflow_ratio", "loan_term_days", "collateral_value",
]

STABLE_INFLOWS = [480000, 520000, 500000, 510000, 490000, 520000]
IRREGULAR_INFLOWS = [500000, 20000, 480000, 15000, 460000, 10000]

HIGH_RISK = {
    "age": 26, "employment_type": 1, "monthly_income": 450000,
    "monthly_inflows": STABLE_INFLOWS, "avg_monthly_outflow": 430000, "avg_balance": 70000,
    "active_loans_count": 2, "missed_payments_6m": 1, "loan_amount": 200000,
    "repayment_amount": 300000, "loan_term_days": 14, "collateral_value": 0,
}

LOW_RISK = {
    "age": 38, "employment_type": 0, "monthly_income": 3500000,
    "monthly_inflows": [3400000, 3600000, 3500000, 3550000, 3450000, 3600000],
    "avg_monthly_outflow": 1800000, "avg_balance": 2500000, "active_loans_count": 0,
    "missed_payments_6m": 0, "loan_amount": 1000000, "repayment_amount": 1120000,
    "loan_term_days": 180, "collateral_value": 2000000,
}


@pytest.fixture(scope="module")
def svc():
    return MsenteModelService(MODEL_PATH)


def test_model_loads(svc):
    assert svc.model is not None
    assert svc.preprocessor is not None


def test_employment_mapping(svc):
    assert set(svc.employment_mapping.keys()) == {0, 1, 2, 3, 4}


def test_feature_order(svc):
    assert svc.feature_order == EXPECTED_ORDER


def test_threshold_used(svc):
    assert svc.threshold == 0.4
    result = svc.predict(HIGH_RISK)
    assert result["threshold_used"] == 0.4
    assert result["debt_stress_prediction"] == int(result["risk_probability"] / 100 >= 0.4)


def test_derived_features_correct(svc):
    result = svc.predict(HIGH_RISK)
    cf = result["calculated_features"]
    assert cf["loan_cost_percentage"] == 50.0
    assert round(cf["repayment_to_income_ratio"], 4) == round(300000 / 450000, 4)
    assert cf["repayment_to_inflow_ratio"] == round(300000 / cf["avg_monthly_inflow"], 4)


def test_income_stability_bounds():
    for inflows in (STABLE_INFLOWS, IRREGULAR_INFLOWS, [100, 100, 100]):
        score, _c, _m, _a = compute_income_stability(inflows)
        assert 0.0 <= score <= 1.0


def test_stable_inflows_high_stability():
    score, confidence, _m, _a = compute_income_stability(STABLE_INFLOWS)
    assert score >= 0.85
    assert confidence == "high"


def test_irregular_inflows_lower_stability():
    stable, _c1, _m1, _a1 = compute_income_stability(STABLE_INFLOWS)
    irregular, _c2, _m2, _a2 = compute_income_stability(IRREGULAR_INFLOWS)
    assert irregular < stable


def test_invalid_employment_rejected(svc):
    bad = dict(HIGH_RISK, employment_type=9)
    with pytest.raises(ModelServiceError):
        svc.predict(bad)


def test_zero_income_rejected(svc):
    bad = dict(HIGH_RISK, monthly_income=0)
    with pytest.raises(ModelServiceError):
        svc.predict(bad)


def test_repayment_below_loan_rejected(svc):
    bad = dict(HIGH_RISK, repayment_amount=100000, loan_amount=200000)
    with pytest.raises(ModelServiceError):
        svc.predict(bad)


def test_too_few_inflows_rejected(svc):
    bad = dict(HIGH_RISK, monthly_inflows=[500000, 480000])
    with pytest.raises(ModelServiceError):
        svc.predict(bad)


def test_prediction_returns_probability(svc):
    result = svc.predict(LOW_RISK)
    assert 0.0 <= result["risk_probability"] <= 100.0
    assert result["risk_level"] in {"Low Risk", "Caution", "High Risk", "Severe Debt-Stress Risk"}


def test_high_risk_inputs_return_warnings(svc):
    result = svc.predict(HIGH_RISK)
    assert len(result["risk_reasons"]) > 0


def test_response_is_json_safe(svc):
    result = svc.predict(HIGH_RISK)
    json.dumps(result)
    assert isinstance(result["risk_probability"], float)
    assert isinstance(result["debt_stress_prediction"], int)


def test_endpoint_low_and_high():
    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "ok"
        high = client.post("/api/debt-stress/predict", json=HIGH_RISK).json()
        low = client.post("/api/debt-stress/predict", json=LOW_RISK).json()
        assert high["risk_probability"] > low["risk_probability"]
        assert low["risk_level"] == "Low Risk"


def test_endpoint_validation_error():
    with TestClient(app) as client:
        resp = client.post("/api/debt-stress/predict", json=dict(HIGH_RISK, monthly_income=0))
        assert resp.status_code == 400
