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
import Svg, { Path, Rect } from "react-native-svg";
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

function LockIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"
        stroke="#A68A7B"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"
          stroke="#A68A7B"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M12 15a3 3 0 100-6 3 3 0 000 6z"
          stroke="#A68A7B"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"
        stroke="#A68A7B"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect
        x={2}
        y={2}
        width={20}
        height={20}
        rx={6}
        stroke={checked ? "#DA9133" : "#D9CCC4"}
        strokeWidth={1.8}
        fill={checked ? "#DA9133" : "none"}
      />
      {checked && (
        <Path
          d="M7 12.5l3 3 7-7"
          stroke="#FFFFFF"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

export default function SignupScreen() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = useCallback(async () => {
    if (loading) return;
    const trimmed = email.trim();
    if (!trimmed || !password) {
      Alert.alert(t("auth_missing_fields"), t("auth_missing_fields_msg"));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t("auth_weak_password"), t("auth_weak_password_msg"));
      return;
    }
    if (!agreed) {
      Alert.alert(t("auth_terms_required"), t("auth_terms_required_msg"));
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert(t("auth_sign_up_failed"), error.message);
      return;
    }

    if (data.session) {
      return;
    }

    Alert.alert(
      t("auth_check_email"),
      t("auth_check_email_signup"),
      [{ text: t("common_ok"), onPress: () => router.back() }],
    );
  }, [email, password, agreed, loading]);

  const showTerms = useCallback(() => {
    Alert.alert(
      "Terms & Conditions",
      "Welcome to Kakasa.\n\n" +
        "1. Acceptance — By creating an account you agree to these Terms.\n\n" +
        "2. The Service — Kakasa helps you understand and manage digital loan offers. We do not lend money.\n\n" +
        "3. Your Account — Keep your login details secure. You are responsible for activity on your account.\n\n" +
        "4. Data & Privacy — We process your information to provide the service and protect you from unsafe loans. We never sell your data.\n\n" +
        "5. No Financial Advice — Information shown is for your awareness and is not financial advice.\n\n" +
        "6. Changes — We may update these Terms and will notify you of material changes.\n\n" +
        "7. Contact — Reach us at support@kakasa.app.",
      [
        { text: "Close", style: "cancel" },
        { text: "I Agree", onPress: () => setAgreed(true) },
      ],
    );
  }, []);

  const isValid = email.trim().length > 0 && password.length >= 6 && agreed;

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
          <Text style={styles.title}>{t("auth_sign_up")}</Text>

          <Text style={styles.label}>{t("auth_email")}</Text>
          <View style={styles.inputWrapper}>
            <MailIcon />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth_email_placeholder_alt")}
              placeholderTextColor="#A68A7B"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>

          <Text style={styles.label}>{t("auth_password")}</Text>
          <View style={styles.inputWrapper}>
            <LockIcon />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth_password_placeholder")}
              placeholderTextColor="#A68A7B"
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={10}
            >
              <EyeIcon visible={showPassword} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.termsRow}
            activeOpacity={0.7}
            onPress={() => setAgreed((v) => !v)}
          >
            <Checkbox checked={agreed} />
            <Text style={styles.termsText}>
              {t("auth_agree_with")}{" "}
              <Text style={styles.termsLink} onPress={showTerms}>
                {t("auth_terms")}
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.signUpButton, (!isValid || loading) && styles.buttonDisabled]}
            activeOpacity={0.85}
            onPress={handleSignUp}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signUpButtonText}>{`${t("auth_sign_up_btn")} →`}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.footer}
          >
            <Text style={styles.footerText}>
              {t("auth_has_account")}{" "}
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
    textAlign: "center",
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
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#4C2311",
    height: "100%",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  termsText: {
    fontSize: 14,
    color: "#633E2F",
  },
  termsLink: {
    color: "#DA9133",
    fontWeight: "600",
  },
  signUpButton: {
    backgroundColor: "#4C2311",
    borderRadius: 28,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  signUpButtonText: {
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
