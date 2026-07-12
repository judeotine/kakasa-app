export interface ScoreInput {
  employment: string | null;
  monthlyIncome: number;
  desiredAmount: number;
  hasLoanHistory: boolean;
  loans: { status: string; total_repayable: number; amount_paid: number }[];
}

export interface Factor {
  key: string;
  label: string;
  rating: "weak" | "fair" | "good" | "excellent";
  score0to100: number;
  weight: number;
}

export interface ScoreResult {
  score: number;
  band: string;
  factors: Factor[];
  tips: string[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function ratingFor(value: number): Factor["rating"] {
  if (value < 40) return "weak";
  if (value < 60) return "fair";
  if (value < 80) return "good";
  return "excellent";
}

function bandFor(score: number): string {
  if (score < 580) return "Poor";
  if (score < 670) return "Fair";
  if (score < 740) return "Good";
  if (score < 800) return "Very Good";
  return "Excellent";
}

const EMPLOYMENT_SCORE: Record<string, number> = {
  employed: 100,
  business: 85,
  self_employed: 80,
  student: 45,
  unemployed: 25,
  other: 55,
};

const TIP: Record<string, string> = {
  payment_history: "Repay current loans on time to strengthen your payment record.",
  debt_to_income: "Lower your outstanding balance before taking on new debt.",
  employment_income: "A stable, higher income improves your borrowing profile.",
  credit_history: "Build a longer track record by responsibly using small loans.",
  utilization: "Borrow well within your means rather than near your income limit.",
};

const LABEL: Record<string, string> = {
  payment_history: "Payment history",
  debt_to_income: "Debt vs income",
  employment_income: "Employment & income",
  credit_history: "Credit history",
  utilization: "Loan utilization",
};

export function computeScore(input: ScoreInput): ScoreResult {
  const loans = input.loans ?? [];
  const overdue = loans.filter((l) => l.status === "overdue").length;
  const paid = loans.filter((l) => l.status === "paid").length;
  const paymentHistory = loans.length === 0
    ? 55
    : clamp(80 + Math.min(paid, 3) * 5 - overdue * 35, 5, 100);

  const outstanding = loans
    .filter((l) => l.status !== "paid")
    .reduce((sum, l) => sum + (Number(l.total_repayable) - Number(l.amount_paid)), 0);
  const dtiRatio = outstanding / Math.max(input.monthlyIncome * 12, 1);
  const debtToIncome = clamp(100 - dtiRatio * 130, 5, 100);

  const empBase = EMPLOYMENT_SCORE[input.employment ?? "other"] ?? 55;
  const incomeAdj = input.monthlyIncome >= 800000 ? 0 : input.monthlyIncome >= 300000 ? -5 : -20;
  const employmentIncome = clamp(empBase + incomeAdj, 0, 100);

  const creditHistory = input.hasLoanHistory
    ? clamp(70 + Math.min(loans.length, 5) * 6, 0, 100)
    : 40;

  const utilRatio = input.desiredAmount / Math.max(input.monthlyIncome * 10, 1);
  const utilization = clamp(100 - utilRatio * 100, 20, 100);

  const raw: { key: string; value: number; weight: number }[] = [
    { key: "payment_history", value: paymentHistory, weight: 0.35 },
    { key: "debt_to_income", value: debtToIncome, weight: 0.3 },
    { key: "employment_income", value: employmentIncome, weight: 0.15 },
    { key: "credit_history", value: creditHistory, weight: 0.1 },
    { key: "utilization", value: utilization, weight: 0.1 },
  ];

  const composite = raw.reduce((sum, f) => sum + f.value * f.weight, 0);
  const score = Math.round(clamp(300 + (composite / 100) * 550, 300, 850));

  const factors: Factor[] = raw.map((f) => ({
    key: f.key,
    label: LABEL[f.key]!,
    rating: ratingFor(f.value),
    score0to100: Math.round(f.value),
    weight: f.weight,
  }));

  const tips = [...raw]
    .sort((a, b) => a.value - b.value)
    .slice(0, 2)
    .map((f) => TIP[f.key]!)
    .filter(Boolean);

  return { score, band: bandFor(score), factors, tips };
}
