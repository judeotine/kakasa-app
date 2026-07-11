import statistics
from typing import List, Tuple


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def compute_income_stability(monthly_inflows: List[float]) -> Tuple[float, str, int, float]:
    months = len(monthly_inflows)
    if months < 3:
        raise ValueError("At least three months of monthly inflows are required")
    if any(value < 0 for value in monthly_inflows):
        raise ValueError("Monthly inflows cannot be negative")

    average = statistics.fmean(monthly_inflows)
    if average <= 0:
        raise ValueError("Average monthly inflow must be greater than zero")

    stdev = statistics.pstdev(monthly_inflows) if months > 1 else 0.0
    coefficient_of_variation = stdev / average
    consistency_score = _clamp(1 - coefficient_of_variation)

    meaningful_months = sum(1 for value in monthly_inflows if value >= 0.1 * average)
    continuity_score = meaningful_months / months

    half = months // 2
    earlier = statistics.fmean(monthly_inflows[:half]) if half else average
    recent = statistics.fmean(monthly_inflows[half:])
    if recent >= earlier:
        trend_score = 1.0
    else:
        decline_percentage = (earlier - recent) / earlier
        trend_score = _clamp(1 - decline_percentage)

    score = 0.65 * consistency_score + 0.20 * continuity_score + 0.15 * trend_score
    score = round(_clamp(score), 3)

    if months >= 6:
        confidence = "high"
    elif months >= 3:
        confidence = "medium"
    else:
        confidence = "insufficient"

    return score, confidence, months, round(average, 2)
