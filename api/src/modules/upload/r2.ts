import { env } from "../../config/env";

const encoder = new TextEncoder();

function toHex(bytes: ArrayBufferLike): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function sha256Hex(data: string | ArrayBuffer): Promise<string> {
  const input = typeof data === "string" ? encoder.encode(data) : new Uint8Array(data);
  return toHex(await crypto.subtle.digest("SHA-256", toArrayBuffer(input)));
}

async function hmac(key: Uint8Array | string, data: string): Promise<Uint8Array> {
  const keyBytes = typeof key === "string" ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(keyBytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data)));
}

function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export async function putObjectToR2(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
    throw new Error("R2 storage is not fully configured");
  }

  const endpoint = new URL(env.S3_ENDPOINT);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = env.S3_REGION || "auto";
  const service = "s3";
  const payloadHash = await sha256Hex(body);
  const canonicalUri = `/${encodePathSegment(env.S3_BUCKET)}/${key.split("/").map(encodePathSegment).join("/")}`;
  const canonicalHeaders = `content-type:${contentType}\nhost:${endpoint.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmac(`AWS4${env.S3_SECRET_KEY}`, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  const signature = toHex((await hmac(kSigning, stringToSign)).buffer);

  const authorization = `AWS4-HMAC-SHA256 Credential=${env.S3_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const target = new URL(canonicalUri, endpoint);

  const response = await fetch(target, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
    body,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`R2 upload failed (${response.status}): ${details.slice(0, 500)}`);
  }
}
