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

function isPrivateIp(ip: string): boolean {
  // IPv4 (including IPv4-mapped IPv6 like ::ffff:127.0.0.1)
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) {
    return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(v4);
  }
  // IPv6: loopback, unique-local fc00::/7, link-local fe80::/10
  const lower = ip.toLowerCase();
  return lower === '::1' || lower === '::' ||
    /^f[cd]/.test(lower) ||
    /^fe[89ab]/.test(lower);
}

// SSRF guard: the hostname string check alone is bypassable via DNS rebinding,
// so every candidate URL is also resolved and all its IPs must be public.
async function assertPublicUrl(url: URL): Promise<boolean> {
  if (!['https:', 'http:'].includes(url.protocol)) return false;
  if (isPrivateHost(url.hostname)) return false;
  if (isPrivateIp(url.hostname)) return false;

  // Literal IP hosts were validated above; resolve DNS names.
  if (!/^[\d.]+$/.test(url.hostname) && !url.hostname.includes(':')) {
    const records: string[] = [];
    for (const recordType of ['A', 'AAAA'] as const) {
      try {
        records.push(...await Deno.resolveDns(url.hostname, recordType));
      } catch { /* no records of this type */ }
    }
    if (records.length === 0) return false;
    if (records.some((ip) => isPrivateIp(ip))) return false;
  }
  return true;
}

const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;

// Fetch with manual redirects, re-validating every hop, and a hard streamed
// byte cap (Content-Length alone is attacker-controlled).
async function fetchPublicPage(initialUrl: URL): Promise<{ ok: boolean; status: number; html: string }> {
  let currentUrl = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await assertPublicUrl(currentUrl))) {
      return { ok: false, status: 400, html: '' };
    }
    const response = await fetch(currentUrl, {
      headers: { 'User-Agent': 'FoodHealthRecipeImporter/1.0' },
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (!location) return { ok: false, status: 422, html: '' };
      currentUrl = new URL(location, currentUrl);
      continue;
    }
    if (!response.ok || !response.body) {
      return { ok: false, status: 422, html: '' };
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return { ok: false, status: 413, html: '' };
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, status: response.status, html: new TextDecoder().decode(merged) };
  }
  return { ok: false, status: 422, html: '' };
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

  // Premium-only feature (MYレシピ登録): enforce server-side.
  const { data: profile } = await client
    .from('profiles')
    .select('is_premium')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.is_premium) {
    return json({ error: 'Premium required' }, 403);
  }

  try {
    const body = await req.json() as { url?: string };
    const url = new URL(body.url ?? '');
    const page = await fetchPublicPage(url);
    if (!page.ok) {
      if (page.status === 400) return json({ error: 'このURLは読み込めません' }, 400);
      if (page.status === 413) return json({ error: 'ページサイズが大きすぎます' }, 413);
      return json({ error: 'レシピページを取得できません' }, 422);
    }
    const html = page.html;
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
