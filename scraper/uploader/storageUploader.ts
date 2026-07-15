/**
 * Uploads gzip-compressed JSON files to Supabase Storage for backup.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';

interface StorageConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  bucket: string;
}

/**
 * Ensures the storage bucket exists.
 */
export async function ensureBucket(config: StorageConfig): Promise<void> {
  const url = `${config.supabaseUrl}/storage/v1/bucket/${config.bucket}`;
  const res = await fetch(url, {
    headers: {
      'apikey': config.supabaseServiceKey,
      'Authorization': `Bearer ${config.supabaseServiceKey}`,
    },
  });

  if (res.status === 404) {
    // Create the bucket
    const createRes = await fetch(`${config.supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.supabaseServiceKey,
        'Authorization': `Bearer ${config.supabaseServiceKey}`,
      },
      body: JSON.stringify({
        id: config.bucket,
        name: config.bucket,
        public: false,
      }),
    });
    if (!createRes.ok) {
      throw new Error(`Failed to create bucket: ${await createRes.text()}`);
    }
    console.log(`  Created bucket: ${config.bucket}`);
  }
}

/**
 * Uploads a file to Supabase Storage, optionally gzip-compressing it.
 */
export async function uploadFile(
  config: StorageConfig,
  localPath: string,
  remotePath: string,
  gzip: boolean = true,
): Promise<void> {
  const fileStats = await stat(localPath);
  console.log(`  Uploading ${remotePath} (source: ${(fileStats.size / 1024 / 1024).toFixed(1)}MB)...`);

  // Read and optionally compress
  const chunks: Buffer[] = [];
  const collector = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });

  const readStream = createReadStream(localPath);
  if (gzip) {
    const gzipStream = createGzip({ level: 9 });
    await pipeline(readStream, gzipStream, collector);
  } else {
    await pipeline(readStream, collector);
  }

  const body = Buffer.concat(chunks);
  const finalName = gzip ? `${remotePath}.gz` : remotePath;
  console.log(`  Compressed: ${(body.length / 1024 / 1024).toFixed(1)}MB`);

  const url = `${config.supabaseUrl}/storage/v1/object/${config.bucket}/${finalName}`;

  // Try upsert first
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'apikey': config.supabaseServiceKey,
      'Authorization': `Bearer ${config.supabaseServiceKey}`,
      'Content-Type': 'application/gzip',
      'x-upsert': 'true',
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Upload failed for ${finalName}: ${res.status} ${await res.text()}`);
  }

  console.log(`  Uploaded: ${finalName}`);
}
