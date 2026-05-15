import messaging from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";
import api from "./api";

const PROVIDER = "firebase";

export interface ForegroundPushNotification {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  receivedAt: number;
}

async function requestAndroidNotificationPermission() {
  const androidVersion =
    typeof Platform.Version === "string"
      ? Number.parseInt(Platform.Version, 10)
      : Platform.Version;

  if (Platform.OS !== "android" || androidVersion < 33) {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestFirebaseNotificationPermission() {
  const androidPermissionGranted = await requestAndroidNotificationPermission();
  if (!androidPermissionGranted) {
    throw new Error("Nguoi dung chua cap quyen thong bao.");
  }

  const authStatus = await messaging().requestPermission();

  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled && Platform.OS === "ios") {
    throw new Error("Nguoi dung chua cap quyen thong bao.");
  }

  return messaging().getToken();
}

export async function registerCurrentDevicePushToken() {
  const fcmToken = await requestFirebaseNotificationPermission();

  await api.post("/push-tokens", {
    token: fcmToken,
    provider: PROVIDER,
    platform: Platform.OS,
  });

  return fcmToken;
}

export async function deactivateCurrentDevicePushToken() {
  const fcmToken = await messaging().getToken();
  if (!fcmToken) {
    return;
  }

  await api.post("/push-tokens/deactivate", {
    token: fcmToken,
    provider: PROVIDER,
  });
}

export function listenFirebaseForegroundMessages(
  onNotification?: (notification: ForegroundPushNotification) => void
) {
  return messaging().onMessage(async (remoteMessage) => {
    console.log("Nhan notification khi app dang mo:", remoteMessage);
    const title = remoteMessage.notification?.title || "Depressy Mate";
    const body =
      remoteMessage.notification?.body ||
      remoteMessage.data?.body ||
      remoteMessage.data?.message ||
      "";

    onNotification?.({
      title: String(title),
      body: String(body),
      data: remoteMessage.data as Record<string, unknown> | undefined,
      receivedAt: Date.now(),
    });
  });
}

export function listenFirebaseTokenRefresh() {
  return messaging().onTokenRefresh(async (fcmToken) => {
    await api.post("/push-tokens", {
      token: fcmToken,
      provider: PROVIDER,
      platform: Platform.OS,
    });
  });
}
