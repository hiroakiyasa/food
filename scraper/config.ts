import { join } from "node:path";

export const BASE_URL = "https://fooddb.mext.go.jp";
export const FOOD_LIST_URL = `${BASE_URL}/selectFood/foodNameList.pl`;
export const DETAILS_URL = `${BASE_URL}/details/details.pl`;

export const CONCURRENCY = 3;
export const REQUEST_INTERVAL_MS = 1000;
export const MAX_RETRIES = 5;

export const CATEGORY_COUNT = 18;

// MODE mapping for detail pages
export const MODES = {
  general: 0,
  aminoAcid: 1,
  fattyAcid: 4,
  carbohydrate: 7,
  dietaryFiber: 8,
  organicAcid: 9,
} as const;

export const DATA_DIR = join(process.cwd(), "data");
export const CACHE_DIR = join(DATA_DIR, "cache");
export const OUTPUT_DIR = join(DATA_DIR, "output");
export const PROGRESS_FILE = join(DATA_DIR, "progress.json");

export const CATEGORY_NAMES: Record<number, string> = {
  1: "穀類",
  2: "いも及びでん粉類",
  3: "砂糖及び甘味類",
  4: "豆類",
  5: "種実類",
  6: "野菜類",
  7: "果実類",
  8: "きのこ類",
  9: "藻類",
  10: "魚介類",
  11: "肉類",
  12: "卵類",
  13: "乳類",
  14: "油脂類",
  15: "菓子類",
  16: "し好飲料類",
  17: "調味料及び香辛料類",
  18: "調理加工食品類",
};
