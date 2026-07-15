/**
 * scripts/generate-food-index.js
 *
 * 全4ソース (MEXT + USDA Foundation/SR Legacy/Survey) を統合した
 * 完全正規化 JSON を生成する。ミネラル・ビタミン・脂肪酸・アミノ酸を含む。
 *
 * 出力: src/data/ 以下の29ファイル（チャンク分割）
 *   mext_foods_p1〜p5.json    : MEXT 2,541件
 *   usda_foundation_p1.json   : USDA Foundation 365件
 *   usda_sr_legacy_p1〜p13.json: USDA SR Legacy 7,793件
 *   usda_survey_p1〜p10.json  : USDA Survey 5,432件
 *
 * Usage: node scripts/generate-food-index.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR   = path.join(__dirname, '../data/output');
const OUTPUT_DIR = path.join(__dirname, '../src/data');

const MEXT_INPUT        = path.join(DATA_DIR, 'food_composition.json');
const FOUNDATION_INPUT  = path.join(DATA_DIR, 'usda_foundation.json');
const SR_LEGACY_INPUT   = path.join(DATA_DIR, 'usda_sr_legacy.json');
const SURVEY_INPUT      = path.join(DATA_DIR, 'usda_survey.json');

// ── 人気スコア計算 ────────────────────────────────────────────────────────────

const JP_POP_TIERS = [
  {
    score: 9,
    keywords: [
      '精白米','水稲めし','うるち米','食パン','ロールパン',
      '鶏むね','鶏もも','豚ロース','豚バラ','牛もも','牛ひき','豚ひき',
      'まぐろ','さけ','さば','たまご','全卵','牛乳','普通牛乳',
      '木綿豆腐','絹ごし豆腐','キャベツ','たまねぎ','にんじん',
      'じゃがいも','ほうれんそう','きゅうり','トマト','バナナ','りんご','みかん',
    ],
  },
  {
    score: 7,
    keywords: [
      'うどん','そば','スパゲッティ','ラーメン','ハム','ベーコン','ソーセージ',
      'ウインナー','まいわし','あじ','えび','いか','たこ',
      '納豆','味噌','しょうゆ','バター','マーガリン','ヨーグルト','チーズ',
      'ブロッコリー','大根','ごぼう','もやし','レタス','ピーマン','えだまめ',
      'いちご','ぶどう','もも','なし','オレンジ','グレープフルーツ',
    ],
  },
  {
    score: 5,
    keywords: [
      '玄米','もち','コーンフレーク','オートミール','食塩','マヨネーズ',
      'ケチャップ','オリーブ油','サラダ油','ごま','アーモンド','くるみ',
    ],
  },
];

const EN_POP_TIERS = [
  {
    score: 9,
    keywords: [
      'chicken breast','chicken thigh','ground beef','salmon','rice','white bread',
      'whole milk','chicken egg','raw egg','apple','banana',
    ],
  },
  {
    score: 7,
    keywords: [
      'pork','turkey','tuna','shrimp','pasta','cheddar','yogurt','broccoli',
      'spinach','potato','onion','carrot','tomato','orange','strawberry',
    ],
  },
];

/**
 * MEXT食品の人気スコアを計算（1〜9）
 */
function calcMextPop(foodName) {
  if (!foodName) return 3;
  for (const { score, keywords } of JP_POP_TIERS) {
    if (keywords.some(k => foodName.includes(k))) return score;
  }
  return 3;
}

/**
 * USDA食品の人気スコアを計算（1〜9）
 */
function calcUsdaPop(foodName, dataQuality) {
  const lower = (foodName ?? '').toLowerCase();
  for (const { score, keywords } of EN_POP_TIERS) {
    if (keywords.some(k => lower.includes(k))) return score;
  }
  return (dataQuality ?? 2) * 2;
}

// ── ショートキーマッピング ────────────────────────────────────────────────────

