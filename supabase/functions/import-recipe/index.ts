import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: HEADERS });
}

function isPrivateHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.local') ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) ||
    hostname === '::1';
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function recipeNode(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  const node = value as Record<string, unknown>;
  const graph = asArray(node['@graph']);
  for (const child of graph) {
    const result = recipeNode(child);
    if (result) return result;
  }
  const types = asArray(node['@type']).map(String);
  return types.includes('Recipe') ? node : null;
}

function parseNumber(value: unknown): number | null {
  const match = String(value ?? '').match(/[\d,.]+/);
  if (!match) return null;
  const parsed = Number(match[0].replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function instructionText(value: unknown): string[] {
  return asArray(value).flatMap((entry) => {
    if (typeof entry === 'string') return [entry];
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    if (row.text) return [String(row.text)];
    return instructionText(row.itemListElement);
  }).map((text) => text.trim()).filter(Boolean).slice(0, 50);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);
  try {
    const body = await req.json() as { url?: string };
    const url = new URL(body.url ?? '');
    if (!['https:', 'http:'].includes(url.protocol) || isPrivateHost(url.hostname)) {
      return json({ error: 'このURLは読み込めません' }, 400);
    }
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FoodHealthRecipeImporter/1.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return json({ error: 'レシピページを取得できません' }, 422);
    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > 2_000_000) return json({ error: 'ページサイズが大きすぎます' }, 413);
    const html = (await response.text()).slice(0, 2_000_000);
    const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    let recipe: Record<string, unknown> | null = null;
    for (const block of blocks) {
      try {
        const parsed = JSON.parse(block[1].trim());
        for (const candidate of asArray(parsed)) {
          recipe = recipeNode(candidate);
          if (recipe) break;
        }
      } catch { /* invalid publisher JSON-LD */ }
      if (recipe) break;
    }
    if (!recipe) return json({ error: '構造化されたレシピを見つけられませんでした' }, 422);
    const nutrition = (recipe.nutrition ?? {}) as Record<string, unknown>;
    const calories = parseNumber(nutrition.calories);
    const protein = parseNumber(nutrition.proteinContent);
    const fat = parseNumber(nutrition.fatContent);
    const carbs = parseNumber(nutrition.carbohydrateContent);
    const fiber = parseNumber(nutrition.fiberContent);
    const sodium = parseNumber(nutrition.sodiumContent);
    return json({
      name: String(recipe.name ?? '取り込んだレシピ').slice(0, 160),
      source_url: url.toString(),
      servings: parseNumber(recipe.recipeYield) ?? 1,
      ingredients: asArray(recipe.recipeIngredient).map(String).slice(0, 100),
      instructions: instructionText(recipe.recipeInstructions),
      nutrients_per_serving: {
        energy_kcal: calories,
        protein_g: protein,
        fat_g: fat,
        carbohydrate_g: carbs,
        fiber_g: fiber,
        sodium_mg: sodium,
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'レシピを読み込めませんでした' }, 400);
  }
});
