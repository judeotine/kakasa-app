import { supabase } from "@/lib/supabase";

export type LoanStatus = "active" | "paid" | "overdue" | "pending";
export type Period = "day" | "week" | "month" | "year";

export interface Loan {
  id: string;
  provider: string;
  provider_type: string | null;
  principal: number;
  interest_rate: number;
  term_months: number;
  total_repayable: number;
  amount_paid: number;
  outstanding: number;
  disbursed_at: string;
  due_date: string;
  status: LoanStatus;
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  amount: number;
  method: string | null;
  payment_method: "mobile_money" | "visa_card" | null;
  phone_number: string | null;
  card_last_four: string | null;
  transaction_ref: string | null;
  receipt_number: string | null;
  provider_name: string | null;
  status: string;
  remaining_balance: number | null;
  paid_at: string;
}

export interface LoanStats {
  totalOutstanding: number;
  totalBorrowed: number;
  totalRepaid: number;
  activeCount: number;
}

export interface ChartSeries {
  labels: string[];
  borrowed: number[];
  repaid: number[];
}

interface LoanRow {
  id: string;
  provider: string;
  provider_type: string | null;
  principal: number;
  interest_rate: number;
  term_months: number;
  total_repayable: number;
  amount_paid: number;
  disbursed_at: string;
  due_date: string;
  status: LoanStatus;
}

interface LoanPaymentRow {
  id: string;
  loan_id: string;
  amount: number;
  method: string | null;
  payment_method: "mobile_money" | "visa_card" | null;
  phone_number: string | null;
  card_last_four: string | null;
  transaction_ref: string | null;
  receipt_number: string | null;
  provider_name: string | null;
  status: string;
  remaining_balance: number | null;
  paid_at: string;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Bucket {
  start: number;
  end: number;
  label: string;
}

function toLoan(row: LoanRow): Loan {
  return {
    id: row.id,
    provider: row.provider,
    provider_type: row.provider_type,
    principal: row.principal,
    interest_rate: row.interest_rate,
    term_months: row.term_months,
    total_repayable: row.total_repayable,
    amount_paid: row.amount_paid,
    outstanding: row.total_repayable - row.amount_paid,
    disbursed_at: row.disbursed_at,
    due_date: row.due_date,
    status: row.status,
  };
}

const LOAN_SELECT =
  "id, provider, provider_type, principal, interest_rate, term_months, total_repayable, amount_paid, disbursed_at, due_date, status";

const PAYMENT_SELECT =
  "id, loan_id, amount, method, payment_method, phone_number, card_last_four, transaction_ref, receipt_number, provider_name, status, remaining_balance, paid_at";

export function formatUGX(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const digits = Math.abs(rounded).toString();
  const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `UGX ${sign}${withCommas}`;
}

export function formatUGXCompact(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs >= 1e6) {
    return `UGX ${sign}${(abs / 1e6).toFixed(1)}M`;
  }
  if (abs >= 1e3) {
    return `UGX ${sign}${Math.round(abs / 1e3)}K`;
  }
  return `UGX ${sign}${Math.round(abs)}`;
}

export async function listLoans(): Promise<Loan[]> {
  const { data, error } = await supabase
    .from("loans")
    .select(LOAN_SELECT)
    .order("disbursed_at", { ascending: false });

  if (error) throw error;

  return ((data as LoanRow[]) || []).map(toLoan);
}