const MINERAL_KEY_MAP = {
  sodium:     'na',
  potassium:  'k',
  calcium:    'ca',
  magnesium:  'mg',
  phosphorus: 'p',
  iron:       'fe',
  zinc:       'zn',
  copper:     'cu',
  manganese:  'mn',
  iodine:     'io',
  selenium:   'se',
  chromium:   'cr',
  molybdenum: 'mo',
};

const VITAMIN_KEY_MAP = {
  retinolActivityEquiv: 'rae',
  vitaminD:             'd',
  alphaTocopherol:      'e',
  vitaminK:             'k1',
  vitaminB1:            'b1',
  vitaminB2:            'b2',
  niacinEquiv:          'nia',
  vitaminB6:            'b6',
  vitaminB12:           'b12',
  folate:               'fol',
  pantothenicAcid:      'pan',
  biotin:               'bio',
  vitaminC:             'c',
  betaCaroteneEquiv:    'bce',
  retinol:              'ret',
};

const FATTY_ACID_KEY_MAP = {
  saturatedTotal:        'sfa',
  monounsaturatedTotal:  'mufa',
  polyunsaturatedTotal:  'pufa',
  n3PolyunsaturatedTotal:'n3',
  n6PolyunsaturatedTotal:'n6',
  eicosapentaenoicAcid:  'epa',
  docosahexaenoicAcid:   'dha',
  alphaLinolenicAcid:    'ala',
  linoleicAcid:          'la',
  arachidonicAcid:       'ara',
};

const AMINO_ACID_KEY_MAP = {
  isoleucine:   'ile',
  leucine:      'leu',
  lysine:       'lys',
  methionine:   'met',
  cystine:      'cys',
  phenylalanine:'phe',
  tyrosine:     'tyr',
  threonine:    'thr',
  tryptophan:   'trp',
  valine:       'val',
  arginine:     'arg',
  histidine:    'his',
  alanine:      'ala_aa',
  asparticAcid: 'asp',
  glutamicAcid: 'glu',
  glycine:      'gly',
  proline:      'pro',
  serine:       'ser',
};

// USDA usdaFoodCategory → 日本語カテゴリ（MEXT準拠）
const USDA_CATEGORY_MAP = {
  'Dairy and Egg Products':              '乳類',
  'Spices and Herbs':                    '調味料及び香辛料類',
  'Baby Foods':                          '調理加工食品類',
  'Fats and Oils':                       '油脂類',
  'Poultry Products':                    '肉類',
  'Soups, Sauces, and Gravies':          '調味料及び香辛料類',
  'Sausages and Luncheon Meats':         '肉類',
  'Breakfast Cereals':                   '穀類',
  'Fruits and Fruit Juices':             '果実類',
  'Pork Products':                       '肉類',
  'Vegetables and Vegetable Products':   '野菜類',
  'Nut and Seed Products':               '種実類',
  'Beef Products':                       '肉類',
  'Beverages':                           '飲料類',
  'Finfish and Shellfish Products':      '魚介類',
  'Legumes and Legume Products':         '豆類',
  'Lamb, Veal, and Game Products':       '肉類',
  'Baked Products':                      '穀類',
  'Sweets':                              '砂糖及び甘味料類',
  'Cereal Grains and Pasta':             '穀類',
  'Fast Foods':                          '調理加工食品類',
  'Meals, Entrees, and Side Dishes':     '調理加工食品類',
  'Snacks':                              '菓子類',
  'American Indian/Alaska Native Foods': '調理加工食品類',
  'Restaurant Foods':                    '調理加工食品類',
  'Ethnic Foods':                        '調理加工食品類',
  'Branded Food Products Database':      '調理加工食品類',
};

