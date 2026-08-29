/**
 * Bidirectional mapping between full nutrient keys and shortened DB keys.
 * Used to compress JSONB storage in food_items.minerals / food_items.vitamins.
 *
 * Convention: short keys are 2-4 chars. Full keys match scraper FoodItem types.
 */

// --- Minerals (13 keys) ---

export const MINERAL_KEY_MAP: Record<string, string> = {
  sodium: 'na',
  potassium: 'k',
  calcium: 'ca',
  magnesium: 'mg_',
  phosphorus: 'p',
  iron: 'fe',
  zinc: 'zn',
  copper: 'cu',
  manganese: 'mn',
  iodine: 'i',
  selenium: 'se',
  chromium: 'cr',
  molybdenum: 'mo',
};

// --- Vitamins (22 keys) ---

export const VITAMIN_KEY_MAP: Record<string, string> = {
  retinol: 'ret',
  alphaCarotene: 'acar',
  betaCarotene: 'bcar',
  betaCryptoxanthin: 'bcry',
  betaCaroteneEquiv: 'bce',
  retinolActivityEquiv: 'rae',
  vitaminD: 'vd',
  alphaTocopherol: 'at',
  betaTocopherol: 'bt',
  gammaTocopherol: 'gt',
  deltaTocopherol: 'dt',
  vitaminK: 'vk',
  vitaminB1: 'b1',
  vitaminB2: 'b2',
  niacin: 'nia',
  niacinEquiv: 'nie',
  vitaminB6: 'b6',
  vitaminB12: 'b12',
  folate: 'fol',
  pantothenicAcid: 'pa',
  biotin: 'bio',
  vitaminC: 'vc',
};

// --- Fatty acids (45 species) ---

export const FATTY_ACID_KEY_MAP: Record<string, string> = {
  saturatedTotal: 'sfa', monounsaturatedTotal: 'mufa', polyunsaturatedTotal: 'pufa',
  n3PolyunsaturatedTotal: 'n3', n6PolyunsaturatedTotal: 'n6',
  transFattyAcid: 'trans', fattyAcidTotal: 'fat',
  heptanoicAcid: 'c7', butyricAcid: 'c4', hexanoicAcid: 'c6',
  octanoicAcid: 'c8', decanoicAcid: 'c10', lauricAcid: 'c12',
  tridecanoicAcid: 'c13', myristicAcid: 'c14', pentadecanoicAcid: 'c15',
  palmiticAcid: 'c16', heptadecanoicAcid: 'c17', stearicAcid: 'c18',
  arachidocAcid: 'c20', behenicAcid: 'c22', lignocericAcid: 'c24',
  anteisoC15: 'ac15',
  myristoleicAcid: 'c141', pentadecenoicAcid: 'c151', palmitoleicAcid: 'c161',
  heptadecenoicAcid: 'c171', oleicAcid: 'c181', gondoicAcid: 'c201',
  erucicAcid: 'eru', nervicAcid: 'ner',
  linoleicAcid: 'c182', gammaLinolenicAcid: 'gla', alphaLinolenicAcid: 'c183n3',
  eicosadienoicAcid: 'c202', eicosatrienoicAcidN3: 'c203n3',
  eicosatrienoicAcidN9: 'c203n9', arachidonicAcid: 'c204n6',
  eicosapentaenoicAcid: 'epa', docosapentaenoicAcidN3: 'dpa_n3',
  docosapentaenoicAcidN6: 'dpa_n6', docosahexaenoicAcid: 'dha',
};

// --- Amino acids (25 species) ---

export const AMINO_ACID_KEY_MAP: Record<string, string> = {
  isoleucine: 'ile', leucine: 'leu', lysine: 'lys', methionine: 'met',
  cystine: 'cys', phenylalanine: 'phe', tyrosine: 'tyr', threonine: 'thr',
  tryptophan: 'trp', valine: 'val', histidine: 'his', arginine: 'arg',
  alanine: 'ala', asparticAcid: 'asp', glutamicAcid: 'glu', glycine: 'gly',
  proline: 'pro', serine: 'ser', hydroxyproline: 'hyp',
};

// --- General components ---

export const GENERAL_KEY_MAP: Record<string, string> = {
  water: 'h2o', cholesterol: 'cho', ash: 'ash', alcohol: 'alc',
};

// --- Additional nutrients (ext section, USDA only) ---

export const ADDITIONAL_NUTRIENT_KEY_MAP: Record<string, string> = {
  'usda_338_Lutein___zeaxanthin': 'lut',
  'usda_337_Lycopene': 'lyc',
  'usda_421_Choline__total': 'cho2',
  'usda_454_Betaine': 'bet',
};

// --- Reverse maps ---

export const MINERAL_SHORT_TO_FULL: Record<string, string> = Object.fromEntries(
  Object.entries(MINERAL_KEY_MAP).map(([full, short]) => [short, full]),
);

export const VITAMIN_SHORT_TO_FULL: Record<string, string> = Object.fromEntries(
  Object.entries(VITAMIN_KEY_MAP).map(([full, short]) => [short, full]),
);

// --- Helper: extract numeric value from compressed JSONB ---

/**
 * Extracts a nutrient value from a compressed JSONB object.
 * The JSONB stores `{ shortKey: number | null }` after compaction.
 *
 * @param json - The JSONB column value (minerals or vitamins)
 * @param shortKey - The short key (e.g. 'ca', 'b1')
 * @returns The numeric value or null
 */
export function extractCompactValue(
  json: unknown,
  shortKey: string,
): number | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const record = json as Record<string, unknown>;
  const v = record[shortKey];
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  return null;
}

