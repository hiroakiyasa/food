import type { AminoAcids } from "../types.js";
import { parseNutrientTable, getEntry, getEntryExact, toEntry } from "./tableParser.js";

export function parseAminoAcids(html: string): AminoAcids {
  const rows = parseNutrientTable(html);

  // "合計" appears multiple times for different groups.
  // Use positional approach: find the rows after specific amino acids.

  let sulfurAminoAcidTotal = getEntry(rows, "mg");
  let aromaticAminoAcidTotal = getEntry(rows, "mg");

  // Find sulfur amino acid total (after シスチン, before フェニルアラニン)
  const cystineIdx = rows.findIndex((r) => r.name.includes("シスチン"));
  if (cystineIdx >= 0) {
    for (let i = cystineIdx + 1; i < rows.length; i++) {
      if (rows[i].name.includes("合計")) {
        sulfurAminoAcidTotal = toEntry(rows[i]);
        break;
      }
      if (rows[i].name.includes("フェニルアラニン")) break;
    }
  }

  // Find aromatic amino acid total (after チロシン, before トレオニン)
  const tyrosineIdx = rows.findIndex((r) => r.name.includes("チロシン"));
  if (tyrosineIdx >= 0) {
    for (let i = tyrosineIdx + 1; i < rows.length; i++) {
      if (rows[i].name.includes("合計")) {
        aromaticAminoAcidTotal = toEntry(rows[i]);
        break;
      }
      if (rows[i].name.includes("トレオニン")) break;
    }
  }

  return {
    water: getEntryExact(rows, "g", "水分"),
    aminoAcidBasedProtein: getEntry(rows, "g", "アミノ酸組成によるたんぱく質"),
    protein: getEntryExact(rows, "g", "たんぱく質"),
    isoleucine: getEntryExact(rows, "mg", "イソロイシン"),
    leucine: getEntryExact(rows, "mg", "ロイシン"),
    lysine: getEntry(rows, "mg", "リシン"),
    methionine: getEntry(rows, "mg", "メチオニン"),
    cystine: getEntry(rows, "mg", "シスチン"),
    sulfurAminoAcidTotal,
    phenylalanine: getEntry(rows, "mg", "フェニルアラニン"),
    tyrosine: getEntry(rows, "mg", "チロシン"),
    aromaticAminoAcidTotal,
    threonine: getEntry(rows, "mg", "トレオニン"),
    tryptophan: getEntry(rows, "mg", "トリプトファン"),
    valine: getEntry(rows, "mg", "バリン"),
    histidine: getEntry(rows, "mg", "ヒスチジン"),
    arginine: getEntry(rows, "mg", "アルギニン"),
    alanine: getEntryExact(rows, "mg", "アラニン"),
    asparticAcid: getEntry(rows, "mg", "アスパラギン酸"),
    glutamicAcid: getEntry(rows, "mg", "グルタミン酸"),
    glycine: getEntryExact(rows, "mg", "グリシン"),
    proline: getEntryExact(rows, "mg", "プロリン"),
    serine: getEntryExact(rows, "mg", "セリン"),
    hydroxyproline: getEntry(rows, "mg", "ヒドロキシプロリン"),
    aminoAcidTotal: getEntry(rows, "mg", "アミノ酸組成計"),
    ammonia: getEntryExact(rows, "mg", "アンモニア"),
  };
}
