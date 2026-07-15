import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import PQueue from "p-queue";
import pRetry from "p-retry";
import { CACHE_DIR, CONCURRENCY, MAX_RETRIES, REQUEST_INTERVAL_MS } from "../config.js";

const queue = new PQueue({
  concurrency: CONCURRENCY,
  interval: REQUEST_INTERVAL_MS,
  intervalCap: CONCURRENCY,
});

function cacheKey(url: string): string {
  return createHash("md5").update(url).digest("hex") + ".html";
}

async function ensureCacheDir(): Promise<void> {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

export async function fetchHtml(url: string): Promise<string> {
  await ensureCacheDir();
  const cachePath = join(CACHE_DIR, cacheKey(url));

  // Check cache
  if (existsSync(cachePath)) {
    return readFile(cachePath, "utf-8");
  }

  // Fetch with queue and retry
  const html = await queue.add(() =>
    pRetry(
      async () => {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} for ${url}`);
        }
        return res.text();
      },
      {
        retries: MAX_RETRIES,
        minTimeout: 2000,
        factor: 2,
        onFailedAttempt: (err) => {
          console.warn(
            `  Retry ${err.attemptNumber}/${MAX_RETRIES} for ${url}: ${err.message}`
          );
        },
      }
    )
  );

  if (!html) {
    throw new Error(`Empty response for ${url}`);
  }

  // Save to cache
  await writeFile(cachePath, html, "utf-8");
  return html;
}

export function getQueueStats() {
  return {
    pending: queue.pending,
    size: queue.size,
  };
}
