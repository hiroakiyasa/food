import type { FattyAcids, NutrientEntry } from "../types.js";
import { parseNutrientTable, getEntry, type RawRow } from "./tableParser.js";
import { parseNutrientValue } from "../utils/valueParser.js";

/**
 * Find a fatty acid row by its carbon number code (e.g. "4:0", "18:2 n-6").
 * The code appears in a separate pr_name cell, so it's part of the combined name.
 */
function findFattyAcidByCode(rows: RawRow[], code: string): NutrientEntry {
  const row = rows.find((r) => {
    // The name includes the code like "4:0/酪酸" or "18:2 n-6/リノール酸"
    const parts = r.name.split("/");
    return parts.some((p) => p.trim() === code);
  });
  if (row) return parseNutrientValue(row.value, row.unit);
  return { value: null, estimated: false, trace: false, unit: "mg" };
}

export function parseFattyAcids(html: string): FattyAcids {
  const rows = parseNutrientTable(html);

  return {
    water: getEntry(rows, "g", "水分"),
    triacylglycerolEquivalent: getEntry(rows, "g", "トリアシルグリセロール当量"),
    totalFat: getEntry(rows, "g", "脂質"),
    fattyAcidTotal: getEntry(rows, "g", "総量"),
    saturatedTotal: getEntry(rows, "g", "飽和"),
    monounsaturatedTotal: getEntry(rows, "g", "一価不飽和"),
    polyunsaturatedTotal: getEntry(rows, "g", "多価不飽和"),
    n3PolyunsaturatedTotal: getEntry(rows, "g", "n-3系 多価不飽和"),
    n6PolyunsaturatedTotal: getEntry(rows, "g", "n-6系 多価不飽和"),
    // Saturated individual
    butyricAcid: findFattyAcidByCode(rows, "4:0"),
    hexanoicAcid: findFattyAcidByCode(rows, "6:0"),
    heptanoicAcid: findFattyAcidByCode(rows, "7:0"),
    octanoicAcid: findFattyAcidByCode(rows, "8:0"),
    decanoicAcid: findFattyAcidByCode(rows, "10:0"),
    lauricAcid: findFattyAcidByCode(rows, "12:0"),
    tridecanoicAcid: findFattyAcidByCode(rows, "13:0"),
    myristicAcid: findFattyAcidByCode(rows, "14:0"),
    pentadecanoicAcid: findFattyAcidByCode(rows, "15:0"),
    anteisoC15: findFattyAcidByCode(rows, "15:0 ant"),
    palmiticAcid: findFattyAcidByCode(rows, "16:0"),
    heptadecanoicAcid: findFattyAcidByCode(rows, "17:0"),
    stearicAcid: findFattyAcidByCode(rows, "18:0"),
    arachidicAcid: findFattyAcidByCode(rows, "20:0"),
    behenicAcid: findFattyAcidByCode(rows, "22:0"),
    lignocericAcid: findFattyAcidByCode(rows, "24:0"),
    // Monounsaturated individual
    myristoleicAcid: findFattyAcidByCode(rows, "14:1"),
    pentadecenoicAcid: findFattyAcidByCode(rows, "15:1"),
    palmitoleicAcid: findFattyAcidByCode(rows, "16:1"),
    heptadecenoicAcid: findFattyAcidByCode(rows, "17:1"),
    oleicAcid: findFattyAcidByCode(rows, "18:1n-9"),
    eicosenoicAcid: findFattyAcidByCode(rows, "20:1"),
    erucicAcid: findFattyAcidByCode(rows, "22:1"),
    nervionicAcid: findFattyAcidByCode(rows, "24:1"),
    // Polyunsaturated individual
    linoleicAcid: findFattyAcidByCode(rows, "18:2 n-6"),
    gammaLinolenicAcid: findFattyAcidByCode(rows, "18:3 n-6"),
    eicosadienoicAcid: findFattyAcidByCode(rows, "20:2 n-6"),
    eicosatrienoicAcid: findFattyAcidByCode(rows, "20:3 n-6"),
    arachidonicAcid: findFattyAcidByCode(rows, "20:4 n-6"),
    alphaLinolenicAcid: findFattyAcidByCode(rows, "18:3 n-3"),
    eicosatrienoicN3Acid: findFattyAcidByCode(rows, "20:3 n-3"),
    eicosapentaenoicAcid: findFattyAcidByCode(rows, "20:5 n-3"),
    docosapentaenoicN3Acid: findFattyAcidByCode(rows, "22:5 n-3"),
    docosahexaenoicAcid: findFattyAcidByCode(rows, "22:6 n-3"),
    docosapentaenoicN6Acid: findFattyAcidByCode(rows, "22:5 n-6"),
    otherFattyAcids: getEntry(rows, "mg", "未同定物質"),
  };
}
