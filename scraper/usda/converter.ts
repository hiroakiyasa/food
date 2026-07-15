import type { NutrientEntry, FoodItem, GeneralComponents, Minerals, Vitamins, AminoAcids, FattyAcids, CarbohydrateDetails } from "../types.js";
import type { UsdaFood, UsdaSourceType } from "./types.js";
import type { DatasetConfig } from "./config.js";
import { NUTRIENT_MAP, MAPPED_NUTRIENT_NUMBERS } from "./nutrientMapping.js";

function makeNutrientEntry(value: number | null, unit: string): NutrientEntry {
  return { value, estimated: false, trace: false, unit };
}

function nullEntry(unit: string): NutrientEntry {
  return { value: null, estimated: false, trace: false, unit };
}

// Default section creators with all fields set to null
function defaultGeneralComponents(): GeneralComponents {
  return {
    wastePercentage: nullEntry("%"),
    energyKcal: nullEntry("kcal"),
    energyKJ: nullEntry("kJ"),
    water: nullEntry("g"),
    aminoAcidBasedProtein: nullEntry("g"),
    protein: nullEntry("g"),
    triacylglycerolEquivalent: nullEntry("g"),
    cholesterol: nullEntry("mg"),
    totalFat: nullEntry("g"),
    availableCarbohydrateMonosaccharideEquiv: nullEntry("g"),
    availableCarbohydrateMass: nullEntry("g"),
    availableCarbohydrateByDifference: nullEntry("g"),
    dietaryFiberTotal: nullEntry("g"),
    sugarAlcohol: nullEntry("g"),
    carbohydrate: nullEntry("g"),
    organicAcid: nullEntry("g"),
    ash: nullEntry("g"),
    alcohol: nullEntry("g"),
    saltEquivalent: nullEntry("g"),
  };
}

function defaultMinerals(): Minerals {
  return {
    sodium: nullEntry("mg"),
    potassium: nullEntry("mg"),
    calcium: nullEntry("mg"),
    magnesium: nullEntry("mg"),
    phosphorus: nullEntry("mg"),
    iron: nullEntry("mg"),
    zinc: nullEntry("mg"),
    copper: nullEntry("mg"),
    manganese: nullEntry("mg"),
    iodine: nullEntry("μg"),
    selenium: nullEntry("μg"),
    chromium: nullEntry("μg"),
    molybdenum: nullEntry("μg"),
  };
}

function defaultVitamins(): Vitamins {
  return {
    retinol: nullEntry("μg"),
    alphaCarotene: nullEntry("μg"),
    betaCarotene: nullEntry("μg"),
    betaCryptoxanthin: nullEntry("μg"),
    betaCaroteneEquiv: nullEntry("μg"),
    retinolActivityEquiv: nullEntry("μg"),
    vitaminD: nullEntry("μg"),
    alphaTocopherol: nullEntry("mg"),
    betaTocopherol: nullEntry("mg"),
    gammaTocopherol: nullEntry("mg"),
    deltaTocopherol: nullEntry("mg"),
    vitaminK: nullEntry("μg"),
    vitaminB1: nullEntry("mg"),
    vitaminB2: nullEntry("mg"),
    niacin: nullEntry("mg"),
    niacinEquiv: nullEntry("mg"),
    vitaminB6: nullEntry("mg"),
    vitaminB12: nullEntry("μg"),
    folate: nullEntry("μg"),
    pantothenicAcid: nullEntry("mg"),
    biotin: nullEntry("μg"),
    vitaminC: nullEntry("mg"),
  };
}

function defaultAminoAcids(): AminoAcids {
  return {
    water: nullEntry("g"),
    aminoAcidBasedProtein: nullEntry("g"),
    protein: nullEntry("g"),
    isoleucine: nullEntry("mg"),
    leucine: nullEntry("mg"),
    lysine: nullEntry("mg"),
    methionine: nullEntry("mg"),
    cystine: nullEntry("mg"),
    sulfurAminoAcidTotal: nullEntry("mg"),
    phenylalanine: nullEntry("mg"),
    tyrosine: nullEntry("mg"),
    aromaticAminoAcidTotal: nullEntry("mg"),
    threonine: nullEntry("mg"),
    tryptophan: nullEntry("mg"),
    valine: nullEntry("mg"),
    histidine: nullEntry("mg"),
    arginine: nullEntry("mg"),
    alanine: nullEntry("mg"),
    asparticAcid: nullEntry("mg"),
    glutamicAcid: nullEntry("mg"),
    glycine: nullEntry("mg"),
    proline: nullEntry("mg"),
    serine: nullEntry("mg"),
    hydroxyproline: nullEntry("mg"),
    aminoAcidTotal: nullEntry("mg"),
    ammonia: nullEntry("mg"),
  };
}

