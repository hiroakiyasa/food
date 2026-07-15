// Maps USDA nutrient numbers to FoodItem section and field names.
// conversionFactor: multiply USDA value by this to get MEXT units.

export interface NutrientMappingEntry {
  section: string;
  field: string;
  unit: string;
  conversionFactor: number;
}

export const NUTRIENT_MAP: Record<string, NutrientMappingEntry> = {
  // === GeneralComponents ===
  "208": { section: "generalComponents", field: "energyKcal", unit: "kcal", conversionFactor: 1 },
  "268": { section: "generalComponents", field: "energyKJ", unit: "kJ", conversionFactor: 1 },
  "255": { section: "generalComponents", field: "water", unit: "g", conversionFactor: 1 },
  "203": { section: "generalComponents", field: "protein", unit: "g", conversionFactor: 1 },
  "204": { section: "generalComponents", field: "totalFat", unit: "g", conversionFactor: 1 },
  "205": { section: "generalComponents", field: "carbohydrate", unit: "g", conversionFactor: 1 },
  "291": { section: "generalComponents", field: "dietaryFiberTotal", unit: "g", conversionFactor: 1 },
  "207": { section: "generalComponents", field: "ash", unit: "g", conversionFactor: 1 },
  "601": { section: "generalComponents", field: "cholesterol", unit: "mg", conversionFactor: 1 },
  "221": { section: "generalComponents", field: "alcohol", unit: "g", conversionFactor: 1 },

  // === Minerals ===
  "307": { section: "minerals", field: "sodium", unit: "mg", conversionFactor: 1 },
  "306": { section: "minerals", field: "potassium", unit: "mg", conversionFactor: 1 },
  "301": { section: "minerals", field: "calcium", unit: "mg", conversionFactor: 1 },
  "304": { section: "minerals", field: "magnesium", unit: "mg", conversionFactor: 1 },
  "305": { section: "minerals", field: "phosphorus", unit: "mg", conversionFactor: 1 },
  "303": { section: "minerals", field: "iron", unit: "mg", conversionFactor: 1 },
  "309": { section: "minerals", field: "zinc", unit: "mg", conversionFactor: 1 },
  "312": { section: "minerals", field: "copper", unit: "mg", conversionFactor: 1 },
  "315": { section: "minerals", field: "manganese", unit: "mg", conversionFactor: 1 },
  "317": { section: "minerals", field: "selenium", unit: "μg", conversionFactor: 1 },

  // === Vitamins ===
  "319": { section: "vitamins", field: "retinol", unit: "μg", conversionFactor: 1 },
  "322": { section: "vitamins", field: "alphaCarotene", unit: "μg", conversionFactor: 1 },
  "321": { section: "vitamins", field: "betaCarotene", unit: "μg", conversionFactor: 1 },
  "334": { section: "vitamins", field: "betaCryptoxanthin", unit: "μg", conversionFactor: 1 },
  "320": { section: "vitamins", field: "retinolActivityEquiv", unit: "μg", conversionFactor: 1 },
  "328": { section: "vitamins", field: "vitaminD", unit: "μg", conversionFactor: 1 },
  "323": { section: "vitamins", field: "alphaTocopherol", unit: "mg", conversionFactor: 1 },
  "341": { section: "vitamins", field: "betaTocopherol", unit: "mg", conversionFactor: 1 },
  "342": { section: "vitamins", field: "gammaTocopherol", unit: "mg", conversionFactor: 1 },
  "343": { section: "vitamins", field: "deltaTocopherol", unit: "mg", conversionFactor: 1 },
  "430": { section: "vitamins", field: "vitaminK", unit: "μg", conversionFactor: 1 },
  "404": { section: "vitamins", field: "vitaminB1", unit: "mg", conversionFactor: 1 },
  "405": { section: "vitamins", field: "vitaminB2", unit: "mg", conversionFactor: 1 },
  "406": { section: "vitamins", field: "niacin", unit: "mg", conversionFactor: 1 },
  "415": { section: "vitamins", field: "vitaminB6", unit: "mg", conversionFactor: 1 },
  "418": { section: "vitamins", field: "vitaminB12", unit: "μg", conversionFactor: 1 },
  "417": { section: "vitamins", field: "folate", unit: "μg", conversionFactor: 1 },
  "410": { section: "vitamins", field: "pantothenicAcid", unit: "mg", conversionFactor: 1 },
  "416": { section: "vitamins", field: "biotin", unit: "μg", conversionFactor: 1 },
  "401": { section: "vitamins", field: "vitaminC", unit: "mg", conversionFactor: 1 },

  // === AminoAcids (USDA=g → MEXT=mg, ×1000) ===
  "503": { section: "aminoAcids", field: "isoleucine", unit: "mg", conversionFactor: 1000 },
  "504": { section: "aminoAcids", field: "leucine", unit: "mg", conversionFactor: 1000 },
  "505": { section: "aminoAcids", field: "lysine", unit: "mg", conversionFactor: 1000 },
  "506": { section: "aminoAcids", field: "methionine", unit: "mg", conversionFactor: 1000 },
  "507": { section: "aminoAcids", field: "cystine", unit: "mg", conversionFactor: 1000 },
  "508": { section: "aminoAcids", field: "phenylalanine", unit: "mg", conversionFactor: 1000 },
  "509": { section: "aminoAcids", field: "tyrosine", unit: "mg", conversionFactor: 1000 },
  "502": { section: "aminoAcids", field: "threonine", unit: "mg", conversionFactor: 1000 },
  "501": { section: "aminoAcids", field: "tryptophan", unit: "mg", conversionFactor: 1000 },
  "510": { section: "aminoAcids", field: "valine", unit: "mg", conversionFactor: 1000 },
  "512": { section: "aminoAcids", field: "histidine", unit: "mg", conversionFactor: 1000 },
  "511": { section: "aminoAcids", field: "arginine", unit: "mg", conversionFactor: 1000 },
  "513": { section: "aminoAcids", field: "alanine", unit: "mg", conversionFactor: 1000 },
  "514": { section: "aminoAcids", field: "asparticAcid", unit: "mg", conversionFactor: 1000 },
  "515": { section: "aminoAcids", field: "glutamicAcid", unit: "mg", conversionFactor: 1000 },
  "516": { section: "aminoAcids", field: "glycine", unit: "mg", conversionFactor: 1000 },
  "517": { section: "aminoAcids", field: "proline", unit: "mg", conversionFactor: 1000 },
  "518": { section: "aminoAcids", field: "serine", unit: "mg", conversionFactor: 1000 },
  "521": { section: "aminoAcids", field: "hydroxyproline", unit: "mg", conversionFactor: 1000 },

  // === FattyAcids — totals (g, no conversion) ===
  "606": { section: "fattyAcids", field: "saturatedTotal", unit: "g", conversionFactor: 1 },
  "645": { section: "fattyAcids", field: "monounsaturatedTotal", unit: "g", conversionFactor: 1 },
  "646": { section: "fattyAcids", field: "polyunsaturatedTotal", unit: "g", conversionFactor: 1 },

  // === FattyAcids — individual (USDA=g → MEXT=mg, ×1000) ===
  "607": { section: "fattyAcids", field: "butyricAcid", unit: "mg", conversionFactor: 1000 },
  "608": { section: "fattyAcids", field: "hexanoicAcid", unit: "mg", conversionFactor: 1000 },
  "609": { section: "fattyAcids", field: "octanoicAcid", unit: "mg", conversionFactor: 1000 },
  "610": { section: "fattyAcids", field: "decanoicAcid", unit: "mg", conversionFactor: 1000 },
  "611": { section: "fattyAcids", field: "lauricAcid", unit: "mg", conversionFactor: 1000 },
  "612": { section: "fattyAcids", field: "myristicAcid", unit: "mg", conversionFactor: 1000 },
  "613": { section: "fattyAcids", field: "palmiticAcid", unit: "mg", conversionFactor: 1000 },
  "614": { section: "fattyAcids", field: "stearicAcid", unit: "mg", conversionFactor: 1000 },
  "615": { section: "fattyAcids", field: "arachidicAcid", unit: "mg", conversionFactor: 1000 },
  "624": { section: "fattyAcids", field: "behenicAcid", unit: "mg", conversionFactor: 1000 },
  "626": { section: "fattyAcids", field: "palmitoleicAcid", unit: "mg", conversionFactor: 1000 },
  "617": { section: "fattyAcids", field: "oleicAcid", unit: "mg", conversionFactor: 1000 },
  "628": { section: "fattyAcids", field: "eicosenoicAcid", unit: "mg", conversionFactor: 1000 },
  "630": { section: "fattyAcids", field: "erucicAcid", unit: "mg", conversionFactor: 1000 },
  "618": { section: "fattyAcids", field: "linoleicAcid", unit: "mg", conversionFactor: 1000 },
  "619": { section: "fattyAcids", field: "alphaLinolenicAcid", unit: "mg", conversionFactor: 1000 },
  "620": { section: "fattyAcids", field: "arachidonicAcid", unit: "mg", conversionFactor: 1000 },
  "629": { section: "fattyAcids", field: "eicosapentaenoicAcid", unit: "mg", conversionFactor: 1000 },
  "631": { section: "fattyAcids", field: "docosapentaenoicN3Acid", unit: "mg", conversionFactor: 1000 },
  "621": { section: "fattyAcids", field: "docosahexaenoicAcid", unit: "mg", conversionFactor: 1000 },

  // === CarbohydrateDetails ===
  "209": { section: "carbohydrateDetails", field: "starch", unit: "g", conversionFactor: 1 },
  "211": { section: "carbohydrateDetails", field: "glucose", unit: "g", conversionFactor: 1 },
  "212": { section: "carbohydrateDetails", field: "fructose", unit: "g", conversionFactor: 1 },
  "287": { section: "carbohydrateDetails", field: "galactose", unit: "g", conversionFactor: 1 },
  "210": { section: "carbohydrateDetails", field: "sucrose", unit: "g", conversionFactor: 1 },
  "214": { section: "carbohydrateDetails", field: "maltose", unit: "g", conversionFactor: 1 },
  "213": { section: "carbohydrateDetails", field: "lactose", unit: "g", conversionFactor: 1 },
};

// Set of all mapped nutrient numbers for quick lookup
export const MAPPED_NUTRIENT_NUMBERS = new Set(Object.keys(NUTRIENT_MAP));
