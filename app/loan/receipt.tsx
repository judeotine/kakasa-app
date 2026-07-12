import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { getLoan, formatUGX } from "@/lib/loans";
import type { Loan } from "@/lib/loans";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";

const ACCENT_PALETTE = [
  "#D4553A",
  "#3A7BD5",
  "#2E7D32",
  "#8E44AD",
  "#E67E22",
  "#1ABC9C",
];

interface PaymentDetail {
  id: string;
  loan_id: string;
  amount: number;
  method: string | null;
  payment_method: string | null;
  phone_number: string | null;
  card_last_four: string | null;
  transaction_ref: string | null;
  receipt_number: string | null;
  provider_name: string | null;
  status: string | null;
  remaining_balance: number | null;
  paid_at: string;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function accentForProvider(name: string): string {
  return ACCENT_PALETTE[hashString(name) % ACCENT_PALETTE.length]!;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  const first4 = phone.slice(0, 4);
  const last4 = phone.slice(-4);
  return `${first4}****${last4}`;
}

function BackArrowIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="#4C2311"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MobileMoneyIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 2H17.5C18.33 2 19 2.67 19 3.5V20.5C19 21.33 18.33 22 17.5 22H6.5C5.67 22 5 21.33 5 20.5V3.5C5 2.67 5.67 2 6.5 2ZM12 19.5C12.55 19.5 13 19.05 13 18.5C13 17.95 12.55 17.5 12 17.5C11.45 17.5 11 17.95 11 18.5C11 19.05 11.45 19.5 12 19.5Z"
        stroke="#4C2311"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function VisaCardIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5ZM3 9H21M7 15H9M12 15H14"
        stroke="#4C2311"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShareIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V12M16 6L12 2M12 2L8 6M12 2V15"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DownloadIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15M7 10L12 15M12 15L17 10M12 15V3"
        stroke="#4C2311"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckCircleIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999"
        stroke="#2E7D32"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 4L12 14.01L9 11.01"
        stroke="#2E7D32"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DashedLine() {
  return <View style={s.dashedLine} />;
}

function DetailRow({
  label,
  value,
  valueStyle,
  valueNode,
  last,
}: {
  label: string;
  value?: string;
  valueStyle?: object;
  valueNode?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[s.detailRow, last && s.detailRowLast]}>
      <Text style={s.detailLabel}>{label}</Text>
      {valueNode ?? <Text style={[s.detailValue, valueStyle]}>{value}</Text>}
    </View>
  );
}

function buildShareText(
  t: (key: string) => string,
  payment: PaymentDetail,
  loan: Loan | null
): string {
  const isMobile =
    (payment.payment_method ?? payment.method) === "mobile_money";
  const methodLabel = isMobile ? "Mobile Money" : "Visa Card";
  const identifier = isMobile
    ? payment.phone_number
      ? maskPhone(payment.phone_number)
      : ""
    : payment.card_last_four
      ? `****${payment.card_last_four}`
      : "";

  const lines = [
    `--- ${t("receipt_title")} ---`,
    "",
    `${t("receipt_number")}: ${payment.receipt_number ?? "---"}`,
    `${t("receipt_date")}: ${formatDateTime(payment.paid_at)}`,
    payment.transaction_ref
      ? `${t("receipt_transaction_ref")}: ${payment.transaction_ref}`
      : null,
    "",
    `${t("receipt_amount_paid")}: ${formatUGX(payment.amount)}`,
    `${t("receipt_payment_method")}: ${methodLabel}`,
    identifier
      ? `${isMobile ? t("receipt_phone") : t("receipt_card")}: ${identifier}`
      : null,
    "",
    loan ? `${t("receipt_provider")}: ${loan.provider}` : null,
    loan ? `${t("receipt_loan_id")}: ${loan.id.slice(0, 8).toUpperCase()}` : null,
    loan
      ? `${t("receipt_previous_balance")}: ${formatUGX(
          (payment.remaining_balance ?? loan.outstanding) + payment.amount
        )}`
      : null,
    `${t("receipt_amount_paid")}: ${formatUGX(payment.amount)}`,
    `${t("receipt_remaining_balance")}: ${formatUGX(
      payment.remaining_balance ?? (loan ? loan.outstanding : 0)
    )}`,
    "",
    `--- ${t("receipt_thank_you")} ---`,
  ];

  return lines.filter((l) => l !== null).join("\n");
}

