import Constants from "expo-constants";
import { Platform } from "react-native";
import { z } from "zod";

function resolveApiUrl(rawUrl?: string): string {
  // If explicitly configured with a non-localhost URL, keep it
  if (rawUrl && !rawUrl.includes("localhost") && !rawUrl.includes("127.0.0.1")) {
    return rawUrl;
  }

  // Running on Web platform can safely use localhost
  if (Platform.OS === "web") {
    return rawUrl || "http://localhost:4000";
  }

  // Running on physical device or simulator via Expo Go
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const hostIp = hostUri.split(":")[0];
    if (hostIp && hostIp !== "localhost" && hostIp !== "127.0.0.1") {
      return `http://${hostIp}:4000`;
    }
  }

  // Android Emulator loopback
  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000";
  }

  return rawUrl || "http://localhost:4000";
}

const rawApiUrl = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL);

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  EXPO_PUBLIC_SOCKET_URL: z.string().url().optional(),
  EXPO_PUBLIC_HMAC_SECRET_KEY: z
    .string()
    .default("sirkula-super-secure-hmac-secret-key-32chars"),
  EXPO_PUBLIC_USE_MOCK: z.string().default("false"),
});

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_API_URL: rawApiUrl,
  EXPO_PUBLIC_SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL
    ? resolveApiUrl(process.env.EXPO_PUBLIC_SOCKET_URL)
    : rawApiUrl,
  EXPO_PUBLIC_HMAC_SECRET_KEY: process.env.EXPO_PUBLIC_HMAC_SECRET_KEY,
  EXPO_PUBLIC_USE_MOCK: process.env.EXPO_PUBLIC_USE_MOCK,
});

if (!parsed.success) {
  const fields = parsed.error.issues
    .map((issue) => issue.path.join("."))
    .join(", ");
  throw new Error(`Konfigurasi environment tidak valid: ${fields}`);
}

export const env = {
  apiUrl: parsed.data.EXPO_PUBLIC_API_URL,
  socketUrl:
    parsed.data.EXPO_PUBLIC_SOCKET_URL ?? parsed.data.EXPO_PUBLIC_API_URL,
  hmacSecretKey: parsed.data.EXPO_PUBLIC_HMAC_SECRET_KEY,
  useMock: parsed.data.EXPO_PUBLIC_USE_MOCK === "true",
} as const;

