import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient, createUserClient, jsonResponse } from "../_shared/supabaseAdmin.ts";
import { computeScore } from "../_shared/creditScorecard.ts";

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

function normalizeEmployment(value: string | null): string | null {
  if (!value) return null;
  if (value === "business_owner") return "business";
  return value;
}

function mapMoney(value: string | null, table: Record<string, number>): number {
  if (!value) return 0;
  if (table[value] !== undefined) return table[value];
  const digits = Number(String(value).replace(/[^\d]/g, ""));
  return Number.isFinite(digits) ? digits : 0;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "unauthorized" }, 401);

  const { data: userData, error: userErr } = await createUserClient(authHeader).auth.getUser();
  if (userErr || !userData.user) return jsonResponse({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("employment_status, monthly_income, desired_amount, has_loan_history")
    .eq("id", userId)
    .maybeSingle();

  const { data: loans } = await admin
    .from("loans")
    .select("status, total_repayable, amount_paid")
    .eq("user_id", userId);

  const result = computeScore({
    employment: normalizeEmployment(profile?.employment_status ?? null),
    monthlyIncome: mapMoney(profile?.monthly_income ?? null, INCOME_MAP),
    desiredAmount: mapMoney(profile?.desired_amount ?? null, AMOUNT_MAP),
    hasLoanHistory: Boolean(profile?.has_loan_history),
    loans: (loans ?? []).map((l) => ({
      status: String(l.status),
      total_repayable: Number(l.total_repayable ?? 0),
      amount_paid: Number(l.amount_paid ?? 0),
    })),
  });

  const nowIso = new Date().toISOString();

  const { data: previous } = await admin
    .from("credit_scores")
    .select("score")
    .eq("user_id", userId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await admin.from("credit_scores").insert({
    user_id: userId,
    score: result.score,
    band: result.band,
    factors: result.factors,
    tips: result.tips,
    computed_at: nowIso,
  });

  const delta = previous?.score != null ? result.score - Number(previous.score) : 0;

  return jsonResponse({
    score: result.score,
    band: result.band,
    factors: result.factors,
    tips: result.tips,
    computed_at: nowIso,
    delta,
  });
});
