import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createAdminClient,
  createUserClient,
  jsonResponse,
} from "../_shared/supabaseAdmin.ts";
import { sendSMS } from "../_shared/africastalking.ts";
import { ussdText } from "../_shared/ussdStrings.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "missing authorization header" }, 401);
  }

  const userClient = createUserClient(authHeader);
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  let body: {
    loan_id: string;
    amount: number;
    payment_method?: string;
    phone_number?: string;
    card_last_four?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid request body" }, 400);
  }

  const { loan_id, amount, payment_method, phone_number, card_last_four } =
    body;

  if (!loan_id || !amount || amount <= 0) {
    return jsonResponse(
      { error: "loan_id and a positive amount are required" },
      400
    );
  }

  const admin = createAdminClient();

  const { data: loan, error: loanError } = await admin
    .from("loans")
    .select("id, user_id, provider, total_repayable, amount_paid, status")
    .eq("id", loan_id)
    .single();

  if (loanError || !loan) {
    return jsonResponse({ error: "loan not found" }, 404);
  }

  if (loan.user_id !== user.id) {
    return jsonResponse({ error: "loan does not belong to user" }, 403);
  }

  if (loan.status !== "active") {
    return jsonResponse({ error: "loan is not active" }, 400);
  }

  const outstanding = loan.total_repayable - loan.amount_paid;
  if (amount > outstanding) {
    return jsonResponse({ error: "amount exceeds outstanding balance" }, 400);
  }

  const timestamp = Date.now();
  const randomChars = Math.random().toString(36).substring(2, 8);
  const transaction_ref = `KKS-PAY-${timestamp}-${randomChars}`;

  const remaining_balance = outstanding - amount;

  const { data: payment, error: insertError } = await admin
    .from("loan_payments")
    .insert({
      loan_id,
      user_id: user.id,
      amount,
      payment_method: payment_method || "mobile_money",
      phone_number: phone_number || null,
      card_last_four: card_last_four || null,
      transaction_ref,
      provider_name: loan.provider,
      status: "completed",
      remaining_balance,
    })
    .select()
    .single();

  if (insertError) {
    return jsonResponse(
      { error: "failed to process payment", details: insertError.message },
      500
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("push_token, notification_loan_alerts, notification_sound, phone, preferred_language")
    .eq("id", user.id)
    .single();

  const notificationTitle = "Payment Successful";
  const notificationBody = `Your payment of UGX ${amount.toLocaleString()} for ${loan.provider} has been received. Receipt: ${payment.receipt_number}`;

  await admin.from("notifications").insert({
    user_id: user.id,
    title: notificationTitle,
    body: notificationBody,
    type: "loan_update",
    metadata: {
      loan_id,
      payment_id: payment.id,
      receipt_number: payment.receipt_number,
      amount,
    },
  });

  if (profile?.push_token && profile?.notification_loan_alerts) {
    const pushBody = {
      to: profile.push_token,
      title: notificationTitle,
      body: notificationBody,
      sound: profile.notification_sound ? "default" : undefined,
      data: {
        type: "loan_update",
        loan_id,
        payment_id: payment.id,
        receipt_number: payment.receipt_number,
      },
    };

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(pushBody),
    });
  }

  if (profile?.phone) {
    const { data: scoreRow } = await admin
      .from("credit_scores")
      .select("score")
      .eq("user_id", user.id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lang = profile.preferred_language ?? "eng";
    const smsMessage = ussdText("sms_payment_confirm", lang, {
      amount: String(amount),
      provider: loan.provider ?? "Kakasa",
      remaining: String(remaining_balance),
      receipt: payment.receipt_number ?? transaction_ref,
      score: scoreRow?.score ? String(scoreRow.score) : "---",
    });

    sendSMS(profile.phone, smsMessage).catch(() => {});

    admin.from("sms_reminders_sent").insert({
      loan_id,
      user_id: user.id,
      reminder_type: "payment_confirmation",
      phone_number: profile.phone,
      message_id: "",
    }).then(() => {}).catch(() => {});
  }

  return jsonResponse({ payment });
});
