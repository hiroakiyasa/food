import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const FOOD_COLUMNS = [
  'id', 'food_code', 'food_name', 'food_name_en', 'source', 'data_quality',
  'energy_kcal', 'protein_g', 'fat_g', 'carbohydrate_g', 'fiber_g',
  'sodium_mg', 'salt_equivalent_g',
].join(',');
const MAX_BASE64_LENGTH = 8_000_000;

interface RecognitionItem {
  detected_name: string;
  search_terms: string[];
  portion_grams: number;
  confidence: number;
  fallback_per_100g?: Partial<Nutrients>;
}

interface RecognitionResult {
  items: RecognitionItem[];
  meal_type_guess: string;
  summary: string;
}

interface Nutrients {
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbohydrate_g: number;
  fiber_g: number;
  sodium_mg: number;
  salt_equivalent_g: number;
}

interface FoodRow extends Nutrients {
  id: string;
  food_code: string;
  food_name: string;
  food_name_en: string | null;
  source: string | null;
  data_quality: number | null;
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  required: ['items', 'meal_type_guess', 'summary'],
  properties: {
    items: {
      type: 'ARRAY',
      minItems: 1,
      maxItems: 10,
      items: {
        type: 'OBJECT',
        required: ['detected_name', 'search_terms', 'portion_grams', 'confidence', 'fallback_per_100g'],
        properties: {
          detected_name: { type: 'STRING' },
          search_terms: { type: 'ARRAY', minItems: 1, maxItems: 5, items: { type: 'STRING' } },
          portion_grams: { type: 'NUMBER', minimum: 1, maximum: 2000 },
          confidence: { type: 'NUMBER', minimum: 0, maximum: 1 },
          fallback_per_100g: {
            type: 'OBJECT',
            required: [
              'energy_kcal', 'protein_g', 'fat_g', 'carbohydrate_g',
              'fiber_g', 'sodium_mg', 'salt_equivalent_g',
            ],
            properties: {
              energy_kcal: { type: 'NUMBER', minimum: 0 },
              protein_g: { type: 'NUMBER', minimum: 0 },
              fat_g: { type: 'NUMBER', minimum: 0 },
              carbohydrate_g: { type: 'NUMBER', minimum: 0 },
              fiber_g: { type: 'NUMBER', minimum: 0 },
              sodium_mg: { type: 'NUMBER', minimum: 0 },
              salt_equivalent_g: { type: 'NUMBER', minimum: 0 },
            },
          },
        },
      },
    },
    meal_type_guess: { type: 'STRING', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
    summary: { type: 'STRING' },
  },
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

function finite(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s/／・,，()（）［\]【】「」『』]/g, '');
}

