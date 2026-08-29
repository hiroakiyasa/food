/**
 * tokuho-scraper.ts
 *
 * 消費者庁の特定保健用食品 (特保) および機能性表示食品データベースをスクレイプし、
 * Supabase の tokuho_products テーブルにインポートするための JSON を生成する。
 *
 * データソース:
 *   - 特保: https://www.caa.go.jp/policies/policy/food_labeling/health_promotion/assets/food_labeling_cms206_230515_01.xlsx
 *   - 機能性表示: https://www.caa.go.jp/policies/policy/food_labeling/foods_with_function_claims/search/
 *
 * 使用方法:
 *   tsx scraper/src/tokuho-scraper.ts [--output <path>] [--limit <n>]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TokuhoProductRecord {
  license_number: string | null;
  product_name: string;
  brand: string | null;
  category: 'tokuho' | 'functional_claim';
  health_claims: string[];
  active_ingredients: ActiveIngredient[];
  jan_codes: string[];
  expiry_date: string | null; // YYYY-MM-DD
  product_url: string | null;
}

export interface ActiveIngredient {
  name: string;
  amount_per_serving: string | null;
  unit: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FUNCTIONAL_SEARCH_URL =
  'https://www.caa.go.jp/policies/policy/food_labeling/foods_with_function_claims/search/';

const TOKUHO_LIST_URL =
  'https://www.caa.go.jp/policies/policy/food_labeling/health_promotion/';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  // Handle Japanese date formats: "令和7年3月31日" → "2025-03-31"
  const reiwaMatch = dateStr.match(/令和(\d+)年(\d+)月(\d+)日/);
  if (reiwaMatch) {
    const year = 2018 + parseInt(reiwaMatch[1]!);
    const month = String(parseInt(reiwaMatch[2]!)).padStart(2, '0');
    const day = String(parseInt(reiwaMatch[3]!)).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // ISO or simple formats
  const isoMatch = dateStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;
  }
  return null;
}

/**
 * ページURLからタイプを判別して製品リストを取得する（実装例）
 * 実際の運用では cheerio でHTMLをパース、またはAPIエンドポイントを利用
 */
async function fetchFunctionalClaimPage(pageNum: number): Promise<TokuhoProductRecord[]> {
  const url = `${FUNCTIONAL_SEARCH_URL}?category=all&page=${pageNum}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FoodAppScraper/1.0)',
    },
  });

  if (!resp.ok) {
    console.warn(`[tokuho-scraper] HTTP ${resp.status} for page ${pageNum}`);
    return [];
  }

  const html = await resp.text();
  return parseFunctionalClaimsHtml(html);
}

/**
 * 機能性表示食品検索ページのHTMLをパースして製品リストを返す
 */
function parseFunctionalClaimsHtml(html: string): TokuhoProductRecord[] {
  const products: TokuhoProductRecord[] = [];

  // 届出番号パターン: A0001 〜 Z9999
  const rowPattern =
    /<tr[^>]*>[\s\S]*?<td[^>]*>((?:[A-Z]\d{4}))<\/td>[\s\S]*?<td[^>]*>(.*?)<\/td>[\s\S]*?<td[^>]*>(.*?)<\/td>[\s\S]*?<\/tr>/gi;

  let match: RegExpExecArray | null;
  while ((match = rowPattern.exec(html)) !== null) {
    const licenseNumber = match[1]?.trim() ?? null;
    const productName = stripTags(match[2] ?? '').trim();
    const brand = stripTags(match[3] ?? '').trim();

    if (!productName) continue;

    products.push({
      license_number: licenseNumber,
      product_name: productName,
      brand: brand || null,
      category: 'functional_claim',
      health_claims: [],
      active_ingredients: [],
      jan_codes: [],
      expiry_date: null,
      product_url: licenseNumber
        ? `${FUNCTIONAL_SEARCH_URL}${encodeURIComponent(licenseNumber)}`
        : null,
    });
  }

  return products;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const outputArg = args.indexOf('--output');
  const limitArg = args.indexOf('--limit');
  const outputPath = outputArg >= 0 ? args[outputArg + 1] : 'data/tokuho_products.json';
  const limit = limitArg >= 0 ? parseInt(args[limitArg + 1] ?? '100') : Infinity;
  const isDryRun = args.includes('--dry-run');

  console.log('[tokuho-scraper] Starting scrape...');
  console.log(`  Output: ${outputPath}`);
  console.log(`  Limit:  ${isFinite(limit) ? limit : 'all'}`);
  console.log(`  Mode:   ${isDryRun ? 'dry-run' : 'full'}`);

  const results: TokuhoProductRecord[] = [];
  let page = 1;

  while (results.length < limit) {
    console.log(`[tokuho-scraper] Fetching page ${page}...`);
    const batch = isDryRun ? [] : await fetchFunctionalClaimPage(page);

    if (batch.length === 0) {
      console.log('[tokuho-scraper] No more results, stopping.');
      break;
    }

    results.push(...batch.slice(0, limit - results.length));
    console.log(`[tokuho-scraper] Page ${page}: ${batch.length} products (total: ${results.length})`);
    page++;

    // Rate limiting: 500ms between requests
    await new Promise((r) => setTimeout(r, 500));
  }

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`[tokuho-scraper] Done. ${results.length} products saved to ${outputPath}`);
}

main().catch((err) => {
  console.error('[tokuho-scraper] Fatal error:', err);
  process.exit(1);
});
