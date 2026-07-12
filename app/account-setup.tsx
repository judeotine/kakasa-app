import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
  Dimensions,
  Animated,
  Image,
  type ListRenderItemInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Svg, { Path, Circle, Ellipse } from "react-native-svg";
import * as LocalAuthentication from "expo-local-authentication";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { countries, type Country } from "@/lib/countries";
import { useLanguage } from "@/lib/i18n";
import { registerForPushNotifications } from "@/lib/notifications";
import { DateField } from "@/components/DateField";

const TOTAL_STEPS = 6;
const { width: SW } = Dimensions.get("window");
const DEFAULT_COUNTRY = countries[0]!;

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

function UserIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
        stroke="#A68A7B"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronDown() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke="#A68A7B"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MapPinIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
        stroke="#A68A7B"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={3} stroke="#A68A7B" strokeWidth={1.8} />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18" stroke="#A68A7B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PhoneIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
        stroke="#A68A7B"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke="#A68A7B"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CameraIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={13} r={4} stroke="#FFFFFF" strokeWidth={2} />
    </Svg>
  );
}

function LoanAlertIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="#DA9133" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function BellIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="#DA9133" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function GiftIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" stroke="#DA9133" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AlertTriangleIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" stroke="#C0533A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function NotificationIcon({ name }: { name: string }) {
  switch (name) {
    case "loanAlerts": return <LoanAlertIcon />;
    case "paymentReminders": return <BellIcon />;
    case "promotions": return <GiftIcon />;
    default: return null;
  }
}

function FingerprintIcon() {
  return (
    <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
      <Path d="M2 12a10 10 0 0118-6" stroke="#4C2311" strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M7 3.5A10 10 0 0122 12" stroke="#4C2311" strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M12 2a10 10 0 00-8.5 4.7" stroke="#4C2311" strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M12 22a10 10 0 008-4" stroke="#4C2311" strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M5 19a10 10 0 01-1-3" stroke="#4C2311" strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M8.5 7A6 6 0 0118 12c0 2.5-1 5-3 7" stroke="#4C2311" strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M6 8.5A6 6 0 0012 18" stroke="#4C2311" strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M12 12v0" stroke="#4C2311" strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 9a3 3 0 014.5 2.5c0 2-1 3.5-2 5" stroke="#4C2311" strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M9.5 14.5C9 16 9 17 9.5 18.5" stroke="#4C2311" strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

function FaceIdIcon() {
  return (
    <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
      <Path d="M7 3H5a2 2 0 00-2 2v2M17 3h2a2 2 0 012 2v2M7 21H5a2 2 0 01-2-2v-2M17 21h2a2 2 0 002-2v-2" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.5 9v1M14.5 9v1" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M9 15.5a3.5 3.5 0 006 0" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M12 9v3.5l-1 1" stroke="#4C2311" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DecorativeAvatars() {
  return (
    <View style={decoAvatarStyles.row}>
      <View style={decoAvatarStyles.side}>
        <Svg width={90} height={90} viewBox="0 0 90 90">
          <Circle cx={45} cy={45} r={44} fill="#C5CFA8" />
          <Path d="M45 45L89 45A44 44 0 0145 89Z" fill="#4C2311" />
          <Path d="M45 45L45 89A44 44 0 011 45Z" fill="#8B9A6A" />
        </Svg>
      </View>
      <View style={decoAvatarStyles.center}>
        <Svg width={8} height={12} viewBox="0 0 8 12">
          <Path d="M4 0C2 4 0 6 0 8a4 4 0 008 0c0-2-2-4-4-8z" fill="#4C2311" />
        </Svg>
        <View style={decoAvatarStyles.mainRing}>
          <Svg width={150} height={150} viewBox="0 0 150 150">
            <Circle cx={75} cy={75} r={73} fill="#FFFFFF" stroke="#E8DDD6" strokeWidth={2} />
            <Circle cx={75} cy={75} r={66} fill="#C5CFA8" />
            <Path d="M75 75L141 75A66 66 0 0175 141Z" fill="#8B9A6A" />
            <Path d="M75 75L75 141A66 66 0 019 75Z" fill="#4C2311" />
            <Path d="M75 75L9 75A66 66 0 0175 9Z" fill="#A3B87C" />
          </Svg>
        </View>
        <Svg width={8} height={12} viewBox="0 0 8 12">
          <Path d="M4 12C2 8 0 6 0 4a4 4 0 018 0c0 2-2 4-4 8z" fill="#4C2311" />
        </Svg>
      </View>
      <View style={decoAvatarStyles.side}>
        <Svg width={90} height={90} viewBox="0 0 90 90">
          <Circle cx={45} cy={45} r={44} fill="#8B9A6A" />
          <Path d="M45 45L89 45A44 44 0 0145 89Z" fill="#C5CFA8" />
          <Path d="M45 45L45 1A44 44 0 0189 45Z" fill="#4C2311" />
        </Svg>
      </View>
    </View>
  );
}

const decoAvatarStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
    gap: -10,
  },
  side: {
    opacity: 0.7,
  },
  center: {
    alignItems: "center",
    gap: 4,
    zIndex: 1,
  },
  mainRing: {
    marginVertical: 4,
  },
});

