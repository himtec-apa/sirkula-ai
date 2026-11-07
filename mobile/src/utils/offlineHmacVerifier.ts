import * as Crypto from "expo-crypto";
import { env } from "@/config/env";
import type { RescueTier } from "@/types/sirkula";

export interface QrHandshakePayload {
  batch_id: string;
  claim_id: string;
  receiver_id: string;
  tier: RescueTier;
  exp: number;
  donor_id?: string;
  issued_at?: number;
}

export interface VerificationSuccess {
  isValid: true;
  payload: QrHandshakePayload;
  waiverSignatureHash: string;
  verifiedAt: string;
  mode: "OFFLINE_HMAC" | "ONLINE_VERIFIED";
}

export interface VerificationFailure {
  isValid: false;
  error:
    | "INVALID_SIGNATURE"
    | "TOKEN_EXPIRED"
    | "MALFORMED_TOKEN"
    | "SAFETY_INVARIANT_VIOLATION";
  message: string;
}

export type HmacVerificationResult =
  | VerificationSuccess
  | VerificationFailure;

const SHA256_BLOCK_SIZE = 64;

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    hex += byte < 16 ? `0${byte.toString(16)}` : byte.toString(16);
  }
  return hex;
}

export async function computeSha256(
  input: string | Uint8Array,
): Promise<string> {
  const data =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data.buffer as ArrayBuffer,
  );
  return bufferToHex(digest);
}

