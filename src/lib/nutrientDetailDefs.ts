// Nutrient detail section definitions for collapsible display

import { DISPLAY_TO_SHORT_KEY } from '@/src/lib/nutrientKeyMapping';

export interface NutrientItemDef {
  /** Display key — used to look up short key via DISPLAY_TO_SHORT_KEY */
  jsonKey: string;
  nameJa: string;
  unit: string;
  order: number;
}

export interface NutrientSection {
  key: string;
  title: string;
  /** Storage section: 'min' | 'vit' | 'fat' | 'aa' | 'g' | 'ext' */
  storageSection: 'min' | 'vit' | 'fat' | 'aa' | 'g' | 'ext';
  paletteKey: 'minerals' | 'vitamins' | 'fattyAcids' | 'aminoAcids';
  items: NutrientItemDef[];
}

export interface DynamicNutrientSection {
  key: string;
  title: string;
  /** Storage detail section key: 'org' | 'cho_d' | 'fib_d' | 'add' */
  detailSection: 'org' | 'cho_d' | 'fib_d' | 'add';
  /** Uses minerals color as default for detail sections */
  paletteKey: 'minerals';
  items: DynamicNutrientItemDef[];
}

export interface DynamicNutrientItemDef {
  /** Raw key as stored in detail JSON */
  rawKey: string;
  nameJa: string;
  unit: string;
  order: number;
}

