import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient, jsonResponse } from "../_shared/supabaseAdmin.ts";
import { sendSMS, formatPhone } from "../_shared/africastalking.ts";
import { ussdText } from "../_shared/ussdStrings.ts";

const admin = createAdminClient();

interface LoanReminder {
  loanId: string;
  userId: string;
  phone: string;
  lang: string;
  name: string;
  provider: string;
  outstanding: number;
  dueDate: string;
  daysUntilDue: number;
}

function formatAmount(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function getLoansForReminders(): Promise<LoanReminder[]> {
  const { data: loans } = await admin
    .from("loans")
    .select("id, user_id, provider, total_repayable, amount_paid, due_date, status")
    .in("status", ["active", "overdue"]);

  if (!loans) return [];

  const today = new Date();
  const results: LoanReminder[] = [];

  for (const loan of loans) {
    const dueDate = new Date(loan.due_date);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const outstanding = Number(loan.total_repayable) - Number(loan.amount_paid ?? 0);
    if (outstanding <= 0) continue;

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, phone, preferred_language, notification_payment_reminders")
      .eq("id", loan.user_id)
      .maybeSingle();

    if (!profile || !profile.notification_payment_reminders || !profile.phone) continue;

    results.push({
      loanId: loan.id,
      userId: loan.user_id,
      phone: profile.phone,
      lang: profile.preferred_language ?? "eng",
      name: (profile.full_name ?? "Customer").split(" ")[0]!,
      provider: loan.provider,
      outstanding,
      dueDate: loan.due_date,
      daysUntilDue: diffDays,
    });
  }

  return results;
}

function getReminderType(daysUntilDue: number): string | null {
  if (daysUntilDue === 7) return "pre_7d";
  if (daysUntilDue === 1) return "pre_1d";
  if (daysUntilDue === -3) return "overdue_3d";
  return null;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ") || authHeader.length < 20) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const loans = await getLoansForReminders();
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const loan of loans) {
    const reminderType = getReminderType(loan.daysUntilDue);
    if (!reminderType) {
      skipped++;
      continue;
    }

    const { data: existing } = await admin
      .from("sms_reminders_sent")
      .select("id")
      .eq("loan_id", loan.loanId)
      .eq("reminder_type", reminderType)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const smsKey = `sms_${reminderType}`;
    const message = ussdText(smsKey, loan.lang, {
      name: loan.name,
      provider: loan.provider,
      amount: formatAmount(loan.outstanding),
      due_date: loan.dueDate,
      days: String(Math.abs(loan.daysUntilDue)),
    });

    try {
      const result = await sendSMS(loan.phone, message);

      await admin.from("sms_reminders_sent").insert({
        loan_id: loan.loanId,
        user_id: loan.userId,
        reminder_type: reminderType,
        phone_number: loan.phone,
        message_id: result.messageId,
      });

      sent++;
    } catch (err) {
      errors.push(`${loan.loanId}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  return jsonResponse({ sent, skipped, errors, total_loans: loans.length });
});