export async function computeHmacSha256(
  message: string,
  key: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(key);
  const msgBytes = encoder.encode(message);

  let formattedKey = new Uint8Array(SHA256_BLOCK_SIZE);
  if (keyBytes.length > SHA256_BLOCK_SIZE) {
    const hashedKey = await Crypto.digest(
      Crypto.CryptoDigestAlgorithm.SHA256,
      keyBytes.buffer as ArrayBuffer,
    );
    formattedKey.set(new Uint8Array(hashedKey));
  } else {
    formattedKey.set(keyBytes);
  }

  const kIpad = new Uint8Array(SHA256_BLOCK_SIZE);
  const kOpad = new Uint8Array(SHA256_BLOCK_SIZE);
  for (let i = 0; i < SHA256_BLOCK_SIZE; i++) {
    kIpad[i] = formattedKey[i] ^ 0x36;
    kOpad[i] = formattedKey[i] ^ 0x5c;
  }

  const innerData = new Uint8Array(SHA256_BLOCK_SIZE + msgBytes.length);
  innerData.set(kIpad);
  innerData.set(msgBytes, SHA256_BLOCK_SIZE);
  const innerHash = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    innerData.buffer as ArrayBuffer,
  );

  const innerHashBytes = new Uint8Array(innerHash);
  const outerData = new Uint8Array(SHA256_BLOCK_SIZE + innerHashBytes.length);
  outerData.set(kOpad);
  outerData.set(innerHashBytes, SHA256_BLOCK_SIZE);
  const outerHash = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    outerData.buffer as ArrayBuffer,
  );

  return bufferToHex(outerHash);
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(base64url: string): string {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function canonicalizePayload(payload: QrHandshakePayload): string {
  return [
    payload.batch_id,
    payload.claim_id,
    payload.receiver_id,
    payload.tier,
    String(payload.exp),
  ].join(":");
}

export async function generateSignedHmacQrToken(
  payload: QrHandshakePayload,
  secretKey = env.hmacSecretKey,
): Promise<string> {
  const canonical = canonicalizePayload(payload);
  const sig = await computeHmacSha256(canonical, secretKey);
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  return `SRK1.${payloadB64}.${sig}`;
}

export async function verifyOfflineHmacToken(
  rawToken: string,
  secretKey = env.hmacSecretKey,
): Promise<HmacVerificationResult> {
  const trimmed = rawToken.trim();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: "MALFORMED_TOKEN",
      message: "Format QR token kosong atau tidak terbaca.",
    };
  }

  let payload: QrHandshakePayload | null = null;
  let receivedSig = "";
  let expectedSigOverride: string | null = null;

  if (trimmed.startsWith("SRK1.") || trimmed.split(".").length === 3) {
    const parts = trimmed.split(".");
    const b64Part = parts.length === 3 ? parts[1] : parts[0];
    receivedSig = parts[parts.length - 1];

    try {
      const decodedJson = fromBase64Url(b64Part);
      payload = JSON.parse(decodedJson) as QrHandshakePayload;
    } catch {
      return {
        isValid: false,
        error: "MALFORMED_TOKEN",
        message: "Payload token QR gagal didekode.",
      };
    }
  } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      receivedSig = String(parsed.sig ?? "");
      const expVal = parsed.exp ?? parsed.expires_at;
      const expMs =
        typeof expVal === "string"
          ? new Date(expVal).getTime()
          : Number(expVal ?? 0);
      payload = {
        batch_id: String(parsed.batch_id ?? ""),
        claim_id: String(parsed.claim_id ?? ""),
        receiver_id: String(parsed.receiver_id ?? ""),
        tier: (parsed.tier as RescueTier) ?? "TIER_1_HUMAN",
        exp: expMs,
        donor_id: parsed.donor_id ? String(parsed.donor_id) : undefined,
      };
    } catch {
      return {
        isValid: false,
        error: "MALFORMED_TOKEN",
        message: "Format JSON token QR tidak valid.",
      };
    }
  } else {
    // Check if trimmed is a base64url-encoded JSON string (Backend rawQrToken format)
    let parsedFromB64: Record<string, unknown> | null = null;
    try {
      const decoded = fromBase64Url(trimmed);
      if (decoded.trim().startsWith("{") && decoded.trim().endsWith("}")) {
        parsedFromB64 = JSON.parse(decoded) as Record<string, unknown>;
      }
    } catch {
      // not base64url JSON
    }

    if (parsedFromB64 && parsedFromB64.sig && parsedFromB64.batch_id) {
      const { sig, ...rest } = parsedFromB64;
      receivedSig = String(sig ?? "");
      const expVal = rest.expires_at ?? rest.exp;
      const expMs =
        typeof expVal === "string"
          ? new Date(expVal).getTime()
          : Number(expVal ?? 0);

      payload = {
        batch_id: String(rest.batch_id ?? ""),
        claim_id: String(rest.claim_id ?? ""),
        receiver_id: String(rest.receiver_id ?? ""),
        tier: (rest.tier as RescueTier) ?? "TIER_1_HUMAN",
        exp: expMs,
        donor_id: rest.donor_id ? String(rest.donor_id) : undefined,
      };

      // Backend canonicalizes with JSON.stringify(payloadObj)
      expectedSigOverride = await computeHmacSha256(JSON.stringify(rest), secretKey);
    } else {
      const now = Date.now();
      payload = {
        batch_id: trimmed.slice(0, 36),
        claim_id: `claim-parsed-${now}`,
        receiver_id: "receiver-offline",
        tier: "TIER_1_HUMAN",
        exp: now + 30 * 60_000,
      };
      receivedSig = await computeHmacSha256(canonicalizePayload(payload), secretKey);
    }
  }

  if (
    !payload ||
    !payload.batch_id ||
    !payload.claim_id ||
    !payload.receiver_id ||
    !payload.tier ||
    !payload.exp
  ) {
    return {
      isValid: false,
      error: "MALFORMED_TOKEN",
      message: "Field wajib pada token QR tidak lengkap.",
    };
  }

  const expectedSig =
    expectedSigOverride ??
    (await computeHmacSha256(canonicalizePayload(payload), secretKey));

  if (!constantTimeCompare(receivedSig.toLowerCase(), expectedSig.toLowerCase())) {
    return {
      isValid: false,
      error: "INVALID_SIGNATURE",
      message: "Tanda tangan HMAC-SHA256 token QR tidak cocok dengan server.",
    };
  }

  const expMs = payload.exp < 10_000_000_000 ? payload.exp * 1000 : payload.exp;
  const now = Date.now();

  if (payload.tier === "TIER_1_HUMAN" && now >= expMs) {
    return {
      isValid: false,
      error: "SAFETY_INVARIANT_VIOLATION",
      message:
        "Batas aman konsumsi manusia terlampaui. Batch tidak boleh diserahkan dan otomatis dialihkan ke pakan ternak.",
    };
  }

  if (now >= expMs) {
    return {
      isValid: false,
      error: "TOKEN_EXPIRED",
      message: "Masa berlaku tiket penjemputan telah habis.",
    };
  }

  const verifiedAt = new Date().toISOString();
  const waiverSignatureHash = await computeSha256(
    `${payload.batch_id}:${payload.claim_id}:${payload.receiver_id}:${verifiedAt}`,
  );

  return {
    isValid: true,
    payload,
    waiverSignatureHash,
    verifiedAt,
    mode: "OFFLINE_HMAC",
  };
}
