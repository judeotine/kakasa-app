import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface Section {
  title: string;
  data: Notification[];
}

function BackArrowIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#4C2311" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MoreIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={5} cy={12} r={1.5} fill="#A68A7B" />
      <Circle cx={12} cy={12} r={1.5} fill="#A68A7B" />
      <Circle cx={19} cy={12} r={1.5} fill="#A68A7B" />
    </Svg>
  );
}

function MessageBubbleIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrendUpIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckCircleIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 4L12 14.01l-3-3" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SparklesIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2zM5 3l.5 1.5L7 5l-1.5.5L5 7l-.5-1.5L3 5l1.5-.5L5 3zM19 17l.5 1.5L21 19l-1.5.5L19 21l-.5-1.5L17 19l1.5-.5L19 17z" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BellOffIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0" stroke="#D9CCC4" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function GreenCheckIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill="#2E7D32" />
      <Path d="M8 12l3 3 5-5" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const TYPE_CONFIG: Record<string, { bg: string; icon: React.ReactNode }> = {
  loan_update: { bg: "#8B9A6A", icon: <MessageBubbleIcon /> },
  payment_reminder: { bg: "#1565C0", icon: <CalendarIcon /> },
  credit_score: { bg: "#DA9133", icon: <TrendUpIcon /> },
  loan_approved: { bg: "#E65100", icon: <CheckCircleIcon /> },
  ai_recommendation: { bg: "#8B9A6A", icon: <SparklesIcon /> },
  general: { bg: "#633E2F", icon: <MessageBubbleIcon /> },
};

function getTimeLabel(dateStr: string, t: (key: string) => string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t("notif_just_now");
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return t("common_yesterday");
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-UG", { month: "short", day: "numeric" });
}

function getSectionTitle(dateStr: string, t: (key: string) => string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return t("notifications_today");
  if (diffDays === 1) return t("notifications_yesterday");
  if (diffDays < 7) return t("notifications_this_week");
  if (diffDays < 30) return t("notif_earlier_this_month");
  return date.toLocaleDateString("en-UG", { month: "long", year: "numeric" });
}

function groupNotifications(items: Notification[], t: (key: string) => string): Section[] {
  const groups = new Map<string, Notification[]>();
  for (const item of items) {
    const key = getSectionTitle(item.created_at, t);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return Array.from(groups, ([title, data]) => ({ title, data }));
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("U");

  const fetchNotifications = useCallback(async () => {
    if (!session?.user.id) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data);
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id) return;

    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        if (data?.full_name) {
          const parts = data.full_name.trim().split(" ");
          setInitials(
            parts.length >= 2
              ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
              : parts[0][0].toUpperCase()
          );
        }
      });

    fetchNotifications().then(() => setLoading(false));
  }, [session?.user.id, fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const sections = groupNotifications(notifications, t);

  const renderItem = ({ item }: { item: Notification }) => {
    const fallback = { bg: "#633E2F", icon: <MessageBubbleIcon /> };
    const config = TYPE_CONFIG[item.type] ?? fallback;
    return (
      <TouchableOpacity
        style={[s.card, !item.read && s.cardUnread]}
        activeOpacity={0.7}
        onPress={() => markAsRead(item.id)}
      >
        <View style={s.cardRow}>
          <View style={[s.iconCircle, { backgroundColor: config.bg }]}>{config.icon}</View>
          <View style={s.cardTextWrap}>
            <Text style={s.cardTitle}>{item.title}</Text>
            <Text style={s.cardSubtitle} numberOfLines={2}>{item.body}</Text>
          </View>
          <View style={s.cardRight}>
            {item.read ? (
              <GreenCheckIcon />
            ) : (
              <View style={s.unreadDot} />
            )}
          </View>
        </View>
        <Text style={s.cardTime}>{getTimeLabel(item.created_at, t)}</Text>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string) => (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      <TouchableOpacity hitSlop={8}>
        <MoreIcon />
      </TouchableOpacity>
    </View>
  );

  const flatData: (string | Notification)[] = [];
  for (const section of sections) {
    flatData.push(section.title);
    flatData.push(...section.data);
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <BackArrowIcon />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{t("notifications_title")}</Text>
          {unreadCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>+{unreadCount}</Text>
            </View>
          )}
        </View>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={s.avatar} />
        ) : (
          <View style={s.avatarFallback}>
            <Text style={s.avatarFallbackText}>{initials}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={s.emptyWrap}>
          <ActivityIndicator color="#4C2311" size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.emptyWrap}>
          <BellOffIcon />
          <Text style={s.emptyTitle}>{t("notifications_no_notifications")}</Text>
          <Text style={s.emptySubtitle}>
            {t("notifications_caught_up")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item) => (typeof item === "string" ? `section-${item}` : item.id)}
          renderItem={({ item }) =>
            typeof item === "string"
              ? renderSectionHeader(item)
              : renderItem({ item })
          }
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4C2311"
              colors={["#4C2311"]}
            />
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F0EB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4C2311",
  },
  badge: {
    backgroundColor: "#DA9133",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#633E2F",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4C2311",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: "#DA9133",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextWrap: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4C2311",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#A68A7B",
    lineHeight: 18,
  },
  cardRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DA9133",
  },
  cardTime: {
    fontSize: 11,
    color: "#A68A7B",
    marginTop: 8,
    textAlign: "right",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4C2311",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#A68A7B",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