// Survey用: foodName のキーワードからカテゴリを推定
const SURVEY_KEYWORD_MAP = [
  { keywords: ['milk', 'cheese', 'yogurt', 'cream', 'butter', 'egg'],   category: '乳類' },
  { keywords: ['beef', 'pork', 'chicken', 'turkey', 'lamb', 'veal', 'meat', 'sausage', 'bacon', 'ham'], category: '肉類' },
  { keywords: ['fish', 'salmon', 'tuna', 'cod', 'shrimp', 'crab', 'lobster', 'clam', 'oyster', 'scallop'], category: '魚介類' },
  { keywords: ['apple', 'orange', 'banana', 'grape', 'berry', 'peach', 'pear', 'melon', 'fruit', 'juice'], category: '果実類' },
  { keywords: ['broccoli', 'carrot', 'spinach', 'tomato', 'potato', 'onion', 'lettuce', 'vegetable', 'salad'], category: '野菜類' },
  { keywords: ['rice', 'bread', 'pasta', 'noodle', 'cereal', 'oat', 'wheat', 'corn', 'grain'], category: '穀類' },
  { keywords: ['bean', 'lentil', 'pea', 'soy', 'tofu', 'tempeh', 'legume'], category: '豆類' },
  { keywords: ['almond', 'walnut', 'peanut', 'cashew', 'pistachio', 'seed', 'nut'], category: '種実類' },
  { keywords: ['oil', 'fat', 'lard', 'shortening', 'margarine'], category: '油脂類' },
  { keywords: ['sugar', 'honey', 'syrup', 'candy', 'chocolate', 'sweet'], category: '砂糖及び甘味料類' },
  { keywords: ['cake', 'cookie', 'pie', 'snack', 'chip', 'cracker', 'popcorn'], category: '菓子類' },
  { keywords: ['water', 'coffee', 'tea', 'beer', 'wine', 'soda', 'drink', 'beverage'], category: '飲料類' },
  { keywords: ['salt', 'sauce', 'vinegar', 'spice', 'herb', 'seasoning', 'dressing', 'mustard'], category: '調味料及び香辛料類' },
];

// ── ヘルパー関数 ──────────────────────────────────────────────────────────────

/**
 * MEXT の { value, estimated, trace, unit } オブジェクトから数値を取り出す
 * -1 はトレース量 → 0
 */
function getVal(obj) {
  if (!obj) return null;
  const v = obj.value;
  if (v == null || v === '') return null;
  if (v === -1) return 0;
  return typeof v === 'number' ? v : null;
}

/**
 * USDA の生値（数値 or null）を取り出す
 */
function getUsdaVal(v) {
  if (v == null || v === '') return null;
  if (v === -1) return 0;
  return typeof v === 'number' ? v : null;
}

/**
 * コンパクトマップ: null/0 を省略してサイズ削減
 * MEXT形式（{ value, ... } オブジェクト）用
 */
