import { createHash, createHmac } from "crypto";
import { env } from "../../config/env";

function sha256Hex(data: string | ArrayBuffer): string {
  const hash = createHash("sha256");
  if (typeof data === "string") hash.update(data);
  else hash.update(Buffer.from(data));
  return hash.digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
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
  const payloadHash = sha256Hex(body);
  const canonicalUri = `/${encodePathSegment(env.S3_BUCKET)}/${key.split("/").map(encodePathSegment).join("/")}`;
  const canonicalQueryString = "";
  const canonicalHeaders = `content-type:${contentType}\nhost:${endpoint.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${env.S3_SECRET_KEY}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

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
    body: Buffer.from(body),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`R2 upload failed (${response.status}): ${details.slice(0, 500)}`);
  }
}
