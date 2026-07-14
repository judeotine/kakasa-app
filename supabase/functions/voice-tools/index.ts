import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function formatAmount(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-vapi-secret, content-type",
    },
  });
}

async function verifyProvider(name: string): Promise<string> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return "Please tell me the name of the lender you want to verify.";
  }

  const escaped = trimmed.replace(/%/g, "\\%").replace(/_/g, "\\_");
  const { data: matches } = await admin
    .from("loan_providers")
    .select("id, name, max_amount, min_rate, max_rate, term_min_months, term_max_months")
    .ilike("name", `%${escaped}%`)
    .order("name")
    .limit(3);

  if (!matches || matches.length === 0) {
    return `WARNING: ${trimmed} is NOT a verified lender on Kakasa. Be very cautious. Do not share personal information or make any payments to this provider. If you received a call or message from them, it could be a scam. You can report this using our fraud reporting option.`;
  }

  const p = matches[0]!;
  let result = `Great news! ${p.name} is a VERIFIED lender on Kakasa. `;
  result += `They offer loans of up to ${formatAmount(Number(p.max_amount))} Uganda Shillings, `;
  result += `with interest rates between ${p.min_rate} and ${p.max_rate} percent, `;
  result += `for loan terms of ${p.term_min_months} to ${p.term_max_months} months. `;
  result += `You can apply through the Kakasa mobile app or visit a Kakasa agent near you.`;

  if (matches.length > 1) {
    const others = matches.slice(1).map((m: Record<string, unknown>) => String(m.name));
    result += ` I also found similar verified lenders: ${others.join(" and ")}.`;
  }

  return result;
}

async function reportFraud(
  description: string,
  suspiciousNumber: string,
  callerPhone: string,
  callId: string
): Promise<string> {
  await admin.from("fraud_reports").insert({
    caller_phone: callerPhone || "unknown",
    reported_entity: suspiciousNumber || "",
    description: description || "",
    call_session_id: callId || "",
  });

  return "Thank you for reporting this. Your report has been logged and our team will investigate. Remember: Kakasa will never call you to ask for your PIN or personal details. If someone claims to be from Kakasa and asks for this information, it is a scam. Stay safe.";
}

function getHelp(topic: string): string {
  const t = (topic || "general").toLowerCase();

  if (t.includes("loan") || t.includes("borrow") || t.includes("apply")) {
    return "To get a loan through Kakasa: First, check your credit score by dialing star 384 star 44413 hash or using the Kakasa app. Then browse eligible lenders based on your score. Apply through the Kakasa mobile app or visit a Kakasa agent near you. Once approved, funds are sent directly to your Mobile Money account. You can repay anytime through USSD or the app.";
  }

  if (t.includes("score") || t.includes("credit")) {
    return "Your Kakasa credit score ranges from 300 to 850 points. It shows lenders how reliable you are. To improve your score: pay your loans on time, this can add 5 to 15 points. Borrow less than 30 percent of your monthly income. Avoid having multiple loans at the same time. You can check your score anytime for free through the Kakasa app or USSD.";
  }

  if (t.includes("scam") || t.includes("fraud") || t.includes("safe") || t.includes("protect")) {
    return "To protect yourself from loan scams: Only borrow from verified lenders listed on Kakasa. Never pay upfront fees to get a loan, legitimate lenders do not charge fees before giving you money. Never share your PIN with anyone, even if they claim to be from Kakasa. If a loan offer sounds too good to be true, it probably is. Always verify the lender by calling this hotline or using USSD.";
  }

  if (t.includes("repay") || t.includes("pay")) {
    return "You can repay your Kakasa loans in several ways: Dial star 384 star 44413 hash on your phone for USSD repayment. Use the Kakasa mobile app. Visit a Kakasa agent near you. Payments are processed through Mobile Money. You can make full or partial payments at any time. Paying on time improves your credit score.";
  }

  return "Kakasa is a mobile lending platform in Uganda that helps you access affordable loans. You can check your credit score for free, browse verified lenders, apply for loans, and make repayments all from your phone. Use the Kakasa app for the full experience, or dial star 384 star 44413 hash for USSD access. Call this hotline anytime to verify a lender or get help.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({});
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.json();
  const message = body.message;

  if (!message) {
    return jsonResponse({ ok: true });
  }

  if (message.type === "function-call") {
    const { name, parameters } = message.functionCall;
    const callerPhone = message.call?.customer?.number || body.call?.customer?.number || "";
    const callId = message.call?.id || body.call?.id || "";

    let result: string;

    switch (name) {
      case "verify_provider":
        result = await verifyProvider(parameters.name || "");
        break;
      case "report_fraud":
        result = await reportFraud(
          parameters.description || "",
          parameters.suspicious_number || "",
          callerPhone,
          callId
        );
        break;
      case "get_help":
        result = getHelp(parameters.topic || "");
        break;
      default:
        result = "I can help you verify if a loan provider is legitimate, answer questions about how Kakasa works, or report suspicious activity. What would you like to do?";
    }

    return jsonResponse({ result });
  }

  if (message.type === "end-of-call-report") {
    await admin.from("voice_sessions").insert({
      session_id: message.call?.id || "",
      caller_phone: message.call?.customer?.number || "",
      language: "eng",
      action: "call_completed",
      duration_seconds: message.durationSeconds || 0,
    });
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: true });
});
