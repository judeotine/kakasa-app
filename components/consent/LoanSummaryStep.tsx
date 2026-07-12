import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { LoanApplication } from "@/lib/loanApplication";
import type { Provider } from "@/lib/providers";
import { formatUGX } from "@/lib/loans";

function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12.5l5 5L20 6.5"
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function riskBadgeColor(level: string | null): string {
  switch (level) {
    case "Low Risk":
      return "#2E7D32";
    case "Caution":
      return "#E6A100";
    case "High Risk":
      return "#E65100";
    case "Severe Debt-Stress Risk":
      return "#C62828";
    default:
      return "#A68A7B";
  }
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue}>{value}</Text>
    </View>
  );
}

export function LoanSummaryStep({
  application,
  provider,
  onContinue,
}: {
  application: LoanApplication;
  provider: Provider;
  onContinue: () => void;
}) {
  const [agreed, setAgreed] = useState(false);

  const amount = application.amount_requested ?? Math.min(1000000, provider.max_amount);
  const termMonths = application.term_months ?? provider.term_min_months;
  const avgRate = (provider.min_rate + provider.max_rate) / 2;
  const totalRepayable = amount * (1 + (avgRate / 100) * (termMonths / 12));
  const monthly = totalRepayable / termMonths;
  const riskLevel = application.risk_level;
  const riskColor = riskBadgeColor(riskLevel);

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.title}>Understand your loan</Text>
      <Text style={s.subtitle}>A quick look before you continue.</Text>

      <View style={s.heroCard}>
        <Text style={s.heroLabel}>Estimated monthly payment</Text>
        <View style={s.heroMainRow}>
          <Text style={s.heroMonthly}>{formatUGX(Math.round(monthly))}</Text>
          <Text style={s.heroPerMonth}>/ month</Text>
        </View>
        <Text style={s.heroContext}>
          {`Borrow ${formatUGX(amount)} from ${provider.name} over ${termMonths} months at ~${avgRate.toFixed(1)}% p.a.`}
        </Text>
      </View>

      <View style={s.card}>
        <SummaryRow label="Amount requested" value={formatUGX(amount)} />
        <SummaryRow label="Interest rate" value={`${provider.min_rate}–${provider.max_rate}% p.a.`} />
        <SummaryRow label="Loan term" value={`${termMonths} months`} />
        <SummaryRow label="Total repayable" value={formatUGX(Math.round(totalRepayable))} />
      </View>

      {riskLevel ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>Your risk rating</Text>
          <View style={[s.riskBadge, { backgroundColor: riskColor }]}>
            <Text style={s.riskBadgeText}>{riskLevel}</Text>
          </View>
          <Text style={s.riskNote}>
            This reflects how comfortably this loan fits your finances based on your recent activity.
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={s.consentRow}
        activeOpacity={0.75}
        onPress={() => setAgreed((v) => !v)}
      >
        <View style={[s.checkbox, agreed && s.checkboxChecked]}>
          {agreed ? <CheckIcon /> : null}
        </View>
        <Text style={s.consentText}>
          I understand the cost and agree to the loan terms, and to Kakasa using my ID and a face check to verify me.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.continueButton, !agreed && s.continueButtonDisabled]}
        activeOpacity={0.85}
        onPress={onContinue}
        disabled={!agreed}
      >
        <Text style={s.continueText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "800", color: "#4C2311" },
  subtitle: { fontSize: 14, color: "#A68A7B", marginTop: 4, marginBottom: 18 },
  heroCard: {
    backgroundColor: "#4C2311",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroMainRow: { flexDirection: "row", alignItems: "baseline", marginTop: 8 },
  heroMonthly: { fontSize: 30, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  heroPerMonth: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.6)", marginLeft: 6 },
  heroContext: { fontSize: 12.5, color: "rgba(255,255,255,0.7)", lineHeight: 18, marginTop: 8 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#4C2311",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#4C2311", marginBottom: 12 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: { fontSize: 14, color: "#A68A7B" },
  summaryValue: { fontSize: 14, fontWeight: "700", color: "#4C2311" },
  riskBadge: {
    alignSelf: "flex-start",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  riskBadgeText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  riskNote: { fontSize: 13, color: "#633E2F", lineHeight: 19, marginTop: 12 },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#D9CCC4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: "#DA9133", borderColor: "#DA9133" },
  consentText: { flex: 1, fontSize: 13.5, color: "#4C2311", lineHeight: 20 },
  continueButton: {
    backgroundColor: "#4C2311",
    borderRadius: 26,
    paddingVertical: 17,
    alignItems: "center",
    marginBottom: 8,
  },
  continueButtonDisabled: { opacity: 0.4 },
  continueText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
});