function compactMapMext(src, keyMap) {
  if (!src) return null;
  const result = {};
  for (const [srcKey, shortKey] of Object.entries(keyMap)) {
    const v = getVal(src[srcKey]);
    if (v !== null && v !== 0) result[shortKey] = v;
  }
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * コンパクトマップ: USDA形式（生数値）用
 */
function compactMapUsda(src, keyMap) {
  if (!src) return null;
  const result = {};
  for (const [srcKey, shortKey] of Object.entries(keyMap)) {
    const v = getUsdaVal(src[srcKey]);
    if (v !== null && v !== 0) result[shortKey] = v;
  }
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * "穀類/アマランサス/玄穀" → "アマランサス/玄穀"
 */
function stripCategory(foodName, categoryName) {
  const prefix = categoryName + '/';
  if (foodName && foodName.startsWith(prefix)) {
    return foodName.slice(prefix.length);
  }
  return foodName;
}

/**
 * USDA Survey の foodName からカテゴリを推定
 */
function inferSurveyCategory(foodName) {
  if (!foodName) return '調理加工食品類';
  const lower = foodName.toLowerCase();
  for (const { keywords, category } of SURVEY_KEYWORD_MAP) {
    if (keywords.some(k => lower.includes(k))) return category;
  }
  return '調理加工食品類';
}

/**
 * チャンク分割して src/data/ に書き込む
 */
function writeChunks(items, prefix, chunkSize) {
  const total = Math.ceil(items.length / chunkSize);
  for (let i = 0; i < total; i++) {
    const chunk = items.slice(i * chunkSize, (i + 1) * chunkSize);
    const outPath = path.join(OUTPUT_DIR, `${prefix}_p${i + 1}.json`);
    fs.writeFileSync(outPath, JSON.stringify(chunk));
    const kb = Math.round(fs.statSync(outPath).size / 1024);
    console.log(`  ${prefix}_p${i + 1}.json  ${chunk.length}件  ${kb} KB`);
  }
  return total;
}

// ── MEXT 変換 ────────────────────────────────────────────────────────────────

function convertMext(food) {
  const gc  = food.generalComponents ?? {};
  const min = food.minerals          ?? {};
  const vit = food.vitamins          ?? {};
  const fat = food.fattyAcids        ?? {};
  const aa  = food.aminoAcids        ?? {};

  const foodNameStripped = stripCategory(food.foodName, food.categoryName);
  return {
    id:               'mext-' + food.foodCode,
    food_code:         food.foodCode,
    food_name:         foodNameStripped,
    food_name_en:      food.foodNameEn ?? null,
    category_name:     food.categoryName,
    source:           'mext',
    data_quality:      5,
    brand_owner:       null,
    pop:               calcMextPop(foodNameStripped),
    energy_kcal:       getVal(gc.energyKcal),
    protein_g:         getVal(gc.protein),
    fat_g:             getVal(gc.totalFat),
    carbohydrate_g:    getVal(gc.carbohydrate),
    fiber_g:           getVal(gc.dietaryFiberTotal),
    sodium_mg:         getVal(min.sodium),
    salt_equivalent_g: getVal(gc.saltEquivalent),
    cholesterol_mg:    getVal(gc.cholesterol),
    carbon_kg_per_100g: null,
    water_liter_per_100g: null,
    min: compactMapMext(min, MINERAL_KEY_MAP),
    vit: compactMapMext(vit, VITAMIN_KEY_MAP),
    fat: compactMapMext(fat, FATTY_ACID_KEY_MAP),
    aa:  compactMapMext(aa,  AMINO_ACID_KEY_MAP),
  };
}

// ── USDA 共通変換 ────────────────────────────────────────────────────────────

function convertUsda(food, source) {
  const gc  = food.generalComponents ?? {};
  const min = food.minerals          ?? {};
  const vit = food.vitamins          ?? {};
  const fat = food.fattyAcids        ?? {};
  const aa  = food.aminoAcids        ?? {};

  // カテゴリ決定
  let category_name;
  if (source === 'usda_survey') {
    category_name = inferSurveyCategory(food.foodName);
  } else {
    category_name = USDA_CATEGORY_MAP[food.usdaFoodCategory] ?? '調理加工食品類';
  }

  // データ品質スコア
  const qualityMap = { usda_foundation: 4, usda_sr_legacy: 3, usda_survey: 2 };
  const data_quality = qualityMap[source] ?? 2;

  // USDA データは MEXT と同じオブジェクト構造（scraper が統一済み）
  const isObjFormat = min.sodium && typeof min.sodium === 'object';
  const mapFn = isObjFormat ? compactMapMext : compactMapUsda;

  // generalComponents も同形式確認
  const gcSodium = gc.sodium;
  const gcIsObj = gcSodium && typeof gcSodium === 'object';
  const gcGetVal = gcIsObj ? getVal : getUsdaVal;

  return {
    id:               'usda-' + food.foodCode,
    food_code:         food.foodCode,
    food_name:         food.foodName,
    food_name_en:      food.foodNameEn ?? food.foodName ?? null,
    category_name,
    source,
    data_quality,
    brand_owner:       food.brandOwner ?? food.brandName ?? null,
    pop:               calcUsdaPop(food.foodName, data_quality),
    energy_kcal:       gcIsObj ? getVal(gc.energyKcal) : getUsdaVal(gc.energyKcal),
    protein_g:         gcIsObj ? getVal(gc.protein) : getUsdaVal(gc.protein),
    fat_g:             gcIsObj ? getVal(gc.totalFat) : getUsdaVal(gc.totalFat),
    carbohydrate_g:    gcIsObj ? getVal(gc.carbohydrate) : getUsdaVal(gc.carbohydrate),
    fiber_g:           gcIsObj ? getVal(gc.dietaryFiberTotal) : getUsdaVal(gc.dietaryFiberTotal),
    sodium_mg:         mapFn(min, { sodium: 'na' })?.na ?? null,
    salt_equivalent_g: gcIsObj ? getVal(gc.saltEquivalent) : getUsdaVal(gc.saltEquivalent),
    cholesterol_mg:    gcIsObj ? getVal(gc.cholesterol) : getUsdaVal(gc.cholesterol),
    carbon_kg_per_100g: null,
    water_liter_per_100g: null,
    min: mapFn(min, MINERAL_KEY_MAP),
    vit: mapFn(vit, VITAMIN_KEY_MAP),
    fat: mapFn(fat, FATTY_ACID_KEY_MAP),
    aa:  mapFn(aa,  AMINO_ACID_KEY_MAP),
  };
}

// ── main ─────────────────────────────────────────────────────────────────────

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

let grandTotal = 0;
let grandFiles = 0;

// ① MEXT (2,541件 → 5ファイル, 600件/ファイル)
console.log('\n[1/4] MEXT food_composition.json を処理中...');
const mextRaw = JSON.parse(fs.readFileSync(MEXT_INPUT, 'utf-8'));
console.log(`  ロード: ${mextRaw.length}件`);
const mextFoods = mextRaw.map(convertMext);
const mextChunks = writeChunks(mextFoods, 'mext_foods', 600);
grandTotal += mextFoods.length;
grandFiles += mextChunks;

// ② USDA Foundation (365件 → 1ファイル)
console.log('\n[2/4] USDA Foundation を処理中...');
const foundRaw = JSON.parse(fs.readFileSync(FOUNDATION_INPUT, 'utf-8'));
console.log(`  ロード: ${foundRaw.length}件`);
const foundFoods = foundRaw.map(f => convertUsda(f, 'usda_foundation'));
const foundChunks = writeChunks(foundFoods, 'usda_foundation', 600);
grandTotal += foundFoods.length;
grandFiles += foundChunks;

// ③ USDA SR Legacy (7,793件 → 13ファイル, 600件/ファイル)
console.log('\n[3/4] USDA SR Legacy を処理中...');
const srRaw = JSON.parse(fs.readFileSync(SR_LEGACY_INPUT, 'utf-8'));
console.log(`  ロード: ${srRaw.length}件`);
const srFoods = srRaw.map(f => convertUsda(f, 'usda_sr_legacy'));
const srChunks = writeChunks(srFoods, 'usda_sr_legacy', 600);
grandTotal += srFoods.length;
grandFiles += srChunks;

// ④ USDA Survey (5,432件 → 10ファイル, 600件/ファイル)
console.log('\n[4/4] USDA Survey を処理中...');
const surveyRaw = JSON.parse(fs.readFileSync(SURVEY_INPUT, 'utf-8'));
console.log(`  ロード: ${surveyRaw.length}件`);
const surveyFoods = surveyRaw.map(f => convertUsda(f, 'usda_survey'));
const surveyChunks = writeChunks(surveyFoods, 'usda_survey', 600);
grandTotal += surveyFoods.length;
grandFiles += surveyChunks;

// ── サマリー ─────────────────────────────────────────────────────────────────
const totalKb = fs.readdirSync(OUTPUT_DIR)
  .filter(f => f.endsWith('.json'))
  .reduce((acc, f) => acc + fs.statSync(path.join(OUTPUT_DIR, f)).size, 0);

console.log(`\n✓ 完了: ${grandTotal.toLocaleString()} 件 / ${grandFiles} ファイル`);
console.log(`  src/data/ 合計: ${Math.round(totalKb / 1024)} KB`);