export default function ReceiptScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { paymentId, loanId } = useLocalSearchParams<{
    paymentId: string;
    loanId: string;
  }>();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const receiptRef = useRef<View>(null);

  const load = useCallback(async () => {
    if (!paymentId || !loanId) return;
    setLoading(true);
    try {
      const [paymentResult, fetchedLoan] = await Promise.all([
        supabase
          .from("loan_payments")
          .select(
            "id, loan_id, amount, method, payment_method, phone_number, card_last_four, transaction_ref, receipt_number, provider_name, status, remaining_balance, paid_at"
          )
          .eq("id", paymentId)
          .maybeSingle(),
        getLoan(loanId),
      ]);

      if (paymentResult.error) throw paymentResult.error;

      if (!paymentResult.data) {
        Alert.alert(t("receipt_not_found"), t("receipt_not_found_msg"));
        router.back();
        return;
      }

      setPayment(paymentResult.data as PaymentDetail);
      setLoan(fetchedLoan);
    } catch (err) {
      Alert.alert(
        t("common_error"),
        err instanceof Error ? err.message : t("auth_something_wrong")
      );
    } finally {
      setLoading(false);
    }
  }, [paymentId, loanId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleShare = async () => {
    if (!payment) return;
    try {
      await Share.share({
        message: buildShareText(t, payment, loan),
      });
    } catch {
      // user cancelled
    }
  };

  const handleDownload = async () => {
    if (!payment) return;
    try {
      await Share.share({
        message: buildShareText(t, payment, loan),
      });
    } catch {
      // user cancelled
    }
  };

  const isMobile =
    payment &&
    (payment.payment_method ?? payment.method) === "mobile_money";

  const previousBalance =
    payment && loan
      ? (payment.remaining_balance ?? loan.outstanding) + payment.amount
      : null;

  const remainingBalance =
    payment
      ? (payment.remaining_balance ?? (loan ? loan.outstanding : 0))
      : 0;

  const accent = loan ? accentForProvider(loan.provider) : ACCENT_PALETTE[0]!;

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={s.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <BackArrowIcon />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("receipt_title")}</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading || !payment ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#DA9133" size="large" />
        </View>
      ) : (
        <ScrollView
          style={s.flex}
          contentContainerStyle={[
            s.scroll,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.receiptCard} ref={receiptRef}>
            <View style={[s.accentStripe, { backgroundColor: accent }]} />

            <View style={s.receiptHeader}>
              <Text style={s.logoText}>Kakasa</Text>
              <Text style={s.receiptSubtitle}>{t("receipt_title")}</Text>
            </View>

            <DashedLine />

            <View style={s.section}>
              <DetailRow
                label={t("receipt_number")}
                value={payment.receipt_number ?? "---"}
              />
              <DetailRow
                label={t("receipt_date")}
                value={formatDateTime(payment.paid_at)}
              />
              <DetailRow
                label={t("receipt_transaction_ref")}
                value={payment.transaction_ref ?? "---"}
                last
              />
            </View>

            <DashedLine />

            <View style={s.section}>
              <View style={s.amountBlock}>
                <Text style={s.amountLabel}>{t("receipt_amount_paid")}</Text>
                <Text style={s.amountValue}>
                  {formatUGX(payment.amount)}
                </Text>
              </View>

              <DetailRow
                label={t("receipt_payment_method")}
                valueNode={
                  <View style={s.methodBadge}>
                    {isMobile ? <MobileMoneyIcon /> : <VisaCardIcon />}
                    <Text style={s.methodText}>
                      {isMobile ? "Mobile Money" : "Visa Card"}
                    </Text>
                  </View>
                }
              />
              {isMobile && payment.phone_number ? (
                <DetailRow
                  label={t("receipt_phone")}
                  value={maskPhone(payment.phone_number)}
                  last
                />
              ) : null}
              {!isMobile && payment.card_last_four ? (
                <DetailRow
                  label={t("receipt_card")}
                  value={`****${payment.card_last_four}`}
                  last
                />
              ) : null}
            </View>

            <DashedLine />

            {loan ? (
              <View style={s.section}>
                <DetailRow
                  label={t("receipt_provider")}
                  value={loan.provider}
                />
                <DetailRow
                  label={t("receipt_loan_id")}
                  value={loan.id.slice(0, 8).toUpperCase()}
                />
                {previousBalance !== null ? (
                  <DetailRow
                    label={t("receipt_previous_balance")}
                    value={formatUGX(previousBalance)}
                  />
                ) : null}
                <DetailRow
                  label={t("receipt_amount_paid")}
                  value={formatUGX(payment.amount)}
                />
                <DetailRow
                  label={t("receipt_remaining_balance")}
                  value={formatUGX(remainingBalance)}
                  valueStyle={s.remainingValue}
                  last
                />
              </View>
            ) : null}

            <DashedLine />

            <View style={s.footer}>
              <Text style={s.thankYou}>{t("receipt_thank_you")}</Text>
            </View>

            <DashedLine />

            <View style={s.statusRow}>
              <View style={s.statusBadge}>
                <CheckCircleIcon />
                <Text style={s.statusText}>{t("receipt_completed")}</Text>
              </View>
            </View>
          </View>

          <View style={s.buttonGroup}>
            <TouchableOpacity
              style={s.primaryButton}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <ShareIcon />
              <Text style={s.primaryButtonText}>{t("receipt_share")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.secondaryButton}
              onPress={handleDownload}
              activeOpacity={0.8}
            >
              <DownloadIcon />
              <Text style={s.secondaryButtonText}>
                {t("receipt_download")}
              </Text>
            </TouchableOpacity>
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
    gap: 20,
  },
  receiptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#4C2311",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  accentStripe: {
    height: 6,
  },
  receiptHeader: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 20,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#4C2311",
    letterSpacing: 0.5,
  },
  receiptSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A68A7B",
    marginTop: 4,
  },
  dashedLine: {
    borderStyle: "dashed",
    borderBottomWidth: 1.5,
    borderBottomColor: "#D9CCC4",
    marginHorizontal: 20,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5EFE9",
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#A68A7B",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4C2311",
    textAlign: "right",
    flex: 1,
  },
  amountBlock: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A68A7B",
    marginBottom: 6,
  },
  amountValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#2E7D32",
  },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F7F0EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  methodText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4C2311",
  },
  remainingValue: {
    color: "#DA9133",
    fontWeight: "800",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  thankYou: {
    fontSize: 15,
    fontWeight: "600",
    color: "#633E2F",
    textAlign: "center",
  },
  statusRow: {
    alignItems: "center",
    paddingVertical: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E7D32",
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#4C2311",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    flexShrink: 1,
    textAlign: "center",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: "#4C2311",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4C2311",
    flexShrink: 1,
    textAlign: "center",
  },
});