export const NUTRIENT_SECTIONS: NutrientSection[] = [
  {
    key: 'minerals',
    title: 'ミネラル',
    storageSection: 'min',
    paletteKey: 'minerals',
    items: [
      { jsonKey: 'sodium_mg', nameJa: 'ナトリウム', unit: 'mg', order: 1 },
      { jsonKey: 'potassium_mg', nameJa: 'カリウム', unit: 'mg', order: 2 },
      { jsonKey: 'calcium_mg', nameJa: 'カルシウム', unit: 'mg', order: 3 },
      { jsonKey: 'magnesium_mg', nameJa: 'マグネシウム', unit: 'mg', order: 4 },
      { jsonKey: 'phosphorus_mg', nameJa: 'リン', unit: 'mg', order: 5 },
      { jsonKey: 'iron_mg', nameJa: '鉄', unit: 'mg', order: 6 },
      { jsonKey: 'zinc_mg', nameJa: '亜鉛', unit: 'mg', order: 7 },
      { jsonKey: 'copper_mg', nameJa: '銅', unit: 'mg', order: 8 },
      { jsonKey: 'manganese_mg', nameJa: 'マンガン', unit: 'mg', order: 9 },
      { jsonKey: 'iodine_ug', nameJa: 'ヨウ素', unit: 'µg', order: 10 },
      { jsonKey: 'selenium_ug', nameJa: 'セレン', unit: 'µg', order: 11 },
      { jsonKey: 'chromium_ug', nameJa: 'クロム', unit: 'µg', order: 12 },
      { jsonKey: 'molybdenum_ug', nameJa: 'モリブデン', unit: 'µg', order: 13 },
    ],
  },
  {
    key: 'vitamins',
    title: 'ビタミン',
    storageSection: 'vit',
    paletteKey: 'vitamins',
    items: [
      { jsonKey: 'retinol_ug', nameJa: 'レチノール', unit: 'µg', order: 1 },
      { jsonKey: 'beta_carotene_equiv_ug', nameJa: 'β-カロテン当量', unit: 'µg', order: 2 },
      { jsonKey: 'retinol_activity_equiv_ug', nameJa: 'レチノール活性当量', unit: 'µgRAE', order: 3 },
      { jsonKey: 'vitamin_d_ug', nameJa: 'ビタミンD', unit: 'µg', order: 4 },
      { jsonKey: 'alpha_tocopherol_mg', nameJa: 'α-トコフェロール', unit: 'mg', order: 5 },
      { jsonKey: 'vitamin_k_ug', nameJa: 'ビタミンK', unit: 'µg', order: 6 },
      { jsonKey: 'vitamin_b1_mg', nameJa: 'ビタミンB1', unit: 'mg', order: 7 },
      { jsonKey: 'vitamin_b2_mg', nameJa: 'ビタミンB2', unit: 'mg', order: 8 },
      { jsonKey: 'niacin_mg', nameJa: 'ナイアシン', unit: 'mg', order: 9 },
      { jsonKey: 'niacin_equiv_mg', nameJa: 'ナイアシン当量', unit: 'mg', order: 10 },
      { jsonKey: 'vitamin_b6_mg', nameJa: 'ビタミンB6', unit: 'mg', order: 11 },
      { jsonKey: 'vitamin_b12_ug', nameJa: 'ビタミンB12', unit: 'µg', order: 12 },
      { jsonKey: 'folate_ug', nameJa: '葉酸', unit: 'µg', order: 13 },
      { jsonKey: 'pantothenic_acid_mg', nameJa: 'パントテン酸', unit: 'mg', order: 14 },
      { jsonKey: 'biotin_ug', nameJa: 'ビオチン', unit: 'µg', order: 15 },
      { jsonKey: 'vitamin_c_mg', nameJa: 'ビタミンC', unit: 'mg', order: 16 },
    ],
  },
  {
    key: 'fattyAcids',
    title: '脂肪酸',
    storageSection: 'fat',
    paletteKey: 'fattyAcids',
    items: [
      { jsonKey: 'saturated_total_g', nameJa: '飽和脂肪酸', unit: 'g', order: 1 },
      { jsonKey: 'monounsaturated_total_g', nameJa: '一価不飽和脂肪酸', unit: 'g', order: 2 },
      { jsonKey: 'polyunsaturated_total_g', nameJa: '多価不飽和脂肪酸', unit: 'g', order: 3 },
      { jsonKey: 'n3_polyunsaturated_total_g', nameJa: 'n-3系多価不飽和', unit: 'g', order: 4 },
      { jsonKey: 'n6_polyunsaturated_total_g', nameJa: 'n-6系多価不飽和', unit: 'g', order: 5 },
      { jsonKey: 'trans_fat_g', nameJa: 'トランス脂肪酸', unit: 'g', order: 6 },
      { jsonKey: 'linoleic_acid_mg', nameJa: 'リノール酸', unit: 'mg', order: 7 },
      { jsonKey: 'alpha_linolenic_acid_mg', nameJa: 'α-リノレン酸', unit: 'mg', order: 8 },
      { jsonKey: 'eicosapentaenoic_acid_mg', nameJa: 'EPA', unit: 'mg', order: 9 },
      { jsonKey: 'docosapentaenoic_acid_n3_mg', nameJa: 'DPA (n-3)', unit: 'mg', order: 10 },
      { jsonKey: 'docosahexaenoic_acid_mg', nameJa: 'DHA', unit: 'mg', order: 11 },
      { jsonKey: 'arachidonic_acid_mg', nameJa: 'アラキドン酸', unit: 'mg', order: 12 },
      { jsonKey: 'gamma_linolenic_acid_mg', nameJa: 'γ-リノレン酸', unit: 'mg', order: 13 },
      { jsonKey: 'oleic_acid_mg', nameJa: 'オレイン酸 (C18:1)', unit: 'mg', order: 14 },
    ],
  },
  {
    key: 'aminoAcids',
    title: 'アミノ酸',
    storageSection: 'aa',
    paletteKey: 'aminoAcids',
    items: [
      { jsonKey: 'isoleucine_mg', nameJa: 'イソロイシン', unit: 'mg', order: 1 },
      { jsonKey: 'leucine_mg', nameJa: 'ロイシン', unit: 'mg', order: 2 },
      { jsonKey: 'lysine_mg', nameJa: 'リシン', unit: 'mg', order: 3 },
      { jsonKey: 'methionine_mg', nameJa: 'メチオニン', unit: 'mg', order: 4 },
      { jsonKey: 'phenylalanine_mg', nameJa: 'フェニルアラニン', unit: 'mg', order: 5 },
      { jsonKey: 'threonine_mg', nameJa: 'スレオニン', unit: 'mg', order: 6 },
      { jsonKey: 'tryptophan_mg', nameJa: 'トリプトファン', unit: 'mg', order: 7 },
      { jsonKey: 'valine_mg', nameJa: 'バリン', unit: 'mg', order: 8 },
      { jsonKey: 'histidine_mg', nameJa: 'ヒスチジン', unit: 'mg', order: 9 },
      { jsonKey: 'glycine_mg', nameJa: 'グリシン', unit: 'mg', order: 10 },
      { jsonKey: 'arginine_mg', nameJa: 'アルギニン', unit: 'mg', order: 11 },
      { jsonKey: 'alanine_mg', nameJa: 'アラニン', unit: 'mg', order: 12 },
      { jsonKey: 'glutamic_acid_mg', nameJa: 'グルタミン酸', unit: 'mg', order: 13 },
    ],
  },
];

