export interface NutrientEntry {
  value: number | null;
  estimated: boolean;
  trace: boolean;
  unit: string;
}

export interface GeneralComponents {
  wastePercentage: NutrientEntry;
  energyKcal: NutrientEntry;
  energyKJ: NutrientEntry;
  water: NutrientEntry;
  aminoAcidBasedProtein: NutrientEntry;
  protein: NutrientEntry;
  triacylglycerolEquivalent: NutrientEntry;
  cholesterol: NutrientEntry;
  totalFat: NutrientEntry;
  availableCarbohydrateMonosaccharideEquiv: NutrientEntry;
  availableCarbohydrateMass: NutrientEntry;
  availableCarbohydrateByDifference: NutrientEntry;
  dietaryFiberTotal: NutrientEntry;
  sugarAlcohol: NutrientEntry;
  carbohydrate: NutrientEntry;
  organicAcid: NutrientEntry;
  ash: NutrientEntry;
  alcohol: NutrientEntry;
  saltEquivalent: NutrientEntry;
}

export interface Minerals {
  sodium: NutrientEntry;
  potassium: NutrientEntry;
  calcium: NutrientEntry;
  magnesium: NutrientEntry;
  phosphorus: NutrientEntry;
  iron: NutrientEntry;
  zinc: NutrientEntry;
  copper: NutrientEntry;
  manganese: NutrientEntry;
  iodine: NutrientEntry;
  selenium: NutrientEntry;
  chromium: NutrientEntry;
  molybdenum: NutrientEntry;
}

export interface Vitamins {
  retinol: NutrientEntry;
  alphaCarotene: NutrientEntry;
  betaCarotene: NutrientEntry;
  betaCryptoxanthin: NutrientEntry;
  betaCaroteneEquiv: NutrientEntry;
  retinolActivityEquiv: NutrientEntry;
  vitaminD: NutrientEntry;
  alphaTocopherol: NutrientEntry;
  betaTocopherol: NutrientEntry;
  gammaTocopherol: NutrientEntry;
  deltaTocopherol: NutrientEntry;
  vitaminK: NutrientEntry;
  vitaminB1: NutrientEntry;
  vitaminB2: NutrientEntry;
  niacin: NutrientEntry;
  niacinEquiv: NutrientEntry;
  vitaminB6: NutrientEntry;
  vitaminB12: NutrientEntry;
  folate: NutrientEntry;
  pantothenicAcid: NutrientEntry;
  biotin: NutrientEntry;
  vitaminC: NutrientEntry;
}

export interface AminoAcids {
  water: NutrientEntry;
  aminoAcidBasedProtein: NutrientEntry;
  protein: NutrientEntry;
  isoleucine: NutrientEntry;
  leucine: NutrientEntry;
  lysine: NutrientEntry;
  methionine: NutrientEntry;
  cystine: NutrientEntry;
  sulfurAminoAcidTotal: NutrientEntry;
  phenylalanine: NutrientEntry;
  tyrosine: NutrientEntry;
  aromaticAminoAcidTotal: NutrientEntry;
  threonine: NutrientEntry;
  tryptophan: NutrientEntry;
  valine: NutrientEntry;
  histidine: NutrientEntry;
  arginine: NutrientEntry;
  alanine: NutrientEntry;
  asparticAcid: NutrientEntry;
  glutamicAcid: NutrientEntry;
  glycine: NutrientEntry;
  proline: NutrientEntry;
  serine: NutrientEntry;
  hydroxyproline: NutrientEntry;
  aminoAcidTotal: NutrientEntry;
  ammonia: NutrientEntry;
}

export interface FattyAcids {
  water: NutrientEntry;
  triacylglycerolEquivalent: NutrientEntry;
  totalFat: NutrientEntry;
  fattyAcidTotal: NutrientEntry;
  saturatedTotal: NutrientEntry;
  monounsaturatedTotal: NutrientEntry;
  polyunsaturatedTotal: NutrientEntry;
  n3PolyunsaturatedTotal: NutrientEntry;
  n6PolyunsaturatedTotal: NutrientEntry;
  // Saturated individual
  butyricAcid: NutrientEntry;
  hexanoicAcid: NutrientEntry;
  heptanoicAcid: NutrientEntry;
  octanoicAcid: NutrientEntry;
  decanoicAcid: NutrientEntry;
  lauricAcid: NutrientEntry;
  tridecanoicAcid: NutrientEntry;
  myristicAcid: NutrientEntry;
  pentadecanoicAcid: NutrientEntry;
  anteisoC15: NutrientEntry;
  palmiticAcid: NutrientEntry;
  heptadecanoicAcid: NutrientEntry;
  stearicAcid: NutrientEntry;
  arachidicAcid: NutrientEntry;
  behenicAcid: NutrientEntry;
  lignocericAcid: NutrientEntry;
  // Monounsaturated individual
  myristoleicAcid: NutrientEntry;
  pentadecenoicAcid: NutrientEntry;
  palmitoleicAcid: NutrientEntry;
  heptadecenoicAcid: NutrientEntry;
  oleicAcid: NutrientEntry;
  eicosenoicAcid: NutrientEntry;
  erucicAcid: NutrientEntry;
  nervionicAcid: NutrientEntry;
  // Polyunsaturated individual
  linoleicAcid: NutrientEntry;
  gammaLinolenicAcid: NutrientEntry;
  eicosadienoicAcid: NutrientEntry;
  eicosatrienoicAcid: NutrientEntry;
  arachidonicAcid: NutrientEntry;
  alphaLinolenicAcid: NutrientEntry;
  eicosatrienoicN3Acid: NutrientEntry;
  eicosapentaenoicAcid: NutrientEntry;
  docosapentaenoicN3Acid: NutrientEntry;
  docosahexaenoicAcid: NutrientEntry;
  docosapentaenoicN6Acid: NutrientEntry;
  otherFattyAcids: NutrientEntry;
  [key: string]: NutrientEntry;
}

