import { supabase } from "@/lib/supabase";

export interface CreditFactor {
  key: string;
  label: string;
  rating: "weak" | "fair" | "good" | "excellent";
  score0to100: number;
  weight: number;
}

export interface CreditScore {
  score: number;
  band: string;
  factors: CreditFactor[];
  tips: string[];
  computed_at: string;
}

export interface CreditResult extends CreditScore {
  delta: number;
}

export const SCORE_MIN = 300;
export const SCORE_MAX = 850;

interface CreditScoreRow {
  score: number;
  band: string;
  factors: CreditFactor[];
  tips: string[];
  computed_at: string;
}

const CREDIT_SCORE_SELECT = "score, band, factors, tips, computed_at";

function toCreditScore(row: CreditScoreRow): CreditScore {
  return {
    score: row.score,
    band: row.band,
    factors: row.factors,
    tips: row.tips,
    computed_at: row.computed_at,
  };
}

export function bandForScore(score: number): string {
  if (score < 580) return "Poor";
  if (score < 670) return "Fair";
  if (score < 740) return "Good";
  if (score < 800) return "Very Good";
  return "Excellent";
}

export function colorForBand(band: string): string {
  switch (band) {
    case "Poor":
      return "#C62828";
    case "Fair":
      return "#E65100";
    case "Good":
      return "#558B2F";
    case "Very Good":
      return "#2E7D32";
    case "Excellent":
      return "#1B5E20";
    default:
      return "#A68A7B";
  }
}

export async function getLatestScore(): Promise<CreditScore | null> {
  const { data, error } = await supabase
    .from("credit_scores")
    .select(CREDIT_SCORE_SELECT)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data ? toCreditScore(data as CreditScoreRow) : null;
}

export async function getScoreHistory(
  limit = 12
): Promise<{ score: number; computed_at: string }[]> {
  const { data, error } = await supabase
    .from("credit_scores")
    .select("score, computed_at")
    .order("computed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data as { score: number; computed_at: string }[]) || [])
    .slice()
    .reverse();
}

export async function computeCreditScore(): Promise<CreditResult> {
  const { data, error } = await supabase.functions.invoke("compute-credit-score");

  if (error) throw error;

  return data as CreditResult;
}

export async function ensureScore(): Promise<CreditScore> {
  const latest = await getLatestScore();
  if (latest) return latest;
  return computeCreditScore();
}
