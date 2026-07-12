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
import type { Provider } from "@/lib/providers";
import { getProvider } from "@/lib/providers";
import { assessLoanRisk, riskColor, type AssessOutput } from "@/lib/debtStress";
import { formatUGX } from "@/lib/loans";
import { useLanguage } from "@/lib/i18n";
import { createApplication, getActiveApplication, updateApplicationStatus } from "@/lib/loanApplication";
import { ensureScore } from "@/lib/credit";

function BackArrowIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#4C2311" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ShieldIcon({ size = 34, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DotRow({ text }: { text: string }) {
  return (
    <View style={s.reasonRow}>
      <View style={s.reasonDot} />
      <Text style={s.reasonText}>{text}</Text>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

export default function LoanRiskCheckScreen() {
  const insets = useSafeAreaInsets();
  const { providerId, amount: amountParam, termMonths: termParam } =
    useLocalSearchParams<{ providerId: string; amount?: string; termMonths?: string }>();
  const { t } = useLanguage();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [result, setResult] = useState<AssessOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    try {
      const fetchedProvider = await getProvider(providerId);
      if (!fetchedProvider) {
        Alert.alert("Provider not found", "This provider is no longer available.");
        router.back();
        return;
      }
      setProvider(fetchedProvider);
      const assessed = await assessLoanRisk({
        provider: fetchedProvider,
        ...(amountParam ? { amount: Number(amountParam) } : {}),
        ...(termParam ? { termMonths: Number(termParam) } : {}),
      });
      setResult(assessed);
    } catch (err) {
      Alert.alert(
        "Couldn't assess this loan",
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [providerId, amountParam, termParam]);

  useEffect(() => {
    load();
  }, [load]);

  const handleContinue = async () => {
    if (!provider || !result) return;
    setSubmitting(true);
    try {
      const existing = await getActiveApplication(provider.id);
      if (existing) {
        const nextScreen = existing.status === "consent"
          ? "/loan-apply/consent"
          : existing.status === "interviewing"
          ? "/loan-apply/interview"
          : existing.status === "reviewing"
          ? "/loan-apply/decision"
          : "/loan-apply/consent";
        router.push({
          pathname: nextScreen,
          params: { applicationId: existing.id, providerId: provider.id },
        });
        return;
      }
      const creditScore = await ensureScore();
      const app = await createApplication(
        provider.id,
        creditScore.score,
        result.assessment.risk_level,
        result.assessment.risk_probability,
        result.amount,
        result.termMonths
      );
      await updateApplicationStatus(app.id, "consent");
      router.push({
        pathname: "/loan-apply/consent",
        params: { applicationId: app.id, providerId: provider.id },
      });
    } catch (err) {
      Alert.alert(
        t("common_error"),
        err instanceof Error ? err.message : t("interview_error_msg")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const color = result ? riskColor(result.assessment.risk_level) : "#A68A7B";

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <BackArrowIcon />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("apply_credit_check")}</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading || !provider || !result ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#DA9133" size="large" />
          <Text style={s.loadingText}>{t("apply_checking_credit")}</Text>
        </View>
      ) : (
        <ScrollView
          style={s.flex}
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.riskHero, { backgroundColor: color }]}>
            <View style={s.riskIconWrap}>
              <ShieldIcon />
            </View>
            <Text style={s.riskProbability}>{Math.round(result.assessment.risk_probability)}%</Text>
            <Text style={s.riskLevel}>{result.assessment.risk_level}</Text>
            <Text style={s.riskMessage}>{result.assessment.message}</Text>
          </View>

          <View style={s.contextCard}>
            <Text style={s.contextText}>
              {`Assessed for a ${formatUGX(result.amount)} loan from ${provider.name} over ${result.termMonths} months, repaying ${formatUGX(result.repayment)}.`}
            </Text>
          </View>

          {result.assessment.risk_reasons.length > 0 ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>Why this rating</Text>
              {result.assessment.risk_reasons.map((reason, i) => (
                <DotRow key={i} text={reason} />
              ))}
            </View>
          ) : null}

          <View style={s.card}>
            <Text style={s.cardTitle}>What we looked at</Text>
            <StatRow
              label="Income stability"
              value={`${Math.round(result.assessment.calculated_features.income_stability_score * 100)}% (${result.assessment.calculated_features.income_stability_confidence})`}
            />
            <StatRow
              label="Repayment vs income"
              value={`${Math.round(result.assessment.calculated_features.repayment_to_income_ratio * 100)}%`}
            />
            <StatRow
              label="Loan cost"
              value={`${Math.round(result.assessment.calculated_features.loan_cost_percentage)}% of amount`}
            />
          </View>

          <Text style={s.disclaimer}>
            {result.assessment.risk_level === "Low Risk" || result.assessment.risk_level === "Caution"
              ? t("apply_score_meets")
              : t("apply_score_below")}
          </Text>

          <TouchableOpacity
            style={s.backToProviderButton}
            activeOpacity={0.85}
            onPress={handleContinue}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={s.backToProviderText}>{t("apply_continue")}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F0EB" },
  flex: { flex: 1 },
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
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#4C2311" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { fontSize: 14, color: "#A68A7B", fontWeight: "500" },
  scroll: { paddingHorizontal: 24, paddingTop: 24 },
  riskHero: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  riskIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  riskProbability: { fontSize: 44, fontWeight: "800", color: "#FFFFFF", letterSpacing: -1 },
  riskLevel: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  riskMessage: {
    fontSize: 14,
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 10,
  },
  contextCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  contextText: { fontSize: 14, color: "#633E2F", lineHeight: 21 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#4C2311", marginBottom: 12 },
  reasonRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  reasonDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#DA9133", marginTop: 6 },
  reasonText: { flex: 1, fontSize: 14, color: "#633E2F", lineHeight: 20 },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  statLabel: { fontSize: 14, color: "#A68A7B" },
  statValue: { fontSize: 14, fontWeight: "700", color: "#4C2311" },
  disclaimer: {
    fontSize: 12,
    color: "#A68A7B",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  backToProviderButton: {
    backgroundColor: "#4C2311",
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  backToProviderText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
