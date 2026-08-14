export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export type UploadCategory = "problem" | "ktp" | "portfolio" | "review" | "avatar";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