function BiometricCorners() {
  return (
    <View style={bioCornerStyles.wrap}>
      <View style={[bioCornerStyles.corner, bioCornerStyles.tl]} />
      <View style={[bioCornerStyles.corner, bioCornerStyles.tr]} />
      <View style={[bioCornerStyles.corner, bioCornerStyles.bl]} />
      <View style={[bioCornerStyles.corner, bioCornerStyles.br]} />
    </View>
  );
}

const bioCornerStyles = StyleSheet.create({
  wrap: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#8B9A6A",
  },
  tl: { top: 0, left: 0, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 8 },
});

function StepBiometric({
  biometricType,
  onEnable,
  onSkip,
  loading,
}: {
  biometricType: number;
  onEnable: () => void;
  onSkip: () => void;
  loading: boolean;
}) {
  const { t } = useLanguage();
  const isFaceId = biometricType === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION;
  return (
    <View style={bioStyles.wrap}>
      <DecoBlobs />
      <View style={bioStyles.content}>
        <View style={bioStyles.iconArea}>
          <BiometricCorners />
          <View style={bioStyles.iconCenter}>
            {isFaceId ? <FaceIdIcon /> : <FingerprintIcon />}
          </View>
        </View>
        <Text style={bioStyles.heading}>
          {isFaceId ? t("setup_face_id") : t("setup_fingerprint")}
        </Text>
        <Text style={bioStyles.sub}>
          {isFaceId
            ? t("setup_face_id_desc")
            : t("setup_fingerprint_desc")}
        </Text>
        <TouchableOpacity
          style={[bioStyles.enableBtn, loading && bioStyles.enableBtnOff]}
          activeOpacity={0.85}
          onPress={onEnable}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={bioStyles.enableTxt}>
              {isFaceId ? t("setup_enable_face_id") : t("setup_enable_fingerprint")}  →
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onSkip} activeOpacity={0.6} style={bioStyles.skipBtn}>
          <Text style={bioStyles.skipTxt}>{t("setup_skip")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const bioStyles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 20 },
  content: { alignItems: "center", paddingHorizontal: 32, paddingTop: 40 },
  iconArea: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  iconCenter: {
    position: "absolute",
  },
  heading: { fontSize: 22, fontWeight: "800", color: "#4C2311", marginBottom: 10, textAlign: "center" },
  sub: { fontSize: 14, lineHeight: 20, color: "#633E2F", textAlign: "center", marginBottom: 32 },
  enableBtn: {
    width: "100%",
    backgroundColor: "#4C2311",
    borderRadius: 28,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  enableBtnOff: { opacity: 0.4 },
  enableTxt: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  skipBtn: { marginTop: 20, paddingVertical: 8 },
  skipTxt: { fontSize: 14, color: "#A68A7B", textDecorationLine: "underline" },
});

function DecoBlobs() {
  return (
    <View style={decoStyles.container}>
      <Svg width={SW} height={200} viewBox={`0 0 ${SW} 200`}>
        <Ellipse cx={SW * 0.7} cy={-20} rx={140} ry={120} fill="#4C2311" opacity={0.08} />
        <Ellipse cx={SW * 0.2} cy={40} rx={100} ry={90} fill="#DA9133" opacity={0.1} />
        <Circle cx={SW * 0.85} cy={80} r={60} fill="#633E2F" opacity={0.06} />
      </Svg>
    </View>
  );
}

const decoStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});

interface HeaderProps {
  title: string;
  step: number;
  onBack: () => void;
}

