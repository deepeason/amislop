/**
 * Cloudflare bindings helper for Next.js
 * Uses getRequestContext from @opennextjs/cloudflare
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getCloudflareBindings() {
  const { env } = await getCloudflareContext();
  return {
    DB: env.DB,
    KV: env.KV,
    AI: env.AI,
    VECTORIZE: env.VECTORIZE,
  };
}
