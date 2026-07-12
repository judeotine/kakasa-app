import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { useLanguage } from "@/lib/i18n";
import { getApplication, type LoanApplication } from "@/lib/loanApplication";

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

function CheckCircleIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#FFFFFF" strokeWidth={2} />
      <Path
        d="M8 12l3 3 5-5"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function XCircleIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#FFFFFF" strokeWidth={2} />
      <Path
        d="M15 9l-6 6M9 9l6 6"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#FFFFFF" strokeWidth={2} />
      <Path
        d="M12 6v6l4 2"
        stroke="#FFFFFF"
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
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
        stroke="#2E7D32"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoneyIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
        stroke="#2E7D32"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke="#2E7D32"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function scoreColor(score: number): string {
  if (score >= 70) return "#2E7D32";
  if (score >= 40) return "#DA9133";
  return "#C62828";
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-UG") + " UGX";
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return phone;
  return phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
}

const HERO_CONFIG = {
  approved: { color: "#2E7D32", Icon: CheckCircleIcon },
  declined: { color: "#C62828", Icon: XCircleIcon },
  reviewing: { color: "#DA9133", Icon: ClockIcon },
} as const;

const MAX_POLLS = 10;
const POLL_INTERVAL = 3000;

export default function DecisionScreen() {
  const insets = useSafeAreaInsets();
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const { t } = useLanguage();
  const [application, setApplication] = useState<LoanApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const pollCount = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDecision = useCallback(async () => {
    if (!applicationId) return;
    try {
      const app = await getApplication(applicationId);
      if (!app) {
        router.back();
        return;
      }
      setApplication(app);

      if (app.status === "reviewing" && pollCount.current < MAX_POLLS) {
        pollCount.current += 1;
        pollTimer.current = setTimeout(loadDecision, POLL_INTERVAL);
        return;
      }
    } catch {
      if (pollCount.current < MAX_POLLS) {
        pollCount.current += 1;
        pollTimer.current = setTimeout(loadDecision, POLL_INTERVAL);
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    loadDecision();
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [loadDecision]);

  if (loading) {
    return (
      <View style={[s.container, s.centered]}>
        <ActivityIndicator size="large" color="#DA9133" />
        <Text style={s.loadingText}>{t("decision_reviewing")}</Text>
      </View>
    );
  }

  if (!application) return null;

  const status = application.status as "approved" | "declined" | "reviewing";
  const hero = HERO_CONFIG[status] ?? HERO_CONFIG.reviewing;
  const HeroIcon = hero.Icon;
  const score = application.interview_score;
  const reasons = application.decision_reasons ?? [];

  const titleKey =
    status === "approved"
      ? "decision_approved"
      : status === "declined"
        ? "decision_declined"
        : "decision_in_review";

  const messageKey =
    status === "approved"
      ? "decision_approved_msg"
      : status === "declined"
        ? "decision_declined_msg"
        : "decision_review_msg";

  const nextStepsKey =
    status === "approved"
      ? "decision_approved_next"
      : status === "declined"
        ? "decision_declined_next"
        : "decision_review_next";

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
        <Text style={s.headerTitle}>{t("decision_title")}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        style={s.flex}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.heroCard, { backgroundColor: hero.color }]}>
          <View style={s.heroIconCircle}>
            <HeroIcon />
          </View>
          <Text style={s.heroTitle}>{t(titleKey)}</Text>
          {score !== null && (
            <View style={s.scoreContainer}>
              <Text style={s.scoreLabel}>{t("decision_score")}</Text>
              <View style={[s.scoreBadge, { borderColor: scoreColor(score) }]}>
                <Text style={[s.scoreValue, { color: scoreColor(score) }]}>
                  {score}
                </Text>
                <Text style={s.scoreMax}>/100</Text>
              </View>
            </View>
          )}
        </View>

        <View style={s.detailCard}>
          <Text style={s.detailText}>{t(messageKey)}</Text>
        </View>

        {reasons.length > 0 && (
          <View style={s.detailCard}>
            <Text style={s.detailCardTitle}>{t("decision_factors")}</Text>
            {reasons.map((reason, index) => (
              <View key={index} style={s.bulletRow}>
                <View
                  style={[s.bulletDot, { backgroundColor: hero.color }]}
                />
                <Text style={s.bulletText}>{reason}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.detailCard}>
          <Text style={s.detailCardTitle}>{t("decision_next_steps")}</Text>
          <Text style={s.detailText}>{t(nextStepsKey)}</Text>
        </View>

        {status === "approved" && application.disbursement_phone && (
          <View style={s.disbursementCard}>
            <View style={s.disbursementHeader}>
              <View style={s.disbursementBadge}>
                <CheckIcon />
                <Text style={s.disbursementBadgeText}>Sent</Text>
              </View>
            </View>
            <View style={s.disbursementRow}>
              <PhoneIcon />
              <View style={s.disbursementInfo}>
                <Text style={s.disbursementLabel}>{t("decision_disbursed_to")}</Text>
                <Text style={s.disbursementValue}>{maskPhone(application.disbursement_phone)}</Text>
              </View>
            </View>
            {application.amount_requested && (
              <View style={s.disbursementRow}>
                <MoneyIcon />
                <View style={s.disbursementInfo}>
                  <Text style={s.disbursementLabel}>{t("decision_amount_sent")}</Text>
                  <Text style={s.disbursementValue}>{formatAmount(application.amount_requested)}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {status === "approved" && (
          <TouchableOpacity
            style={s.primaryButton}
            onPress={() => router.replace("/(tabs)")}
            activeOpacity={0.85}
          >
            <Text style={s.primaryButtonText}>{t("decision_back_home")}</Text>
          </TouchableOpacity>
        )}

        {status === "declined" && (
          <>
            <TouchableOpacity
              style={s.primaryButton}
              onPress={() => router.replace("/(tabs)/providers")}
              activeOpacity={0.85}
            >
              <Text style={s.primaryButtonText}>
                {t("decision_view_providers")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)")}
              activeOpacity={0.7}
              style={s.secondaryLinkWrap}
            >
              <Text style={s.secondaryLinkText}>
                {t("decision_back_home")}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {status === "reviewing" && (
          <TouchableOpacity
            style={s.primaryButton}
            onPress={() => router.replace("/(tabs)")}
            activeOpacity={0.85}
          >
            <Text style={s.primaryButtonText}>{t("decision_back_home")}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F0EB" },
  flex: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#633E2F",
    marginTop: 16,
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
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#4C2311" },
  scroll: { paddingHorizontal: 24, paddingTop: 24 },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  scoreContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 2,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "800",
  },
  scoreMax: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A68A7B",
    marginLeft: 2,
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  detailCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4C2311",
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: "#633E2F",
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 8,
    marginRight: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: "#633E2F",
    lineHeight: 22,
  },
  disbursementCard: {
    backgroundColor: "#F0F9F0",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  disbursementHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  disbursementBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  disbursementBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E7D32",
  },
  disbursementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 14,
  },
  disbursementInfo: {
    flex: 1,
  },
  disbursementLabel: {
    fontSize: 12,
    color: "#4E7D4E",
    fontWeight: "500",
    marginBottom: 2,
  },
  disbursementValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E7D32",
  },
  primaryButton: {
    backgroundColor: "#4C2311",
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryLinkWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  secondaryLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DA9133",
  },
});
