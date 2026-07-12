import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from "../_shared/supabaseAdmin.ts";
import { ussdResponse, formatPhone, maskPhone } from "../_shared/africastalking.ts";
import { ussdText, nextLanguage, languageName, getTip } from "../_shared/ussdStrings.ts";
const PBKDF2_ITERATIONS = 100_000;

async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}

async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [saltHex, expectedHash] = stored.split(":");
  if (!saltHex || !expectedHash) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex === expectedHash;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const admin = createAdminClient();

interface UserContext {
  id: string;
  name: string;
  lang: string;
  pinHash: string | null;
  pinAttempts: number;
  lockedUntil: string | null;
}

interface LoanContext {
  id: string;
  provider: string;
  outstanding: number;
  dueDate: string;
  status: string;
  interestRate: number;
}

async function lookupUser(phone: string): Promise<UserContext | null> {
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, preferred_language, ussd_pin_hash, ussd_pin_attempts, ussd_locked_until")
    .eq("phone", phone)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.full_name ?? "User",
    lang: data.preferred_language ?? "eng",
    pinHash: data.ussd_pin_hash,
    pinAttempts: data.ussd_pin_attempts ?? 0,
    lockedUntil: data.ussd_locked_until,
  };
}

async function getActiveLoans(userId: string): Promise<LoanContext[]> {
  const { data } = await admin
    .from("loans")
    .select("id, provider, principal, total_repayable, amount_paid, due_date, status, interest_rate")
    .eq("user_id", userId)
    .in("status", ["active", "overdue"])
    .order("due_date", { ascending: true });
  if (!data) return [];
  return data.map((l: Record<string, unknown>) => ({
    id: String(l.id),
    provider: String(l.provider),
    outstanding: Number(l.total_repayable) - Number(l.amount_paid ?? 0),
    dueDate: String(l.due_date),
    status: String(l.status),
    interestRate: Number(l.interest_rate),
  }));
}

