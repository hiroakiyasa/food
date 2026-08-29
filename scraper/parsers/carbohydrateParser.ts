import type { CarbohydrateDetails } from "../types.js";
import { parseNutrientTable, getEntry, findRow, toEntry } from "./tableParser.js";

export function parseCarbohydrateDetails(html: string): CarbohydrateDetails {
  const rows = parseNutrientTable(html);

  // "計" appears for the total of available carbohydrates.
  // Find it after the sugar items, before 糖アルコール section.
  let total = getEntry(rows, "g");
  const lactoseIdx = rows.findIndex((r) => r.name.includes("乳糖") || r.name.includes("トレハロース"));
  if (lactoseIdx >= 0) {
    for (let i = lactoseIdx + 1; i < rows.length; i++) {
      if (rows[i].name.includes("計")) {
        total = toEntry(rows[i]);
        break;
      }
      if (rows[i].name.includes("ソルビトール") || rows[i].name.includes("マンニトール")) break;
    }
  }

  return {
    water: getEntry(rows, "g", "水分"),
    monosaccharideEquiv: getEntry(rows, "g", "単糖当量"),
    starch: getEntry(rows, "g", "でんぷん"),
    glucose: getEntry(rows, "g", "ぶどう糖"),
    fructose: getEntry(rows, "g", "果糖"),
    galactose: getEntry(rows, "g", "ガラクトース"),
    sucrose: getEntry(rows, "g", "しょ糖"),
    maltose: getEntry(rows, "g", "麦芽糖"),
    lactose: getEntry(rows, "g", "乳糖"),
    trehalose: getEntry(rows, "g", "トレハロース"),
    total,
    sorbitol: getEntry(rows, "g", "ソルビトール"),
    mannitol: getEntry(rows, "g", "マンニトール"),
  };
}
