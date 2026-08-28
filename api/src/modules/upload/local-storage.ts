import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

/**
 * Node/Bun-only local upload adapter used by cPanel/local development.
 * Stateless runtimes should use the R2 adapter instead.
 */
export async function putObjectLocal(filename: string, body: ArrayBuffer): Promise<void> {
  const uploadDir = join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), new Uint8Array(body));
}
