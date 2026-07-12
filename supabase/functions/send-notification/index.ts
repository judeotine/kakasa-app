import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient, jsonResponse } from "../_shared/supabaseAdmin.ts";

interface NotificationPayload {
  user_id: string;
  title: string;
  body: string;
  type: string;
  metadata?: Record<string, unknown>;
}

const TYPE_TO_PREF: Record<string, string> = {
  loan_update: "notification_loan_alerts",
  loan_approved: "notification_loan_alerts",
  payment_reminder: "notification_payment_reminders",
  credit_score: "notification_credit_score",
};

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!authHeader.includes(serviceKey)) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  let payload: NotificationPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid request body" }, 400);
  }

  const { user_id, title, body, type, metadata } = payload;

  if (!user_id || !title || !body) {
    return jsonResponse(
      { error: "user_id, title, and body are required" },
      400
    );
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select(
      "push_token, notification_loan_alerts, notification_payment_reminders, notification_credit_score, notification_sound"
    )
    .eq("id", user_id)
    .single();

  if (!profile) {
    return jsonResponse({ error: "user not found" }, 404);
  }

  const prefKey = TYPE_TO_PREF[type];
  if (prefKey && !profile[prefKey as keyof typeof profile]) {
    return jsonResponse({ sent: false, reason: "notification_disabled" });
  }

  await admin.from("notifications").insert({
    user_id,
    title,
    body,
    type: type || "general",
    metadata: metadata ?? {},
  });

  if (profile.push_token) {
    const pushBody = {
      to: profile.push_token,
      title,
      body,
      sound: profile.notification_sound ? "default" : undefined,
      data: { type, ...(metadata ?? {}) },
    };

    const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(pushBody),
    });

    const pushResult = await pushRes.json();
    return jsonResponse({ sent: true, push: true, push_result: pushResult });
  }

  return jsonResponse({ sent: true, push: false });
});
