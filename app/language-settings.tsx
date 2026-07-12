import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import { router } from "expo-router";
import { useLanguage } from "@/lib/i18n";
import { SUPPORTED_LANGUAGES } from "@/lib/sunbird";

function BackArrowIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#4C2311" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RadioIcon({ selected }: { selected: boolean }) {
  if (selected) {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={10} fill="#DA9133" />
        <Circle cx={12} cy={12} r={4} fill="#FFFFFF" />
      </Svg>
    );
  }
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#D9CCC4" strokeWidth={1.8} />
    </Svg>
  );
}

const LANGUAGE_LABELS: Record<string, string> = {
  eng: "English",
  lug: "Oluganda",
  nyn: "Runyankole",
  ach: "Lëb Acoli",
  teo: "Ateso",
  lgg: "Lugbara",
  sw: "Kiswahili",
};

export default function LanguageSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t, translating } = useLanguage();
  const [selectedCode, setSelectedCode] = useState(language);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setLanguage(selectedCode);
      Alert.alert(t("language_updated"), t("language_updated_message"), [
        { text: t("common_ok"), onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(t("common_error"), "Failed to update language. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
          <BackArrowIcon />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("language_title")}</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={s.card}
            activeOpacity={0.7}
            onPress={() => setSelectedCode(lang.code)}
          >
            <Text style={s.langName}>{LANGUAGE_LABELS[lang.code] ?? lang.name}</Text>
            <RadioIcon selected={selectedCode === lang.code} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[s.bottomWrap, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.saveBtnText}>{t("language_save")}</Text>
          )}
        </TouchableOpacity>
        {translating && (
          <View style={{ alignItems: "center", marginTop: 16 }}>
            <ActivityIndicator color="#4C2311" size="small" />
            <Text style={{ fontSize: 13, color: "#A68A7B", marginTop: 8 }}>{t("language_translating")}</Text>
          </View>
        )}
      </View>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 60,
    marginBottom: 10,
  },
  langName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4C2311",
  },
  bottomWrap: {
    paddingHorizontal: 24,
  },
  saveBtn: {
    backgroundColor: "#4C2311",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
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
