export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export type UploadCategory =
  | "problem"
  | "ktp"
  | "portfolio"
  | "review"
  | "avatar"
  /** Evidence attached to a dispute — reviewed by admin, kept separate from
   *  ordinary job photos because it backs a decision about money. */
  | "dispute";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
