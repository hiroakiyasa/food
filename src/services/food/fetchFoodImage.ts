import type { FoodItemSearchResult } from './searchFood';

const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY?.trim() ?? '';
const UNSPLASH_API_BASE = 'https://api.unsplash.com';

const CATEGORY_KEYWORDS: Record<string, string> = {
  '穀類': 'grain',
  '肉類': 'meat',
  '魚介類': 'seafood',
  '野菜類': 'vegetable',
  '果実類': 'fruit',
  '乳類': 'dairy',
  '卵類': 'egg',
  '豆類': 'bean',
  'いも及びでん粉類': 'potato',
  'きのこ類': 'mushroom',
  '藻類': 'seaweed',
  '種実類': 'nut',
  '菓子類': 'dessert',
  '油脂類': 'oil',
  '砂糖及び甘味類': 'sweet',
  '調味料及び香辛料類': 'seasoning',
  'し好飲料類': 'drink',
  '調理加工食品類': 'cooked dish',
};

type UnsplashPhoto = {
  alt_description: string | null;
  description: string | null;
  urls: {
    thumb: string;
    small: string;
    regular: string;
  };
  links: {
    download_location: string;
  };
};

type UnsplashSearchResponse = {
  results: UnsplashPhoto[];
};

const FOOD_STOP_WORDS = new Set([
  'food',
  'dish',
  'meal',
  'plate',
  'fresh',
  'delicious',
  'cuisine',
  'table',
  'closeup',
  'close',
  'up',
  'japanese',
]);

const imageCache = new Map<string, string | null>();

function hasJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9faf]/.test(text);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !FOOD_STOP_WORDS.has(token));
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((v) => v?.trim()).filter((v): v is string => !!v))];
}

function buildQuery(food: FoodItemSearchResult): string {
  const nameJa = food.food_name?.trim();
  const nameEn = food.food_name_en?.trim();
  const categoryKeyword = CATEGORY_KEYWORDS[food.category_name] ?? '';

  const terms = unique([
    nameEn,
    nameJa,
    categoryKeyword,
    hasJapanese(nameJa ?? '') ? 'japanese cuisine' : null,
    'food photo',
  ]);

  return terms.join(' ');
}

function scorePhoto(
  photo: UnsplashPhoto,
  tokens: string[],
  primaryName: string,
  categoryKeyword: string,
): number {
  const text = `${photo.alt_description ?? ''} ${photo.description ?? ''}`.toLowerCase();

  let score = 0;

  if (primaryName && text.includes(primaryName.toLowerCase())) {
    score += 30;
  }
  if (categoryKeyword && text.includes(categoryKeyword.toLowerCase())) {
    score += 8;
  }
  for (const token of tokens) {
    if (text.includes(token)) {
      score += 4;
    }
  }

  return score;
}

async function trackUnsplashDownload(downloadLocation: string): Promise<void> {
  if (!UNSPLASH_ACCESS_KEY || !downloadLocation) return;

  try {
    await fetch(downloadLocation, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });
  } catch {
    // Ignore tracking errors; image selection should still succeed.
  }
}

function cacheKeyForFood(food: FoodItemSearchResult): string {
  return [food.id, food.food_name, food.food_name_en ?? '', food.category_name].join('::');
}

export async function fetchFoodImage(food: FoodItemSearchResult): Promise<string | null> {
  const cacheKey = cacheKeyForFood(food);
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey) ?? null;
  }

  if (!UNSPLASH_ACCESS_KEY) {
    imageCache.set(cacheKey, null);
    return null;
  }

  const query = buildQuery(food);
  const categoryKeyword = CATEGORY_KEYWORDS[food.category_name] ?? '';
  const primaryName = (food.food_name_en?.trim() || food.food_name?.trim() || '').toLowerCase();
  const tokens = tokenize(query);

  try {
    const response = await fetch(
      `${UNSPLASH_API_BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=8&orientation=landscape&content_filter=high`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          'Accept-Version': 'v1',
        },
      },
    );

    if (!response.ok) {
      imageCache.set(cacheKey, null);
      return null;
    }

    const payload = (await response.json()) as UnsplashSearchResponse;
    const photos = payload.results ?? [];

    if (photos.length === 0) {
      imageCache.set(cacheKey, null);
      return null;
    }

    const ranked = [...photos].sort((a, b) => (
      scorePhoto(b, tokens, primaryName, categoryKeyword)
      - scorePhoto(a, tokens, primaryName, categoryKeyword)
    ));

    const best = ranked[0];
    const imageUrl = best.urls.small || best.urls.regular || null;
    imageCache.set(cacheKey, imageUrl);

    if (best.links.download_location) {
      void trackUnsplashDownload(best.links.download_location);
    }

    return imageUrl;
  } catch {
    imageCache.set(cacheKey, null);
    return null;
  }
}

