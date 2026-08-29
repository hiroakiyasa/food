import type { NutrientEntry } from "../types.js";

const nullEntry = (unit: string): NutrientEntry => ({
  value: null,
  estimated: false,
  trace: false,
  unit,
});

export function parseNutrientValue(raw: string, unit: string): NutrientEntry {
  const text = raw.trim();

  // Empty, dash, or ellipsis -> null
  if (text === "" || text === "-" || text === "…" || text === "—") {
    return nullEntry(unit);
  }

  // (Tr) -> estimated trace
  if (text === "(Tr)") {
    return { value: 0, estimated: true, trace: true, unit };
  }

  // Tr -> trace
  if (text === "Tr") {
    return { value: 0, estimated: false, trace: true, unit };
  }

  // (value) -> estimated
  const estimatedMatch = text.match(/^\((.+)\)$/);
  if (estimatedMatch) {
    const num = parseFloat(estimatedMatch[1]);
    if (!isNaN(num)) {
      return { value: num, estimated: true, trace: false, unit };
    }
    return nullEntry(unit);
  }

  // Regular number
  const num = parseFloat(text);
  if (!isNaN(num)) {
    return { value: num, estimated: false, trace: false, unit };
  }

  return nullEntry(unit);
}
