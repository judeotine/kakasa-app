# M-Sente Debt-Stress Risk API

A FastAPI microservice that serves the trained **Msente XGBoost debt-stress model**. It estimates whether a proposed loan may cause debt stress for a borrower. It does **not** approve or reject loans.

Wording used: Low Risk · Caution · High Risk · Severe Debt-Stress Risk.

## Model artifact trust

`models/msente_xgboost_model.joblib` is a first-party artifact trained and supplied by the M-Sente team. It is loaded once at startup with `joblib`. Only load model files from this trusted source — never a joblib/pickle from an untrusted origin (pickle deserialization can execute arbitrary code).

## Endpoints

- `GET /health` — service + model status.
- `POST /api/debt-stress/predict` — debt-stress risk assessment.

The backend computes `avg_monthly_inflow`, `income_stability_score`, `loan_cost_percentage`, `repayment_to_income_ratio`, and `repayment_to_inflow_ratio` from the request. Clients send monthly inflows (3–6 months), not raw transactions.

### Request

```json
{
  "age": 26,
  "employment_type": 1,
  "monthly_income": 450000,
  "monthly_inflows": [480000, 520000, 500000, 510000, 490000, 520000],
  "avg_monthly_outflow": 430000,
  "avg_balance": 70000,
  "active_loans_count": 2,
  "missed_payments_6m": 1,
  "loan_amount": 200000,
  "repayment_amount": 300000,
  "loan_term_days": 14,
  "collateral_value": 0
}
```

`employment_type`: 0 Salaried · 1 Self-employed · 2 Student · 3 Freelancer · 4 Unemployed.

## Run locally

```bash
cd ml-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Test

```bash
cd ml-service && source .venv/bin/activate
pytest -q
```

## Deploy (Render)

Deployed as a Python web service via `render.yaml` (root dir `ml-service`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`). The mobile app calls it via `EXPO_PUBLIC_ML_API_URL`.

## Privacy

Uses monthly aggregate inflows only — never raw transaction descriptions, contacts, SMS, PINs, OTPs, or passwords. Obtain user consent before analysing financial information.
