/**
 * Shortened key mappings for JSONB compression.
 * Must stay in sync with src/lib/nutrientKeyMapping.ts.
 */

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

// Amino acids shortened keys (for food_item_details)
export const AMINO_ACID_KEY_MAP: Record<string, string> = {
  isoleucine: 'ile',
  leucine: 'leu',
  lysine: 'lys',
  methionine: 'met',
  cystine: 'cys',
  sulfurAminoAcidTotal: 'saa',
  phenylalanine: 'phe',
  tyrosine: 'tyr',
  aromaticAminoAcidTotal: 'aaa',
  threonine: 'thr',
  tryptophan: 'trp',
  valine: 'val',
  histidine: 'his',
  arginine: 'arg',
  alanine: 'ala',
  asparticAcid: 'asp',
  glutamicAcid: 'glu',
  glycine: 'gly',
  proline: 'pro',
  serine: 'ser',
  hydroxyproline: 'hyp',
  aminoAcidTotal: 'tot',
  ammonia: 'nh3',
  water: 'h2o',
  aminoAcidBasedProtein: 'aap',
  protein: 'prot',
};

// Fatty acid shortened keys — 45 species (extended from 20)
export const FATTY_ACID_KEY_MAP: Record<string, string> = {
  // Totals
  saturatedTotal: 'sfa',
  monounsaturatedTotal: 'mufa',
  polyunsaturatedTotal: 'pufa',
  n3PolyunsaturatedTotal: 'n3',
  n6PolyunsaturatedTotal: 'n6',
  transFattyAcid: 'trans',
  fattyAcidTotal: 'fat',
  // Individual SFAs
  heptanoicAcid: 'c7',
  butyricAcid: 'c4',
  hexanoicAcid: 'c6',
  octanoicAcid: 'c8',
  decanoicAcid: 'c10',
  lauricAcid: 'c12',
  tridecanoicAcid: 'c13',
  myristicAcid: 'c14',
  pentadecanoicAcid: 'c15',
  palmiticAcid: 'c16',
  heptadecanoicAcid: 'c17',
  stearicAcid: 'c18',
  arachidocAcid: 'c20',
  behenicAcid: 'c22',
  lignocericAcid: 'c24',
  anteisoC15: 'ac15',
  // MUFAs
  myristoleicAcid: 'c141',
  pentadecenoicAcid: 'c151',
  palmitoleicAcid: 'c161',
  heptadecenoicAcid: 'c171',
  oleicAcid: 'c181',
  gondoicAcid: 'c201',
  erucicAcid: 'eru',
  nervicAcid: 'ner',
  // PUFAs
  linoleicAcid: 'c182',
  gammaLinolenicAcid: 'gla',
  alphaLinolenicAcid: 'c183n3',
  eicosadienoicAcid: 'c202',
  eicosatrienoicAcidN3: 'c203n3',
  eicosatrienoicAcidN9: 'c203n9',
  arachidonicAcid: 'c204n6',
  eicosapentaenoicAcid: 'epa',
  docosapentaenoicAcidN3: 'dpa_n3',
  docosapentaenoicAcidN6: 'dpa_n6',
  docosahexaenoicAcid: 'dha',
};

// General component shortened keys (water, cholesterol, ash, alcohol)
export const GENERAL_KEY_MAP: Record<string, string> = {
  water: 'h2o',
  cholesterol: 'cho',
  ash: 'ash',
  alcohol: 'alc',
};

// Additional nutrients from USDA additionalNutrients field
export const ADDITIONAL_NUTRIENT_KEY_MAP: Record<string, string> = {
  'usda_338_Lutein___zeaxanthin': 'lut',
  'usda_337_Lycopene': 'lyc',
  'usda_421_Choline__total': 'cho2',
  'usda_454_Betaine': 'bet',
};