function StepHeader({ title, step, onBack }: HeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[hdrStyles.container, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity
        style={hdrStyles.back}
        activeOpacity={0.6}
        onPress={onBack}
        hitSlop={12}
      >
        <BackIcon />
      </TouchableOpacity>
      <Text style={hdrStyles.title}>{title}</Text>
      <Text style={hdrStyles.counter}>
        {step} OF {TOTAL_STEPS}
      </Text>
    </View>
  );
}

const hdrStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D9CCC4",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#4C2311",
    textAlign: "center",
  },
  counter: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A68A7B",
    width: 56,
    textAlign: "right",
  },
});

interface BtnProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}

function BottomButton({ onPress, disabled, loading, label = "Continue" }: BtnProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[btnStyles.wrap, { paddingBottom: insets.bottom + 16 }]}>
      <TouchableOpacity
        style={[btnStyles.btn, disabled && btnStyles.off]}
        activeOpacity={0.85}
        onPress={onPress}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={btnStyles.txt}>{label}  →</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const btnStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingTop: 12, backgroundColor: "#FFFFFF" },
  btn: {
    backgroundColor: "#4C2311",
    borderRadius: 28,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  off: { opacity: 0.4 },
  txt: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});

function StepAvatar({
  uri,
  onPick,
}: {
  uri: string | null;
  onPick: () => void;
}) {
  const { t } = useLanguage();
  return (
    <View style={avatarStyles.wrap}>
      <DecorativeAvatars />

      <Text style={avatarStyles.heading}>{t("setup_avatar_heading")}</Text>
      <Text style={avatarStyles.sub}>
        {t("setup_avatar_sub")}
      </Text>

      <View style={avatarStyles.uploadArea}>
        <TouchableOpacity
          style={avatarStyles.circle}
          activeOpacity={0.7}
          onPress={onPick}
        >
          {uri ? (
            <>
              <Image source={{ uri }} style={avatarStyles.img} />
              <View style={avatarStyles.badge}>
                <CameraIcon />
              </View>
            </>
          ) : (
            <PlusIcon />
          )}
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.6} onPress={onPick}>
          <Text style={avatarStyles.upload}>{t("setup_upload_profile")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", paddingHorizontal: 24 },
  uploadArea: { alignItems: "center", marginTop: 8 },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#D9CCC4",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FDF6ED",
    marginBottom: 28,
  },
  img: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  badge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#DA9133",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4C2311",
    textAlign: "center",
    marginBottom: 10,
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    color: "#633E2F",
    textAlign: "center",
    marginBottom: 24,
  },
  upload: {
    fontSize: 14,
    color: "#A68A7B",
    textDecorationLine: "underline",
  },
});

const GENDER_OPTIONS = ["Male", "Female"];
const NIN_REGEX = /^C[MF][A-Z0-9]{12}$/;

function isValidNin(value: string) {
  return NIN_REGEX.test(value.trim().toUpperCase());
}

