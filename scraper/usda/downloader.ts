import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { USDA_RAW_DIR, USDA_EXTRACTED_DIR, type DatasetConfig } from "./config.js";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  console.log(`  Size: ${contentLength > 0 ? formatBytes(contentLength) : "unknown"}`);

  const fileStream = createWriteStream(destPath);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  let downloaded = 0;
  let lastLogPercent = -10;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    fileStream.write(value);
    downloaded += value.length;

    if (contentLength > 0) {
      const percent = Math.floor((downloaded / contentLength) * 100);
      if (percent >= lastLogPercent + 10) {
        process.stdout.write(`\r  Downloaded: ${formatBytes(downloaded)} / ${formatBytes(contentLength)} (${percent}%)`);
        lastLogPercent = percent;
      }
    }
  }

  fileStream.end();
  await new Promise<void>((resolve, reject) => {
    fileStream.on("finish", resolve);
    fileStream.on("error", reject);
  });

  console.log(`\n  Download complete: ${formatBytes(downloaded)}`);
}

async function extractZip(zipPath: string, destDir: string): Promise<string[]> {
  await mkdir(destDir, { recursive: true });

  // Use system unzip for reliability (unzipper's streaming can hang)
  const { execSync } = await import("node:child_process");
  execSync(`unzip -o -q "${zipPath}" -d "${destDir}"`, { stdio: "pipe" });

  // Collect extracted JSON files
  const extractedFiles: string[] = [];
  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        extractedFiles.push(fullPath);
      }
    }
  }
  await walk(destDir);
  return extractedFiles;
}

export async function downloadAndExtract(dataset: DatasetConfig): Promise<string[]> {
  await mkdir(USDA_RAW_DIR, { recursive: true });
  await mkdir(USDA_EXTRACTED_DIR, { recursive: true });

  const zipPath = join(USDA_RAW_DIR, dataset.zipFilename);
  const extractDir = join(USDA_EXTRACTED_DIR, dataset.sourceType);

  // Check if already extracted
  if (existsSync(extractDir)) {
    const files = await readdir(extractDir, { recursive: true });
    const jsonFiles = files.filter((f) => String(f).endsWith(".json"));
    if (jsonFiles.length > 0) {
      console.log(`  Already extracted: ${extractDir} (${jsonFiles.length} JSON files)`);
      return jsonFiles.map((f) => join(extractDir, String(f)));
    }
  }

  // Download if not present
  if (!existsSync(zipPath)) {
    console.log(`  Downloading: ${dataset.url}`);
    await downloadFile(dataset.url, zipPath);
  } else {
    const s = await stat(zipPath);
    console.log(`  ZIP already exists: ${zipPath} (${formatBytes(s.size)})`);
  }

  // Extract
  console.log(`  Extracting to: ${extractDir}`);
  const files = await extractZip(zipPath, extractDir);
  console.log(`  Extracted ${files.length} files`);

  return files;
}

export async function downloadAll(datasets: DatasetConfig[]): Promise<void> {
  for (const dataset of datasets) {
    console.log(`\n[${dataset.name}]`);
    await downloadAndExtract(dataset);
  }
}

export async function findJsonFile(dataset: DatasetConfig): Promise<string> {
  const extractDir = join(USDA_EXTRACTED_DIR, dataset.sourceType);
  const files = await readdir(extractDir, { recursive: true });
  const jsonFile = files.find((f) => String(f).endsWith(".json"));
  if (!jsonFile) {
    throw new Error(`No JSON file found in ${extractDir}`);
  }
  return join(extractDir, String(jsonFile));
}
