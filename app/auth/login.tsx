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
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Svg, { Path } from "react-native-svg";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";

WebBrowser.maybeCompleteAuthSession();

const redirectTo = Linking.createURL("auth/callback");

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

export default function LoginScreen() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (loading) return;
    const trimmed = email.trim();
    if (!trimmed || !password) {
      Alert.alert(t("auth_missing_fields"), t("auth_missing_fields_msg"));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert(t("auth_sign_in_failed"), error.message);
    }
  }, [email, password, loading]);

  const handleGoogle = useCallback(async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(
        data?.url ?? "",
        redirectTo,
      );
      if (result.type === "success") {
        const url = result.url;
        const separator = url.includes("#") ? "#" : "?";
        const params = Object.fromEntries(
          url.slice(url.indexOf(separator) + 1).split("&").map((p) => {
            const [k = "", v = ""] = p.split("=");
            return [decodeURIComponent(k), decodeURIComponent(v)];
          }),
        );
        if (params.access_token && params.refresh_token) {
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
        }
      }
    } catch (e) {
      Alert.alert(
        t("auth_google_failed"),
        e instanceof Error ? e.message : t("auth_something_wrong"),
      );
    } finally {
      setGoogleLoading(false);
    }
  }, [googleLoading]);

  const isValid = email.trim().length > 0 && password.length > 0;

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
          <Text style={styles.title}>{t("auth_sign_in")}</Text>

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
              autoComplete="current-password"
              textContentType="password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={10}
            >
              <EyeIcon visible={showPassword} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.signInButton, (!isValid || loading) && styles.buttonDisabled]}
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signInButtonText}>{`${t("auth_sign_in_btn")}  →`}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialButton}
              activeOpacity={0.7}
              onPress={handleGoogle}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#4C2311" size="small" />
              ) : (
                <GoogleIcon size={22} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/auth/signup")}
            hitSlop={8}
          >
            <Text style={styles.footerText}>
              {t("auth_no_account")}{" "}
              <Text style={styles.footerLink}>{t("auth_sign_up_link")}</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/auth/forgot-password")}
            hitSlop={8}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>{t("auth_forgot_password")}</Text>
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
  signInButton: {
    backgroundColor: "#4C2311",
    borderRadius: 28,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 32,
    marginBottom: 32,
  },
  socialButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F7F0EB",
    justifyContent: "center",
    alignItems: "center",
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
  forgotButton: {
    marginTop: 14,
    alignSelf: "center",
  },
  forgotText: {
    fontSize: 14,
    color: "#DA9133",
    fontWeight: "600",
  },
});