// --- Display key → short Storage key (for all sections) ---

/**
 * Maps human-readable display keys to the short keys used in Storage JSON.
 * Section prefix: min=ミネラル, vit=ビタミン, fat=脂肪酸, aa=アミノ酸, g=一般成分, ext=特殊
 */
export const DISPLAY_TO_SHORT_KEY: Record<string, string> = {
  // ミネラル (13)
  sodium_mg: 'na', potassium_mg: 'k', calcium_mg: 'ca', magnesium_mg: 'mg_',
  phosphorus_mg: 'p', iron_mg: 'fe', zinc_mg: 'zn', copper_mg: 'cu',
  manganese_mg: 'mn', iodine_ug: 'i', selenium_ug: 'se', chromium_ug: 'cr',
  molybdenum_ug: 'mo',
  // ビタミン (22)
  retinol_ug: 'ret', retinol_activity_equiv_ug: 'rae', alpha_carotene_ug: 'acar',
  beta_carotene_ug: 'bcar', beta_cryptoxanthin_ug: 'bcry', beta_carotene_equiv_ug: 'bce',
  vitamin_d_ug: 'vd', alpha_tocopherol_mg: 'at', beta_tocopherol_mg: 'bt',
  gamma_tocopherol_mg: 'gt', delta_tocopherol_mg: 'dt', vitamin_k_ug: 'vk',
  vitamin_b1_mg: 'b1', vitamin_b2_mg: 'b2', niacin_mg: 'nia', niacin_equiv_mg: 'nie',
  vitamin_b6_mg: 'b6', vitamin_b12_ug: 'b12', folate_ug: 'fol',
  pantothenic_acid_mg: 'pa', biotin_ug: 'bio', vitamin_c_mg: 'vc',
  // 脂肪酸 (主要)
  saturated_total_g: 'sfa', monounsaturated_total_g: 'mufa',
  polyunsaturated_total_g: 'pufa', n3_polyunsaturated_total_g: 'n3',
  n6_polyunsaturated_total_g: 'n6', trans_fat_g: 'trans',
  linoleic_acid_mg: 'c182', alpha_linolenic_acid_mg: 'c183n3',
  gamma_linolenic_acid_mg: 'gla', arachidonic_acid_mg: 'c204n6',
  eicosapentaenoic_acid_mg: 'epa', docosapentaenoic_acid_n3_mg: 'dpa_n3',
  docosahexaenoic_acid_mg: 'dha', oleic_acid_mg: 'c181',
  palmitic_acid_mg: 'c16', stearic_acid_mg: 'c18',
  // アミノ酸 (主要)
  isoleucine_mg: 'ile', leucine_mg: 'leu', valine_mg: 'val', lysine_mg: 'lys',
  methionine_mg: 'met', phenylalanine_mg: 'phe', threonine_mg: 'thr',
  tryptophan_mg: 'trp', histidine_mg: 'his', glycine_mg: 'gly',
  arginine_mg: 'arg', alanine_mg: 'ala', glutamic_acid_mg: 'glu',
  // 一般成分 (g セクション)
  water_g: 'h2o', cholesterol_mg: 'cho', ash_g: 'ash', alcohol_g: 'alc',
  // 特殊栄養素 (ext セクション)
  lutein_zeaxanthin_ug: 'lut', lycopene_ug: 'lyc', choline_mg: 'cho2', betaine_mg: 'bet',
};

// --- Mapping from app nutrient keys to short JSONB keys ---

/**
 * Maps the `foodItemJsonKey` used in NUTRIENT_DEFINITIONS to
 * { column: 'minerals' | 'vitamins' | 'fatty_acids', shortKey: string }.
 */
export const NUTRIENT_TO_COMPACT: Record<
  string,
  { column: 'minerals' | 'vitamins'; shortKey: string }
> = {
  calcium: { column: 'minerals', shortKey: 'ca' },
  iron: { column: 'minerals', shortKey: 'fe' },
  potassium: { column: 'minerals', shortKey: 'k' },
  sodium: { column: 'minerals', shortKey: 'na' },
  magnesium: { column: 'minerals', shortKey: 'mg_' },
  phosphorus: { column: 'minerals', shortKey: 'p' },
  zinc: { column: 'minerals', shortKey: 'zn' },
  copper: { column: 'minerals', shortKey: 'cu' },
  manganese: { column: 'minerals', shortKey: 'mn' },
  iodine: { column: 'minerals', shortKey: 'i' },
  selenium: { column: 'minerals', shortKey: 'se' },
  chromium: { column: 'minerals', shortKey: 'cr' },
  molybdenum: { column: 'minerals', shortKey: 'mo' },
  retinolActivityEquiv: { column: 'vitamins', shortKey: 'rae' },
  alphaTocopherol: { column: 'vitamins', shortKey: 'at' },
  vitaminB1: { column: 'vitamins', shortKey: 'b1' },
  vitaminB2: { column: 'vitamins', shortKey: 'b2' },
  vitaminC: { column: 'vitamins', shortKey: 'vc' },
  vitaminD: { column: 'vitamins', shortKey: 'vd' },
  vitaminK: { column: 'vitamins', shortKey: 'vk' },
  vitaminB6: { column: 'vitamins', shortKey: 'b6' },
  vitaminB12: { column: 'vitamins', shortKey: 'b12' },
  folate: { column: 'vitamins', shortKey: 'fol' },
  niacin: { column: 'vitamins', shortKey: 'nia' },
  pantothenicAcid: { column: 'vitamins', shortKey: 'pa' },
  biotin: { column: 'vitamins', shortKey: 'bio' },
};
