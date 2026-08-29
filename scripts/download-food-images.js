#!/usr/bin/env node
/**
 * scripts/download-food-images.js
 *
 * Unsplash から MEXT 食品データの画像を一括ダウンロードし、
 * アプリ用のアセットマップを生成する。
 *
 * 使い方:
 *   node scripts/download-food-images.js             # 全件 (デモ制限内)
 *   node scripts/download-food-images.js --limit 50  # 最大 50 件
 *   node scripts/download-food-images.js --dry-run   # ダウンロードせず件数確認のみ
 *
 * 出力:
 *   assets/food-images/img_XXXX.jpg         ← ダウンロード画像
 *   src/data/foodImageMap.json              ← food_id → image_key
 *   src/data/foodImageAssets.ts             ← image_key → require() (Metro用)
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── 設定 ─────────────────────────────────────────────────────────────────────
const ACCESS_KEY  = process.env.UNSPLASH_ACCESS_KEY
  || 'hLRr8-ErFZWqo7r1iBTGNdR0vsKVBDZmeUhuF604m8A';

const IMAGES_DIR   = path.join(__dirname, '../assets/food-images');
const MAP_OUTPUT   = path.join(__dirname, '../src/data/foodImageMap.json');
const ASSETS_OUTPUT = path.join(__dirname, '../src/data/foodImageAssets.ts');
const DATA_DIR     = path.join(__dirname, '../src/data');

// API レートリミット: デモ=50/h → 最低 72 秒間隔
// (X-Ratelimit-Remaining ヘッダーで動的に調整)
const MIN_INTERVAL_MS = 1300; // 余裕をもって 1.3 秒

const CATEGORY_KEYWORDS = {
  '穀類':             'grain rice',
  '肉類':             'meat',
  '魚介類':           'seafood fish',
  '野菜類':           'vegetable',
  '果実類':           'fruit',
  '乳類':             'dairy milk',
  '卵類':             'egg',
  '豆類':             'bean legume',
  'いも及びでん粉類': 'potato starch',
  'きのこ類':         'mushroom',
  '藻類':             'seaweed',
  '種実類':           'nut seed',
  '菓子類':           'dessert sweets',
  '油脂類':           'oil fat',
  '砂糖及び甘味類':   'sugar sweet',
  '調味料及び香辛料類': 'seasoning spice',
  'し好飲料類':       'drink beverage',
  '調理加工食品類':   'cooked dish',
};

// ── CLI 引数 ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN  = args.includes('--dry-run');
const LIMIT    = (() => {
  const i = args.indexOf('--limit');
  return i >= 0 ? parseInt(args[i + 1], 10) : Infinity;
})();

// ── ユーティリティ ────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** MEXT 食品名から「基本食材名」を抽出して検索クエリに使う */
function extractBaseName(food) {
  if (food.food_name_en) return food.food_name_en.trim();

  // "（だいこん類）/だいこん/葉/ゆで" → "だいこん"
  let name = food.food_name || '';
  name = name.replace(/（[^）]+）\//g, '');   // （〜類）/ を除去
  name = name.replace(/<[^>]+>\//g, '');      // <〜>/ を除去
  return name.split('/')[0].trim();
}

/**
 * Unsplash 検索クエリを構築。
 * fallback=true のとき、日本語名を除いてカテゴリキーワードのみで再試行用クエリを返す。
 */
function buildSearchQuery(food, baseName, fallback = false) {
  const catKw = CATEGORY_KEYWORDS[food.category_name] || 'food';
  if (food.food_name_en) {
    return `${food.food_name_en} ${catKw} food`.trim();
  }
  if (fallback) {
    // フォールバック: カテゴリキーワードのみ (Unsplash に確実にヒットする英語クエリ)
    return `${catKw} japanese food`.trim();
  }
  // 日本語名をそのまま含める (Unsplash は日本語クエリ対応)
  return `${baseName} ${catKw} food`.trim();
}

/** Unsplash Search API を呼ぶ */
function unsplashSearch(query) {
  return new Promise((resolve, reject) => {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=8&orientation=squarish&content_filter=high`;
    const options = {
      headers: {
        Authorization: `Client-ID ${ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    };
    https.get(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const remaining = parseInt(res.headers['x-ratelimit-remaining'] ?? '-1', 10);
        try {
          const payload = JSON.parse(body);
          resolve({ payload, remaining });
        } catch (e) {
          reject(new Error(`JSON parse error: ${body.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

/** 最もスコアの高い写真を選ぶ */
function pickBestPhoto(photos, primaryName, catKw) {
  if (photos.length === 0) return null;
  const ranked = [...photos].sort((a, b) => {
    const textA = `${a.alt_description ?? ''} ${a.description ?? ''}`.toLowerCase();
    const textB = `${b.alt_description ?? ''} ${b.description ?? ''}`.toLowerCase();
    const score = (text) => {
      let s = 0;
      if (primaryName && text.includes(primaryName.toLowerCase())) s += 30;
      if (catKw && text.includes(catKw.split(' ')[0].toLowerCase())) s += 8;
      if (text.includes('food') || text.includes('dish') || text.includes('meal')) s += 5;
      return s;
    };
    return score(textB) - score(textA);
  });
  return ranked[0];
}

/** 画像ファイルをダウンロードして保存 */
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/** Unsplash ダウンロード通知 (API ガイドライン必須) */
function trackDownload(downloadLocation) {
  if (!downloadLocation) return;
  https.get(downloadLocation, {
    headers: {
      Authorization: `Client-ID ${ACCESS_KEY}`,
      'Accept-Version': 'v1',
    },
  }, () => {}).on('error', () => {});
}

// ── メイン処理 ────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== 食品画像ダウンロード ===\n');

  // 1. MEXT 食品データを全件読み込み
  const files = fs.readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('mext_foods_p') && f.endsWith('.json'))
    .sort()
    .map((f) => path.join(DATA_DIR, f));

  if (files.length === 0) {
    console.error('エラー: src/data/mext_foods_p*.json が見つかりません');
    process.exit(1);
  }

  const allFoods = files.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  console.log(`食品総数: ${allFoods.length} 件`);

  // 2. baseName でグループ化 → ユニーク検索クエリを作成
  //    同じ baseName の食品は同じ画像を共有する
  const groups = new Map(); // baseName → { foods[], query, imgKey }
  for (const food of allFoods) {
    const baseName = extractBaseName(food);
    if (!groups.has(baseName)) {
      groups.set(baseName, { foods: [], baseName, representative: food });
    }
    groups.get(baseName).foods.push(food);
  }

  const uniqueGroups = [...groups.values()];
  console.log(`ユニーク食材数: ${uniqueGroups.length} 件 (重複除去後)\n`);

  // 3. 既存の map を読み込み (resume 対応)
  let existingMap = {};
  if (fs.existsSync(MAP_OUTPUT)) {
    existingMap = JSON.parse(fs.readFileSync(MAP_OUTPUT, 'utf8'));
  }
  const downloadedKeys = new Set(
    fs.existsSync(IMAGES_DIR)
      ? fs.readdirSync(IMAGES_DIR).map((f) => f.replace('.jpg', ''))
      : []
  );

  // 4. ダウンロード計画
  const allGroupsWithKeys = uniqueGroups.map((g, i) => ({
    ...g,
    imgKey: `img_${String(i + 1).padStart(4, '0')}`,
  }));

  const pendingGroups = allGroupsWithKeys.filter((g) => !downloadedKeys.has(g.imgKey));
  const alreadyDone = allGroupsWithKeys.length - pendingGroups.length;
  const toProcess = pendingGroups.slice(0, LIMIT);
  console.log(`ダウンロード済み: ${alreadyDone} / ${uniqueGroups.length}`);
  console.log(`今回ダウンロード: ${toProcess.length} 件`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] ダウンロードはスキップします');
    console.log('サンプル:');
    toProcess.slice(0, 5).forEach((g) => {
      const q = buildSearchQuery(g.representative, g.baseName);
      console.log(`  ${g.imgKey} | "${g.baseName}" → "${q}"`);
    });
    return;
  }

  if (toProcess.length === 0) {
    console.log('\n全画像ダウンロード済みです。マップを生成します...');
  } else {
    const hoursNeeded = (toProcess.length / 50).toFixed(1);
    console.log(`\n⚠️  Unsplash デモ制限: 50 リクエスト/時間`);
    console.log(`   推定所要時間: 約 ${hoursNeeded} 時間`);
    console.log(`   (Ctrl+C で中断し、再実行するとレジューム可能)\n`);
    await sleep(2000);
  }

  // 5. 画像ダウンロードループ
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const g = toProcess[i];
    const destPath = path.join(IMAGES_DIR, `${g.imgKey}.jpg`);

    process.stdout.write(`[${i + 1}/${toProcess.length}] ${g.imgKey} "${g.baseName}" ... `);

    const startTime = Date.now();
    try {
      // 1st try: 日本語名 + カテゴリキーワード
      const query1 = buildSearchQuery(g.representative, g.baseName, false);
      const { payload: p1, remaining: rem1 } = await unsplashSearch(query1);
      const catKw = CATEGORY_KEYWORDS[g.representative.category_name] ?? '';
      let best = pickBestPhoto(p1.results ?? [], g.baseName, catKw);
      let remaining = rem1;

      // 2nd try: 写真なしの場合はカテゴリキーワードのみでフォールバック
      if (!best && rem1 > 0) {
        await sleep(MIN_INTERVAL_MS);
        const query2 = buildSearchQuery(g.representative, g.baseName, true);
        const { payload: p2, remaining: rem2 } = await unsplashSearch(query2);
        best = pickBestPhoto(p2.results ?? [], g.baseName, catKw);
        remaining = rem2;
      }

      if (!best) {
        console.log('写真なし (スキップ)');
        failCount++;
      } else {
        const imgUrl = best.urls.small || best.urls.regular;
        await downloadImage(imgUrl, destPath);
        trackDownload(best.links?.download_location);
        console.log(`✓ (残り ${remaining} req/h)`);
        successCount++;
      }

      // レートリミット超過時: ローリング60分窓がリセットされるまで待機
      if (remaining >= 0 && remaining < 2) {
        const waitMin = 70;
        console.log(`\n⚠️  レートリミット残り ${remaining} 件。${waitMin}分待機中...`);
        console.log(`   再開時刻: ${new Date(Date.now() + waitMin * 60000).toLocaleTimeString('ja-JP')}\n`);
        // 中間保存してから待機
        saveOutputFiles(allGroupsWithKeys, existingMap);
        await sleep(waitMin * 60 * 1000);
        console.log('待機完了。ダウンロード再開...\n');
      }
    } catch (err) {
      console.log(`✗ エラー: ${err.message}`);
      failCount++;
    }

    // インターバル確保
    const elapsed = Date.now() - startTime;
    const wait = Math.max(0, MIN_INTERVAL_MS - elapsed);
    if (wait > 0 && i < toProcess.length - 1) await sleep(wait);

    // 10件ごとに中間マップを保存 (レジューム用)
    if ((i + 1) % 10 === 0) {
      saveOutputFiles(allGroupsWithKeys, existingMap);
      process.stdout.write('  (中間保存完了)\n');
    }
  }

  // 6. 最終的にマップとアセットファイルを生成
  saveOutputFiles(allGroupsWithKeys, existingMap);

  console.log(`\n=== 完了 ===`);
  console.log(`成功: ${successCount + alreadyDone} / ${uniqueGroups.length}`);
  console.log(`失敗: ${failCount}`);
  console.log(`出力: ${MAP_OUTPUT}`);
  console.log(`出力: ${ASSETS_OUTPUT}`);
}

/** foodImageMap.json と foodImageAssets.ts を生成 */
function saveOutputFiles(allGroupsWithKeys, existingMap) {
  const downloadedKeys = new Set(
    fs.readdirSync(IMAGES_DIR).map((f) => f.replace('.jpg', ''))
  );

  // food_id → imgKey マップ (ダウンロード済みのみ)
  const foodImageMap = { ...existingMap };
  for (const g of allGroupsWithKeys) {
    if (!downloadedKeys.has(g.imgKey)) continue;
    for (const food of g.foods) {
      foodImageMap[food.id] = g.imgKey;
    }
  }
  fs.writeFileSync(MAP_OUTPUT, JSON.stringify(foodImageMap, null, 2), 'utf8');

  // foodImageAssets.ts (Metro 静的 require マップ)
  const downloadedGroups = allGroupsWithKeys.filter((g) => downloadedKeys.has(g.imgKey));
  const lines = [
    '// Auto-generated by scripts/download-food-images.js — DO NOT EDIT',
    `// ${downloadedGroups.length} images as of ${new Date().toISOString().slice(0, 10)}`,
    '',
    '// eslint-disable-next-line @typescript-eslint/no-explicit-any',
    'const foodImageAssets: Record<string, any> = {',
  ];
  for (const g of downloadedGroups) {
    lines.push(`  '${g.imgKey}': require('../../assets/food-images/${g.imgKey}.jpg'),`);
  }
  lines.push('};', '', 'export default foodImageAssets;', '');
  fs.writeFileSync(ASSETS_OUTPUT, lines.join('\n'), 'utf8');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
