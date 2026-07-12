import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

export interface NotificationPreferences {
  notification_loan_alerts: boolean;
  notification_payment_reminders: boolean;
  notification_credit_score: boolean;
  notification_sound: boolean;
  notification_vibration: boolean;
}

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function setupAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#DA9133",
    });
  }
}

export async function registerForPushNotifications(
  userId: string
): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  await setupAndroidChannel();

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
    projectId: projectId as string,
  });

  await supabase
    .from("profiles")
    .update({ push_token: tokenData })
    .eq("id", userId);

  return tokenData;
}

export async function refreshPushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  try {
    await setupAndroidChannel();

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
      projectId: projectId as string,
    });

    await supabase
      .from("profiles")
      .update({ push_token: tokenData })
      .eq("id", userId);
  } catch {
    return;
  }
}

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from("profiles")
    .select(
      "notification_loan_alerts, notification_payment_reminders, notification_credit_score, notification_sound, notification_vibration"
    )
    .eq("id", userId)
    .single();

  return {
    notification_loan_alerts: data?.notification_loan_alerts ?? true,
    notification_payment_reminders:
      data?.notification_payment_reminders ?? true,
    notification_credit_score: data?.notification_credit_score ?? false,
    notification_sound: data?.notification_sound ?? true,
    notification_vibration: data?.notification_vibration ?? true,
  };
}

export async function updateNotificationPreference(
  userId: string,
  key: keyof NotificationPreferences,
  value: boolean
): Promise<void> {
  await supabase.from("profiles").update({ [key]: value }).eq("id", userId);
}
