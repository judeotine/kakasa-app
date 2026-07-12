import { useState, useEffect, useCallback, useMemo } from "react";
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
import { getProvider, type Provider } from "@/lib/providers";
import { formatUGX } from "@/lib/loans";

const AMOUNT_PRESETS = [100000, 250000, 500000, 1000000, 2000000, 3000000, 5000000];
const TERM_PRESETS = [3, 6, 9, 12, 18, 24];

function BackArrowIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#4C2311" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function amountOptions(max: number): number[] {
  const opts = AMOUNT_PRESETS.filter((v) => v <= max);
  if (opts.length === 0 || opts[opts.length - 1] !== max) opts.push(max);
  return opts;
}

function termOptions(min: number, max: number): number[] {
  const set = new Set<number>([min, max]);
  TERM_PRESETS.forEach((v) => {
    if (v > min && v < max) set.add(v);
  });
  return Array.from(set)
    .sort((a, b) => a - b)
    .slice(0, 5);
}

export default function LoanAmountScreen() {
  const insets = useSafeAreaInsets();
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number | null>(null);
  const [term, setTerm] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    try {
      const fetched = await getProvider(providerId);
      if (!fetched) {
        Alert.alert("Provider not found", "This provider is no longer available.");
        router.back();
        return;
      }
      setProvider(fetched);
      const amounts = amountOptions(fetched.max_amount);
      setAmount(amounts.find((v) => v >= 500000) ?? amounts[amounts.length - 1]!);
      setTerm(fetched.term_min_months);
    } catch (err) {
      Alert.alert("Something went wrong", err instanceof Error ? err.message : "Please try again.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    load();
  }, [load]);

  const amounts = useMemo(
    () => (provider ? amountOptions(provider.max_amount) : []),
    [provider]
  );
  const terms = useMemo(
    () => (provider ? termOptions(provider.term_min_months, provider.term_max_months) : []),
    [provider]
  );

  const repayment = useMemo(() => {
    if (!provider || amount == null || term == null) return 0;
    const rate = (provider.min_rate + provider.max_rate) / 2;
    return Math.round(amount * (1 + (rate / 100) * (term / 12)));
  }, [provider, amount, term]);

  const handleContinue = () => {
    if (!provider || amount == null || term == null) return;
    router.push({
      pathname: "/loan-apply/[providerId]",
      params: {
        providerId: provider.id,
        amount: String(amount),
        termMonths: String(term),
      },
    });
  };

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <BackArrowIcon />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Loan amount</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading || !provider || amount == null || term == null ? (
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
            <Text style={s.summaryLabel}>You are requesting</Text>
            <Text style={s.summaryAmount}>{formatUGX(amount)}</Text>
            <Text style={s.summarySub}>
              {`from ${provider.name} over ${term} ${term === 1 ? "month" : "months"}`}
            </Text>
          </View>

          <Text style={s.sectionTitle}>Amount</Text>
          <View style={s.chipWrap}>
            {amounts.map((value) => {
              const active = value === amount;
              return (
                <TouchableOpacity
                  key={value}
                  style={[s.chip, active && s.chipActive]}
                  activeOpacity={0.85}
                  onPress={() => setAmount(value)}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{formatUGX(value)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.sectionTitle}>Repayment period</Text>
          <View style={s.chipWrap}>
            {terms.map((value) => {
              const active = value === term;
              return (
                <TouchableOpacity
                  key={value}
                  style={[s.chip, active && s.chipActive]}
                  activeOpacity={0.85}
                  onPress={() => setTerm(value)}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>
                    {`${value} ${value === 1 ? "month" : "months"}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={s.estimateCard}>
            <View style={s.estimateRow}>
              <Text style={s.estimateLabel}>Estimated total repayment</Text>
              <Text style={s.estimateValue}>{formatUGX(repayment)}</Text>
            </View>
            <View style={s.estimateRow}>
              <Text style={s.estimateLabel}>Interest rate</Text>
              <Text style={s.estimateValue}>{`${provider.min_rate}–${provider.max_rate}% p.a.`}</Text>
            </View>
            <Text style={s.estimateNote}>
              A quick risk check runs next before you continue your application.
            </Text>
          </View>

          <TouchableOpacity style={s.continueButton} activeOpacity={0.85} onPress={handleContinue}>
            <Text style={s.continueText}>Continue</Text>
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
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 24, paddingTop: 24 },
  summaryCard: {
    backgroundColor: "#4C2311",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  summaryLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.7)" },
  summaryAmount: { fontSize: 38, fontWeight: "800", color: "#FFFFFF", letterSpacing: -1, marginTop: 6 },
  summarySub: { fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 6, textAlign: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#4C2311", marginBottom: 12 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  chip: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#E4D8D0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: "#DA9133", borderColor: "#DA9133" },
  chipText: { fontSize: 14, fontWeight: "700", color: "#633E2F" },
  chipTextActive: { color: "#FFFFFF" },
  estimateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  estimateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  estimateLabel: { fontSize: 14, color: "#A68A7B" },
  estimateValue: { fontSize: 15, fontWeight: "700", color: "#4C2311" },
  estimateNote: { fontSize: 12, color: "#A68A7B", lineHeight: 18, marginTop: 8 },
  continueButton: {
    backgroundColor: "#4C2311",
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