export interface CarbohydrateDetails {
  water: NutrientEntry;
  monosaccharideEquiv: NutrientEntry;
  starch: NutrientEntry;
  glucose: NutrientEntry;
  fructose: NutrientEntry;
  galactose: NutrientEntry;
  sucrose: NutrientEntry;
  maltose: NutrientEntry;
  lactose: NutrientEntry;
  trehalose: NutrientEntry;
  total: NutrientEntry;
  sorbitol: NutrientEntry;
  mannitol: NutrientEntry;
}

export interface DietaryFiber {
  water: NutrientEntry;
  proskySoluble: NutrientEntry;
  proskyInsoluble: NutrientEntry;
  proskyTotal: NutrientEntry;
  aoacLowMolWeightSoluble: NutrientEntry;
  aoacHighMolWeightSoluble: NutrientEntry;
  aoacInsoluble: NutrientEntry;
  aoacResistantStarch: NutrientEntry;
  aoacTotal: NutrientEntry;
}

export interface OrganicAcids {
  water: NutrientEntry;
  formicAcid: NutrientEntry;
  aceticAcid: NutrientEntry;
  glycolicAcid: NutrientEntry;
  lacticAcid: NutrientEntry;
  gluconicAcid: NutrientEntry;
  oxalicAcid: NutrientEntry;
  malonicAcid: NutrientEntry;
  succinicAcid: NutrientEntry;
  fumaricAcid: NutrientEntry;
  malicAcid: NutrientEntry;
  tartaricAcid: NutrientEntry;
  alphaKetoglutaricAcid: NutrientEntry;
  citricAcid: NutrientEntry;
  salicylicAcid: NutrientEntry;
  pCoumaricAcid: NutrientEntry;
  caffeicAcid: NutrientEntry;
  ferulicAcid: NutrientEntry;
  chlorogenicAcid: NutrientEntry;
  quinicAcid: NutrientEntry;
  galacturonicAcid: NutrientEntry;
  glucuronicAcid: NutrientEntry;
  oroticAcid: NutrientEntry;
  pyroglutamicAcid: NutrientEntry;
  propionicAcid: NutrientEntry;
  total: NutrientEntry;
}

export interface FoodItem {
  foodCode: string;
  foodNumber: string;
  categoryNumber: number;
  categoryName: string;
  foodName: string;
  itemNo: string;
  generalComponents: GeneralComponents | null;
  minerals: Minerals | null;
  vitamins: Vitamins | null;
  aminoAcids: AminoAcids | null;
  fattyAcids: FattyAcids | null;
  carbohydrateDetails: CarbohydrateDetails | null;
  dietaryFiber: DietaryFiber | null;
  organicAcids: OrganicAcids | null;

  // USDA-specific fields (all optional for backward compatibility)
  source?: "mext" | "usda_foundation" | "usda_sr_legacy" | "usda_survey" | "usda_branded";
  foodNameEn?: string | null;
  fdcId?: number | null;
  ndbNumber?: number | null;
  dataType?: string | null;
  scientificName?: string | null;
  brandOwner?: string | null;
  brandName?: string | null;
  gtinUpc?: string | null;
  ingredients?: string | null;
  servingSize?: number | null;
  servingSizeUnit?: string | null;
  foodPortions?: { amount: number; gramWeight: number; description: string }[] | null;
  usdaFoodCategory?: string | null;
  additionalNutrients?: Record<string, NutrientEntry> | null;
}

export interface FoodListEntry {
  itemNo: string;
  categoryNumber: number;
  foodCode: string;
  categoryName: string;
  foodName: string;
}

export interface ProgressState {
  completedItems: string[];
  totalItems: number;
  lastUpdated: string;
}