function defaultFattyAcids(): FattyAcids {
  return {
    water: nullEntry("g"),
    triacylglycerolEquivalent: nullEntry("g"),
    totalFat: nullEntry("g"),
    fattyAcidTotal: nullEntry("g"),
    saturatedTotal: nullEntry("g"),
    monounsaturatedTotal: nullEntry("g"),
    polyunsaturatedTotal: nullEntry("g"),
    n3PolyunsaturatedTotal: nullEntry("g"),
    n6PolyunsaturatedTotal: nullEntry("g"),
    butyricAcid: nullEntry("mg"),
    hexanoicAcid: nullEntry("mg"),
    heptanoicAcid: nullEntry("mg"),
    octanoicAcid: nullEntry("mg"),
    decanoicAcid: nullEntry("mg"),
    lauricAcid: nullEntry("mg"),
    tridecanoicAcid: nullEntry("mg"),
    myristicAcid: nullEntry("mg"),
    pentadecanoicAcid: nullEntry("mg"),
    anteisoC15: nullEntry("mg"),
    palmiticAcid: nullEntry("mg"),
    heptadecanoicAcid: nullEntry("mg"),
    stearicAcid: nullEntry("mg"),
    arachidicAcid: nullEntry("mg"),
    behenicAcid: nullEntry("mg"),
    lignocericAcid: nullEntry("mg"),
    myristoleicAcid: nullEntry("mg"),
    pentadecenoicAcid: nullEntry("mg"),
    palmitoleicAcid: nullEntry("mg"),
    heptadecenoicAcid: nullEntry("mg"),
    oleicAcid: nullEntry("mg"),
    eicosenoicAcid: nullEntry("mg"),
    erucicAcid: nullEntry("mg"),
    nervionicAcid: nullEntry("mg"),
    linoleicAcid: nullEntry("mg"),
    gammaLinolenicAcid: nullEntry("mg"),
    eicosadienoicAcid: nullEntry("mg"),
    eicosatrienoicAcid: nullEntry("mg"),
    arachidonicAcid: nullEntry("mg"),
    alphaLinolenicAcid: nullEntry("mg"),
    eicosatrienoicN3Acid: nullEntry("mg"),
    eicosapentaenoicAcid: nullEntry("mg"),
    docosapentaenoicN3Acid: nullEntry("mg"),
    docosahexaenoicAcid: nullEntry("mg"),
    docosapentaenoicN6Acid: nullEntry("mg"),
    otherFattyAcids: nullEntry("mg"),
  };
}

function defaultCarbohydrateDetails(): CarbohydrateDetails {
  return {
    water: nullEntry("g"),
    monosaccharideEquiv: nullEntry("g"),
    starch: nullEntry("g"),
    glucose: nullEntry("g"),
    fructose: nullEntry("g"),
    galactose: nullEntry("g"),
    sucrose: nullEntry("g"),
    maltose: nullEntry("g"),
    lactose: nullEntry("g"),
    trehalose: nullEntry("g"),
    total: nullEntry("g"),
    sorbitol: nullEntry("g"),
    mannitol: nullEntry("g"),
  };
}

type SectionKey = "generalComponents" | "minerals" | "vitamins" | "aminoAcids" | "fattyAcids" | "carbohydrateDetails";

function generateFoodCode(food: UsdaFood, config: DatasetConfig): string {
  if (config.useNdbNumber && food.ndbNumber) {
    return `${config.codePrefix}${food.ndbNumber}`;
  }
  return `${config.codePrefix}${food.fdcId}`;
}

