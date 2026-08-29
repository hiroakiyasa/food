import * as cheerio from "cheerio";
import type { GeneralComponents, Minerals, Vitamins } from "../types.js";
import { parseNutrientTable, getEntry, getEntryExact } from "./tableParser.js";
import { parseNutrientValue } from "../utils/valueParser.js";
import type { NutrientEntry } from "../types.js";

function extractEnergyKJ(html: string): NutrientEntry {
  const $ = cheerio.load(html);
  // Find the kJ row - it's the <tr> that has a td with unit kJ
  let value: NutrientEntry = { value: null, estimated: false, trace: false, unit: "kJ" };
  $("#nut tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    let hasKJ = false;
    let valText = "";
    tds.each((_, td) => {
      const $td = $(td);
      const cls = $td.attr("class") || "";
      if (cls.includes("pr_unit") && $td.text().includes("kJ")) {
        hasKJ = true;
      }
      if (cls === "num" || cls === "marker") {
        valText = $td.text().trim();
      }
    });
    if (hasKJ && valText) {
      value = parseNutrientValue(valText, "kJ");
      return false; // break
    }
  });
  return value;
}

export function parseGeneralComponents(html: string): {
  generalComponents: GeneralComponents;
  minerals: Minerals;
  vitamins: Vitamins;
} {
  const rows = parseNutrientTable(html);

  const generalComponents: GeneralComponents = {
    wastePercentage: getEntry(rows, "%", "廃棄率"),
    energyKcal: (() => {
      const row = rows.find((r) => r.name.includes("エネルギー") && r.unit === "kcal");
      return row ? parseNutrientValue(row.value, row.unit) : { value: null, estimated: false, trace: false, unit: "kcal" };
    })(),
    energyKJ: extractEnergyKJ(html),
    water: getEntryExact(rows, "g", "水分"),
    aminoAcidBasedProtein: getEntry(rows, "g", "アミノ酸組成によるたんぱく質"),
    protein: getEntryExact(rows, "g", "たんぱく質"),
    triacylglycerolEquivalent: getEntry(rows, "g", "トリアシルグリセロール当量", "脂肪酸のトリアシルグリセロール当量"),
    cholesterol: getEntry(rows, "mg", "コレステロール"),
    totalFat: getEntryExact(rows, "g", "脂質"),
    availableCarbohydrateMonosaccharideEquiv: getEntry(rows, "g", "利用可能炭水化物（単糖当量）"),
    availableCarbohydrateMass: getEntry(rows, "g", "利用可能炭水化物（質量計）"),
    availableCarbohydrateByDifference: getEntry(rows, "g", "差引き法による利用可能炭水化物"),
    dietaryFiberTotal: getEntry(rows, "g", "食物繊維総量"),
    sugarAlcohol: getEntryExact(rows, "g", "糖アルコール"),
    carbohydrate: getEntryExact(rows, "g", "炭水化物"),
    organicAcid: getEntryExact(rows, "g", "有機酸"),
    ash: getEntryExact(rows, "g", "灰分"),
    alcohol: getEntryExact(rows, "g", "アルコール"),
    saltEquivalent: getEntry(rows, "g", "食塩相当量"),
  };

  const minerals: Minerals = {
    sodium: getEntry(rows, "mg", "ナトリウム"),
    potassium: getEntry(rows, "mg", "カリウム"),
    calcium: getEntry(rows, "mg", "カルシウム"),
    magnesium: getEntry(rows, "mg", "マグネシウム"),
    phosphorus: getEntry(rows, "mg", "リン"),
    iron: getEntry(rows, "mg", "鉄"),
    zinc: getEntry(rows, "mg", "亜鉛"),
    copper: getEntry(rows, "mg", "銅"),
    manganese: getEntry(rows, "mg", "マンガン"),
    iodine: getEntry(rows, "μg", "ヨウ素"),
    selenium: getEntry(rows, "μg", "セレン"),
    chromium: getEntry(rows, "μg", "クロム"),
    molybdenum: getEntry(rows, "μg", "モリブデン"),
  };

  const vitamins: Vitamins = {
    retinol: getEntry(rows, "μg", "レチノール"),
    alphaCarotene: getEntry(rows, "μg", "α−カロテン", "α-カロテン"),
    betaCarotene: getEntry(rows, "μg", "β−カロテン", "β-カロテン"),
    betaCryptoxanthin: getEntry(rows, "μg", "β−クリプトキサンチン", "β-クリプトキサンチン"),
    betaCaroteneEquiv: getEntry(rows, "μg", "β−カロテン当量", "β-カロテン当量"),
    retinolActivityEquiv: getEntry(rows, "μg", "レチノール活性当量"),
    vitaminD: getEntry(rows, "μg", "ビタミンD"),
    alphaTocopherol: getEntry(rows, "mg", "α−トコフェロール", "α-トコフェロール"),
    betaTocopherol: getEntry(rows, "mg", "β−トコフェロール", "β-トコフェロール"),
    gammaTocopherol: getEntry(rows, "mg", "γ−トコフェロール", "γ-トコフェロール"),
    deltaTocopherol: getEntry(rows, "mg", "δ−トコフェロール", "δ-トコフェロール"),
    vitaminK: getEntry(rows, "μg", "ビタミンK"),
    vitaminB1: getEntry(rows, "mg", "ビタミンB1"),
    vitaminB2: getEntry(rows, "mg", "ビタミンB2"),
    niacin: getEntryExact(rows, "mg", "ナイアシン"),
    niacinEquiv: getEntry(rows, "mg", "ナイアシン当量"),
    vitaminB6: getEntry(rows, "mg", "ビタミンB6"),
    vitaminB12: getEntry(rows, "μg", "ビタミンB12"),
    folate: getEntry(rows, "μg", "葉酸"),
    pantothenicAcid: getEntry(rows, "mg", "パントテン酸"),
    biotin: getEntry(rows, "μg", "ビオチン"),
    vitaminC: getEntry(rows, "mg", "ビタミンC"),
  };

  return { generalComponents, minerals, vitamins };
}
