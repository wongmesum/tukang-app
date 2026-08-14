import { Hono } from "hono";
import { authMiddleware } from "../../shared/auth-middleware";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "./types";
import type { UploadCategory } from "./types";
import { createStorageAdapter, getExtension } from "./storage";

const uploadRouter = new Hono();
const storage = createStorageAdapter();

const VALID_CATEGORIES: UploadCategory[] = ["problem", "ktp", "portfolio", "review", "avatar"];

// POST /upload/image
uploadRouter.post("/image", authMiddleware, async (context) => {
  const contentType = context.req.header("Content-Type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request harus multipart/form-data",
        },
      },
      400,
    );
  }

  const formData = await context.req.formData();
  const file = formData.get("file");
  const category = (formData.get("category") as string) ?? "problem";

  if (!file || !(file instanceof File)) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "File wajib disertakan",
        },
      },
      400,
    );
  }

  // Validate category
  if (!VALID_CATEGORIES.includes(category as UploadCategory)) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Kategori tidak valid. Pilihan: ${VALID_CATEGORIES.join(", ")}`,
        },
      },
      400,
    );
  }

  // Validate MIME type
  const mimeType = file.type;
  if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Tipe file tidak didukung. Hanya: ${ALLOWED_MIME_TYPES.join(", ")}`,
        },
      },
      400,
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Ukuran file melebihi batas maksimum ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`,
        },
      },
      400,
    );
  }

  // Read file buffer and save
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = getExtension(mimeType);

  const result = await storage.save(buffer, category as UploadCategory, extension);

  return context.json({
    success: true,
    data: {
      url: result.url,
      filename: result.filename,
      size: result.size,
      mime_type: result.mimeType,
    },
  });
});

export { uploadRouter };
