import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { UploadCategory, UploadResult } from "./types";
import { env } from "../../config/env";

/**
 * Storage interface — allows swapping local disk for S3 in production.
 */
export interface StorageAdapter {
  save(buffer: Buffer, category: UploadCategory, extension: string): Promise<UploadResult>;
}

// --- Local Disk Storage (development/test) ---

const UPLOAD_DIR = join(process.cwd(), "uploads");

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  return map[mimeType] ?? ".bin";
}

export class LocalStorageAdapter implements StorageAdapter {
  async save(buffer: Buffer, category: UploadCategory, extension: string): Promise<UploadResult> {
    const dir = join(UPLOAD_DIR, category);
    await ensureDir(dir);

    const filename = `${randomUUID()}${extension}`;
    const filepath = join(dir, filename);
    await writeFile(filepath, buffer);

    // In dev, serve from local path; in production, this would be a CDN URL
    const baseUrl = env.NODE_ENV === "production"
      ? "https://cdn.tukangndeso.id"
      : `http://localhost:${env.PORT}`;

    return {
      url: `${baseUrl}/uploads/${category}/${filename}`,
      filename,
      size: buffer.length,
      mimeType: `image/${extension.slice(1)}`,
    };
  }
}

// --- S3 Storage (production placeholder) ---

export class S3StorageAdapter implements StorageAdapter {
  async save(buffer: Buffer, category: UploadCategory, extension: string): Promise<UploadResult> {
    // TODO: Implement S3 upload using AWS SDK or compatible client
    // For now, fall back to local storage
    const local = new LocalStorageAdapter();
    return local.save(buffer, category, extension);
  }
}

// Factory: pick adapter based on environment
export function createStorageAdapter(): StorageAdapter {
  // Future: if (env.S3_BUCKET) return new S3StorageAdapter();
  return new LocalStorageAdapter();
}

export { getExtension };