export function convertUsdaFood(food: UsdaFood, config: DatasetConfig): FoodItem {
  const sections: Record<SectionKey, Record<string, NutrientEntry>> = {
    generalComponents: defaultGeneralComponents() as unknown as Record<string, NutrientEntry>,
    minerals: defaultMinerals() as unknown as Record<string, NutrientEntry>,
    vitamins: defaultVitamins() as unknown as Record<string, NutrientEntry>,
    aminoAcids: defaultAminoAcids() as unknown as Record<string, NutrientEntry>,
    fattyAcids: defaultFattyAcids() as unknown as Record<string, NutrientEntry>,
    carbohydrateDetails: defaultCarbohydrateDetails() as unknown as Record<string, NutrientEntry>,
  };

  const additionalNutrients: Record<string, NutrientEntry> = {};
  let hasAminoAcids = false;
  let hasFattyAcids = false;
  let hasCarbohydrateDetails = false;
  let sodiumMg: number | null = null;

  for (const fn of food.foodNutrients) {
    const nutrientNumber = fn.nutrient.number;
    const amount = fn.amount;
    if (amount == null) continue;

    const mapping = NUTRIENT_MAP[nutrientNumber];
    if (mapping) {
      const convertedValue = Math.round(amount * mapping.conversionFactor * 1000) / 1000;
      const entry = makeNutrientEntry(convertedValue, mapping.unit);
      const section = sections[mapping.section as SectionKey];
      if (section) {
        section[mapping.field] = entry;
      }

      // Track which optional sections have data
      if (mapping.section === "aminoAcids") hasAminoAcids = true;
      if (mapping.section === "fattyAcids") hasFattyAcids = true;
      if (mapping.section === "carbohydrateDetails") hasCarbohydrateDetails = true;

      // Track sodium for salt equivalent calculation
      if (nutrientNumber === "307") sodiumMg = convertedValue;
    } else {
      // Store unmapped nutrients in additionalNutrients
      const key = `usda_${nutrientNumber}_${fn.nutrient.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
      additionalNutrients[key] = makeNutrientEntry(amount, fn.nutrient.unitName);
    }
  }

  // Calculate salt equivalent: sodium_mg × 2.54 / 1000
  if (sodiumMg != null) {
    const saltG = Math.round((sodiumMg * 2.54 / 1000) * 1000) / 1000;
    sections.generalComponents["saltEquivalent"] = makeNutrientEntry(saltG, "g");
  }

  // Build food portions
  const foodPortions = food.foodPortions?.map((p) => ({
    amount: p.amount,
    gramWeight: p.gramWeight,
    description: p.portionDescription ?? p.measureUnit?.name ?? p.modifier ?? "",
  })) ?? null;

  const foodCode = generateFoodCode(food, config);

  return {
    foodCode,
    foodNumber: foodCode,
    categoryNumber: 99,
    categoryName: food.foodCategory?.description ?? "USDA",
    foodName: food.description,
    itemNo: `${config.sourceType}_${food.fdcId}`,
    generalComponents: sections.generalComponents as unknown as GeneralComponents,
    minerals: sections.minerals as unknown as Minerals,
    vitamins: sections.vitamins as unknown as Vitamins,
    aminoAcids: hasAminoAcids ? sections.aminoAcids as unknown as AminoAcids : null,
    fattyAcids: hasFattyAcids ? sections.fattyAcids as unknown as FattyAcids : null,
    carbohydrateDetails: hasCarbohydrateDetails ? sections.carbohydrateDetails as unknown as CarbohydrateDetails : null,
    dietaryFiber: null,
    organicAcids: null,

    // USDA-specific fields
    source: config.sourceType,
    foodNameEn: food.description,
    fdcId: food.fdcId,
    ndbNumber: food.ndbNumber ?? null,
    dataType: food.dataType,
    scientificName: food.scientificName ?? null,
    brandOwner: food.brandOwner ?? null,
    brandName: food.brandName ?? null,
    gtinUpc: food.gtinUpc ?? null,
    ingredients: food.ingredients ?? null,
    servingSize: food.servingSize ?? null,
    servingSizeUnit: food.servingSizeUnit ?? null,
    foodPortions,
    usdaFoodCategory: food.foodCategory?.description ?? null,
    additionalNutrients: Object.keys(additionalNutrients).length > 0 ? additionalNutrients : null,
  };
}
