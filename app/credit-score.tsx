import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { router } from "expo-router";
import {
  type CreditScore,
  type CreditFactor,
  colorForBand,
  getScoreHistory,
  computeCreditScore,
  ensureScore,
} from "@/lib/credit";
import {
  getUserEligibilityContext,
  listProviders,
  evaluateEligibility,
} from "@/lib/providers";
import { ScoreGauge } from "@/components/credit/ScoreGauge";
import { ScoreTrend } from "@/components/credit/ScoreTrend";
import { FactorBar } from "@/components/credit/FactorBar";
import { BandPill } from "@/components/credit/BandPill";

const { width: SCREEN_W } = Dimensions.get("window");

function BackArrowIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#4C2311" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RefreshIcon({ color = "#4C2311" }: { color?: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path d="M23 4v6h-6M1 20v-6h6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LightbulbIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18h6M10 22h4M15.09 14c.36-.53.68-1.06 1.01-1.6a6 6 0 10-8.2 0c.33.54.65 1.07 1.01 1.6a3.5 3.5 0 011.09 2h4a3.5 3.5 0 011.09-2z"
        stroke="#DA9133"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArrowRightIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M12 5l7 7-7 7" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function CreditScoreScreen() {
  const insets = useSafeAreaInsets();
  const [score, setScore] = useState<CreditScore | null>(null);
  const [history, setHistory] = useState<{ score: number; computed_at: string }[]>([]);
  const [delta, setDelta] = useState<number | null>(null);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [totalProviders, setTotalProviders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    const latest = await ensureScore();
    setScore(latest);

    const hist = await getScoreHistory(12);
    setHistory(hist);
    setDelta(hist.length >= 2 ? hist[hist.length - 1]!.score - hist[hist.length - 2]!.score : null);

    const [context, providers] = await Promise.all([getUserEligibilityContext(), listProviders()]);
    const eligible = providers.filter((p) => evaluateEligibility(p, context).eligible).length;
    setEligibleCount(eligible);
    setTotalProviders(providers.length);
  }, []);

  useEffect(() => {
    loadAll()
      .catch(() => {
        Alert.alert("Something went wrong", "We couldn't load your credit score. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [loadAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await computeCreditScore();
      setScore(result);
      setDelta(result.delta);
      const hist = await getScoreHistory(12);
      setHistory(hist);
    } catch {
      Alert.alert("Refresh failed", "We couldn't recompute your score. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const floatHeader = (
    <View style={[s.floatHeader, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity style={s.headerButton} onPress={() => router.back()} activeOpacity={0.7}>
        <BackArrowIcon />
      </TouchableOpacity>
      <Text style={s.floatTitle}>Credit Score</Text>
      <TouchableOpacity style={s.headerButton} onPress={handleRefresh} activeOpacity={0.7} disabled={refreshing}>
        {refreshing ? <ActivityIndicator size="small" color="#4C2311" /> : <RefreshIcon />}
      </TouchableOpacity>
    </View>
  );

  if (loading || !score) {
    return (
      <View style={s.screen}>
        <StatusBar style="light" />
        {floatHeader}
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#4C2311" />
        </View>
      </View>
    );
  }

  const sortedFactors: CreditFactor[] = [...score.factors].sort((a, b) => b.weight - a.weight);
  const bandColor = colorForBand(score.band);

  let deltaLabel: string;
  let deltaColor: string;
  if (delta === null) {
    deltaLabel = "First check";
    deltaColor = "rgba(255,255,255,0.6)";
  } else if (delta > 0) {
    deltaLabel = `▲ ${delta} since last check`;
    deltaColor = "#8BC34A";
  } else if (delta < 0) {
    deltaLabel = `▼ ${Math.abs(delta)} since last check`;
    deltaColor = "#EF9A9A";
  } else {
    deltaLabel = "No change since last check";
    deltaColor = "rgba(255,255,255,0.6)";
  }

  return (
    <View style={s.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
        <View style={[s.hero, { paddingTop: insets.top + 64 }]}>
          <Svg width={SCREEN_W} height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="cgrad" x1="0" y1="0" x2="0.5" y2="1">
                <Stop offset="0" stopColor="#5C2E17" />
                <Stop offset="1" stopColor="#3A1A0C" />
              </LinearGradient>
            </Defs>
            <Rect width={SCREEN_W} height="100%" fill="url(#cgrad)" />
            <Circle cx={SCREEN_W * 0.88} cy={insets.top + 30} r={80} fill="rgba(255,255,255,0.05)" />
            <Circle cx={SCREEN_W * 0.08} cy={insets.top + 330} r={110} fill="rgba(255,255,255,0.04)" />
            <Circle cx={SCREEN_W / 2} cy={insets.top + 210} r={135} fill={`${bandColor}22`} />
          </Svg>

          <Text style={s.heroLabel}>YOUR CREDIT SCORE</Text>
          <View style={s.gaugeWrap}>
            <ScoreGauge score={score.score} band={score.band} size={214} />
          </View>
          <Text style={[s.deltaText, { color: deltaColor }]}>{deltaLabel}</Text>
          <View style={s.pillWrap}>
            <BandPill band={score.band} />
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Score history</Text>
          <ScoreTrend points={history} color={bandColor} />
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>What affects your score</Text>
          {sortedFactors.map((factor, index) => (
            <FactorBar
              key={factor.key}
              label={factor.label}
              rating={factor.rating}
              score0to100={factor.score0to100}
              last={index === sortedFactors.length - 1}
            />
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>How to improve</Text>
          {score.tips.length === 0 ? (
            <Text style={s.emptyTips}>You're doing great — keep it up.</Text>
          ) : (
            score.tips.map((tip, index) => (
              <View key={index} style={[s.tipRow, index === score.tips.length - 1 && s.tipRowLast]}>
                <View style={s.tipIconWrap}>
                  <LightbulbIcon />
                </View>
                <Text style={s.tipText}>{tip}</Text>
              </View>
            ))
          )}
        </View>

        <View style={[s.card, s.eligCard]}>
          <Text style={s.eligibilityText}>
            You qualify with <Text style={s.eligibilityHighlight}>{eligibleCount}</Text> of {totalProviders} providers
          </Text>
          <TouchableOpacity style={s.ctaButton} activeOpacity={0.85} onPress={() => router.push("/providers")}>
            <Text style={s.ctaButtonText}>View loan providers</Text>
            <ArrowRightIcon />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {floatHeader}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F0EB" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  floatHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  floatTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  hero: {
    paddingBottom: 34,
    paddingHorizontal: 24,
    alignItems: "center",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: "hidden",
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 4,
  },
  gaugeWrap: { marginTop: 4 },
  deltaText: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 16,
  },
  pillWrap: { marginTop: 14 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: "#4C2311",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#4C2311", marginBottom: 16 },
  emptyTips: { fontSize: 14, color: "#A68A7B", lineHeight: 20 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  tipRowLast: { marginBottom: 0 },
  tipIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FDF6ED",
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: { flex: 1, fontSize: 14, color: "#4C2311", lineHeight: 20, paddingTop: 7 },
  eligCard: { backgroundColor: "#4C2311" },
  eligibilityText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "600",
    marginBottom: 16,
    lineHeight: 22,
  },
  eligibilityHighlight: { color: "#F0B968", fontWeight: "800" },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DA9133",
    borderRadius: 24,
    paddingVertical: 15,
  },
  ctaButtonText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});
