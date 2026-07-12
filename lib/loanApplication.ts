import { File } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";

export type ApplicationStatus =
  | "credit_check"
  | "consent"
  | "interviewing"
  | "reviewing"
  | "approved"
  | "declined"
  | "cancelled";

export interface InterviewMessage {
  role: "interviewer" | "applicant";
  content: string;
  timestamp: string;
}

export interface ApplicationDocument {
  id: string;
  doc_type: string;
  file_name: string;
  storage_path: string;
  uploaded_at: string;
}

export interface LoanApplication {
  id: string;
  user_id: string;
  provider_id: string;
  status: ApplicationStatus;
  credit_score: number | null;
  risk_level: string | null;
  risk_probability: number | null;
  amount_requested: number | null;
  term_months: number | null;
  interview_transcript: InterviewMessage[];
  interview_score: number | null;
  interview_flags: string[];
  documents: ApplicationDocument[];
  decision_reasons: string[];
  decided_at: string | null;
  disbursement_id: string | null;
  disbursement_phone: string | null;
  created_at: string;
  updated_at: string;
}

interface ApplicationRow {
  id: string;
  user_id: string;
  provider_id: string;
  status: ApplicationStatus;
  credit_score: number | null;
  risk_level: string | null;
  risk_probability: number | null;
  amount_requested: number | null;
  term_months: number | null;
  interview_transcript: InterviewMessage[];
  interview_score: number | null;
  interview_flags: string[];
  documents: ApplicationDocument[];
  decision_reasons: string[];
  decided_at: string | null;
  disbursement_id: string | null;
  disbursement_phone: string | null;
  created_at: string;
  updated_at: string;
}

function toApplication(row: ApplicationRow): LoanApplication {
  return {
    id: row.id,
    user_id: row.user_id,
    provider_id: row.provider_id,
    status: row.status,
    credit_score: row.credit_score,
    risk_level: row.risk_level,
    risk_probability: row.risk_probability,
    amount_requested: row.amount_requested,
    term_months: row.term_months,
    interview_transcript: row.interview_transcript ?? [],
    interview_score: row.interview_score,
    interview_flags: (row.interview_flags as string[]) ?? [],
    documents: (row.documents as ApplicationDocument[]) ?? [],
    decision_reasons: (row.decision_reasons as string[]) ?? [],
    decided_at: row.decided_at,
    disbursement_id: row.disbursement_id ?? null,
    disbursement_phone: row.disbursement_phone ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const APPLICATION_SELECT = `
  id, user_id, provider_id, status,
  credit_score, risk_level, risk_probability,
  amount_requested, term_months,
  interview_transcript, interview_score, interview_flags,
  documents, decision_reasons, decided_at,
  disbursement_id, disbursement_phone,
  created_at, updated_at
`;

export async function createApplication(
  providerId: string,
  creditScore: number,
  riskLevel: string | null,
  riskProbability: number | null,
  amountRequested: number,
  termMonths: number
): Promise<LoanApplication> {
  const { data, error } = await supabase
    .from("loan_applications")
    .insert({
      provider_id: providerId,
      status: "credit_check" as ApplicationStatus,
      credit_score: creditScore,
      risk_level: riskLevel,
      risk_probability: riskProbability,
      amount_requested: amountRequested,
      term_months: termMonths,
    })
    .select(APPLICATION_SELECT)
    .single();

  if (error) throw error;
  return toApplication(data as ApplicationRow);
}

export async function getApplication(id: string): Promise<LoanApplication | null> {
  const { data, error } = await supabase
    .from("loan_applications")
    .select(APPLICATION_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toApplication(data as ApplicationRow) : null;
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "approved" || status === "declined") {
    update.decided_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("loan_applications")
    .update(update)
    .eq("id", id);

  if (error) throw error;
}

export async function updateInterviewTranscript(
  id: string,
  transcript: InterviewMessage[]
): Promise<void> {
  const { error } = await supabase
    .from("loan_applications")
    .update({
      interview_transcript: transcript,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function getActiveApplication(
  providerId: string
): Promise<LoanApplication | null> {
  const { data, error } = await supabase
    .from("loan_applications")
    .select(APPLICATION_SELECT)
    .eq("provider_id", providerId)
    .in("status", ["credit_check", "consent", "interviewing", "reviewing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? toApplication(data as ApplicationRow) : null;
}

export interface ApplicantDetails {
  full_name: string;
  date_of_birth: string;
  gender: string;
  location: string;
  phone: string;
}

export async function saveConsent(
  applicationId: string,
  details: ApplicantDetails
): Promise<void> {
  const { error } = await supabase
    .from("loan_applications")
    .update({
      applicant_details: details,
      consent_accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) throw error;
}

export async function setIdSubmitted(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from("loan_applications")
    .update({
      id_submitted: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) throw error;
}

export async function setLivenessComplete(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from("loan_applications")
    .update({
      liveness_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) throw error;
}

async function resizeImage(uri: string, maxWidth = 1280): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { format: SaveFormat.JPEG, compress: 0.7 }
  );
  return result.uri;
}

export async function uploadDocument(
  applicationId: string,
  docType: string,
  fileName: string,
  fileUri: string,
  userId?: string
): Promise<ApplicationDocument> {
  if (!userId) {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData.user?.id;
  }

  const isImage = /\.(jpe?g|png|heic|heif|webp)$/i.test(fileName) || docType.startsWith("face_") || docType.startsWith("id_");
  const finalUri = isImage ? await resizeImage(fileUri, docType.startsWith("face_") ? 640 : 1280) : fileUri;

  const ext = (fileName.split(".").pop() ?? "jpg").toLowerCase();
  const storagePath = `documents/${userId}/${applicationId}/${docType}_${Date.now()}.${ext}`;

  const arrayBuffer = await new File(finalUri).arrayBuffer();
  const contentType = ext === "png" ? "image/png" : "image/jpeg";

  const { error: uploadError } = await supabase.storage
    .from("application-documents")
    .upload(storagePath, arrayBuffer, { contentType });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("application_documents")
    .insert({
      application_id: applicationId,
      doc_type: docType,
      file_name: fileName,
      storage_path: storagePath,
    })
    .select("id, doc_type, file_name, storage_path, uploaded_at")
    .single();

  if (error) throw error;

  return data as ApplicationDocument;
}