// ─── Meal item image fetching (by ai_detected_name) ───

const mealItemImageCache = new Map<string, string | null>();

const JA_TO_EN_COMMON: Record<string, string> = {
  'ご飯': 'steamed rice',
  '白米': 'steamed rice',
  '味噌汁': 'miso soup',
  'みそ汁': 'miso soup',
  'サラダ': 'fresh salad',
  '鶏肉': 'grilled chicken',
  '豚肉': 'pork',
  '牛肉': 'beef steak',
  '鮭': 'grilled salmon',
  'パン': 'bread',
  '卵焼き': 'japanese omelette tamagoyaki',
  '納豆': 'natto',
  'カレー': 'japanese curry rice',
  'ラーメン': 'ramen noodle soup',
  'うどん': 'udon noodle',
  'そば': 'soba noodle',
  'パスタ': 'pasta',
  '寿司': 'sushi',
  '天ぷら': 'tempura',
  'トースト': 'toast bread',
  'ヨーグルト': 'yogurt',
  '牛乳': 'glass of milk',
  'コーヒー': 'coffee cup',
  'バナナ': 'banana',
  'りんご': 'apple fruit',
};

function buildMealItemQuery(name: string): string {
  const trimmed = name.trim();

  // Check common Japanese → English mapping
  for (const [ja, en] of Object.entries(JA_TO_EN_COMMON)) {
    if (trimmed.includes(ja)) {
      return `${en} food photography`;
    }
  }

  // If already English or mixed, use directly
  if (!hasJapanese(trimmed)) {
    return `${trimmed} food photography`;
  }

  // Fallback: use Japanese name with food context
  return `${trimmed} food dish`;
}

function isPersonPhoto(photo: UnsplashPhoto): boolean {
  const text = `${photo.alt_description ?? ''} ${photo.description ?? ''}`.toLowerCase();
  const personKeywords = ['person', 'people', 'man', 'woman', 'child', 'portrait', 'selfie', 'face', 'hand', 'holding'];
  return personKeywords.some((kw) => text.includes(kw));
}

export async function fetchMealItemImage(
  name: string,
  size: 'thumb' | 'small' | 'regular' = 'small',
): Promise<string | null> {
  const cacheKey = `meal_item::${name}::${size}`;
  if (mealItemImageCache.has(cacheKey)) {
    return mealItemImageCache.get(cacheKey) ?? null;
  }

  if (!UNSPLASH_ACCESS_KEY || !name.trim()) {
    mealItemImageCache.set(cacheKey, null);
    return null;
  }

  const query = buildMealItemQuery(name);

  try {
    const response = await fetch(
      `${UNSPLASH_API_BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape&content_filter=high`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          'Accept-Version': 'v1',
        },
      },
    );

    if (!response.ok) {
      mealItemImageCache.set(cacheKey, null);
      return null;
    }

    const payload = (await response.json()) as UnsplashSearchResponse;
    const photos = payload.results ?? [];

    // Filter out photos with people
    const filtered = photos.filter((p) => !isPersonPhoto(p));
    const candidates = filtered.length > 0 ? filtered : photos;

    if (candidates.length === 0) {
      mealItemImageCache.set(cacheKey, null);
      return null;
    }

    // Score based on food relevance
    const nameLower = name.toLowerCase();
    const ranked = [...candidates].sort((a, b) => {
      const textA = `${a.alt_description ?? ''} ${a.description ?? ''}`.toLowerCase();
      const textB = `${b.alt_description ?? ''} ${b.description ?? ''}`.toLowerCase();
      let scoreA = 0;
      let scoreB = 0;
      if (textA.includes('food') || textA.includes('dish') || textA.includes('meal')) scoreA += 10;
      if (textB.includes('food') || textB.includes('dish') || textB.includes('meal')) scoreB += 10;
      if (textA.includes(nameLower)) scoreA += 20;
      if (textB.includes(nameLower)) scoreB += 20;
      // Penalize person photos that slipped through
      if (isPersonPhoto(a)) scoreA -= 50;
      if (isPersonPhoto(b)) scoreB -= 50;
      return scoreB - scoreA;
    });

    const best = ranked[0];
    const imageUrl = best.urls[size] || best.urls.small || best.urls.regular || null;
    mealItemImageCache.set(cacheKey, imageUrl);

    if (best.links.download_location) {
      void trackUnsplashDownload(best.links.download_location);
    }

    return imageUrl;
  } catch {
    mealItemImageCache.set(cacheKey, null);
    return null;
  }
}
