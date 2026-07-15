import * as cheerio from "cheerio";
import type { NutrientEntry } from "../types.js";
import { parseNutrientValue } from "../utils/valueParser.js";

export interface RawRow {
  name: string;
  value: string;
  unit: string;
}

/**
 * Parse all rows from the #nut table.
 * Extracts nutrient name, raw value text, and unit from each row.
 */
export function parseNutrientTable(html: string): RawRow[] {
  const $ = cheerio.load(html);
  const rows: RawRow[] = [];

  $("#nut tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length === 0) return;

    // Find value cell (class "num" or "marker", or empty class with no text for organic acids)
    let valueText = "";
    let unitText = "";
    let nameText = "";

    const nameTexts: string[] = [];

    tds.each((_, td) => {
      const $td = $(td);
      const cls = $td.attr("class") || "";

      if (cls.includes("pr_unit")) {
        // Unit cell - extract from abbr or text
        const abbr = $td.find("abbr");
        unitText = abbr.length > 0 ? abbr.text().trim() : $td.text().trim();
      } else if (cls === "num" || cls === "marker") {
        valueText = $td.text().trim();
      } else if (cls.includes("pr_name")) {
        // Nutrient name - get text, replace <br> with space
        const text = $td
          .html()
          ?.replace(/<br\s*\/?>/gi, " ")
          .replace(/<[^>]+>/g, "")
          .trim();
        if (text) nameTexts.push(text);
      } else if (cls.includes("pr_gr_name")) {
        // Group name - extract span title or text
        const span = $td.find("span");
        const grpText = span.length > 0
          ? (span.attr("title") || span.text().replace(/<br\s*\/?>/gi, "").trim())
          : $td.text().trim();
        if (grpText) nameTexts.push(grpText);
      } else if (cls === "") {
        // Empty class cell could be a value cell (organic acids with no data)
        const text = $td.text().trim();
        if (text === "" && !valueText) {
          // This is likely an empty value cell
          valueText = "";
        }
      }
    });

    nameText = nameTexts.join("/");

    // Only add rows that have a unit (indicating actual nutrient data)
    if (unitText && nameText) {
      rows.push({ name: nameText, value: valueText, unit: unitText });
    }
  });

  return rows;
}

/**
 * Create a NutrientEntry from a RawRow
 */
export function toEntry(row: RawRow): NutrientEntry {
  return parseNutrientValue(row.value, row.unit);
}

/**
 * Find a row by name from the parsed rows (partial match)
 */
export function findRow(rows: RawRow[], ...names: string[]): RawRow | undefined {
  return rows.find((r) => names.some((n) => r.name.includes(n)));
}

/**
 * Find a row where the name ends with the given string (for exact field matching)
 */
export function findRowExact(rows: RawRow[], ...names: string[]): RawRow | undefined {
  // Try exact match on the last segment (after the last "/")
  return rows.find((r) => {
    const lastSegment = r.name.split("/").pop() || r.name;
    return names.some((n) => lastSegment === n);
  });
}

/**
 * Get NutrientEntry for a nutrient by name (partial match)
 */
export function getEntry(rows: RawRow[], defaultUnit: string, ...names: string[]): NutrientEntry {
  const row = findRow(rows, ...names);
  if (row) return toEntry(row);
  return { value: null, estimated: false, trace: false, unit: defaultUnit };
}

/**
 * Get NutrientEntry for a nutrient by exact name match on last segment
 */
export function getEntryExact(rows: RawRow[], defaultUnit: string, ...names: string[]): NutrientEntry {
  const row = findRowExact(rows, ...names);
  if (row) return toEntry(row);
  return { value: null, estimated: false, trace: false, unit: defaultUnit };
}
