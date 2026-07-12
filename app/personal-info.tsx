import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { DateField } from "@/components/DateField";

function BackArrowIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#4C2311" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4" stroke="#A68A7B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
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
      <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="#A68A7B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MapPinIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="#A68A7B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={10} r={3} stroke="#A68A7B" strokeWidth={1.8} />
    </Svg>
  );
}

function PenIcon({ color = "#4C2311" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function UploadIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#A68A7B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronDownIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke="#4C2311" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RadioIcon({ selected }: { selected: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={selected ? "#FFFFFF" : "#D9CCC4"} strokeWidth={1.8} />
      {selected && <Circle cx={12} cy={12} r={5} fill="#FFFFFF" />}
    </Svg>
  );
}

function AvatarPattern1() {
  return (
    <Svg width={60} height={60} viewBox="0 0 70 70">
      <Circle cx={35} cy={35} r={35} fill="#C5CFA8" />
      <Path d="M10 38 C18 18, 28 18, 35 38 C42 58, 52 58, 60 38" stroke="#4C2311" strokeWidth={3.5} fill="none" />
      <Path d="M10 32 C18 52, 28 52, 35 32 C42 12, 52 12, 60 32" stroke="#4C2311" strokeWidth={3.5} fill="none" />
    </Svg>
  );
}

function AvatarPattern2() {
  return (
    <Svg width={60} height={60} viewBox="0 0 70 70">
      <Circle cx={35} cy={35} r={35} fill="#C5CFA8" />
      <Circle cx={35} cy={35} r={22} fill="#8B9A6A" />
      <Circle cx={35} cy={35} r={12} stroke="#4C2311" strokeWidth={4} fill="none" />
      <Circle cx={35} cy={35} r={4} fill="#4C2311" />
    </Svg>
  );
}

function AvatarPattern3() {
  return (
    <Svg width={60} height={60} viewBox="0 0 70 70">
      <Circle cx={35} cy={35} r={35} fill="#C5CFA8" />
      <Rect x={10} y={10} width={20} height={20} rx={2} fill="#4C2311" />
      <Rect x={40} y={10} width={20} height={20} rx={2} fill="#A3B87C" />
      <Rect x={10} y={40} width={20} height={20} rx={2} fill="#A3B87C" />
      <Rect x={40} y={40} width={20} height={20} rx={2} fill="#4C2311" />
    </Svg>
  );
}

function AvatarPattern4() {
  return (
    <Svg width={60} height={60} viewBox="0 0 70 70">
      <Circle cx={35} cy={35} r={35} fill="#C5CFA8" />
      <Path d="M35 35 L35 5 A30 30 0 0 1 65 35 Z" fill="#8B9A6A" />
      <Path d="M35 35 L65 35 A30 30 0 0 1 35 65 Z" fill="#A3B87C" />
      <Path d="M35 35 L35 65 A30 30 0 0 1 5 35 Z" fill="#4C2311" />
      <Path d="M35 35 L5 35 A30 30 0 0 1 35 5 Z" fill="#8B9A6A" opacity={0.6} />
    </Svg>
  );
}

const AVATAR_PATTERNS = [AvatarPattern1, AvatarPattern2, AvatarPattern3, AvatarPattern4];
const GENDER_OPTIONS = ["Male", "Female"] as const;

