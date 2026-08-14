import { env } from "../../config/env";

/**
 * Firebase Cloud Messaging (FCM) HTTP v1 API client.
 *
 * Uses Google OAuth2 access token for authentication.
 * No dependency on firebase-admin SDK — pure HTTP fetch for minimal bundle.
 *
 * Reference: https://firebase.google.com/docs/cloud-messaging/send-message
 */

interface FcmMessage {
  token: string;
  notification: { title: string; body: string };
  data?: Record<string, string>;
  android?: {
    priority: "high" | "normal";
    notification?: { channel_id?: string; sound?: string };
  };
}

interface FcmSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  shouldRemoveToken?: boolean;
}

// Cache access token (expires every ~55 minutes)
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Get Google OAuth2 access token from service account credentials.
 * Uses JWT assertion grant (no external dependency).
 */
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedAccessToken && now < tokenExpiresAt - 60) {
    return cachedAccessToken;
  }

  const { FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = env;

  if (!FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error("Firebase credentials not configured");
  }

  // Build JWT for Google OAuth2
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with RSA private key
  const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const signature = await signRsa256(signatureInput, privateKey);
  const jwt = `${signatureInput}.${signature}`;

  // Exchange JWT for access token
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = data.access_token;
  tokenExpiresAt = now + data.expires_in;

  return cachedAccessToken;
}

/**
 * Send FCM message via HTTP v1 API.
 */
export async function sendFcmMessage(message: FcmMessage): Promise<FcmSendResult> {
  const { FIREBASE_PROJECT_ID } = env;

  if (!FIREBASE_PROJECT_ID) {
    // Firebase not configured — log and skip
    if (env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(`[FCM-STUB] → ${message.token.slice(0, 8)}... | ${message.notification.title}`);
    }
    return { success: true, messageId: "stub-no-firebase" };
  }

  try {
    const accessToken = await getAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: message.token,
          notification: message.notification,
          data: message.data,
          android: message.android ?? {
            priority: "high",
            notification: { channel_id: "tukangndeso_orders", sound: "default" },
          },
        },
      }),
    });

    if (response.ok) {
      const result = (await response.json()) as { name: string };
      return { success: true, messageId: result.name };
    }

    const errorBody = (await response.json()) as {
      error?: { code?: number; message?: string; details?: Array<{ errorCode?: string }> };
    };

    // Determine if we should remove the token (invalid/unregistered)
    const errorCode = errorBody.error?.details?.[0]?.errorCode;
    const shouldRemove =
      errorCode === "UNREGISTERED" ||
      errorCode === "INVALID_ARGUMENT" ||
      response.status === 404;

    return {
      success: false,
      error: errorBody.error?.message ?? `HTTP ${response.status}`,
      shouldRemoveToken: shouldRemove,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown FCM error",
    };
  }
}

// --- Crypto helpers ---

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signRsa256(data: string, privateKeyPem: string): Promise<string> {
  const { createSign } = await import("node:crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(data);
  const signature = sign.sign(privateKeyPem, "base64");
  return signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
