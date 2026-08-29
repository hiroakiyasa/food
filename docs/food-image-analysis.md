# Food image analysis handoff

The photo flow uses the same boundary as ReelMake:

1. Expo resizes the selected photo to a maximum edge of 1024px and encodes a compressed JPEG.
2. The signed-in client invokes the authenticated `analyze-food-image` Supabase Edge Function.
3. Gemini recognizes visible dishes, likely database search terms, portions, and confidence.
4. The Edge Function searches `food_items` and calculates nutrition from its per-100g values.
5. Only unmatched foods use Gemini's fallback estimate and are labeled `AI概算` in the UI.
6. The user can correct each portion or remove a false detection before saving.

The client never receives `GEMINI_API_KEY` or a Supabase secret/service-role key.

## Required configuration

Copy `.env.example` to `.env.local` and configure the public Supabase URL and publishable/anon key. Set `EXPO_PUBLIC_USE_MOCK=false` for the real backend.

Configure and deploy the server-side secret and function. The function prefers this secret; for compatibility with the existing ReelMake-style infrastructure, it can fall back to the service-role-protected `api_keys` row where `service_name = 'gemini'`:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY
npx supabase functions deploy analyze-food-image
```

To change the model without shipping a new app build:

```sh
npx supabase secrets set GEMINI_FOOD_MODEL=gemini-3.1-flash-lite
```

## Verification

Static-check the Edge Function:

```sh
npx -y deno-bin check --no-config supabase/functions/analyze-food-image/index.ts
```

Run the app type check:

```sh
npx tsc --noEmit
```

Production verification requires a linked Supabase project containing `food_items`, an authenticated test user, and a configured Gemini secret. Confirm that the result UI shows `食品DB` on matched items, displays salt equivalent, and saves the returned `food_item_id`.

## Accuracy contract

Photo-based portion and dish recognition is an estimate. Database-matched nutrition is calculated from stored per-100g values, but accuracy still depends on the recognized dish and estimated portion. The UI therefore exposes confidence, source, editable portions, removal, and a save-time disclaimer. This must not be presented as medical diagnosis or laboratory measurement.