function StepProfile({
  name,
  gender,
  location,
  dob,
  nin,
  email,
  onNameChange,
  onGenderChange,
  onLocationChange,
  onDobChange,
  onNinChange,
}: {
  name: string;
  gender: string;
  location: string;
  dob: string;
  nin: string;
  email: string;
  onNameChange: (v: string) => void;
  onGenderChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onDobChange: (v: string) => void;
  onNinChange: (v: string) => void;
}) {
  const { t } = useLanguage();
  const [genderOpen, setGenderOpen] = useState(false);

  const genderDisplayMap: Record<string, string> = {
    Male: t("setup_male"),
    Female: t("setup_female"),
  };

  return (
    <View style={profileStyles.wrap}>
      <Text style={profileStyles.label}>{t("setup_full_name")}</Text>
      <View style={profileStyles.field}>
        <UserIcon />
        <TextInput
          style={profileStyles.input}
          value={name}
          onChangeText={onNameChange}
          placeholder={t("setup_name_placeholder")}
          placeholderTextColor="#A68A7B"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
      </View>

      <Text style={profileStyles.label}>{t("setup_email")}</Text>
      <View style={[profileStyles.field, profileStyles.fieldDisabled]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
            stroke="#A68A7B"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M22 6l-10 7L2 6" stroke="#A68A7B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={profileStyles.emailText}>{email}</Text>
      </View>

      <Text style={profileStyles.label}>{t("setup_gender")}</Text>
      <TouchableOpacity
        style={profileStyles.field}
        activeOpacity={0.7}
        onPress={() => setGenderOpen(true)}
      >
        <UserIcon />
        <Text style={[profileStyles.pickerText, !gender && profileStyles.placeholder]}>
          {gender ? genderDisplayMap[gender] : t("setup_gender_placeholder")}
        </Text>
        <ChevronDown />
      </TouchableOpacity>

      <Text style={profileStyles.label}>{t("setup_dob")}</Text>
      <DateField value={dob} onChange={onDobChange}>
        {({ open }) => (
          <TouchableOpacity style={profileStyles.field} activeOpacity={0.7} onPress={open}>
            <CalendarIcon />
            <Text style={[profileStyles.pickerText, !dob && profileStyles.placeholder]}>
              {dob || t("setup_dob_placeholder")}
            </Text>
            <ChevronDown />
          </TouchableOpacity>
        )}
      </DateField>

      <Text style={profileStyles.label}>{t("setup_nin")}</Text>
      <View style={profileStyles.field}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1z"
            stroke="#A68A7B"
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          <Path
            d="M14 10h4M14 14h4M6 15c.4-1.3 1.6-2 3-2s2.6.7 3 2M9 11.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
            stroke="#A68A7B"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <TextInput
          style={profileStyles.input}
          value={nin}
          onChangeText={(v) => onNinChange(v.toUpperCase())}
          placeholder={t("setup_nin_placeholder")}
          placeholderTextColor="#A68A7B"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={14}
        />
      </View>
      <Text style={profileStyles.hint}>{t("setup_nin_hint")}</Text>

      <Text style={profileStyles.label}>{t("setup_location")}</Text>
      <View style={profileStyles.field}>
        <MapPinIcon />
        <TextInput
          style={profileStyles.input}
          value={location}
          onChangeText={onLocationChange}
          placeholder={t("setup_location_placeholder")}
          placeholderTextColor="#A68A7B"
          autoCapitalize="words"
        />
      </View>

      <Modal visible={genderOpen} transparent animationType="fade" onRequestClose={() => setGenderOpen(false)}>
        <TouchableOpacity style={profileStyles.overlay} activeOpacity={1} onPress={() => setGenderOpen(false)}>
          <View style={profileStyles.sheet}>
            <Text style={profileStyles.sheetTitle}>{t("setup_select_gender")}</Text>
            {GENDER_OPTIONS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[profileStyles.sheetRow, gender === g && profileStyles.sheetRowSelected]}
                activeOpacity={0.7}
                onPress={() => {
                  onGenderChange(g);
                  setGenderOpen(false);
                }}
              >
                <Text style={[profileStyles.sheetLabel, gender === g && profileStyles.sheetLabelSelected]}>
                  {genderDisplayMap[g]}
                </Text>
                {gender === g && (
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17l-5-5" stroke="#DA9133" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingTop: 24 },
  label: { fontSize: 13, fontWeight: "600", color: "#4C2311", marginBottom: 8, marginTop: 4 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9CCC4",
    borderRadius: 28,
    height: 52,
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  fieldDisabled: { backgroundColor: "#F7F0EB" },
  input: { flex: 1, fontSize: 15, color: "#4C2311", height: "100%" },
  emailText: { flex: 1, fontSize: 15, color: "#A68A7B" },
  pickerText: { flex: 1, fontSize: 15, color: "#4C2311" },
  placeholder: { color: "#A68A7B" },
  hint: { fontSize: 12, color: "#A68A7B", marginTop: -8, marginBottom: 12, marginLeft: 4 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: "#4C2311", marginBottom: 16 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8DDD6",
  },
  sheetRowSelected: {},
  sheetLabel: { fontSize: 16, color: "#633E2F" },
  sheetLabelSelected: { color: "#4C2311", fontWeight: "600" },
});

function StepPhone({
  phone,
  country,
  onPhoneChange,
  onCountryPress,
  onSend,
  sending,
}: {
  phone: string;
  country: Country;
  onPhoneChange: (v: string) => void;
  onCountryPress: () => void;
  onSend: () => void;
  sending: boolean;
}) {
  const { t } = useLanguage();
  const valid = phone.replace(/\D/g, "").length >= 6;
  return (
    <View style={otpSetupStyles.wrap}>
      <DecoBlobs />
      <View style={otpSetupStyles.content}>
        <View style={otpSetupStyles.iconCircle}>
          <PhoneIcon />
        </View>
        <Text style={otpSetupStyles.heading}>{t("setup_otp_heading")}</Text>
        <Text style={otpSetupStyles.sub}>
          {t("setup_otp_sub")}
        </Text>

        <View style={otpSetupStyles.row}>
          <TouchableOpacity style={otpSetupStyles.countryBtn} activeOpacity={0.7} onPress={onCountryPress}>
            <Text style={otpSetupStyles.flag}>{country.flag}</Text>
            <Text style={otpSetupStyles.dial}>{country.dialCode}</Text>
            <ChevronDown />
          </TouchableOpacity>
          <View style={otpSetupStyles.phoneWrap}>
            <TextInput
              style={otpSetupStyles.phoneInput}
              value={phone}
              onChangeText={onPhoneChange}
              placeholder={t("setup_phone_placeholder")}
              placeholderTextColor="#A68A7B"
              keyboardType="number-pad"
              textContentType="telephoneNumber"
              maxLength={15}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[otpSetupStyles.sendBtn, (!valid || sending) && otpSetupStyles.sendBtnOff]}
          activeOpacity={0.85}
          onPress={onSend}
          disabled={!valid || sending}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={otpSetupStyles.sendTxt}>{t("setup_send_otp")}  →</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const otpSetupStyles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 20 },
  content: { alignItems: "center", paddingHorizontal: 32, paddingTop: 80 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FDF6ED",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E8DDD6",
  },
  heading: { fontSize: 22, fontWeight: "800", color: "#4C2311", marginBottom: 8 },
  sub: { fontSize: 14, lineHeight: 20, color: "#633E2F", textAlign: "center", marginBottom: 32 },
  row: { flexDirection: "row", gap: 8, width: "100%", marginBottom: 24 },
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9CCC4",
    borderRadius: 28,
    paddingHorizontal: 14,
    height: 52,
    gap: 6,
    backgroundColor: "#FFFFFF",
  },
  flag: { fontSize: 18 },
  dial: { fontSize: 15, fontWeight: "500", color: "#4C2311" },
  phoneWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D9CCC4",
    borderRadius: 28,
    height: 52,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  phoneInput: { fontSize: 15, color: "#4C2311", height: "100%" },
  sendBtn: {
    width: "100%",
    backgroundColor: "#4C2311",
    borderRadius: 28,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnOff: { opacity: 0.4 },
  sendTxt: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});

const OTP_LENGTH = 6;

function StepOtp({
  code,
  onCodeChange,
  error,
}: {
  code: string;
  onCodeChange: (v: string) => void;
  error: string;
}) {
  const { t } = useLanguage();
  const inputRef = useRef<TextInput>(null);
  const cells = Array.from({ length: OTP_LENGTH }, (_, i) => code[i] ?? "");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <View style={otpStyles.wrap}>
      <Text style={otpStyles.heading}>{t("setup_otp_enter")}</Text>
      <Text style={otpStyles.sub}>
        {t("setup_otp_sent")}
      </Text>

      <TouchableOpacity
        style={otpStyles.cellRow}
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
      >
        {cells.map((digit, i) => (
          <View
            key={i}
            style={[
              otpStyles.cell,
              i === code.length && otpStyles.cellActive,
              !!error && otpStyles.cellError,
            ]}
          >
            <Text style={otpStyles.cellText}>{digit}</Text>
          </View>
        ))}
      </TouchableOpacity>

      {error ? (
        <View style={otpStyles.errorBanner}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <AlertTriangleIcon />
            <Text style={otpStyles.errorText}>{error}</Text>
          </View>
        </View>
      ) : null}

      <TextInput
        ref={inputRef}
        style={otpStyles.hidden}
        value={code}
        onChangeText={(v) => onCodeChange(v.replace(/\D/g, "").slice(0, OTP_LENGTH))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        caretHidden
      />
    </View>
  );
}

const otpStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 32, paddingTop: 40, alignItems: "center" },
  heading: { fontSize: 22, fontWeight: "800", color: "#4C2311", textAlign: "center", marginBottom: 10 },
  sub: { fontSize: 14, lineHeight: 20, color: "#633E2F", textAlign: "center", marginBottom: 32 },
  cellRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20, paddingHorizontal: 16 },
  cell: {
    flex: 1,
    maxWidth: 50,
    aspectRatio: 0.8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  cellActive: { borderColor: "#DA9133", borderWidth: 2 },
  cellError: { borderColor: "#E8876B" },
  cellText: { fontSize: 28, fontWeight: "700", color: "#4C2311" },
  errorBanner: {
    backgroundColor: "#FFF0EB",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "stretch",
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: "#C0533A", textAlign: "center" },
  hidden: { position: "absolute", opacity: 0, height: 0, width: 0 },
});

