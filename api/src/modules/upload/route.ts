import { Hono } from "hono";
import { authMiddleware } from "../../shared/auth-middleware";
import { env } from "../../config/env";
import { putObjectToR2 } from "./r2";

const uploadRouter = new Hono();

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

function getLocalPublicUrl(filename: string): string {
  return `${env.CDN_BASE_URL ?? `http://localhost:${env.PORT}`}/uploads/${filename}`;
}

function getR2PublicUrl(objectKey: string): string {
  if (!env.CDN_BASE_URL) throw new Error("CDN_BASE_URL is required for R2 uploads");
  return `${env.CDN_BASE_URL.replace(/\/$/, "")}/${objectKey}`;
}

function detectMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return "image/png";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";

  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
    if (brand === "heic" || brand === "heix" || brand === "mif1") return "image/heic";
    if (brand === "heif") return "image/heif";
  }

  return null;
}

uploadRouter.post("/upload/image", authMiddleware, async (context) => {
  const contentType = context.req.header("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Content-Type harus multipart/form-data" } }, 400);
  }

  const body = await context.req.parseBody();
  const file = body["file"];
  if (!file || !(file instanceof File)) {
    return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Field 'file' wajib berupa file" } }, 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: `Tipe file tidak didukung: ${file.type}. Gunakan JPEG, PNG, WebP, HEIC, atau HEIF.` } }, 400);
  }

  const maxFileSize = env.UPLOAD_MAX_SIZE_MB * 1024 * 1024;
  if (file.size > maxFileSize) {
    return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: `Ukuran file melebihi batas ${env.UPLOAD_MAX_SIZE_MB}MB (${(file.size / 1024 / 1024).toFixed(1)}MB)` } }, 400);
  }

  const buffer = await file.arrayBuffer();
  const detectedMime = detectMimeFromBytes(new Uint8Array(buffer));
  if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
    return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Isi file tidak sesuai dengan tipe yang diklaim. Pastikan file adalah gambar yang valid." } }, 400);
  }

  const ext = MIME_TO_EXT[detectedMime];
  if (!ext) {
    return context.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Ekstensi file tidak didukung" } }, 400);
  }
  const filename = `${crypto.randomUUID()}${ext}`;

  if (env.UPLOAD_STORAGE === "r2") {
    const date = new Date();
    const objectKey = `uploads/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${filename}`;
    await putObjectToR2(objectKey, buffer, detectedMime);

    return context.json({
      success: true,
      data: {
        url: getR2PublicUrl(objectKey),
        filename,
        object_key: objectKey,
        storage: "r2",
        size: file.size,
        mime_type: detectedMime,
      },
    });
  }

  // Loaded only for the cPanel/local fallback so stateless R2 deployments do
  // not require Node filesystem modules on their normal execution path.
  const { putObjectLocal } = await import("./local-storage");
  await putObjectLocal(filename, buffer);

  return context.json({
    success: true,
    data: {
      url: getLocalPublicUrl(filename),
      filename,
      storage: "local",
      size: file.size,
      mime_type: detectedMime,
    },
  });
});

export { uploadRouter };