async function getLatestScore(userId: string): Promise<{ score: number; band: string } | null> {
  const { data } = await admin
    .from("credit_scores")
    .select("score, band")
    .eq("user_id", userId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { score: Number(data.score), band: String(data.band) };
}

function redactPin(inputChain: string, action: string): string {
  if (!inputChain) return inputChain;
  const parts = inputChain.split("*");
  if ((action === "repay" || action === "repay_partial") && parts.length >= 3) {
    parts[parts.length - 1] = "****";
  }
  if (action === "new_user" && parts.length >= 5 && parts[0] === "1") {
    parts[parts.length - 1] = "****";
  }
  return parts.join("*");
}

async function logSession(
  sessionId: string,
  phone: string,
  userId: string | null,
  action: string,
  inputChain: string,
  lang: string
): Promise<void> {
  await admin.from("ussd_sessions").insert({
    session_id: sessionId,
    phone_number: phone,
    user_id: userId,
    action,
    input_chain: redactPin(inputChain, action),
    language: lang,
  });
}

function formatAmount(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const due = new Date(dateStr);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function mainMenu(user: UserContext, loans: LoanContext[], score: { score: number; band: string } | null): Response {
  const lang = user.lang;
  const overdue = loans.find((l) => l.status === "overdue");

  if (overdue) {
    const days = Math.abs(daysUntil(overdue.dueDate));
    return ussdResponse(
      ussdText("welcome_overdue", lang, {
        name: user.name.split(" ")[0]!,
        amount: formatAmount(overdue.outstanding),
        days: String(days),
        outstanding: formatAmount(overdue.outstanding),
        lang: languageName(lang),
      }),
      false
    );
  }

  if (loans.length > 0) {
    const next = loans[0]!;
    const days = daysUntil(next.dueDate);
    return ussdResponse(
      ussdText("welcome_active", lang, {
        name: user.name.split(" ")[0]!,
        amount: formatAmount(next.outstanding),
        days: String(Math.max(0, days)),
        lang: languageName(lang),
      }),
      false
    );
  }

  return ussdResponse(
    ussdText("welcome_idle", lang, {
      name: user.name.split(" ")[0]!,
      score: score ? String(score.score) : "---",
      band: score?.band ?? "Unknown",
      max_amount: "2,000,000",
      lang: languageName(lang),
    }),
    false
  );
}

async function handleRepayment(
  steps: string[],
  user: UserContext,
  loans: LoanContext[],
  phone: string
): Promise<Response> {
  const lang = user.lang;

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    return ussdResponse(ussdText("repay_locked", lang), true);
  }

  let selectedLoan: LoanContext;

  if (loans.length > 1 && steps.length === 0) {
    const list = loans.map((l, i) => `${i + 1}. ${l.provider} - ${formatAmount(l.outstanding)} UGX`).join("\n");
    return ussdResponse(ussdText("loan_list", lang, { list }), false);
  }

  if (loans.length > 1) {
    const loanIdx = parseInt(steps[0]!) - 1;
    if (isNaN(loanIdx) || loanIdx < 0 || loanIdx >= loans.length) {
      return ussdResponse(ussdText("invalid_input", lang, { menu: "" }), true);
    }
    selectedLoan = loans[loanIdx]!;
    steps = steps.slice(1);
  } else {
    selectedLoan = loans[0]!;
  }

  if (steps.length === 0) {
    return ussdResponse(
      ussdText("repay_amount", lang, {
        provider: selectedLoan.provider,
        outstanding: formatAmount(selectedLoan.outstanding),
        due_date: selectedLoan.dueDate,
        half: formatAmount(Math.ceil(selectedLoan.outstanding / 2)),
      }),
      false
    );
  }

  let amount: number;
  const amountChoice = steps[0]!;
  if (amountChoice === "1") amount = selectedLoan.outstanding;
  else if (amountChoice === "2") amount = Math.ceil(selectedLoan.outstanding / 2);
  else if (amountChoice === "3" && steps.length === 1) {
    return ussdResponse(ussdText("repay_custom", lang), false);
  } else if (amountChoice === "3" && steps.length >= 2) {
    amount = parseInt(steps[1]!);
    if (isNaN(amount) || amount <= 0) return ussdResponse(ussdText("invalid_input", lang, { menu: "" }), true);
    steps = steps.slice(1);
  } else {
    return ussdResponse(ussdText("invalid_input", lang, { menu: "" }), true);
  }

  const pinStep = amountChoice === "3" ? steps[2] : steps[1];

  if (!pinStep) {
    return ussdResponse(
      ussdText("repay_confirm", lang, {
        amount: formatAmount(amount!),
        phone: maskPhone(phone),
        rate: String(selectedLoan.interestRate),
      }),
      false
    );
  }

  if (!user.pinHash) {
    return ussdResponse("No PIN set. Dial back and register first.", true);
  }

  const pinValid = await verifyPin(pinStep, user.pinHash);
  if (!pinValid) {
    const remaining = 3 - (user.pinAttempts + 1);
    if (remaining <= 0) {
      await admin
        .from("profiles")
        .update({
          ussd_pin_attempts: 0,
          ussd_locked_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })
        .eq("id", user.id);
      return ussdResponse(ussdText("repay_locked", lang), true);
    }
    await admin
      .from("profiles")
      .update({ ussd_pin_attempts: user.pinAttempts + 1 })
      .eq("id", user.id);
    return ussdResponse(ussdText("repay_bad_pin", lang, { attempts: String(remaining) }), false);
  }

  await admin.from("profiles").update({ ussd_pin_attempts: 0 }).eq("id", user.id);

  const txRef = `KKS-PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const { data: payment, error: payErr } = await admin
    .from("loan_payments")
    .insert({
      loan_id: selectedLoan.id,
      user_id: user.id,
      amount: amount!,
      payment_method: "mobile_money",
      phone_number: phone,
      transaction_ref: txRef,
      status: "completed",
      paid_at: new Date().toISOString(),
    })
    .select("receipt_number")
    .single();

  if (payErr) {
    return ussdResponse("Payment failed. Try again later.", true);
  }

  const scoreData = await getLatestScore(user.id);
  const tipKey = getTip(user.id);

  return ussdResponse(
    ussdText("repay_success", lang, {
      amount: formatAmount(amount!),
      receipt: payment?.receipt_number ?? txRef,
      remaining: formatAmount(Math.max(0, selectedLoan.outstanding - amount!)),
      score: scoreData ? String(scoreData.score) : "---",
      tip: ussdText(tipKey, lang),
    }),
    true
  );
}

async function handleScore(steps: string[], user: UserContext): Promise<Response> {
  const lang = user.lang;
  const scoreData = await getLatestScore(user.id);

  if (steps.length === 0) {
    return ussdResponse(
      ussdText("score_view", lang, {
        score: scoreData ? String(scoreData.score) : "---",
        band: scoreData?.band ?? "Unknown",
        trend: "",
        payment: "Good",
        debt: "Moderate",
        income: "Good",
      }),
      false
    );
  }

  if (steps[0] === "2") {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return ussdResponse(
      ussdText("score_improve", lang, {
        date: nextMonth.toISOString().slice(0, 10),
      }),
      true
    );
  }

  return ussdResponse(ussdText("help_scores", lang), true);
}

async function handleLenders(steps: string[], user: UserContext): Promise<Response> {
  const lang = user.lang;
  const scoreData = await getLatestScore(user.id);
  const score = scoreData?.score ?? 0;

  const { data: providers } = await admin
    .from("loan_providers")
    .select("id, name, max_amount, min_rate, max_rate, min_score, term_min_months, term_max_months, requirements")
    .lte("min_score", score)
    .order("min_rate", { ascending: true })
    .limit(5);

  if (!providers || providers.length === 0) {
    return ussdResponse("No lenders match your\ncurrent score.\nImprove your score first.", true);
  }

  if (steps.length === 0) {
    const list = providers
      .slice(0, 3)
      .map((p: Record<string, unknown>, i: number) => `${i + 1}. ${p.name} - ${formatAmount(Number(p.max_amount))} UGX`)
      .join("\n");
    return ussdResponse(ussdText("lenders_list", lang, { score: String(score), list }), false);
  }

  const idx = parseInt(steps[0]!) - 1;
  if (isNaN(idx) || idx < 0 || idx >= providers.length) {
    return ussdResponse(ussdText("invalid_input", lang, { menu: "" }), true);
  }

  const p = providers[idx]!;
  return ussdResponse(
    ussdText("lender_detail", lang, {
      name: String(p.name),
      max: formatAmount(Number(p.max_amount)),
      min_rate: String(p.min_rate),
      max_rate: String(p.max_rate),
      term_min: String(p.term_min_months),
      term_max: String(p.term_max_months),
    }),
    true
  );
}

function handleHelp(steps: string[], lang: string): Response {
  if (steps.length === 0) return ussdResponse(ussdText("help_menu", lang), false);
  switch (steps[0]) {
    case "1": return ussdResponse(ussdText("help_kakasa", lang), true);
    case "2": return ussdResponse(ussdText("help_loans", lang), true);
    case "3": return ussdResponse(ussdText("help_scores", lang), true);
    case "4": return ussdResponse(ussdText("help_contact", lang), true);
    default: return ussdResponse(ussdText("help_menu", lang), false);
  }
}

async function handleRegistration(
  steps: string[],
  phone: string
): Promise<Response> {
  if (steps.length === 0) return ussdResponse(ussdText("register_name", "eng"), false);
  if (steps.length === 1) return ussdResponse(ussdText("register_nin", "eng"), false);
  if (steps.length === 2) return ussdResponse(ussdText("register_lang", "eng"), false);
  if (steps.length === 3) return ussdResponse(ussdText("register_pin", "eng"), false);

  const fullName = steps[0]!;
  const nin = steps[1]!.toUpperCase();
  const langChoice = steps[2]!;
  const pin = steps[3]!;

  const ninPattern = /^C[MF][A-Z0-9]{12}$/;
  if (!ninPattern.test(nin)) {
    return ussdResponse("Invalid NIN format.\nMust be 14 characters\n(e.g. CM9401027XXXXX)", true);
  }

  if (!/^\d{4}$/.test(pin)) {
    return ussdResponse("PIN must be exactly\n4 digits. Dial back\nto try again.", true);
  }

  const langMap: Record<string, string> = { "1": "eng", "2": "lug", "3": "nyn", "4": "ach", "5": "teo", "6": "lgg", "7": "sw" };
  const lang = langMap[langChoice] ?? "eng";
  const pinHashed = await hashPin(pin);

  const formattedPhone = formatPhone(phone);
  let userId: string | null = null;

  const { data: authUser, error: createErr } = await admin.auth.admin.createUser({
    phone: formattedPhone,
    phone_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authUser?.user) {
    userId = authUser.user.id;
  } else if (createErr) {
    const phoneDigits = formattedPhone.replace(/^\+/, "");
    const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const match = existing?.users?.find((u: { phone?: string }) => {
      const p = u.phone ?? "";
      return p === formattedPhone || p === phoneDigits;
    });
    if (match) {
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id, ussd_pin_hash")
        .eq("id", match.id)
        .maybeSingle();
      if (existingProfile?.ussd_pin_hash) {
        return ussdResponse("Account already exists.\nDial back to log in.", true);
      }
      userId = match.id;
    }
  }

  if (!userId) {
    return ussdResponse("Registration failed.\nPlease try again later.", true);
  }

  const { error: profileErr } = await admin.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    phone: formattedPhone,
    nin,
    preferred_language: lang,
    ussd_pin_hash: pinHashed,
    onboarding_completed: true,
  }, { onConflict: "id", ignoreDuplicates: true });

  if (profileErr) {
    return ussdResponse("Registration failed.\nPlease try again later.", true);
  }

  const firstName = fullName.split(" ")[0]!;
  return ussdResponse(ussdText("register_done", lang, { name: firstName }), true);
}

async function handleNewUser(steps: string[], phone: string): Promise<Response> {
  if (steps.length === 0) return ussdResponse(ussdText("welcome_new", "eng"), false);

  switch (steps[0]) {
    case "1": return handleRegistration(steps.slice(1), phone);
    case "2": {
      if (steps.length === 1) return ussdResponse(ussdText("learn_more", "eng"), false);
      if (steps[1] === "1") return handleRegistration([], phone);
      return ussdResponse(ussdText("welcome_new", "eng"), false);
    }
    case "3": return ussdResponse(ussdText("register_lang", "eng"), false);
    default: return ussdResponse(ussdText("welcome_new", "eng"), false);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("AT_WEBHOOK_SECRET");
  if (webhookSecret) {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? "";
    if (!constantTimeEqual(token, webhookSecret)) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let sessionId: string, phoneNumber: string, text: string;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData();
    sessionId = formData.get("sessionId")?.toString() ?? "";
    phoneNumber = formData.get("phoneNumber")?.toString() ?? "";
    text = formData.get("text")?.toString() ?? "";
  } else {
    const body = await req.json();
    sessionId = body.sessionId ?? "";
    phoneNumber = body.phoneNumber ?? "";
    text = body.text ?? "";
  }

  const phone = formatPhone(phoneNumber);
  const steps = text === "" ? [] : text.split("*");

  const { count } = await admin
    .from("ussd_sessions")
    .select("id", { count: "exact", head: true })
    .eq("phone_number", phone)
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if (count !== null && count >= 50) {
    return ussdResponse("Too many requests. Try again later.", true);
  }

  const user = await lookupUser(phone);

  if (!user) {
    await logSession(sessionId, phone, null, "new_user", text, "eng");
    return handleNewUser(steps, phone);
  }

  if (steps.length > 0 && steps[0] === "0") {
    const newLang = nextLanguage(user.lang);
    await admin.from("profiles").update({ preferred_language: newLang }).eq("id", user.id);
    user.lang = newLang;
    const loans = await getActiveLoans(user.id);
    const score = await getLatestScore(user.id);
    await logSession(sessionId, phone, user.id, "change_lang", text, newLang);
    return mainMenu(user, loans, score);
  }

  const loans = await getActiveLoans(user.id);
  const score = await getLatestScore(user.id);

  if (steps.length === 0) {
    await logSession(sessionId, phone, user.id, "main_menu", text, user.lang);
    return mainMenu(user, loans, score);
  }

  const hasOverdue = loans.some((l) => l.status === "overdue");
  const hasActive = loans.length > 0;

  let menuMap: Record<string, string>;
  if (hasOverdue) {
    menuMap = { "1": "repay", "2": "repay_partial", "3": "score", "4": "help" };
  } else if (hasActive) {
    menuMap = { "1": "repay", "2": "loan_details", "3": "score", "4": "tip" };
  } else {
    menuMap = { "1": "lenders", "2": "score", "3": "tip", "4": "help" };
  }

  const action = menuMap[steps[0]!] ?? "invalid";
  const subSteps = steps.slice(1);

  await logSession(sessionId, phone, user.id, action, text, user.lang);

  switch (action) {
    case "repay":
    case "repay_partial":
      return handleRepayment(subSteps, user, loans, phone);
    case "score":
      return handleScore(subSteps, user);
    case "lenders":
      return handleLenders(subSteps, user);
    case "help":
      return handleHelp(subSteps, user.lang);
    case "tip": {
      const tipKey = getTip(user.id);
      return ussdResponse(ussdText(tipKey, user.lang), true);
    }
    case "loan_details": {
      if (loans.length === 0) return ussdResponse("No active loans.", true);
      const l = loans[0]!;
      return ussdResponse(
        `${l.provider}\nOutstanding: ${formatAmount(l.outstanding)} UGX\nDue: ${l.dueDate}\nRate: ${l.interestRate}%\n\n1. Repay\n0. Back`,
        false
      );
    }
    default:
      return ussdResponse(ussdText("invalid_input", user.lang, { menu: "" }), true);
  }
});
