import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from "react-native-svg";
import type { Provider, Eligibility, UserProfileForEligibility } from "@/lib/providers";
import { getProvider, getUserEligibilityContext, evaluateEligibility } from "@/lib/providers";
import { ensureScore } from "@/lib/credit";
import { formatUGX } from "@/lib/loans";

const { width: SCREEN_W } = Dimensions.get("window");
const HERO_H = 250;

function shadeColor(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  const r = Math.max(0, Math.min(255, Math.round(((num >> 16) & 255) * (1 - percent))));
  const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 255) * (1 - percent))));
  const b = Math.max(0, Math.min(255, Math.round((num & 255) * (1 - percent))));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#4C2311" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PercentIcon({ c = "#DA9133" }: { c?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M19 5L5 19" stroke={c} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={6.5} cy={6.5} r={2.5} stroke={c} strokeWidth={2} />
      <Circle cx={17.5} cy={17.5} r={2.5} stroke={c} strokeWidth={2} />
    </Svg>
  );
}

function WalletIcon({ c = "#DA9133" }: { c?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M3 7a2 2 0 012-2h11a2 2 0 012 2v1H5a2 2 0 00-2 2V7z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M3 9h16a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
      <Circle cx={16.5} cy={14} r={1.3} fill={c} />
    </Svg>
  );
}