export default function PersonalInfoScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { t } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user.id) return;
    supabase
      .from("profiles")
      .select("full_name, location, gender, avatar_url, date_of_birth, phone")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? "");
          setLocation(data.location ?? "");
          setGender(data.gender ?? "");
          setDateOfBirth(data.date_of_birth ?? "");
          setPhone(data.phone ?? "");
          if (data.avatar_url) setAvatarUri(data.avatar_url);
        }
        setLoading(false);
      });
  }, [session?.user.id]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarUri || !session?.user.id || avatarUri.startsWith("http")) return avatarUri;
    try {
      const ext = avatarUri.split(".").pop() ?? "jpg";
      const filePath = `${session.user.id}/avatar.${ext}`;
      const response = await fetch(avatarUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      await supabase.storage.from("avatars").upload(filePath, arrayBuffer, {
        contentType: `image/${ext}`,
        upsert: true,
      });
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      return `${data.publicUrl}?t=${Date.now()}`;
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (!session?.user.id) return;
    setSaving(true);
    const uploadedUrl = await uploadAvatar();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        location: location.trim(),
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        phone: phone.trim() || null,
        ...(uploadedUrl ? { avatar_url: uploadedUrl } : {}),
      })
      .eq("id", session.user.id);
    setSaving(false);
    if (error) {
      Alert.alert(t("common_error"), error.message);
      return;
    }
    Alert.alert(t("common_saved"), t("personal_info_saved"), [
      { text: t("common_ok"), onPress: () => router.back() },
    ]);
  };

  if (loading) {
    return (
      <View style={s.screen}>
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
            <BackArrowIcon />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t("personal_info_title")}</Text>
          <View style={s.headerSpacer} />
        </View>
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#4C2311" />
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
          <BackArrowIcon />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("personal_info_title")}</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.fieldGroup}>
          <Text style={s.label}>{t("personal_info_full_name")}</Text>
          <View style={s.card}>
            <LockIcon />
            <TextInput
              style={s.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t("personal_info_name_placeholder")}
              placeholderTextColor="#A68A7B"
              autoCapitalize="words"
            />
            <PenIcon />
          </View>
        </View>

        <View style={s.fieldGroup}>
          <Text style={s.label}>{t("personal_info_dob")}</Text>
          <DateField value={dateOfBirth} onChange={setDateOfBirth}>
            {({ open }) => (
              <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={open}>
                <CalendarIcon />
                <Text style={[s.cardValue, !dateOfBirth && s.cardValueEmpty]}>
                  {dateOfBirth || t("personal_info_not_set")}
                </Text>
                <PenIcon />
              </TouchableOpacity>
            )}
          </DateField>
        </View>

        <View style={s.fieldGroup}>
          <Text style={s.label}>{t("personal_info_phone")}</Text>
          <View style={s.card}>
            <PhoneIcon />
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder={t("personal_info_phone_placeholder")}
              placeholderTextColor="#A68A7B"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={s.fieldGroup}>
          <Text style={s.label}>{t("personal_info_profile_picture")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.avatarScroll}>
            <TouchableOpacity style={s.uploadSlot} onPress={pickImage} activeOpacity={0.7}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.uploadedAvatar} />
              ) : (
                <UploadIcon />
              )}
            </TouchableOpacity>
            {AVATAR_PATTERNS.map((Pattern, i) => (
              <TouchableOpacity key={i} activeOpacity={0.7} onPress={pickImage}>
                <Pattern />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={s.fieldGroup}>
          <Text style={s.label}>{t("personal_info_location")}</Text>
          <View style={s.card}>
            <MapPinIcon />
            <TextInput
              style={s.input}
              value={location}
              onChangeText={setLocation}
              placeholder={t("personal_info_location_placeholder")}
              placeholderTextColor="#A68A7B"
              autoCapitalize="words"
            />
            <ChevronDownIcon />
          </View>
        </View>

        <View style={s.fieldGroup}>
          <View style={s.genderHeader}>
            <Text style={s.label}>{t("personal_info_gender")}</Text>
            <Text style={s.sublabel}>{t("personal_info_choose_one")}</Text>
          </View>
          <View style={s.chipRow}>
            {GENDER_OPTIONS.map((option) => {
              const selected = gender === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[s.chip, selected && s.chipSelected]}
                  activeOpacity={0.7}
                  onPress={() => setGender(option)}
                >
                  <Text style={[s.chipText, selected && s.chipTextSelected]}>{t(`personal_info_${option.toLowerCase()}`)}</Text>
                  <RadioIcon selected={selected} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.saveBtnText}>{t("personal_info_save")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F0EB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#4C2311",
    textAlign: "center",
  },
  headerSpacer: {
    width: 42,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  fieldGroup: {
    marginBottom: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4C2311",
    marginBottom: 10,
  },
  sublabel: {
    fontSize: 12,
    color: "#A68A7B",
    fontWeight: "500",
  },
  genderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 56,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#4C2311",
    height: "100%",
  },
  cardValue: {
    flex: 1,
    fontSize: 15,
    color: "#4C2311",
  },
  cardValueEmpty: {
    color: "#A68A7B",
  },
  avatarScroll: {
    gap: 14,
    paddingVertical: 4,
  },
  uploadSlot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#D9CCC4",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  uploadedAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  chipRow: {
    flexDirection: "row",
    gap: 12,
  },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#D9CCC4",
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  chipSelected: {
    backgroundColor: "#DA9133",
    borderColor: "#DA9133",
  },
  chipText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4C2311",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  saveBtn: {
    backgroundColor: "#4C2311",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
