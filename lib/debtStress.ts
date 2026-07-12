import { supabase } from "@/lib/supabase";
import type { Provider } from "@/lib/providers";

const API_URL = process.env.EXPO_PUBLIC_ML_API_URL;

export type RiskLevel = "Low Risk" | "Caution" | "High Risk" | "Severe Debt-Stress Risk";

export interface DebtStressResult {
  risk_probability: number;
  risk_level: RiskLevel;
  debt_stress_prediction: number;
  prediction_label: string;
  threshold_used: number;
  risk_reasons: string[];
  calculated_features: {
    income_stability_score: number;
    income_stability_confidence: string;
    avg_monthly_inflow: number;
    loan_cost_percentage: number;
    repayment_to_income_ratio: number;
    repayment_to_inflow_ratio: number;
  };
  message: string;
}

const INCOME_MAP: Record<string, number> = {
  under_500k: 350000,
  "500k_1m": 750000,
  "1m_2m": 1500000,
  "2m_5m": 3500000,
  over_5m: 6000000,
};

const AMOUNT_MAP: Record<string, number> = {
  "100k": 100000,
  "500k": 500000,
  "1m": 1000000,
  "2m": 2000000,
  "5m": 5000000,
};

function toNumber(value: string | null, table: Record<string, number>): number {
  if (!value) return 0;
  if (table[value] !== undefined) return table[value];
  const digits = Number(String(value).replace(/[^\d]/g, ""));
  return Number.isFinite(digits) ? digits : 0;
}

function employmentCode(status: string | null): number {
  switch (status) {
    case "employed":
      return 0;
    case "self_employed":
    case "business_owner":
      return 1;
    case "other":
      return 3;
    default:
      return 4;
  }
}

function synthesizeInflows(income: number): number[] {
  const base = income > 0 ? income : 350000;
  return [1.05, 0.95, 1.0, 1.02, 0.98, 1.03].map((f) => Math.round(base * f));
}

export function riskColor(level: RiskLevel): string {
  switch (level) {
    case "Low Risk":
      return "#2E7D32";
    case "Caution":
      return "#E6A100";
    case "High Risk":
      return "#E65100";
    case "Severe Debt-Stress Risk":
      return "#C62828";
  }
}

export interface AssessInput {
  provider: Provider;
  amount?: number;
  termMonths?: number;
}

export interface AssessOutput {
  assessment: DebtStressResult;
  amount: number;
  termMonths: number;
  repayment: number;
}

function defaultAmountFor(provider: Provider, desiredAmount: string | null): number {
  const desired = toNumber(desiredAmount, AMOUNT_MAP);
  const amount = desired > 0 ? desired : 500000;
  return Math.min(amount, provider.max_amount);
}

export async function assessLoanRisk(input: AssessInput): Promise<AssessOutput> {
  if (!API_URL) throw new Error("Risk service is not configured.");

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("You must be signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("employment_status, monthly_income, desired_amount")
    .eq("id", userId)
    .maybeSingle();

  const { data: loans } = await supabase
    .from("loans")
    .select("status")
    .eq("user_id", userId);

  const activeLoans = (loans ?? []).filter((l) => l.status === "active").length;
  const missedPayments = (loans ?? []).filter((l) => l.status === "overdue").length;

  const income = toNumber(profile?.monthly_income ?? null, INCOME_MAP) || 350000;
  const amount = input.amount ?? defaultAmountFor(input.provider, profile?.desired_amount ?? null);
  const termMonths = input.termMonths ?? input.provider.term_min_months;
  const rate = (input.provider.min_rate + input.provider.max_rate) / 2;
  const repayment = Math.round(amount * (1 + (rate / 100) * (termMonths / 12)));

  const body = {
    age: 30,
    employment_type: employmentCode(profile?.employment_status ?? null),
    monthly_income: income,
    monthly_inflows: synthesizeInflows(income),
    avg_monthly_outflow: Math.round(income * 0.7),
    avg_balance: Math.round(income * 0.4),
    active_loans_count: activeLoans,
    missed_payments_6m: missedPayments,
    loan_amount: amount,
    repayment_amount: repayment,
    loan_term_days: termMonths * 30,
    collateral_value: 0,
  };

  const res = await fetch(`${API_URL}/api/debt-stress/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail ?? "Could not assess this loan right now.");
  }

  const assessment = (await res.json()) as DebtStressResult;
  return { assessment, amount, termMonths, repayment };
}
