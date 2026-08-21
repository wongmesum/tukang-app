import { Hono } from "hono";
import { authMiddleware } from "../../shared/auth-middleware";
import { env } from "../../config/env";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join, extname } from "path";

const uploadRouter = new Hono();

// Allowed MIME types for image uploads
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Map MIME to extension
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

function getUploadDir(): string {
  return join(process.cwd(), "uploads");
}

function getPublicUrl(filename: string): string {
  // In production, this would be an S3/CDN URL
  const baseUrl = env.NODE_ENV === "production"
    ? process.env.CDN_BASE_URL ?? `http://localhost:${env.PORT}`
    : `http://localhost:${env.PORT}`;
  return `${baseUrl}/uploads/${filename}`;
}

/**
 * Detect MIME type from file magic bytes (file signature).
 * Returns null if unrecognized.
 */
function detectMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return "image/png";
  }

  // WebP: RIFF....WEBP
  if (bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }

  // HEIF/HEIC: ....ftyp at offset 4
  if (bytes.length >= 12 &&
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
    if (brand === "heic" || brand === "heix" || brand === "mif1") return "image/heic";
    if (brand === "heif") return "image/heif";
  }

  return null;
}

uploadRouter.post("/upload/image", authMiddleware, async (context) => {
  const contentType = context.req.header("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Content-Type harus multipart/form-data",
        },
      },
      400,
    );
  }

  const body = await context.req.parseBody();
  const file = body["file"];

  if (!file || !(file instanceof File)) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Field 'file' wajib berupa file",
        },
      },
      400,
    );
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Tipe file tidak didukung: ${file.type}. Gunakan JPEG, PNG, atau WebP.`,
        },
      },
      400,
    );
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Ukuran file melebihi batas 5MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
        },
      },
      400,
    );
  }

  // Validate file content via magic bytes
  const buffer = await file.arrayBuffer();
  const detectedMime = detectMimeFromBytes(new Uint8Array(buffer));
  if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Isi file tidak sesuai dengan tipe yang diklaim. Pastikan file adalah gambar yang valid.",
        },
      },
      400,
    );
  }

  // Generate unique filename
  const ext = MIME_TO_EXT[detectedMime] ?? extname(file.name || ".jpg");
  const filename = `${randomUUID()}${ext}`;

  // Ensure upload directory exists
  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });

  // Write file to disk (buffer already read for magic bytes validation)
  const filePath = join(uploadDir, filename);
  await writeFile(filePath, Buffer.from(buffer));

  const url = getPublicUrl(filename);

  return context.json({
    success: true,
    data: {
      url,
      filename,
      size: file.size,
      mime_type: file.type,
    },
  });
});

export { uploadRouter };
