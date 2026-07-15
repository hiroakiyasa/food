import type { DietaryFiber } from "../types.js";
import { parseNutrientTable, getEntry, toEntry, type RawRow } from "./tableParser.js";

export function parseDietaryFiber(html: string): DietaryFiber {
  const rows = parseNutrientTable(html);

  // Prosky method: 水溶性, 不溶性, 総量 (under プロスキー変法)
  // AOAC method: 低分子量水溶性, 高分子量水溶性, 不溶性食物繊維, 難消化性でん粉, 総量

  // "水溶性" and "不溶性" appear both in Prosky and AOAC sections.
  // "総量" also appears twice. Use positional approach.

  let proskySoluble = getEntry(rows, "g");
  let proskyInsoluble = getEntry(rows, "g");
  let proskyTotal = getEntry(rows, "g");
  let aoacLowMolWeightSoluble = getEntry(rows, "g");
  let aoacHighMolWeightSoluble = getEntry(rows, "g");
  let aoacInsoluble = getEntry(rows, "g");
  let aoacResistantStarch = getEntry(rows, "g");
  let aoacTotal = getEntry(rows, "g");

  // Find Prosky section (first 水溶性, 不溶性, 総量)
  let solubleCount = 0;
  let insolubleCount = 0;
  let totalCount = 0;

  for (const row of rows) {
    const name = row.name;

    if (name.includes("水溶性") && !name.includes("低分子") && !name.includes("高分子")) {
      solubleCount++;
      if (solubleCount === 1) proskySoluble = toEntry(row);
    } else if (name.includes("不溶性") && !name.includes("不溶性食物繊維")) {
      insolubleCount++;
      if (insolubleCount === 1) proskyInsoluble = toEntry(row);
    } else if (name.includes("総量")) {
      totalCount++;
      if (totalCount === 1) proskyTotal = toEntry(row);
      else if (totalCount === 2) aoacTotal = toEntry(row);
    } else if (name.includes("低分子量水溶性")) {
      aoacLowMolWeightSoluble = toEntry(row);
    } else if (name.includes("高分子量水溶性")) {
      aoacHighMolWeightSoluble = toEntry(row);
    } else if (name.includes("不溶性食物繊維")) {
      aoacInsoluble = toEntry(row);
    } else if (name.includes("難消化性でん粉")) {
      aoacResistantStarch = toEntry(row);
    }
  }

  return {
    water: getEntry(rows, "g", "水分"),
    proskySoluble,
    proskyInsoluble,
    proskyTotal,
    aoacLowMolWeightSoluble,
    aoacHighMolWeightSoluble,
    aoacInsoluble,
    aoacResistantStarch,
    aoacTotal,
  };
}
