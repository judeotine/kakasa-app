import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import type { Loan, LoanPayment} from "@/lib/loans";
import { getLoan, listPayments, formatUGX } from "@/lib/loans";
import { StatusBadge } from "@/components/loans/StatusBadge";
import { useLanguage } from "@/lib/i18n";

function BackArrowIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#4C2311" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function TermRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={s.termRow}>
      <Text style={s.termLabel}>{label}</Text>
      {typeof value === "string" ? <Text style={s.termValue}>{value}</Text> : value}
    </View>
  );
}

function ChevronRightIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke="#A68A7B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PaymentRow({ payment, last, loanId }: { payment: LoanPayment; last: boolean; loanId: string }) {
  return (
    <TouchableOpacity
      style={[s.paymentRow, last && s.paymentRowLast]}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: "/loan/receipt" as never, params: { paymentId: payment.id, loanId } })}
    >
      <View>
        <Text style={s.paymentDate}>{formatDate(payment.paid_at)}</Text>
        {payment.method ? <Text style={s.paymentMethod}>{payment.method}</Text> : null}
      </View>
      <View style={s.paymentRight}>
        <Text style={s.paymentAmount}>{`+${formatUGX(payment.amount)}`}</Text>
        <ChevronRightIcon />
      </View>
    </TouchableOpacity>
  );
}

export default function LoanDetailScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const fetchedLoan = await getLoan(id);
      if (!fetchedLoan) {
        Alert.alert(t("loan_not_found"), t("loan_not_found_msg"));
        router.back();
        return;
      }
      setLoan(fetchedLoan);
      const fetchedPayments = await listPayments(id);
      setPayments(fetchedPayments);
    } catch (err) {
      Alert.alert(t("common_error"), err instanceof Error ? err.message : t("auth_something_wrong"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const pct = loan && loan.total_repayable > 0
    ? Math.min(1, Math.max(0, loan.amount_paid / loan.total_repayable))
    : 0;

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <BackArrowIcon />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("loan_details")}</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading || !loan ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#DA9133" size="large" />
        </View>
      ) : (
        <ScrollView
          style={s.flex}
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.summaryCard}>
            <Text style={s.providerName}>{loan.provider}</Text>
            {loan.provider_type ? <Text style={s.providerType}>{loan.provider_type}</Text> : null}
            <View style={s.outstandingBlock}>
              <Text style={s.outstandingLabel}>{t("loan_outstanding")}</Text>
              <Text style={s.outstandingValue}>{formatUGX(loan.outstanding)}</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${pct * 100}%` }]} />
            </View>
            <Text style={s.progressCaption}>{`${Math.round(pct * 100)}% ${t("loan_repaid")}`}</Text>
          </View>

          <View style={s.card}>
            <TermRow label={t("loan_principal")} value={formatUGX(loan.principal)} />
            <TermRow label={t("loan_interest_rate")} value={`${loan.interest_rate}%`} />
            <TermRow label={t("loan_term")} value={`${loan.term_months} ${t("loan_months")}`} />
            <TermRow label={t("loan_total_repayable")} value={formatUGX(loan.total_repayable)} />
            <TermRow label={t("loan_amount_paid")} value={formatUGX(loan.amount_paid)} />
            <TermRow label={t("loan_disbursed")} value={formatDate(loan.disbursed_at)} />
            <TermRow label={t("loan_due")} value={formatDate(loan.due_date)} />
            <View style={[s.termRow, s.termRowLast]}>
              <Text style={s.termLabel}>{t("loan_status")}</Text>
              <StatusBadge status={loan.status} />
            </View>
          </View>

          {(loan.status === "active" || loan.status === "overdue") && (
            <TouchableOpacity
              style={s.makePaymentBtn}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: "/loan/pay" as never, params: { id: loan.id } })}
            >
              <Text style={s.makePaymentBtnText}>{t("pay_make_payment")}</Text>
            </TouchableOpacity>
          )}

          <View style={s.card}>
            <Text style={s.sectionTitle}>{t("loan_payment_history")}</Text>
            {payments.length === 0 ? (
              <Text style={s.emptyText}>{t("loan_no_payments")}</Text>
            ) : (
              payments.map((payment, index) => (
                <PaymentRow key={payment.id} payment={payment} last={index === payments.length - 1} loanId={id!} />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F0EB",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8E2",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4C2311",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    padding: 20,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: "#4C2311",
    borderRadius: 24,
    padding: 20,
  },
  providerName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  providerType: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  outstandingBlock: {
    marginTop: 20,
    marginBottom: 16,
  },
  outstandingLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  outstandingValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DA9133",
  },
  progressCaption: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginTop: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4C2311",
    marginBottom: 12,
  },
  termRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8E1",
  },
  termRowLast: {
    borderBottomWidth: 0,
  },
  termLabel: {
    fontSize: 14,
    color: "#A68A7B",
    fontWeight: "500",
  },
  termValue: {
    fontSize: 14,
    color: "#4C2311",
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    color: "#A68A7B",
    fontWeight: "500",
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8E1",
  },
  paymentRowLast: {
    borderBottomWidth: 0,
  },
  paymentDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4C2311",
  },
  paymentMethod: {
    fontSize: 12,
    color: "#A68A7B",
    fontWeight: "500",
    marginTop: 2,
  },
  paymentRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E7D32",
  },
  makePaymentBtn: {
    backgroundColor: "#4C2311",
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  makePaymentBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