export async function getLoan(id: string): Promise<Loan | null> {
  const { data, error } = await supabase
    .from("loans")
    .select(LOAN_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data ? toLoan(data as LoanRow) : null;
}

export async function listPayments(loanId: string): Promise<LoanPayment[]> {
  const { data, error } = await supabase
    .from("loan_payments")
    .select(PAYMENT_SELECT)
    .eq("loan_id", loanId)
    .order("paid_at", { ascending: false });

  if (error) throw error;

  return (data as LoanPaymentRow[]) || [];
}

export async function getLoanStats(): Promise<LoanStats> {
  const loans = await listLoans();

  let totalOutstanding = 0;
  let totalBorrowed = 0;
  let totalRepaid = 0;
  let activeCount = 0;

  for (const loan of loans) {
    if (loan.status !== "paid") {
      totalOutstanding += loan.outstanding;
    }
    totalBorrowed += loan.principal;
    totalRepaid += loan.amount_paid;
    if (loan.status === "active") {
      activeCount += 1;
    }
  }

  return { totalOutstanding, totalBorrowed, totalRepaid, activeCount };
}

function buildBuckets(period: Period): Bucket[] {
  const now = new Date();
  const buckets: Bucket[] = [];

  if (period === "day") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 6; i++) {
      const bucketStart = start.getTime() + i * 4 * 60 * 60 * 1000;
      const bucketEnd = bucketStart + 4 * 60 * 60 * 1000;
      const hour = i * 4;
      buckets.push({
        start: bucketStart,
        end: bucketEnd,
        label: hour < 10 ? `0${hour}` : `${hour}`,
      });
    }
    return buckets;
  }

  if (period === "week") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    for (let i = 0; i < 7; i++) {
      const bucketStart = new Date(start);
      bucketStart.setDate(start.getDate() + i);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketStart.getDate() + 1);
      buckets.push({
        start: bucketStart.getTime(),
        end: bucketEnd.getTime(),
        label: DAY_LABELS[bucketStart.getDay()]!,
      });
    }
    return buckets;
  }

  if (period === "month") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);
    for (let i = 0; i < 6; i++) {
      const bucketStart = new Date(start);
      bucketStart.setDate(start.getDate() + i * 5);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketStart.getDate() + 5);
      buckets.push({
        start: bucketStart.getTime(),
        end: bucketEnd.getTime(),
        label: `${i * 5 + 1}`,
      });
    }
    return buckets;
  }

  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  for (let i = 0; i < 12; i++) {
    const bucketStart = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const bucketEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 1);
    buckets.push({
      start: bucketStart.getTime(),
      end: bucketEnd.getTime(),
      label: MONTH_LABELS[bucketStart.getMonth()]!,
    });
  }
  return buckets;
}

function findBucketIndex(buckets: Bucket[], t: number): number {
  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i]!;
    const inRange =
      i === buckets.length - 1
        ? t >= bucket.start && t <= bucket.end
        : t >= bucket.start && t < bucket.end;
    if (inRange) return i;
  }
  return -1;
}

export async function makePayment(
  loanId: string,
  amount: number,
  paymentMethod: "mobile_money" | "visa_card",
  phoneNumber?: string,
  cardLastFour?: string
): Promise<LoanPayment> {
  const { data, error } = await supabase.functions.invoke("process-payment", {
    body: {
      loan_id: loanId,
      amount,
      payment_method: paymentMethod,
      phone_number: phoneNumber,
      card_last_four: cardLastFour,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.payment as LoanPayment;
}

export async function getPaymentReceipt(
  paymentId: string
): Promise<LoanPayment | null> {
  const { data, error } = await supabase
    .from("loan_payments")
    .select(PAYMENT_SELECT)
    .eq("id", paymentId)
    .maybeSingle();

  if (error) throw error;

  return (data as LoanPaymentRow) || null;
}

export async function getChartSeries(period: Period): Promise<ChartSeries> {
  const buckets = buildBuckets(period);

  const [loansResult, paymentsResult] = await Promise.all([
    supabase.from("loans").select("principal, disbursed_at"),
    supabase.from("loan_payments").select("amount, paid_at"),
  ]);

  if (loansResult.error) throw loansResult.error;
  if (paymentsResult.error) throw paymentsResult.error;

  const loanRows = (loansResult.data as { principal: number; disbursed_at: string }[]) || [];
  const paymentRows = (paymentsResult.data as { amount: number; paid_at: string }[]) || [];

  const borrowed = new Array(buckets.length).fill(0);
  const repaid = new Array(buckets.length).fill(0);

  for (const row of loanRows) {
    const t = new Date(row.disbursed_at).getTime();
    const index = findBucketIndex(buckets, t);
    if (index !== -1) {
      borrowed[index] += row.principal;
    }
  }

  for (const row of paymentRows) {
    const t = new Date(row.paid_at).getTime();
    const index = findBucketIndex(buckets, t);
    if (index !== -1) {
      repaid[index] += row.amount;
    }
  }

  return {
    labels: buckets.map((b) => b.label),
    borrowed,
    repaid,
  };
}
