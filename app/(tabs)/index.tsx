import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TextInput,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { ensureScore, colorForBand, getScoreHistory, SCORE_MAX } from "@/lib/credit";
import { listLoans, type Loan } from "@/lib/loans";
import { getRecommendedProviders, type Provider, type Eligibility } from "@/lib/providers";
import ProviderCard from "@/components/providers/ProviderCard";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const { width: SCREEN_W } = Dimensions.get("window");
const OVERVIEW_CARD_W = (SCREEN_W - 48 - 12) / 2;
const PROVIDER_CARD_W = 170;

const GAUGE_R = 38;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;
const GAUGE_ARC = GAUGE_CIRC * 0.75;

const BAR_HEIGHTS = [0.5, 0.72, 0.6, 0.88, 0.78, 1, 0.66, 0.82];

function repaidPct(loan: Loan) {
  if (loan.total_repayable <= 0) return 0;
  return Math.round((loan.amount_paid / loan.total_repayable) * 100);
}

function daysUntil(iso: string) {
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

interface IconProps {
  size?: number;
  color?: string;
}

function CalendarIcon({ size = 18, color = "#633E2F" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BellIcon({ size = 22, color = "#4C2311" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SearchIcon({ size = 20, color = "#A68A7B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShieldIcon({ size = 16, color = "#FFFFFF" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BanknoteIcon({ size = 16, color = "#FFFFFF" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function WalletIcon({ size = 20, color = "#FFFFFF" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 5a2 2 0 012-2h16a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V5zM2 10h20"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon({ size = 20, color = "#FFFFFF" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 6v6l4 2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckCircleIcon({ size = 20, color = "#FFFFFF" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 11.08V12a10 10 0 11-5.93-9.14"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 4L12 14.01l-3-3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrendUpIcon({ size = 20, color = "#FFFFFF" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SparklesIcon({ size = 24, color = "#FFFFFF" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2zM5 3l.5 1.5L7 5l-1.5.5L5 7l-.5-1.5L3 5l1.5-.5L5 3zM19 17l.5 1.5L21 19l-1.5.5L19 21l-.5-1.5L17 19l1.5-.5L19 17z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoreIcon({ size = 20, color = "#A68A7B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={5} cy={12} r={1.5} fill={color} />
      <Circle cx={12} cy={12} r={1.5} fill={color} />
      <Circle cx={19} cy={12} r={1.5} fill={color} />
    </Svg>
  );
}

function MessageIcon({ size = 20, color = "#FFFFFF" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function formatUGX(amount: number) {
  if (amount >= 1000000) return `UGX ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `UGX ${Math.round(amount / 1000)}K`;
  return `UGX ${amount.toLocaleString()}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate() {
  const d = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDueDate(iso: string) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function SectionHeader({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      {trailing ?? (
        <TouchableOpacity hitSlop={8}>
          <MoreIcon />
        </TouchableOpacity>
      )}
    </View>
  );
}

function useEntrance(delay: number) {
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, delay]);
  return {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };
}

function useReveal(active: boolean, delay: number) {
  const [frac, setFrac] = useState(0);
  useEffect(() => {
    if (!active) return;
    const reveal = new Animated.Value(0);
    const id = reveal.addListener(({ value }) => setFrac(value));
    Animated.timing(reveal, {
      toValue: 1,
      duration: 900,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => reveal.removeListener(id);
  }, [active, delay]);
  return frac;
}

function CreditScoreCard({
  score,
  band,
  onPress,
}: {
  score: number | null;
  band: string | null;
  onPress: () => void;
}) {
  const { t } = useLanguage();
  const hasScore = score !== null && band !== null;
  const entrance = useEntrance(0);
  const frac = useReveal(hasScore, 220);
  const ratio = hasScore ? score / SCORE_MAX : 0;
  const filled = GAUGE_ARC * ratio * frac;
  const bg = hasScore ? colorForBand(band) : "#A68A7B";
  const bandLabel = hasScore ? t(`home_score_${band.toLowerCase().replace(" ", "_")}`) : "—";

  return (
    <AnimatedTouchable
      style={[s.metricCard, { backgroundColor: bg }, entrance]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={s.metricLabel}>
        <ShieldIcon size={14} />
        <Text style={s.metricLabelText}>{t("home_credit_score")}</Text>
      </View>
      <View style={s.gaugeWrap}>
        <Svg width={96} height={96} viewBox="0 0 100 100">
          <Circle
            cx={50}
            cy={50}
            r={GAUGE_R}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={8}
            fill="none"
            strokeDasharray={`${GAUGE_ARC} ${GAUGE_CIRC}`}
            strokeLinecap="round"
            transform="rotate(135 50 50)"
          />
          <Circle
            cx={50}
            cy={50}
            r={GAUGE_R}
            stroke="#FFFFFF"
            strokeWidth={8}
            fill="none"
            strokeDasharray={`${filled} ${GAUGE_CIRC}`}
            strokeLinecap="round"
            transform="rotate(135 50 50)"
          />
        </Svg>
        <View style={s.gaugeCenter}>
          <Text style={s.gaugeValue}>{hasScore ? Math.round(score * frac) : "—"}</Text>
          <Text style={s.gaugeSubtext}>{bandLabel}</Text>
        </View>
      </View>
    </AnimatedTouchable>
  );
}

function ActiveLoanCard({ loan }: { loan: Loan | null }) {
  const { t } = useLanguage();
  const entrance = useEntrance(90);
  const frac = useReveal(loan !== null, 320);

  if (!loan) {
    return (
      <Animated.View style={[s.metricCard, s.loanCardEmpty, entrance]}>
        <View style={s.metricLabel}>
          <BanknoteIcon size={14} />
          <Text style={s.metricLabelText}>{t("home_active_loan")}</Text>
        </View>
        <View style={s.loanEmptyBody}>
          <Text style={s.loanEmptyTitle}>{t("home_no_active_loan")}</Text>
          <Text style={s.loanEmptySub}>{t("home_no_active_loan_sub")}</Text>
        </View>
      </Animated.View>
    );
  }

  const pct = repaidPct(loan);
  const filledBars = Math.round((pct / 100) * BAR_HEIGHTS.length);

  return (
    <Animated.View style={[s.metricCard, { backgroundColor: "#C47F2D" }, entrance]}>
      <View style={s.metricLabel}>
        <BanknoteIcon size={14} />
        <Text style={s.metricLabelText}>{t("home_active_loan")}</Text>
      </View>
      <Text style={s.loanAmount}>{formatUGX(loan.total_repayable)}</Text>
      <Text style={s.loanProvider} numberOfLines={1}>{loan.provider}</Text>
      <View style={s.loanBars}>
        {BAR_HEIGHTS.map((h, i) => (
          <View
            key={i}
            style={{
              width: 7,
              height: h * 28 * Math.max(0, Math.min(1, frac * 1.6 - i * 0.12)),
              borderRadius: 3.5,
              backgroundColor: i < filledBars ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
            }}
          />
        ))}
      </View>
      <Text style={s.loanPct}>{`${pct}% ${t("home_repaid")}`}</Text>
    </Animated.View>
  );
}

interface TrackerRowProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  last?: boolean;
}

function TrackerRow({ icon, iconBg, title, subtitle, badge, badgeBg, badgeColor, last }: TrackerRowProps) {
  return (
    <View style={[s.trackerRow, !last && s.trackerRowBorder]}>
      <View style={[s.trackerIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={s.trackerText}>
        <Text style={s.trackerTitle}>{title}</Text>
        <Text style={s.trackerSub}>{subtitle}</Text>
      </View>
      <View style={[s.trackerBadge, { backgroundColor: badgeBg }]}>
        <Text style={[s.trackerBadgeText, { color: badgeColor }]}>{badge}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [search, setSearch] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [creditScore, setCreditScore] = useState<{ score: number; band: string } | null>(null);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loansLoaded, setLoansLoaded] = useState(false);
  const [recommended, setRecommended] = useState<{ provider: Provider; eligibility: Eligibility }[]>([]);

  useEffect(() => {
    if (!session?.user.id) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("read", false)
      .then(({ count }) => {
        setUnreadCount(count ?? 0);
      });
  }, [session?.user.id]);

  useEffect(() => {
    ensureScore()
      .then((result) => setCreditScore({ score: result.score, band: result.band }))
      .catch(() => Alert.alert("Error", "We couldn't load your credit score. Please try again later."));
    getScoreHistory(2)
      .then((history) => {
        if (history.length >= 2) {
          setScoreDelta(history[history.length - 1]!.score - history[history.length - 2]!.score);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    listLoans()
      .then(setLoans)
      .catch(() => Alert.alert("Error", "We couldn't load your loans. Please try again later."))
      .finally(() => setLoansLoaded(true));
  }, []);

  useEffect(() => {
    getRecommendedProviders(5)
      .then(setRecommended)
      .catch(() => Alert.alert("Error", "We couldn't load recommended providers. Please try again later."));
  }, []);

  const activeLoan =
    loans.find((l) => l.status === "active") ??
    loans.find((l) => l.status === "overdue") ??
    loans.find((l) => l.status !== "paid") ??
    null;
  const completedCount = loans.filter((l) => l.status === "paid").length;

  const repayPct = activeLoan ? repaidPct(activeLoan) : 0;
  const dueDays = activeLoan ? daysUntil(activeLoan.due_date) : null;

  let nextPaymentSub: string;
  let nextPaymentBadge: string;
  if (activeLoan) {
    nextPaymentSub = formatDueDate(activeLoan.due_date);
    nextPaymentBadge =
      dueDays !== null && dueDays < 0 ? t("home_overdue") : `${dueDays} ${t("home_days")}`;
  } else {
    nextPaymentSub = t("home_next_payment_none");
    nextPaymentBadge = "—";
  }

  let creditHealthSub: string;
  let creditHealthBadge: string;
  if (scoreDelta === null || scoreDelta === 0) {
    creditHealthSub = t("home_credit_flat");
    creditHealthBadge = scoreDelta === 0 ? "0" : "—";
  } else if (scoreDelta > 0) {
    creditHealthSub = t("home_credit_up");
    creditHealthBadge = `+${scoreDelta}`;
  } else {
    creditHealthSub = t("home_credit_down");
    creditHealthBadge = `${scoreDelta}`;
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScrollView
        style={s.flex}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View style={s.dateRow}>
            <View style={s.dateLeft}>
              <CalendarIcon size={20} />
              <Text style={s.dateText}>{formatDate()}</Text>
            </View>
            <TouchableOpacity style={s.bellWrap} hitSlop={8} onPress={() => router.push("/notifications")}>
              <BellIcon size={24} />
              {unreadCount > 0 && (
                <View style={s.bellBadge}>
                  <Text style={s.bellBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={s.greetingRow}>
            <View style={s.avatarRing}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={s.greetingText}>
              <Text style={s.greetingName}>{t("common_hi")}, {firstName}!</Text>
              <View style={s.badgesRow}>
                <TouchableOpacity style={s.badge} activeOpacity={0.7} onPress={() => router.push("/credit-score")}>
                  <ShieldIcon size={13} color="#DA9133" />
                  <Text style={s.badgeText}>{t("common_score")}: {creditScore ? creditScore.score : "—"}</Text>
                </TouchableOpacity>
                <View style={[s.badge, { backgroundColor: "#E8F5E9" }]}>
                  <TrendUpIcon size={13} color="#2E7D32" />
                  <Text style={[s.badgeText, { color: "#2E7D32" }]}>
                    {creditScore ? t(`home_score_${creditScore.band.toLowerCase().replace(" ", "_")}`) : "—"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={s.searchWrap}>
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t("home_search_placeholder")}
              placeholderTextColor="#A68A7B"
            />
            <SearchIcon size={22} color="#4C2311" />
          </View>
        </View>

        <View style={s.section}>
          <SectionHeader title={t("home_loan_overview")} />
          <View style={s.metricRow}>
            <CreditScoreCard
              score={creditScore?.score ?? null}
              band={creditScore?.band ?? null}
              onPress={() => router.push("/credit-score")}
            />
            <ActiveLoanCard loan={activeLoan} />
          </View>
        </View>

        <View style={s.section}>
          <SectionHeader title={t("home_loan_activity")} />
          <View style={s.trackerCard}>
            <TrackerRow
              icon={<WalletIcon size={20} />}
              iconBg="#2E7D32"
              title={t("home_repayment_progress")}
              subtitle={
                activeLoan
                  ? `${formatUGX(activeLoan.amount_paid)} / ${formatUGX(activeLoan.total_repayable)}`
                  : t("home_repayment_none")
              }
              badge={`${repayPct}%`}
              badgeBg="#E8F5E9"
              badgeColor="#2E7D32"
            />
            <TrackerRow
              icon={<ClockIcon size={20} />}
              iconBg="#1565C0"
              title={t("home_next_payment")}
              subtitle={nextPaymentSub}
              badge={nextPaymentBadge}
              badgeBg="#E3F2FD"
              badgeColor="#1565C0"
            />
            <TrackerRow
              icon={<CheckCircleIcon size={20} />}
              iconBg="#E65100"
              title={t("home_loans_completed")}
              subtitle={`${completedCount} ${t("home_loans_paid_label")}`}
              badge={`${completedCount}`}
              badgeBg="#FFF3E0"
              badgeColor="#E65100"
            />
            <TrackerRow
              icon={<TrendUpIcon size={20} />}
              iconBg="#6A1B9A"
              title={t("home_credit_health")}
              subtitle={creditHealthSub}
              badge={creditHealthBadge}
              badgeBg="#F3E5F5"
              badgeColor="#6A1B9A"
              last
            />
          </View>
        </View>

        <View style={s.section}>
          <SectionHeader title={t("home_ai_loan_advisor")} />
          <TouchableOpacity style={s.aiCard} activeOpacity={0.85}>
            <View style={s.aiContent}>
              <View style={s.aiLeft}>
                <View style={s.aiStatRow}>
                  <MessageIcon size={18} color="#DA9133" />
                  <Text style={s.aiStatText}>{t("home_suggestions_available")}</Text>
                </View>
                <Text style={s.aiHeading}>{t("home_get_personalized")}</Text>
                <Text style={s.aiSub}>
                  {t("home_ai_description")}
                </Text>
                <View style={s.aiButton}>
                  <Text style={s.aiButtonText}>{t("home_start_conversation")}</Text>
                </View>
              </View>
              <View style={s.aiRight}>
                <SparklesIcon size={52} color="rgba(218,145,51,0.6)" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <SectionHeader
            title={t("home_loan_providers")}
            trailing={
              <TouchableOpacity hitSlop={8} onPress={() => router.push("/providers")}>
                <Text style={s.seeAll}>{t("home_see_all")}</Text>
              </TouchableOpacity>
            }
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.providerScroll}
          >
            {recommended.map(({ provider, eligibility }) => (
              <View key={provider.id} style={s.recommendedCardWrap}>
                <ProviderCard
                  provider={provider}
                  eligibility={eligibility}
                  onPress={() => router.push({ pathname: "/providers/[id]", params: { id: provider.id } })}
                />
              </View>
            ))}
          </ScrollView>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F0EB",
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  dateLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: "#633E2F",
    fontWeight: "500",
  },
  bellWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#4C2311",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#DA9133",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#F7F0EB",
  },
  bellBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  avatarRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2.5,
    borderColor: "#D9CCC4",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#4C2311",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  greetingText: {
    flex: 1,
  },
  greetingName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#4C2311",
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FDF6ED",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DA9133",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDE5DD",
    borderRadius: 28,
    height: 52,
    paddingHorizontal: 18,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#4C2311",
    height: "100%",
  },

  section: {
    marginTop: 24,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4C2311",
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DA9133",
  },

  metricRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
  },
  metricCard: {
    width: OVERVIEW_CARD_W,
    borderRadius: 20,
    padding: 14,
    minHeight: 190,
  },
  metricLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  metricLabelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },

  gaugeWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeCenter: {
    position: "absolute",
    alignItems: "center",
  },
  gaugeValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  gaugeSubtext: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginTop: -2,
  },

  loanAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
  },
  loanProvider: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  loanBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginTop: "auto",
    paddingTop: 12,
  },
  loanPct: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
  },
  loanCardEmpty: {
    backgroundColor: "#B99B7B",
  },
  loanEmptyBody: {
    flex: 1,
    justifyContent: "center",
  },
  loanEmptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loanEmptySub: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },

  trackerCard: {
    marginHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
  },
  trackerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  trackerRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8E1",
  },
  trackerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  trackerText: {
    flex: 1,
  },
  trackerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4C2311",
    marginBottom: 2,
  },
  trackerSub: {
    fontSize: 12,
    color: "#A68A7B",
    fontWeight: "500",
  },
  trackerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trackerBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },

  aiCard: {
    marginHorizontal: 24,
    backgroundColor: "#4C2311",
    borderRadius: 24,
    overflow: "hidden",
  },
  aiContent: {
    flexDirection: "row",
    padding: 20,
  },
  aiLeft: {
    flex: 1,
    paddingRight: 12,
  },
  aiRight: {
    justifyContent: "center",
    alignItems: "center",
    width: 60,
  },
  aiStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  aiStatText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DA9133",
  },
  aiHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 26,
    marginBottom: 8,
  },
  aiSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 18,
    marginBottom: 16,
  },
  aiButton: {
    backgroundColor: "#DA9133",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  aiButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  providerScroll: {
    paddingHorizontal: 24,
    gap: 12,
  },
  recommendedCardWrap: {
    width: 220,
  },
  providerCard: {
    width: PROVIDER_CARD_W,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  providerInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  providerType: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  providerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4C2311",
    marginBottom: 6,
  },
  providerRate: {
    fontSize: 12,
    color: "#633E2F",
    fontWeight: "500",
    marginBottom: 2,
  },
  providerMax: {
    fontSize: 11,
    color: "#A68A7B",
    fontWeight: "500",
  },

});