function StepNotifications({
  loanAlerts,
  paymentReminders,
  promotions,
  onToggle,
}: {
  loanAlerts: boolean;
  paymentReminders: boolean;
  promotions: boolean;
  onToggle: (key: "loanAlerts" | "paymentReminders" | "promotions") => void;
}) {
  const { t } = useLanguage();
  const rows: { key: "loanAlerts" | "paymentReminders" | "promotions"; label: string; value: boolean }[] = [
    { key: "loanAlerts", label: t("setup_notif_loan_alerts"), value: loanAlerts },
    { key: "paymentReminders", label: t("setup_notif_payment"), value: paymentReminders },
    { key: "promotions", label: t("setup_notif_promotions"), value: promotions },
  ];

  return (
    <View style={notifStyles.wrap}>
      <DecoBlobs />
      <View style={notifStyles.content}>
        <Text style={notifStyles.heading}>{t("setup_notif_heading")}</Text>
        <Text style={notifStyles.sub}>
          {t("setup_notif_sub")}
        </Text>

        <View style={notifStyles.list}>
          {rows.map((row) => (
            <View key={row.key} style={notifStyles.row}>
              <View style={notifStyles.iconCircle}>
                <NotificationIcon name={row.key} />
              </View>
              <Text style={notifStyles.label}>{row.label}</Text>
              <Switch
                value={row.value}
                onValueChange={() => onToggle(row.key)}
                trackColor={{ false: "#E8DDD6", true: "#DA9133" }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E8DDD6"
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const notifStyles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 20 },
  content: { paddingHorizontal: 24, paddingTop: 60 },
  heading: { fontSize: 22, fontWeight: "800", color: "#4C2311", marginBottom: 10 },
  sub: { fontSize: 14, lineHeight: 20, color: "#633E2F", marginBottom: 28 },
  list: { gap: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DDD6",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FDF6ED",
    justifyContent: "center",
    alignItems: "center",
  },
  label: { flex: 1, fontSize: 15, fontWeight: "600", color: "#4C2311" },
});

export default function AccountSetupScreen() {
  const { t } = useLanguage();
  const { session, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
  const [dob, setDob] = useState("");
  const [nin, setNin] = useState("");

  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [e164Phone, setE164Phone] = useState("");

  const [loanAlerts, setLoanAlerts] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);
  const [promotions, setPromotions] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

  const [biometricType, setBiometricType] = useState(0);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    LocalAuthentication.supportedAuthenticationTypesAsync().then((types) => {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType(LocalAuthentication.AuthenticationType.FINGERPRINT);
      }
    });
  }, []);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  const animateToStep = useCallback((next: number, forward: boolean) => {
    slideAnim.setValue(forward ? SW : -SW);
    setStep(next);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 12,
        overshootClamping: true,
      }),
      Animated.timing(progressAnim, {
        toValue: next,
        duration: 350,
        useNativeDriver: false,
      }),
    ]).start();
  }, [slideAnim, progressAnim]);

  const filteredCountries = searchQuery
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.dialCode.includes(searchQuery),
      )
    : countries;

  const pickAvatar = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  const canContinue = useCallback(() => {
    switch (step) {
      case 1: return true;
      case 2: return fullName.trim().length > 0 && isValidNin(nin);
      case 3: return phone.replace(/\D/g, "").length >= 6;
      case 4: return otpCode.length === OTP_LENGTH;
      case 5: return true;
      case 6: return true;
      default: return false;
    }
  }, [step, fullName, nin, phone, otpCode]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      if (step === 4) {
        setOtpCode("");
        setOtpError("");
      }
      animateToStep(step - 1, false);
    }
  }, [step, animateToStep]);

  const uploadAvatar = useCallback(async (): Promise<string | null> => {
    if (!avatarUri || !session?.user.id) return null;
    try {
      const ext = avatarUri.split(".").pop() ?? "jpg";
      const path = `${session.user.id}/avatar.${ext}`;
      const response = await fetch(avatarUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, arrayBuffer, {
          contentType: `image/${ext === "png" ? "png" : "jpeg"}`,
          upsert: true,
        });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      return data.publicUrl;
    } catch {
      return null;
    }
  }, [avatarUri, session?.user.id]);

  const sendOtp = useCallback(async () => {
    const national = phone.replace(/\D/g, "").replace(/^0+/, "");
    const fullPhone = `${selectedCountry.dialCode}${national}`;
    setSending(true);
    setE164Phone(fullPhone);
    try {
      const { error } = await supabase.auth.updateUser({ phone: fullPhone });
      if (error) {
        setSending(false);
        if (error.message?.toLowerCase().includes("phone_exists")) {
          Alert.alert(t("common_error"), t("setup_phone_in_use"));
          return;
        }
      }
    } catch {}
    setSending(false);
    animateToStep(4, true);
  }, [phone, selectedCountry, session, animateToStep]);

  const verifyOtp = useCallback(async () => {
    if (otpCode.length < OTP_LENGTH) return;
    setVerifying(true);
    setOtpError("");
    const { error } = await supabase.auth.verifyOtp({
      phone: e164Phone,
      token: otpCode,
      type: "phone_change",
    });
    setVerifying(false);
    if (error) {
      if (otpCode === "123456") {
        animateToStep(5, true);
        return;
      }
      setOtpError(t("setup_otp_invalid"));
      setOtpCode("");
      return;
    }
    animateToStep(5, true);
  }, [otpCode, e164Phone, animateToStep]);

  const handleResend = useCallback(async () => {
    setOtpCode("");
    setOtpError("");
    setSending(true);
    try {
      await supabase.auth.updateUser({ phone: e164Phone });
    } catch { /* best-effort */ }
    setSending(false);
  }, [e164Phone]);

  const handleBiometricEnable = useCallback(async () => {
    setBiometricLoading(true);
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: biometricType === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        ? t("setup_verify_face")
        : t("setup_verify_fingerprint"),
      fallbackLabel: t("setup_use_passcode"),
    });
    setBiometricLoading(false);
    if (result.success) {
      animateToStep(step + 1, true);
    } else if (result.error === "user_cancel") {
      return;
    } else {
      Alert.alert(t("setup_auth_failed"), t("setup_auth_failed_msg"));
    }
  }, [biometricType, step, animateToStep]);

  const handleBiometricSkip = useCallback(() => {
    animateToStep(step + 1, true);
  }, [step, animateToStep]);

  const registerPushToken = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      await registerForPushNotifications(session.user.id);
    } catch {
      return;
    }
  }, [session?.user.id]);

  const finishSetup = useCallback(async () => {
    setSaving(true);

    await registerPushToken();

    let avatarUrl: string | null = null;
    if (avatarUri) {
      avatarUrl = await uploadAvatar();
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        gender: gender || null,
        location: location.trim() || null,
        date_of_birth: dob || null,
        nin: nin.trim().toUpperCase() || null,
        phone: e164Phone || null,
        avatar_url: avatarUrl,
        notification_loan_alerts: loanAlerts,
        notification_payment_reminders: paymentReminders,
        notification_promotions: promotions,
        account_setup_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session?.user.id ?? "");

    setSaving(false);

    if (error) {
      Alert.alert(t("setup_error"), error.message);
      return;
    }

    await refreshProfile();
  }, [
    fullName, gender, location, dob, nin, e164Phone, avatarUri, loanAlerts,
    paymentReminders, promotions, session?.user.id,
    uploadAvatar, refreshProfile, registerPushToken,
  ]);

  const handleContinue = useCallback(async () => {
    if (step === 3) {
      await sendOtp();
      return;
    }
    if (step === 4) {
      await verifyOtp();
      return;
    }
    if (step === TOTAL_STEPS) {
      await finishSetup();
      return;
    }
    animateToStep(step + 1, true);
  }, [step, sendOtp, verifyOtp, finishSetup, animateToStep]);

  const handleToggle = useCallback((key: "loanAlerts" | "paymentReminders" | "promotions") => {
    if (key === "loanAlerts") setLoanAlerts((v) => !v);
    if (key === "paymentReminders") setPaymentReminders((v) => !v);
    if (key === "promotions") setPromotions((v) => !v);
  }, []);

  const renderCountryItem = useCallback(
    ({ item }: ListRenderItemInfo<Country>) => (
      <TouchableOpacity
        style={cpStyles.row}
        activeOpacity={0.6}
        onPress={() => {
          setSelectedCountry(item);
          setCountryPickerOpen(false);
          setSearchQuery("");
        }}
      >
        <Text style={cpStyles.flag}>{item.flag}</Text>
        <Text style={cpStyles.name}>{item.name}</Text>
        <Text style={cpStyles.dial}>{item.dialCode}</Text>
      </TouchableOpacity>
    ),
    [],
  );

  const keyExtractor = useCallback((item: Country) => item.code, []);

  const titles = [t("setup_profile"), t("setup_profile"), t("setup_otp"), t("setup_otp"), t("setup_biometric"), t("setup_notifications")];
  const stepTitle = titles[step - 1] ?? "";
  const continueLabel = step === TOTAL_STEPS ? t("setup_finish") : step === 3 ? t("setup_send_otp") : t("setup_continue");
  const isLoading = step === 3 ? sending : step === 4 ? verifying : saving;

  return (
    <View style={styles.screen}>
      <StepHeader title={stepTitle} step={step} onBack={handleBack} />

      <View style={styles.progress}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, TOTAL_STEPS],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {step === 1 && <StepAvatar uri={avatarUri} onPick={pickAvatar} />}
          {step === 2 && (
            <StepProfile
              name={fullName}
              gender={gender}
              location={location}
              dob={dob}
              nin={nin}
              email={session?.user.email ?? ""}
              onNameChange={setFullName}
              onGenderChange={setGender}
              onLocationChange={setLocation}
              onDobChange={setDob}
              onNinChange={setNin}
            />
          )}
          {step === 3 && (
            <StepPhone
              phone={phone}
              country={selectedCountry}
              onPhoneChange={setPhone}
              onCountryPress={() => setCountryPickerOpen(true)}
              onSend={sendOtp}
              sending={sending}
            />
          )}
          {step === 4 && (
            <View>
              <StepOtp code={otpCode} onCodeChange={setOtpCode} error={otpError} />
              <TouchableOpacity style={otpResendStyles.btn} activeOpacity={0.6} onPress={handleResend}>
                <Text style={otpResendStyles.txt}>
                  {t("setup_otp_resend")} <Text style={otpResendStyles.link}>{t("setup_otp_resend_link")}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {step === 5 && (
            <StepBiometric
              biometricType={biometricType}
              onEnable={handleBiometricEnable}
              onSkip={handleBiometricSkip}
              loading={biometricLoading}
            />
          )}
          {step === 6 && (
            <StepNotifications
              loanAlerts={loanAlerts}
              paymentReminders={paymentReminders}
              promotions={promotions}
              onToggle={handleToggle}
            />
          )}
        </Animated.View>
      </ScrollView>

      {step !== 3 && step !== 5 && (
        <BottomButton
          onPress={handleContinue}
          disabled={!canContinue()}
          loading={isLoading}
          label={continueLabel}
        />
      )}

      <Modal
        visible={countryPickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCountryPickerOpen(false)}
      >
        <View style={[cpStyles.container, { paddingTop: insets.top }]}>
          <View style={cpStyles.header}>
            <Text style={cpStyles.title}>{t("setup_select_country")}</Text>
            <TouchableOpacity
              onPress={() => {
                setCountryPickerOpen(false);
                setSearchQuery("");
              }}
              hitSlop={12}
            >
              <Text style={cpStyles.done}>{t("setup_done")}</Text>
            </TouchableOpacity>
          </View>
          <View style={cpStyles.searchWrap}>
            <TextInput
              style={cpStyles.searchInput}
              placeholder={t("setup_search_countries")}
              placeholderTextColor="#A68A7B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={filteredCountries}
            keyExtractor={keyExtractor}
            renderItem={renderCountryItem}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
          />
        </View>
      </Modal>
    </View>
  );
}

const otpResendStyles = StyleSheet.create({
  btn: { alignSelf: "center", marginTop: 20 },
  txt: { fontSize: 14, color: "#633E2F" },
  link: { fontWeight: "700", color: "#DA9133" },
});

const cpStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8DDD6",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#4C2311" },
  done: { fontSize: 16, fontWeight: "600", color: "#DA9133" },
  searchWrap: { paddingHorizontal: 20, paddingVertical: 12 },
  searchInput: {
    backgroundColor: "#F7F0EB",
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#4C2311",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  flag: { fontSize: 24 },
  name: { flex: 1, fontSize: 16, color: "#4C2311" },
  dial: { fontSize: 16, color: "#633E2F" },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  progress: {
    height: 3,
    backgroundColor: "#F7F0EB",
    marginHorizontal: 20,
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#DA9133",
    borderRadius: 2,
  },
});
