import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import type { Loan } from "@/lib/loans";
import { getLoan, formatUGX, makePayment } from "@/lib/loans";
import { getProfileForPrefill } from "@/lib/profile";
import { useLanguage } from "@/lib/i18n";

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

function PhoneIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
        stroke="#4C2311"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CardIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM1 10h22"
        stroke="#4C2311"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke="#FFFFFF"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type PaymentMethod = "mobile_money" | "visa_card";

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function PayScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const [amountText, setAmountText] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("mobile_money");
  const [phone, setPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const [success, setSuccess] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);

  const amount = parseFloat(amountText) || 0;
  const outstanding = loan?.outstanding ?? 0;

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [fetchedLoan, profile] = await Promise.all([
        getLoan(id),
        getProfileForPrefill(),
      ]);
      if (!fetchedLoan) {
        Alert.alert(t("loan_not_found"), t("loan_not_found_msg"));
        router.back();
        return;
      }
      setLoan(fetchedLoan);
      setAmountText(Math.round(fetchedLoan.outstanding).toString());
      if (profile.phone) {
        const cleaned = profile.phone.replace(/\D/g, "");
        if (cleaned.startsWith("256")) {
          setPhone(cleaned.slice(3));
        } else if (cleaned.startsWith("0")) {
          setPhone(cleaned.slice(1));
        } else {
          setPhone(cleaned);
        }
      }
    } catch (err) {
      Alert.alert(
        t("common_error"),
        err instanceof Error ? err.message : t("auth_something_wrong")
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isAmountValid = amount > 0 && amount <= outstanding;

  const isMobileMoneyReady = method === "mobile_money" && phone.length >= 9;
  const isCardReady =
    method === "visa_card" &&
    cardNumber.replace(/\D/g, "").length === 16 &&
    expiry.replace(/\D/g, "").length === 4 &&
    cvv.length === 3;

  const canPay = isAmountValid && (isMobileMoneyReady || isCardReady);

  const handleQuickAmount = (pct: number) => {
    const value = Math.round(outstanding * pct);
    setAmountText(value.toString());
  };

  const handlePay = async () => {
    if (!loan || !id) return;

    if (amount <= 0) {
      Alert.alert(t("pay_invalid_amount"), t("pay_invalid_amount_msg"));
      return;
    }
    if (amount > outstanding) {
      Alert.alert(t("pay_exceeds_balance"), t("pay_exceeds_balance_msg"));
      return;
    }
    if (method === "mobile_money" && phone.length < 9) {
      Alert.alert(t("common_error"), t("pay_phone_required"));
      return;
    }
    if (method === "visa_card" && !isCardReady) {
      Alert.alert(t("common_error"), t("pay_card_required"));
      return;
    }

    setPaying(true);
    try {
      const result = await makePayment(
        id,
        amount,
        method,
        method === "mobile_money" ? `+256${phone}` : undefined,
        method === "visa_card"
          ? cardNumber.replace(/\D/g, "").slice(-4)
          : undefined
      );
      setReceiptNumber(result.receipt_number ?? "");
      setPaidAmount(amount);
      setSuccess(true);
    } catch (err) {
      Alert.alert(
        t("common_error"),
        err instanceof Error ? err.message : t("auth_something_wrong")
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading || !loan) {
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
          <Text style={s.headerTitle}>{t("pay_title")}</Text>
          <View style={{ width: 42 }} />
        </View>
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#DA9133" size="large" />
        </View>
      </View>
    );
  }

  if (success) {
    return (
      <View style={s.container}>
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <View style={{ width: 42 }} />
          <Text style={s.headerTitle}>{t("pay_title")}</Text>
          <View style={{ width: 42 }} />
        </View>
        <View style={s.successContainer}>
          <View style={s.checkCircle}>
            <CheckIcon />
          </View>
          <Text style={s.successTitle}>{t("pay_success")}</Text>
          <Text style={s.successMsg}>{t("pay_success_msg")}</Text>

          <View style={s.receiptCard}>
            <View style={s.receiptRow}>
              <Text style={s.receiptLabel}>{t("pay_receipt_number")}</Text>
              <Text style={s.receiptValue}>{receiptNumber}</Text>
            </View>
            <View style={[s.receiptRow, s.receiptRowLast]}>
              <Text style={s.receiptLabel}>{t("pay_amount")}</Text>
              <Text style={s.receiptValue}>{formatUGX(paidAmount)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={s.payBtn}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: "/loan/receipt" as never,
                params: { paymentId: receiptNumber, loanId: id },
              })
            }
          >
            <Text style={s.payBtnText}>{t("pay_view_receipt")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.secondaryBtn}
            activeOpacity={0.7}
            onPress={() =>
              router.push({ pathname: "/loan/[id]", params: { id: id! } })
            }
          >
            <Text style={s.secondaryBtnText}>{t("pay_back_to_loan")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        <Text style={s.headerTitle}>{t("pay_title")}</Text>
        <View style={{ width: 42 }} />
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={s.flex}
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.summaryCard}>
            <Text style={s.providerName}>{loan.provider}</Text>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>{t("pay_outstanding")}</Text>
              <Text style={s.summaryValue}>{formatUGX(outstanding)}</Text>
            </View>
            <Text style={s.loanRef}>{loan.id.slice(0, 8).toUpperCase()}</Text>
          </View>

          <View style={s.card}>
            <Text style={s.sectionTitle}>{t("pay_amount")}</Text>
            <View style={s.amountInputWrap}>
              <Text style={s.amountPrefix}>UGX</Text>
              <TextInput
                style={s.amountInput}
                value={amountText}
                onChangeText={(txt) =>
                  setAmountText(txt.replace(/[^0-9]/g, ""))
                }
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#A68A7B"
                maxLength={12}
              />
            </View>
            <View style={s.quickRow}>
              {[0.25, 0.5, 0.75, 1].map((pct) => (
                <TouchableOpacity
                  key={pct}
                  style={[
                    s.quickBtn,
                    amount === Math.round(outstanding * pct) && s.quickBtnActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleQuickAmount(pct)}
                >
                  <Text
                    style={[
                      s.quickBtnText,
                      amount === Math.round(outstanding * pct) &&
                        s.quickBtnTextActive,
                    ]}
                  >
                    {`${pct * 100}%`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.card}>
            <View style={s.tabRow}>
              <TouchableOpacity
                style={[s.tab, method === "mobile_money" && s.tabActive]}
                activeOpacity={0.7}
                onPress={() => setMethod("mobile_money")}
              >
                <PhoneIcon />
                <Text
                  style={[
                    s.tabText,
                    method === "mobile_money" && s.tabTextActive,
                  ]}
                >
                  {t("pay_mobile_money")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, method === "visa_card" && s.tabActive]}
                activeOpacity={0.7}
                onPress={() => setMethod("visa_card")}
              >
                <CardIcon />
                <Text
                  style={[
                    s.tabText,
                    method === "visa_card" && s.tabTextActive,
                  ]}
                >
                  {t("pay_visa_card")}
                </Text>
              </TouchableOpacity>
            </View>

            {method === "mobile_money" ? (
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>{t("pay_phone")}</Text>
                <View style={s.phoneRow}>
                  <View style={s.countryCode}>
                    <Text style={s.countryCodeText}>+256</Text>
                  </View>
                  <TextInput
                    style={s.phoneInput}
                    value={phone}
                    onChangeText={(txt) =>
                      setPhone(txt.replace(/[^0-9]/g, "").slice(0, 9))
                    }
                    keyboardType="phone-pad"
                    placeholder="7XXXXXXXX"
                    placeholderTextColor="#A68A7B"
                    maxLength={9}
                  />
                </View>
              </View>
            ) : (
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>{t("pay_card_number")}</Text>
                <TextInput
                  style={s.input}
                  value={formatCardNumber(cardNumber)}
                  onChangeText={(txt) =>
                    setCardNumber(txt.replace(/\D/g, "").slice(0, 16))
                  }
                  keyboardType="number-pad"
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor="#A68A7B"
                  maxLength={19}
                />
                <View style={s.cardRow}>
                  <View style={s.cardHalf}>
                    <Text style={s.fieldLabel}>{t("pay_expiry")}</Text>
                    <TextInput
                      style={s.input}
                      value={formatExpiry(expiry)}
                      onChangeText={(txt) =>
                        setExpiry(txt.replace(/\D/g, "").slice(0, 4))
                      }
                      keyboardType="number-pad"
                      placeholder="MM/YY"
                      placeholderTextColor="#A68A7B"
                      maxLength={5}
                    />
                  </View>
                  <View style={s.cardHalf}>
                    <Text style={s.fieldLabel}>{t("pay_cvv")}</Text>
                    <TextInput
                      style={s.input}
                      value={cvv}
                      onChangeText={(txt) =>
                        setCvv(txt.replace(/[^0-9]/g, "").slice(0, 3))
                      }
                      keyboardType="number-pad"
                      placeholder="123"
                      placeholderTextColor="#A68A7B"
                      maxLength={3}
                      secureTextEntry
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[s.payBtn, (!canPay || paying) && s.payBtnDisabled]}
            activeOpacity={0.8}
            onPress={handlePay}
            disabled={!canPay || paying}
          >
            {paying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={s.payBtnText}>{`${t("pay_button")} ${formatUGX(amount)}`}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  summaryRow: {
    marginTop: 16,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  loanRef: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
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
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  amountPrefix: {
    fontSize: 18,
    fontWeight: "700",
    color: "#A68A7B",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "800",
    color: "#4C2311",
    textAlign: "center",
    padding: 0,
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  quickBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    backgroundColor: "#FFFFFF",
  },
  quickBtnActive: {
    backgroundColor: "#4C2311",
    borderColor: "#4C2311",
  },
  quickBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4C2311",
  },
  quickBtnTextActive: {
    color: "#FFFFFF",
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    backgroundColor: "#FFFFFF",
  },
  tabActive: {
    backgroundColor: "#F7F0EB",
    borderColor: "#4C2311",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A68A7B",
  },
  tabTextActive: {
    color: "#4C2311",
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#633E2F",
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 10,
  },
  countryCode: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    backgroundColor: "#F7F0EB",
    alignItems: "center",
    justifyContent: "center",
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4C2311",
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#4C2311",
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  input: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4C2311",
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  cardHalf: {
    flex: 1,
  },
  payBtn: {
    backgroundColor: "#4C2311",
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnDisabled: {
    opacity: 0.5,
  },
  payBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4C2311",
    marginBottom: 8,
  },
  successMsg: {
    fontSize: 15,
    fontWeight: "500",
    color: "#A68A7B",
    textAlign: "center",
    marginBottom: 24,
  },
  receiptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    width: "100%",
    marginBottom: 24,
  },
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8E1",
  },
  receiptRowLast: {
    borderBottomWidth: 0,
  },
  receiptLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#A68A7B",
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4C2311",
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DA9133",
  },
});
