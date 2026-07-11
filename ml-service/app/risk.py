from typing import Dict, List


def risk_level(probability: float) -> str:
    if probability < 0.30:
        return "Low Risk"
    if probability < 0.40:
        return "Caution"
    if probability < 0.70:
        return "High Risk"
    return "Severe Debt-Stress Risk"


def risk_message(level: str) -> str:
    return {
        "Low Risk": "This loan looks manageable based on the borrower's finances.",
        "Caution": "This loan is close to the borrower's comfortable limit.",
        "High Risk": "This loan may be difficult for the borrower to repay.",
        "Severe Debt-Stress Risk": "This loan may create serious repayment difficulty.",
    }[level]


def build_risk_reasons(features: Dict[str, float]) -> List[str]:
    reasons: List[str] = []
    if features["repayment_to_income_ratio"] >= 0.60:
        reasons.append("Repayment uses a large portion of the borrower's monthly income.")
    if features["repayment_to_inflow_ratio"] >= 0.60:
        reasons.append("Repayment uses a large portion of normal monthly inflows.")
    if features["active_loans_count"] >= 2:
        reasons.append("The borrower already has multiple active loans.")
    if features["missed_payments_6m"] > 0:
        reasons.append("The borrower has missed repayments in the last six months.")
    if features["loan_cost_percentage"] >= 40:
        reasons.append("The loan has a high total cost.")
    if features["loan_term_days"] <= 14:
        reasons.append("The loan has a short repayment period.")
    if features["income_stability_score"] < 0.50:
        reasons.append("The borrower's income has been unstable.")
    if features["avg_monthly_outflow"] >= features["avg_monthly_inflow"]:
        reasons.append("Normal monthly spending is equal to or higher than monthly inflows.")
    return reasons