/** Dynamic sections from detail Storage (org/cho_d/fib_d/add) */
export const DYNAMIC_NUTRIENT_SECTIONS: DynamicNutrientSection[] = [
  {
    key: 'organicAcids',
    title: '有機酸',
    detailSection: 'org',
    paletteKey: 'minerals',
    items: [
      { rawKey: 'citric_acid', nameJa: 'クエン酸', unit: 'g', order: 1 },
      { rawKey: 'malic_acid', nameJa: 'リンゴ酸', unit: 'g', order: 2 },
      { rawKey: 'lactic_acid', nameJa: '乳酸', unit: 'g', order: 3 },
      { rawKey: 'acetic_acid', nameJa: '酢酸', unit: 'g', order: 4 },
      { rawKey: 'oxalic_acid', nameJa: 'シュウ酸', unit: 'g', order: 5 },
      { rawKey: 'succinic_acid', nameJa: 'コハク酸', unit: 'g', order: 6 },
    ],
  },
  {
    key: 'carbohydrateDetails',
    title: '糖質内訳',
    detailSection: 'cho_d',
    paletteKey: 'minerals',
    items: [
      { rawKey: 'glucose', nameJa: 'ブドウ糖', unit: 'g', order: 1 },
      { rawKey: 'fructose', nameJa: '果糖', unit: 'g', order: 2 },
      { rawKey: 'sucrose', nameJa: 'ショ糖', unit: 'g', order: 3 },
      { rawKey: 'maltose', nameJa: '麦芽糖', unit: 'g', order: 4 },
      { rawKey: 'lactose', nameJa: '乳糖', unit: 'g', order: 5 },
      { rawKey: 'starch', nameJa: 'でんぷん', unit: 'g', order: 6 },
      { rawKey: 'fructan', nameJa: 'フルクタン', unit: 'g', order: 7 },
      { rawKey: 'sorbitol', nameJa: 'ソルビトール', unit: 'g', order: 8 },
    ],
  },
  {
    key: 'dietaryFiber',
    title: '食物繊維内訳',
    detailSection: 'fib_d',
    paletteKey: 'minerals',
    items: [
      { rawKey: 'soluble', nameJa: '水溶性食物繊維', unit: 'g', order: 1 },
      { rawKey: 'insoluble', nameJa: '不溶性食物繊維', unit: 'g', order: 2 },
      { rawKey: 'beta_glucan', nameJa: 'β-グルカン', unit: 'g', order: 3 },
    ],
  },
  {
    key: 'additionalNutrients',
    title: '特殊栄養素',
    detailSection: 'add',
    paletteKey: 'minerals',
    items: [
      { rawKey: 'isoflavones', nameJa: 'イソフラボン', unit: 'mg', order: 1 },
      { rawKey: 'purines', nameJa: 'プリン体', unit: 'mg', order: 2 },
      { rawKey: 'gaba', nameJa: 'GABA', unit: 'mg', order: 3 },
      { rawKey: 'caffeine', nameJa: 'カフェイン', unit: 'mg', order: 4 },
      { rawKey: 'plant_sterols', nameJa: '植物ステロール', unit: 'mg', order: 5 },
      { rawKey: 'taurine', nameJa: 'タウリン', unit: 'mg', order: 6 },
    ],
  },
];

/**
 * Looks up the short Storage key for a display key.
 * Falls back to the display key itself if not found.
 */
export function displayKeyToShortKey(displayKey: string): string | undefined {
  return DISPLAY_TO_SHORT_KEY[displayKey];
}

/**
 * Looks up a nutrient value from the Storage nutrients object.
 * Handles section routing (min/vit/fat/aa/g/ext) via displayKey.
 */
export function lookupNutrientValue(
  nutrients: {
    min?: Record<string, number>;
    vit?: Record<string, number>;
    fat?: Record<string, number>;
    aa?: Record<string, number>;
    g?: Record<string, number>;
    ext?: Record<string, number>;
  } | null | undefined,
  section: NutrientSection,
  displayKey: string,
): number | null {
  if (!nutrients) return null;
  const shortKey = DISPLAY_TO_SHORT_KEY[displayKey];
  if (!shortKey) return null;

  const sectionData = nutrients[section.storageSection];
  if (!sectionData) return null;

  const val = sectionData[shortKey];
  return typeof val === 'number' ? val : null;
}

/** Count non-null items in a Storage section for a given section definition */
export function countNutrientItems(
  sectionDef: NutrientSection,
  nutrientsData: {
    min?: Record<string, number>;
    vit?: Record<string, number>;
    fat?: Record<string, number>;
    aa?: Record<string, number>;
    g?: Record<string, number>;
    ext?: Record<string, number>;
  } | null | undefined,
): number {
  if (!nutrientsData) return 0;
  const sectionData = nutrientsData[sectionDef.storageSection];
  if (!sectionData) return 0;
  return sectionDef.items.filter((item) => {
    const shortKey = DISPLAY_TO_SHORT_KEY[item.jsonKey];
    return shortKey !== undefined && sectionData[shortKey] != null;
  }).length;
}
