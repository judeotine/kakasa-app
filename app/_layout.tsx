import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import {
  setupNotificationHandler,
  refreshPushToken,
} from "@/lib/notifications";

setupNotificationHandler();

function RootNavigator() {
  const { session, loading, onboarded, accountReady } = useAuth();

  useEffect(() => {
    if (session?.user?.id && accountReady) {
      refreshPushToken(session.user.id);
    }
  }, [session?.user?.id, accountReady]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === "loan_update" || data?.type === "loan_approved") {
          router.push("/notifications");
        } else if (data?.type === "credit_score") {
          router.push("/credit-score");
        } else {
          router.push("/notifications");
        }
      }
    );
    return () => subscription.remove();
  }, []);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="auth/forgot-password" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && onboarded && !accountReady}>
        <Stack.Screen name="account-setup" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && onboarded && accountReady}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="personal-info" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="notification-settings" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="help-center" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="feedback" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="advisor-chat" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="language-settings" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="loan/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="credit-score" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="loan-apply/amount" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="loan-apply/[providerId]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="loan-apply/consent" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="loan-apply/interview" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="loan-apply/decision" options={{ animation: "slide_from_right" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LanguageProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </LanguageProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
