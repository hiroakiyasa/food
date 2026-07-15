import * as cheerio from "cheerio";
import { FOOD_LIST_URL, CATEGORY_COUNT, CATEGORY_NAMES } from "../config.js";
import { fetchHtml } from "../utils/httpClient.js";
import type { FoodListEntry } from "../types.js";

export async function fetchAllFoodItems(): Promise<FoodListEntry[]> {
  const allItems: FoodListEntry[] = [];

  for (let cat = 1; cat <= CATEGORY_COUNT; cat++) {
    const url = `${FOOD_LIST_URL}?CATEGORY=${cat}&USER_ID=`;
    console.log(`Fetching food list for category ${cat}/${CATEGORY_COUNT}: ${CATEGORY_NAMES[cat]}`);

    const html = await fetchHtml(url);
    const items = parseFoodList(html, cat);
    allItems.push(...items);
    console.log(`  Found ${items.length} items`);
  }

  console.log(`Total food items: ${allItems.length}`);
  return allItems;
}

function parseFoodList(html: string, categoryNumber: number): FoodListEntry[] {
  const $ = cheerio.load(html);
  const items: FoodListEntry[] = [];

  $("select#FOOD_ITEM_NO option").each((_, el) => {
    const value = $(el).attr("value");
    const text = $(el).text().trim();

    if (!value) return;

    // value format: "7_{cat}_{code}_100"
    const match = value.match(/^7_(\d+)_(\d+)_100$/);
    if (!match) return;

    const foodCode = match[2];
    const itemNo = `${match[1]}_${foodCode}_7`;

    items.push({
      itemNo,
      categoryNumber,
      foodCode,
      categoryName: CATEGORY_NAMES[categoryNumber] ?? `カテゴリ${categoryNumber}`,
      foodName: text,
    });
  });

  return items;
}
