import { supabase } from "@/lib/supabase";

export interface Provider {
  id: string;
  slug: string;
  name: string;
  loan_type: string;
  logo_color: string;
  min_rate: number;
  max_rate: number;
  max_amount: number;
  min_score: number;
  min_income: number;
  eligible_employment: string[];
  term_min_months: number;
  term_max_months: number;
  requirements: string[];
  description: string | null;
  sort_order: number;
}

export interface Eligibility {
  eligible: boolean;
  reasons: string[];
  meetsScore: boolean;
  meetsIncome: boolean;
  meetsEmployment: boolean;
}

export interface UserProfileForEligibility {
  score: number;
  monthlyIncome: number;
  employment: string | null;
}

const INCOME_BAND_TO_AMOUNT: Record<string, number> = {
  under_500k: 350000,
  "500k_1m": 750000,
  "1m_2m": 1500000,
  "2m_5m": 3500000,
  over_5m: 6000000,
};

const EMPLOYMENT_MAP: Record<string, string> = {
  employed: "employed",
  self_employed: "self_employed",
  business_owner: "business",
  other: "other",
};

function formatThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function parseMoney(text: string | null): number {
  if (text == null) return 0;
  if (text in INCOME_BAND_TO_AMOUNT) return INCOME_BAND_TO_AMOUNT[text]!;
  const digits = text.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

export function normalizeEmployment(value: string | null): string | null {
  if (value == null) return null;
  return EMPLOYMENT_MAP[value] ?? null;
}

export function evaluateEligibility(
  p: Provider,
  u: UserProfileForEligibility
): Eligibility {
  const meetsScore = u.score >= p.min_score;
  const meetsIncome = u.monthlyIncome >= p.min_income;
  const meetsEmployment =
    p.eligible_employment.length === 0 ||
    (u.employment != null && p.eligible_employment.includes(u.employment));
  const eligible = meetsScore && meetsIncome && meetsEmployment;

  const reasons: string[] = [];
  if (!meetsScore) reasons.push(`Needs a credit score of ${p.min_score}`);
  if (!meetsIncome)
    reasons.push(
      `Needs monthly income of UGX ${formatThousands(p.min_income)}`
    );
  if (!meetsEmployment) reasons.push("Not available for your employment type");

  return { eligible, reasons, meetsScore, meetsIncome, meetsEmployment };
}

function mapProvider(row: Record<string, unknown>): Provider {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    loan_type: String(row.loan_type),
    logo_color: String(row.logo_color),
    min_rate: Number(row.min_rate),
    max_rate: Number(row.max_rate),
    max_amount: Number(row.max_amount),
    min_score: Number(row.min_score),
    min_income: Number(row.min_income),
    eligible_employment: (row.eligible_employment as string[] | null) ?? [],
    term_min_months: Number(row.term_min_months),
    term_max_months: Number(row.term_max_months),
    requirements: (row.requirements as string[] | null) ?? [],
    description: (row.description as string | null) ?? null,
    sort_order: Number(row.sort_order),
  };
}

export async function listProviders(): Promise<Provider[]> {
  const { data } = await supabase
    .from("loan_providers")
    .select("*")
    .order("sort_order", { ascending: true });

  if (!data) return [];
  return data.map(mapProvider);
}

export async function getProvider(id: string): Promise<Provider | null> {
  const { data } = await supabase
    .from("loan_providers")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) return null;
  return mapProvider(data);
}

export async function getUserEligibilityContext(): Promise<UserProfileForEligibility> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { score: 0, monthlyIncome: 0, employment: null };
  }

  const [{ data: scoreRow }, { data: profile }] = await Promise.all([
    supabase
      .from("credit_scores")
      .select("score")
      .eq("user_id", user.id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("monthly_income, employment_status")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  return {
    score: scoreRow?.score ?? 0,
    monthlyIncome: parseMoney(profile?.monthly_income ?? null),
    employment: normalizeEmployment(profile?.employment_status ?? null),
  };
}

export async function getRecommendedProviders(
  limit: number
): Promise<{ provider: Provider; eligibility: Eligibility }[]> {
  const [providers, user] = await Promise.all([
    listProviders(),
    getUserEligibilityContext(),
  ]);

  const evaluated = providers.map((provider) => ({
    provider,
    eligibility: evaluateEligibility(provider, user),
  }));

  evaluated.sort((a, b) => {
    if (a.eligibility.eligible !== b.eligibility.eligible) {
      return a.eligibility.eligible ? -1 : 1;
    }
    return a.provider.min_rate - b.provider.min_rate;
  });

  return evaluated.slice(0, limit);
}
