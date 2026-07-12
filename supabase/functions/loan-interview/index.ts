import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createAdminClient,
  createUserClient,
  jsonResponse,
} from "../_shared/supabaseAdmin.ts";

interface TranscriptEntry {
  role: "interviewer" | "applicant";
  content: string;
  timestamp: string;
}

interface InterviewRequest {
  audio_base64?: string;
  audio_format?: string;
  text_message?: string;
  application_id: string;
  provider_id: string;
  transcript: TranscriptEntry[];
  init?: boolean;
  end_interview?: boolean;
}

interface ScoringResult {
  score: number;
  status: "approved" | "declined" | "reviewing";
  flags: string[];
  reasons: string[];
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function openRouterHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
  };
}

async function transcribeAudio(audioBase64: string, format = "m4a"): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: {
                data: audioBase64,
                format: format,
              },
            },
            {
              type: "text",
              text: "Transcribe this audio recording word for word. Return only the spoken text, nothing else. If the audio is silent or unintelligible, return an empty string.",
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "unknown error");
    throw new Error(`Transcription failed: ${detail}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function chatWithInterviewer(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: "deepseek/deepseek-chat-v3-0324",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 300,
      temperature: 0.7,
      stop: ["\nApplicant:", "\nUser:", "\nCandidate:", "\nCustomer:", "\nPeter:", "\nBorrower:", "\nClient:"],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "unknown error");
    throw new Error(`LLM request failed: ${detail}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

function buildSystemPrompt(
  provider: { name: string; loan_type: string; max_amount: number; requirements: string[] | string } | null,
  profile: { full_name: string; employment_status: string; monthly_income: number } | null
): string {
  const providerContext = provider
    ? `The applicant is applying for a ${provider.loan_type} loan from ${provider.name} (max amount: ${provider.max_amount} UGX). Requirements: ${Array.isArray(provider.requirements) ? provider.requirements.join(", ") : provider.requirements}.`
    : "No specific provider details available.";

  const profileContext = profile
    ? `The applicant's name is ${profile.full_name}. They listed their employment as "${profile.employment_status}" with a monthly income of ${profile.monthly_income} UGX.`
    : "No profile details on file.";

  return `You are a professional loan interview officer for Kakasa, a mobile lending platform in Uganda. You are conducting a loan interview with an applicant.

${providerContext}
${profileContext}

CRITICAL RULES:
- You MUST only generate YOUR OWN single response. NEVER write what the applicant might say. NEVER simulate, imagine, or generate the applicant's words.
- Do NOT create a back-and-forth dialogue. Output ONLY your one message, then stop and wait.
- Do NOT write lines like "Applicant:", "Peter:", "User:", "Customer:", or any text pretending to be the applicant.

Your role:
- Ask questions to verify the applicant's identity, employment, income source, and loan purpose.
- Be thorough but friendly and professional. Put the applicant at ease while gathering critical information.
- Ask follow-up questions when answers are vague or inconsistent.
- Watch for red flags: contradictory answers, evasive responses, unrealistic income claims relative to stated employment, reluctance to provide details.
- Keep each response concise — 2 to 3 sentences maximum. Ask one question at a time.
- Start by greeting the applicant by name (if available) and explaining the interview process briefly.
- Cover these areas over the course of the interview: identity verification, current employment details, income sources and amounts, existing debts or obligations, purpose of the loan, repayment plan.
- After 8 to 12 exchanges, begin wrapping up the interview naturally.
- Speak naturally as if in a real conversation — avoid bullet points or numbered lists.`;
}

function buildScoringPrompt(
  transcript: TranscriptEntry[],
  provider: { name: string; loan_type: string; max_amount: number; requirements: string[] | string } | null,
  profile: { full_name: string; employment_status: string; monthly_income: number } | null
): string {
  const transcriptText = transcript
    .map((t) => `${t.role === "interviewer" ? "Interviewer" : "Applicant"}: ${t.content}`)
    .join("\n");

  const providerContext = provider
    ? `Loan type: ${provider.loan_type}, Provider: ${provider.name}, Max amount: ${provider.max_amount} UGX, Requirements: ${Array.isArray(provider.requirements) ? provider.requirements.join(", ") : provider.requirements}`
    : "No provider details.";

  const profileContext = profile
    ? `Name: ${profile.full_name}, Employment: ${profile.employment_status}, Monthly income: ${profile.monthly_income} UGX`
    : "No profile on file.";

  return `You are a loan risk assessment engine. Evaluate the following loan interview transcript and produce a risk score.

Profile on file: ${profileContext}
Loan details: ${providerContext}

Interview transcript:
${transcriptText}

Evaluate the applicant based on:
1. Consistency of answers (do employment, income, and purpose align?)
2. Completeness of information provided
3. Red flags (evasiveness, contradictions, unrealistic claims)
4. Confidence and clarity of responses
5. Alignment between stated income and requested loan amount

Return ONLY valid JSON with no additional text:
{
  "score": <number 0-100>,
  "status": "<approved if score >= 70, reviewing if score 40-69, declined if score < 40>",
  "flags": ["<list of observed positive or negative indicators>"],
  "reasons": ["<list of 2-4 human-readable sentences explaining the decision>"]
}`;
}

async function scoreInterview(
  transcript: TranscriptEntry[],
  provider: { name: string; loan_type: string; max_amount: number; requirements: string[] | string } | null,
  profile: { full_name: string; employment_status: string; monthly_income: number } | null
): Promise<ScoringResult> {
  const prompt = buildScoringPrompt(transcript, provider, profile);
  const raw = await chatWithInterviewer(prompt, [
    { role: "user", content: "Evaluate this interview and return the scoring JSON." },
  ]);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Scoring response did not contain valid JSON");

  const result = JSON.parse(jsonMatch[0]) as ScoringResult;

  if (result.score >= 70) result.status = "approved";
  else if (result.score >= 40) result.status = "reviewing";
  else result.status = "declined";

  return result;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "unauthorized" }, 401);

  const { data: userData, error: userErr } = await createUserClient(authHeader).auth.getUser();
  if (userErr || !userData.user) return jsonResponse({ error: "unauthorized" }, 401);

  let body: InterviewRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid request body" }, 400);
  }

  const { audio_base64, audio_format, text_message, application_id, provider_id, init, end_interview } = body;

  if (!application_id || !provider_id) {
    return jsonResponse({ error: "application_id and provider_id are required" }, 400);
  }

  const admin = createAdminClient();

  try {
    const { data: provider } = await admin
      .from("loan_providers")
      .select("name, loan_type, max_amount, min_rate, max_rate, requirements")
      .eq("id", provider_id)
      .single();

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, employment_status, monthly_income, phone")
      .eq("id", userData.user.id)
      .maybeSingle();

    const { data: app } = await admin
      .from("loan_applications")
      .select("user_id, status, disbursement_id, interview_transcript, amount_requested, term_months, applicant_details")
      .eq("id", application_id)
      .single();

    if (!app || app.user_id !== userData.user.id) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    if (end_interview) {
      if (["approved", "declined", "reviewing"].includes(app.status) || app.disbursement_id) {
        return jsonResponse({ error: "application already decided" }, 409);
      }
      const serverTranscript = (app.interview_transcript ?? []) as TranscriptEntry[];
      const scoringResult = await scoreInterview(serverTranscript, provider, profile);

      const applicationUpdate: Record<string, unknown> = {
        interview_score: scoringResult.score,
        interview_flags: scoringResult.flags,
        status: scoringResult.status,
        decision_reasons: scoringResult.reasons,
        decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let disbursement = null;

      if (scoringResult.status === "approved" && app.amount_requested) {
        const applicantDetails = app.applicant_details as Record<string, string> | null;
        const phoneNumber = applicantDetails?.phone || profile?.phone || "";
        const interestRate = provider?.max_rate ?? 15;
        const termMonths = app.term_months ?? 3;
        const totalRepayable = app.amount_requested * (1 + interestRate / 100);
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + termMonths);

        const { data: loan } = await admin
          .from("loans")
          .insert({
            user_id: userData.user.id,
            provider: provider?.name ?? "Unknown",
            provider_type: provider?.loan_type ?? null,
            principal: app.amount_requested,
            interest_rate: interestRate,
            term_months: termMonths,
            total_repayable: totalRepayable,
            disbursed_at: new Date().toISOString().split("T")[0],
            due_date: dueDate.toISOString().split("T")[0],
            status: "active",
          })
          .select("id")
          .single();

        if (phoneNumber) {
          const txRef = `KKS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

          const { data: disbRow } = await admin
            .from("disbursements")
            .insert({
              application_id,
              loan_id: loan?.id ?? null,
              user_id: userData.user.id,
              amount: app.amount_requested,
              phone_number: phoneNumber,
              provider: "mobile_money",
              status: "completed",
              transaction_ref: txRef,
              completed_at: new Date().toISOString(),
            })
            .select("id, phone_number, amount, transaction_ref, status")
            .single();

          disbursement = disbRow;

          applicationUpdate.disbursement_id = disbRow?.id ?? null;
          applicationUpdate.disbursement_phone = phoneNumber;
        }
      }

      const notifTitle =
        scoringResult.status === "approved"
          ? "Loan Approved & Disbursed!"
          : scoringResult.status === "declined"
            ? "Loan Application Declined"
            : "Loan Application Under Review";

      const providerLabel = provider ? ` with ${provider.name}` : "";
      const notifBody =
        scoringResult.status === "approved"
          ? disbursement
            ? `Your loan of ${Number(disbursement.amount).toLocaleString()} UGX has been sent to ${disbursement.phone_number}.`
            : `Your loan application${providerLabel} has been approved.`
          : scoringResult.status === "declined"
            ? `Your loan application${providerLabel} was not approved at this time.`
            : `Your loan application${providerLabel} is being reviewed.`;

      const notifType =
        scoringResult.status === "approved" ? "loan_approved" : "loan_update";

      await Promise.all([
        admin
          .from("loan_applications")
          .update(applicationUpdate)
          .eq("id", application_id),
        admin.from("notifications").insert({
          user_id: userData.user.id,
          title: notifTitle,
          body: notifBody,
          type: notifType,
          metadata: {
            application_id,
            provider_id,
            score: scoringResult.score,
            status: scoringResult.status,
            disbursement_ref: disbursement?.transaction_ref ?? null,
          },
        }),
        (async () => {
          const { data: userProfile } = await admin
            .from("profiles")
            .select("push_token, notification_loan_alerts, notification_sound")
            .eq("id", userData.user.id)
            .single();

          if (userProfile?.push_token && userProfile.notification_loan_alerts) {
            await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                to: userProfile.push_token,
                title: notifTitle,
                body: notifBody,
                sound: userProfile.notification_sound ? "default" : undefined,
                data: { type: notifType, application_id, provider_id },
              }),
            }).catch(() => {});
          }
        })(),
      ]);

      return jsonResponse({
        user_text: "",
        response_text: "",
        decision: scoringResult,
        disbursement,
      });
    }

    let userText = "";
    if (!init && audio_base64) {
      userText = await transcribeAudio(audio_base64, audio_format || "m4a");
    } else if (!init && text_message) {
      userText = text_message;
    }

    const serverTranscript = (app.interview_transcript ?? []) as TranscriptEntry[];
    const messages = serverTranscript.map((m: TranscriptEntry) => ({
      role: m.role === "interviewer" ? "assistant" : "user",
      content: m.content,
    }));

    if (userText) {
      messages.push({ role: "user", content: userText });
    }

    if (messages.length === 0) {
      messages.push({ role: "user", content: "Please begin the interview." });
    }

    const systemPrompt = buildSystemPrompt(provider, profile);
    const aiResponse = await chatWithInterviewer(systemPrompt, messages);

    return jsonResponse({
      user_text: userText,
      response_text: aiResponse,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal error";
    return jsonResponse({ error: message }, 500);
  }
});
