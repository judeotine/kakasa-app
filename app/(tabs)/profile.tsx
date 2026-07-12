import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

function BellOutlineIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0" stroke="#4C2311" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PersonOutlineIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#4C2311" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={7} r={4} stroke="#4C2311" strokeWidth={1.8} />
    </Svg>
  );
}

function GlobeIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#4C2311" strokeWidth={1.8} />
      <Path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="#4C2311" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ShieldIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#4C2311" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CreditScoreIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 3v18h18" stroke="#4C2311" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 15l4-4 3 3 5-6" stroke="#4C2311" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChatIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#4C2311" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function FeedbackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#4C2311" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#4C2311" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrashIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="#C62828" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LogOutIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="#4C2311" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRightIcon({ color = "#D9CCC4" }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PenIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
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

function AlertTriangleIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#C62828" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

interface RowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function SettingsRow({ icon, label, value, onPress, danger }: RowProps) {
  return (
    <TouchableOpacity
      style={[s.row, danger && s.rowDanger]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={[s.rowLabel, danger && s.rowLabelDanger]}>{label}</Text>
      <View style={s.rowRight}>
        {value ? <Text style={s.rowValue}>{value}</Text> : null}
        <ChevronRightIcon color={danger ? "#E8A49C" : "#D9CCC4"} />
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {trailing ?? (
        <TouchableOpacity hitSlop={8}>
          <MoreIcon />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { languageName, t } = useLanguage();
  const [profile, setProfile] = useState<{
    full_name: string | null;
    avatar_url: string | null;
    location: string | null;
  } | null>(null);

  useEffect(() => {
    if (!session?.user.id) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url, location")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [session?.user.id]);

  const displayName = profile?.full_name ?? "User";
  const email = session?.user.email ?? "";
  const location = profile?.location ?? "Uganda";
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const handleSignOut = () => {
    Alert.alert(t("settings_sign_out"), t("settings_sign_out_confirm"), [
      { text: t("common_cancel"), style: "cancel" },
      { text: t("settings_sign_out"), style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  };

  const handleCloseAccount = () => {
    Alert.alert(
      t("settings_close_account"),
      t("settings_close_account_confirm"),
      [
        { text: t("common_cancel"), style: "cancel" },
        { text: t("settings_close_account"), style: "destructive" },
      ],
    );
  };

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.headerBg, { paddingTop: insets.top + 16 }]}>
          <Text style={s.headerTitle}>{t("settings_title")}</Text>
        </View>

        <View style={s.avatarSection}>
          <View style={s.avatarWrap}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={s.editBadge}>
              <PenIcon />
            </View>
          </View>
          <Text style={s.profileName}>{displayName}</Text>
          <Text style={s.profileEmail}>{email}</Text>
          <Text style={s.profileLocation}>{location}</Text>
        </View>

        <SectionHeader title={t("settings_general")} />
        <SettingsRow
          icon={<BellOutlineIcon />}
          label={t("settings_notifications")}
          onPress={() => router.push("/notification-settings")}
        />
        <SettingsRow
          icon={<PersonOutlineIcon />}
          label={t("settings_personal_info")}
          onPress={() => router.push("/personal-info")}
        />
        <SettingsRow
          icon={<GlobeIcon />}
          label={t("settings_language")}
          value={languageName}
          onPress={() => router.push("/language-settings")}
        />

        <SectionHeader title={t("settings_security_privacy")} />
        <SettingsRow icon={<ShieldIcon />} label={t("settings_security")} />
        <SettingsRow
          icon={<CreditScoreIcon />}
          label="Credit Score"
          onPress={() => router.push("/credit-score")}
        />
        <SettingsRow
          icon={<ChatIcon />}
          label={t("settings_help_center")}
          onPress={() => router.push("/help-center")}
        />
        <SettingsRow
          icon={<FeedbackIcon />}
          label={t("settings_submit_feedback")}
          onPress={() => router.push("/feedback")}
        />

        <SectionHeader title={t("settings_danger_zone")} trailing={<AlertTriangleIcon />} />
        <SettingsRow
          icon={<TrashIcon />}
          label={t("settings_close_account")}
          onPress={handleCloseAccount}
          danger
        />

        <SectionHeader title={t("settings_log_out")} />
        <SettingsRow icon={<LogOutIcon />} label={t("settings_log_out")} onPress={handleSignOut} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F0EB",
  },
  headerBg: {
    backgroundColor: "#4C2311",
    paddingHorizontal: 24,
    paddingBottom: 56,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  avatarSection: {
    alignItems: "center",
    marginTop: -40,
    marginBottom: 8,
  },
  avatarWrap: {
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: "#F7F0EB",
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#633E2F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#F7F0EB",
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  editBadge: {
    position: "absolute",
    right: -2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#DA9133",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#F7F0EB",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4C2311",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: "#A68A7B",
    marginBottom: 2,
  },
  profileLocation: {
    fontSize: 13,
    color: "#A68A7B",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4C2311",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 24,
    marginBottom: 10,
    gap: 14,
  },
  rowDanger: {
    backgroundColor: "#FFF0EE",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#4C2311",
  },
  rowLabelDanger: {
    color: "#C62828",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowValue: {
    fontSize: 13,
    color: "#A68A7B",
    fontWeight: "500",
  },
});