function safeSearchTerm(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[,%_()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function matchScore(food: FoodRow, terms: string[]): number {
  const names = [food.food_name, food.food_name_en ?? ''].map(normalizeName);
  let lexical = 0;
  for (const term of terms) {
    const normalizedTerm = normalizeName(term);
    if (!normalizedTerm) continue;
    for (const name of names) {
      if (name === normalizedTerm) lexical = Math.max(lexical, 1);
      else if (name.startsWith(normalizedTerm) || normalizedTerm.startsWith(name)) lexical = Math.max(lexical, 0.92);
      else if (name.includes(normalizedTerm) || normalizedTerm.includes(name)) lexical = Math.max(lexical, 0.8);
    }
  }
  const quality = Math.min(1, finite(food.data_quality, 3) / 5);
  const sourceBoost = food.source === 'mext' ? 0.05 : 0;
  return Math.min(1, lexical * 0.82 + quality * 0.13 + sourceBoost);
}

async function findFoodMatch(
  supabase: SupabaseClient,
  terms: string[],
): Promise<{ food: FoodRow; score: number } | null> {
  const candidates = new Map<string, FoodRow>();
  for (const rawTerm of terms.slice(0, 5)) {
    const term = safeSearchTerm(rawTerm);
    if (!term) continue;
    const { data } = await supabase
      .from('food_items')
      .select(FOOD_COLUMNS)
      .ilike('food_name', `%${term}%`)
      .not('energy_kcal', 'is', null)
      .order('data_quality', { ascending: false, nullsFirst: false })
      .limit(15);
    for (const row of (data ?? []) as unknown as FoodRow[]) candidates.set(row.id, row);
    if (candidates.size >= 20) break;
  }
  if (candidates.size === 0) {
    for (const rawTerm of terms.slice(0, 3)) {
      const term = safeSearchTerm(rawTerm);
      if (!term) continue;
      const { data } = await supabase
        .from('food_items')
        .select(FOOD_COLUMNS)
        .ilike('food_name_en', `%${term}%`)
        .not('energy_kcal', 'is', null)
        .order('data_quality', { ascending: false, nullsFirst: false })
        .limit(10);
      for (const row of (data ?? []) as unknown as FoodRow[]) candidates.set(row.id, row);
    }
  }

  let best: { food: FoodRow; score: number } | null = null;
  for (const food of candidates.values()) {
    const score = matchScore(food, terms);
    if (!best || score > best.score) best = { food, score };
  }
  return best && best.score >= 0.48 ? best : null;
}

function scaleNutrients(source: Partial<Nutrients>, grams: number): Nutrients {
  const ratio = grams / 100;
  const sodiumMg = finite(source.sodium_mg) * ratio;
  return {
    energy_kcal: finite(source.energy_kcal) * ratio,
    protein_g: finite(source.protein_g) * ratio,
    fat_g: finite(source.fat_g) * ratio,
    carbohydrate_g: finite(source.carbohydrate_g) * ratio,
    fiber_g: finite(source.fiber_g) * ratio,
    sodium_mg: sodiumMg,
    salt_equivalent_g: source.salt_equivalent_g == null
      ? sodiumMg * 2.54 / 1000
      : finite(source.salt_equivalent_g) * ratio,
  };
}

async function recognizeFoodImage(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  model: string,
): Promise<RecognitionResult> {
  const prompt = `この食事写真を日本の管理栄養士の記録補助として解析してください。

要件:
- 写真に見える料理を、栄養データベースで照合しやすい単位に分ける
- 完成料理として食品成分表にありそうな場合は、材料へ分解しすぎず完成料理名を優先する
- たれ、ドレッシング、みそ汁、しょうゆ等、塩分に影響するものも見える範囲で別項目にする
- 各項目の可食部重量をgで推定する
- search_termsは日本食品標準成分表で検索しやすい日本語を具体的な順に最大5個返す
- fallback_per_100gはDBに一致しない場合だけ使う概算値。一般的な調理後の100gあたりを返す
- 写真だけでは断定できないものはconfidenceを下げる
- 医療診断はせず、短い日本語のsummaryを返す`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: prompt },
          ],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.15,
          maxOutputTokens: 4096,
        },
      }),
    },
  );
  if (!response.ok) {
    console.error(`[analyze-food-image] Gemini ${response.status}: ${await response.text().catch(() => '')}`);
    throw new Error('AI recognition failed');
  }
  const payload = await response.json();
  const text = (payload?.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part.text ?? '')
    .join('');
  const parsed = JSON.parse(text) as RecognitionResult;
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new Error('No food detected');
  }
  return parsed;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({})) as {
      image_base64?: string;
      mime_type?: string;
    };
    const rawImage = body.image_base64 ?? '';
    const imageBase64 = rawImage.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    if (imageBase64.length < 100 || imageBase64.length > MAX_BASE64_LENGTH) {
      return json({ error: 'Invalid image size' }, 400);
    }
    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
    const mimeType = allowedMimeTypes.has(body.mime_type ?? '') ? body.mime_type! : 'image/jpeg';
    let apiKey = Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('GOOGLE_API_KEY') ?? '';
    if (!apiKey) {
      const { data: keyRow, error: keyError } = await supabase
        .from('api_keys')
        .select('api_key')
        .eq('service_name', 'gemini')
        .maybeSingle();
      if (keyError) console.error(`[analyze-food-image] Gemini key lookup: ${keyError.message}`);
      apiKey = typeof keyRow?.api_key === 'string' ? keyRow.api_key : '';
    }
    if (!apiKey) return json({ error: 'AI service not configured' }, 503);
    const model = Deno.env.get('GEMINI_FOOD_MODEL') ?? Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.1-flash-lite';

    const recognition = await recognizeFoodImage(imageBase64, mimeType, apiKey, model);
    const recognizedItems = recognition.items.slice(0, 10);
    const items = await Promise.all(recognizedItems.map(async (recognized) => {
      const detectedName = String(recognized.detected_name || '食品').slice(0, 120);
      const terms = [detectedName, ...(recognized.search_terms ?? [])]
        .map((term) => String(term))
        .filter(Boolean);
      const grams = Math.max(1, Math.min(2000, finite(recognized.portion_grams, 100)));
      const match = await findFoodMatch(supabase, terms);
      const source = match?.food ?? recognized.fallback_per_100g ?? {};
      const nutrients = scaleNutrients(source, grams);
      return {
        name: match?.food.food_name ?? detectedName,
        detected_name: detectedName,
        matched_food_name: match?.food.food_name ?? null,
        food_item_id: match?.food.id ?? null,
        food_code: match?.food.food_code ?? null,
        database_source: match?.food.source ?? null,
        estimate_basis: match ? 'database' : 'ai_estimate',
        portion_grams: grams,
        confidence: Math.min(1, finite(recognized.confidence, 0.4)),
        database_match_score: match?.score ?? 0,
        ...nutrients,
      };
    }));

    return json({
      items,
      meal_type_guess: recognition.meal_type_guess,
      summary: recognition.summary,
      disclaimer: '写真からの食品・分量推定です。DB一致項目は食品成分値から計算し、未一致項目はAI概算です。保存前に内容と分量を確認してください。',
      analysis_source: 'gemini+database',
      model,
    });
  } catch (error) {
    console.error(`[analyze-food-image] ${error instanceof Error ? error.message : String(error)}`);
    return json({ error: 'Food image analysis failed' }, 502);
  }
});
