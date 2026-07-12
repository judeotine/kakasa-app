import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import * as Notifications from "expo-notifications";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  getNotificationPreferences,
  updateNotificationPreference,
  registerForPushNotifications,
  type NotificationPreferences,
} from "@/lib/notifications";

function BackIcon() {
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

function MoreIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={5} r={1.5} fill="#A68A7B" />
      <Circle cx={12} cy={12} r={1.5} fill="#A68A7B" />
      <Circle cx={12} cy={19} r={1.5} fill="#A68A7B" />
    </Svg>
  );
}

function BellIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
        stroke="#4C2311"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18"
        stroke="#4C2311"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrendIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 6l-9.5 9.5-5-5L1 18"
        stroke="#4C2311"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 6h6v6"
        stroke="#4C2311"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TagIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"
        stroke="#4C2311"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={7} cy={7} r={1} fill="#4C2311" />
    </Svg>
  );
}

function DownloadIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
        stroke="#4C2311"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke="#A68A7B"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SectionHeader({ title, showMore }: { title: string; showMore?: boolean }) {
  return (
    <View style={sectionStyles.header}>
      <Text style={sectionStyles.title}>{title}</Text>
      {showMore && (
        <TouchableOpacity hitSlop={12} activeOpacity={0.6}>
          <MoreIcon />
        </TouchableOpacity>
      )}
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onValueChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={rowStyles.card}>
      <View style={rowStyles.iconWrap}>{icon}</View>
      <Text style={rowStyles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D9CCC4", true: "#8B9A6A" }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#D9CCC4"
      />
    </View>
  );
}

function DescriptionToggleRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={rowStyles.card}>
      <View style={rowStyles.descContent}>
        <Text style={rowStyles.boldLabel}>{title}</Text>
        <Text style={rowStyles.description}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D9CCC4", true: "#8B9A6A" }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#D9CCC4"
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    notification_loan_alerts: true,
    notification_payment_reminders: true,
    notification_credit_score: false,
    notification_sound: true,
    notification_vibration: true,
  });

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const { status } = await Notifications.getPermissionsAsync();
      setPushEnabled(status === "granted");
      const saved = await getNotificationPreferences(userId);
      setPrefs(saved);
      setLoading(false);
    };
    load();
  }, [userId]);

  const togglePref = useCallback(
    (key: keyof NotificationPreferences) => async (value: boolean) => {
      if (!userId) return;
      setPrefs((prev) => ({ ...prev, [key]: value }));
      await updateNotificationPreference(userId, key, value);
    },
    [userId]
  );

  const handlePushToggle = useCallback(
    async (value: boolean) => {
      if (!userId) return;
      if (value) {
        const token = await registerForPushNotifications(userId);
        if (!token) {
          Alert.alert(
            t("notif_push_denied"),
            t("notif_push_denied_msg"),
            [
              { text: t("common_cancel"), style: "cancel" },
              {
                text: t("notif_open_settings"),
                onPress: () => {
                  if (Platform.OS === "ios") {
                    Linking.openURL("app-settings:");
                  } else {
                    Linking.openSettings();
                  }
                },
              },
            ]
          );
          return;
        }
        setPushEnabled(true);
      } else {
        Alert.alert(
          t("notif_disable_push"),
          t("notif_disable_push_msg"),
          [
            { text: t("common_cancel"), style: "cancel" },
            {
              text: t("notif_open_settings"),
              onPress: () => {
                if (Platform.OS === "ios") {
                  Linking.openURL("app-settings:");
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }
    },
    [userId, t]
  );

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }, styles.centered]}>
        <ActivityIndicator color="#DA9133" size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.6}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("notif_settings_title")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title={t("notif_loan_alerts")} showMore />
        <View style={sectionStyles.group}>
          <ToggleRow
            icon={<BellIcon />}
            label={t("notif_push")}
            value={pushEnabled}
            onValueChange={handlePushToggle}
          />
          <ToggleRow
            icon={<CalendarIcon />}
            label={t("notif_payment_reminders")}
            value={prefs.notification_payment_reminders}
            onValueChange={togglePref("notification_payment_reminders")}
          />
          <ToggleRow
            icon={<TrendIcon />}
            label={t("notif_credit_updates")}
            value={prefs.notification_credit_score}
            onValueChange={togglePref("notification_credit_score")}
          />
        </View>

        <SectionHeader title={t("notif_sound_vibration")} />
        <View style={sectionStyles.group}>
          <DescriptionToggleRow
            title={t("notif_sound")}
            description={t("notif_sound_desc")}
            value={prefs.notification_sound}
            onValueChange={togglePref("notification_sound")}
          />
          <DescriptionToggleRow
            title={t("notif_vibration")}
            description={t("notif_vibration_desc")}
            value={prefs.notification_vibration}
            onValueChange={togglePref("notification_vibration")}
          />
        </View>

        <SectionHeader title={t("notif_misc")} showMore />
        <View style={sectionStyles.group}>
          <TouchableOpacity style={rowStyles.card} activeOpacity={0.7}>
            <View style={rowStyles.iconWrap}>
              <TagIcon />
            </View>
            <Text style={rowStyles.label}>{t("notif_special_offers")}</Text>
            <View style={rowStyles.badge}>
              <Text style={rowStyles.badgeText}>50% OFF</Text>
            </View>
            <ChevronRightIcon />
          </TouchableOpacity>
          <ToggleRow
            icon={<DownloadIcon />}
            label={t("notif_app_updates")}
            value={prefs.notification_loan_alerts}
            onValueChange={togglePref("notification_loan_alerts")}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F0EB",
  },
  flex: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D9CCC4",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#4C2311",
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
});

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4C2311",
  },
  group: {
    gap: 12,
  },
});

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F7F0EB",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#4C2311",
  },
  boldLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4C2311",
    marginBottom: 4,
  },
  descContent: {
    flex: 1,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: "#A68A7B",
  },
  badge: {
    backgroundColor: "#DA9133",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
