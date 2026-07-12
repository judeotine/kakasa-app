import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";

function MailIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        stroke="#A68A7B"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 6l-10 7L2 6"
        stroke="#A68A7B"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ForgotPasswordScreen() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = useCallback(async () => {
    if (loading) return;
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert(t("auth_missing_email"), t("auth_missing_email_msg"));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
    setLoading(false);

    if (error) {
      Alert.alert(t("auth_reset_failed"), error.message);
      return;
    }

    Alert.alert(
      t("auth_check_email"),
      t("auth_check_email_reset"),
      [{ text: t("common_ok"), onPress: () => router.back() }],
    );
  }, [email, loading, t]);

  const isValid = email.trim().length > 0;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader />

        <View style={styles.body}>
          <Text style={styles.title}>{t("auth_forgot_password")}</Text>
          <Text style={styles.subtitle}>
            {t("auth_forgot_subtitle")}
          </Text>

          <Text style={styles.label}>{t("auth_email")}</Text>
          <View style={styles.inputWrapper}>
            <MailIcon />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth_email_placeholder")}
              placeholderTextColor="#A68A7B"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.resetButton, (!isValid || loading) && styles.buttonDisabled]}
            activeOpacity={0.85}
            onPress={handleReset}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.resetButtonText}>{t("auth_send_reset")} →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.footer}
          >
            <Text style={styles.footerText}>
              {t("auth_remember_password")}{" "}
              <Text style={styles.footerLink}>{t("auth_sign_in_link")}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#4C2311",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#633E2F",
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4C2311",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9CCC4",
    borderRadius: 28,
    height: 52,
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#4C2311",
    height: "100%",
  },
  resetButton: {
    backgroundColor: "#4C2311",
    borderRadius: 28,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  footer: {
    marginTop: 32,
    alignSelf: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#633E2F",
    textAlign: "center",
  },
  footerLink: {
    color: "#DA9133",
    fontWeight: "700",
  },
});
