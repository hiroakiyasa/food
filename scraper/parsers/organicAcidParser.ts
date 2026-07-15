import type { OrganicAcids } from "../types.js";
import { parseNutrientTable, getEntry } from "./tableParser.js";

export function parseOrganicAcids(html: string): OrganicAcids {
  const rows = parseNutrientTable(html);

  return {
    water: getEntry(rows, "g", "水分"),
    formicAcid: getEntry(rows, "g", "ギ酸"),
    aceticAcid: getEntry(rows, "g", "酢酸"),
    glycolicAcid: getEntry(rows, "g", "グリコール酸"),
    lacticAcid: getEntry(rows, "g", "乳酸"),
    gluconicAcid: getEntry(rows, "g", "グルコン酸"),
    oxalicAcid: getEntry(rows, "g", "シュウ酸"),
    malonicAcid: getEntry(rows, "g", "マロン酸"),
    succinicAcid: getEntry(rows, "g", "コハク酸"),
    fumaricAcid: getEntry(rows, "g", "フマル酸"),
    malicAcid: getEntry(rows, "g", "リンゴ酸"),
    tartaricAcid: getEntry(rows, "g", "酒石酸"),
    alphaKetoglutaricAcid: getEntry(rows, "g", "α-ケトグルタル酸"),
    citricAcid: getEntry(rows, "g", "クエン酸"),
    salicylicAcid: getEntry(rows, "g", "サリチル酸"),
    pCoumaricAcid: getEntry(rows, "g", "Ｐ-クマル酸", "P-クマル酸", "p-クマル酸"),
    caffeicAcid: getEntry(rows, "g", "コーヒー酸"),
    ferulicAcid: getEntry(rows, "g", "フェルラ酸"),
    chlorogenicAcid: getEntry(rows, "g", "クロロゲン酸"),
    quinicAcid: getEntry(rows, "g", "キナ酸"),
    galacturonicAcid: getEntry(rows, "g", "ガラクツロン酸"),
    glucuronicAcid: getEntry(rows, "g", "グルクロン酸"),
    oroticAcid: getEntry(rows, "g", "オロト酸"),
    pyroglutamicAcid: getEntry(rows, "g", "ピログルタミン酸"),
    propionicAcid: getEntry(rows, "g", "プロピオン酸"),
    total: getEntry(rows, "g", "有機酸計"),
  };
}