function CalendarIcon({ c = "#DA9133" }: { c?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={16} rx={3} stroke={c} strokeWidth={1.8} />
      <Path d="M3 9h18M8 3v4M16 3v4" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function GaugeIcon({ c = "#DA9133" }: { c?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M4 18a8 8 0 1116 0" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 18l4-4" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function CoinsIcon({ c = "#DA9133" }: { c?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={9} r={5} stroke={c} strokeWidth={1.8} />
      <Path d="M14.5 5.5a5 5 0 010 9.5M8 20a5 5 0 006-4" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function CheckIcon({ size = 16, c = "#2E7D32" }: { size?: number; c?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill={c} />
      <Path d="M8 12.5l2.5 2.5 5.5-6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ShieldCheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="rgba(255,255,255,0.9)" strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M9 11.5l2 2 4-4.5" stroke="rgba(255,255,255,0.9)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ArrowRightIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function loanTypeLabel(loanType: string): string {
  if (loanType.toLowerCase() === "sme") return "SME";
  return loanType.charAt(0).toUpperCase() + loanType.slice(1);
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={s.statPill}>
      <View style={s.statIconWrap}>{icon}</View>
      <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function TermRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.termRow, !last && s.termRowBorder]}>
      <View style={s.termIcon}>{icon}</View>
      <Text style={s.termLabel}>{label}</Text>
      <Text style={s.termValue}>{value}</Text>
    </View>
  );
}

export default function ProviderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [userContext, setUserContext] = useState<UserProfileForEligibility | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const fetchedProvider = await getProvider(id);
      if (!fetchedProvider) {
        Alert.alert("Provider not found", "This provider is no longer available.");
        router.back();
        return;
      }
      await ensureScore().catch(() => undefined);
      const fetchedContext = await getUserEligibilityContext();
      setProvider(fetchedProvider);
      setUserContext(fetchedContext);
    } catch (err) {
      Alert.alert(
        "Couldn't load provider",
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const eligibility: Eligibility | null =
    provider && userContext ? evaluateEligibility(provider, userContext) : null;

  const handleApply = () => {
    if (!provider) return;
    router.push({ pathname: "/loan-apply/amount", params: { providerId: provider.id } });
  };

  if (loading || !provider || !userContext || !eligibility) {
    return (
      <View style={s.container}>
        <View style={[s.floatHeader, { paddingTop: insets.top + 6 }]}>
          <TouchableOpacity style={s.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <BackIcon />
          </TouchableOpacity>
        </View>
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#DA9133" size="large" />
        </View>
      </View>
    );
  }

  const gradientTop = provider.logo_color;
  const gradientBottom = shadeColor(provider.logo_color, 0.4);
  const scoreRatio = provider.min_score > 0 ? clamp(userContext.score / provider.min_score, 0, 1) : 1;
  const pointsAway = Math.max(0, provider.min_score - userContext.score);

  const exampleAmount = Math.min(1000000, provider.max_amount);
  const termMonths = provider.term_min_months;
  const avgRate = (provider.min_rate + provider.max_rate) / 2;
  const totalRepay = exampleAmount * (1 + (avgRate / 100) * (termMonths / 12));
  const monthly = totalRepay / termMonths;

  return (
    <View style={s.container}>
      <ScrollView
        style={s.flex}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.hero, { paddingTop: insets.top + 56 }]}>
          <Svg width={SCREEN_W} height={HERO_H + insets.top} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="0.6" y2="1">
                <Stop offset="0" stopColor={gradientTop} />
                <Stop offset="1" stopColor={gradientBottom} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={SCREEN_W} height={HERO_H + insets.top} fill="url(#grad)" />
            <Circle cx={SCREEN_W * 0.86} cy={insets.top + 30} r={70} fill="rgba(255,255,255,0.07)" />
            <Circle cx={SCREEN_W * 0.12} cy={HERO_H * 0.8} r={95} fill="rgba(255,255,255,0.05)" />
          </Svg>

          <View style={s.heroAvatar}>
            <Text style={s.heroAvatarInitial}>{provider.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.heroName}>{provider.name}</Text>
          <View style={s.typePill}>
            <Text style={s.typePillText}>{loanTypeLabel(provider.loan_type)} loan</Text>
          </View>
          <View style={s.trustRow}>
            <ShieldCheckIcon />
            <Text style={s.trustText}>Licensed lender · Regulated</Text>
          </View>
        </View>

        <View style={s.statRow}>
          <StatPill icon={<PercentIcon />} value={`${provider.min_rate}–${provider.max_rate}%`} label="Interest rate" />
          <StatPill icon={<WalletIcon />} value={formatUGX(provider.max_amount).replace("UGX ", "")} label="Max (UGX)" />
          <StatPill icon={<CalendarIcon />} value={`${provider.term_min_months}–${provider.term_max_months}`} label="Months" />
        </View>

        {eligibility.eligible ? (
          <View style={[s.card, s.eligCardGood]}>
            <View style={s.eligHead}>
              <CheckIcon size={26} />
              <View style={s.eligHeadText}>
                <Text style={s.eligTitleGood}>You qualify</Text>
                <Text style={s.eligSub}>Your profile meets {provider.name}'s requirements.</Text>
              </View>
            </View>
            <View style={s.scoreBarTrack}>
              <View style={[s.scoreBarFill, { width: `${Math.max(8, scoreRatio * 100)}%`, backgroundColor: "#2E7D32" }]} />
            </View>
            <Text style={s.scoreBarCaption}>
              {`Your score ${userContext.score} · needs ${provider.min_score}`}
            </Text>
          </View>
        ) : (
          <View style={[s.card, s.eligCardAmber]}>
            <View style={s.eligHead}>
              <View style={s.almostBadge}>
                <GaugeIcon c="#E65100" />
              </View>
              <View style={s.eligHeadText}>
                <Text style={s.eligTitleAmber}>
                  {pointsAway > 0 ? `${pointsAway} points from qualifying` : "Almost eligible"}
                </Text>
                <Text style={s.eligSub}>Here's what would unlock {provider.name}.</Text>
              </View>
            </View>
            <View style={s.scoreBarTrack}>
              <View style={[s.scoreBarFill, { width: `${Math.max(8, scoreRatio * 100)}%`, backgroundColor: "#E65100" }]} />
            </View>
            <Text style={s.scoreBarCaption}>
              {`Your score ${userContext.score} · needs ${provider.min_score}`}
            </Text>
            <View style={s.reasonsWrap}>
              {eligibility.reasons.map((reason) => (
                <View key={reason} style={s.reasonChip}>
                  <Text style={s.reasonChipText}>{reason}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={[s.card, s.estimateCard]}>
          <Text style={s.estimateLabel}>Example repayment</Text>
          <View style={s.estimateMain}>
            <Text style={s.estimateMonthly}>{formatUGX(Math.round(monthly))}</Text>
            <Text style={s.estimatePerMonth}>/ month</Text>
          </View>
          <Text style={s.estimateContext}>
            {`Borrow ${formatUGX(exampleAmount)} over ${termMonths} months at ~${avgRate}% p.a. · Total ${formatUGX(Math.round(totalRepay))}`}
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Loan terms</Text>
          <TermRow icon={<PercentIcon />} label="Interest rate" value={`${provider.min_rate}–${provider.max_rate}% p.a.`} />
          <TermRow icon={<WalletIcon />} label="Maximum amount" value={formatUGX(provider.max_amount)} />
          <TermRow icon={<CalendarIcon />} label="Loan term" value={`${provider.term_min_months}–${provider.term_max_months} months`} />
          <TermRow icon={<GaugeIcon />} label="Minimum credit score" value={`${provider.min_score}`} />
          <TermRow icon={<CoinsIcon />} label="Minimum monthly income" value={formatUGX(provider.min_income)} last />
        </View>

        {provider.requirements.length > 0 ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>What you'll need</Text>
            {provider.requirements.map((req) => (
              <View key={req} style={s.reqRow}>
                <CheckIcon size={18} c="#8B9A6A" />
                <Text style={s.reqText}>{req}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {provider.description ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>About {provider.name}</Text>
            <Text style={s.aboutText}>{provider.description}</Text>
          </View>
        ) : null}

        {eligibility.eligible ? (
          <TouchableOpacity style={s.ctaButton} activeOpacity={0.9} onPress={handleApply}>
            <Text style={s.ctaText}>Check my risk & apply</Text>
            <ArrowRightIcon />
          </TouchableOpacity>
        ) : (
          <View style={s.ctaColumn}>
            <TouchableOpacity style={s.ctaButtonSecondary} activeOpacity={0.9} onPress={handleApply}>
              <Text style={s.ctaTextSecondary}>Run a risk check anyway</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push("/credit-score")}>
              <Text style={s.improveLink}>Improve your credit score →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={[s.floatHeader, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={s.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <BackIcon />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F0EB" },
  flex: { flex: 1 },
  floatHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: {
    height: HERO_H,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  heroAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  heroAvatarInitial: { fontSize: 32, fontWeight: "800", color: "#FFFFFF" },
  heroName: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.3 },
  typePill: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  typePillText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  trustText: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
  statRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: -26,
  },
  statPill: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    shadowColor: "#4C2311",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FDF3E6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: { fontSize: 15, fontWeight: "800", color: "#4C2311" },
  statLabel: { fontSize: 10.5, fontWeight: "600", color: "#A68A7B", marginTop: 2 },
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
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#4C2311", marginBottom: 14 },
  eligCardGood: { backgroundColor: "#EAF3EB" },
  eligCardAmber: { backgroundColor: "#FBEEE3" },
  eligHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  eligHeadText: { flex: 1 },
  almostBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(230,81,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  eligTitleGood: { fontSize: 16, fontWeight: "800", color: "#2E7D32" },
  eligTitleAmber: { fontSize: 16, fontWeight: "800", color: "#E65100" },
  eligSub: { fontSize: 13, color: "#633E2F", marginTop: 2, lineHeight: 18 },
  scoreBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(76,35,17,0.1)",
    overflow: "hidden",
  },
  scoreBarFill: { height: "100%", borderRadius: 5 },
  scoreBarCaption: { fontSize: 12, fontWeight: "600", color: "#8A6E5F", marginTop: 8 },
  reasonsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  reasonChip: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  reasonChipText: { fontSize: 12.5, fontWeight: "600", color: "#8A4B1A" },
  estimateCard: { backgroundColor: "#4C2311" },
  estimateLabel: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.5 },
  estimateMain: { flexDirection: "row", alignItems: "baseline", marginTop: 8 },
  estimateMonthly: { fontSize: 30, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  estimatePerMonth: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.6)", marginLeft: 6 },
  estimateContext: { fontSize: 12.5, color: "rgba(255,255,255,0.7)", lineHeight: 18, marginTop: 8 },
  termRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13 },
  termRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F3ECE5" },
  termIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FDF3E6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  termLabel: { flex: 1, fontSize: 14, color: "#633E2F" },
  termValue: { fontSize: 14.5, fontWeight: "800", color: "#4C2311" },
  reqRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  reqText: { flex: 1, fontSize: 14, color: "#4C2311", fontWeight: "500" },
  aboutText: { fontSize: 14, color: "#633E2F", lineHeight: 21 },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4C2311",
    borderRadius: 26,
    paddingVertical: 17,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: "#4C2311",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  ctaColumn: { alignItems: "center", gap: 14, marginTop: 20, marginHorizontal: 20 },
  ctaButtonSecondary: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    borderRadius: 26,
    paddingVertical: 16,
  },
  ctaTextSecondary: { fontSize: 15, fontWeight: "800", color: "#4C2311" },
  improveLink: { fontSize: 14, fontWeight: "800", color: "#DA9133" },
});
