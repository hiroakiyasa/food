import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Looks up a scanned JAN/EAN barcode in commercial_products.
// Contract (src/services/barcode/lookup.ts): request { barcode: string },
// response = the commercial_products row or null when not found.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { barcode } = await req.json().catch(() => ({})) as { barcode?: string };
    if (!barcode || typeof barcode !== 'string' || !/^\d{8,14}$/.test(barcode)) {
      return Response.json({ error: 'A valid barcode is required' }, { status: 400 });
    }

    const { data: product, error } = await supabase
      .from('commercial_products')
      .select('*')
      .eq('barcode', barcode)
      .maybeSingle();

    if (error) {
      console.error('[barcode-lookup] query failed:', error.message);
      return Response.json({ error: 'Lookup failed' }, { status: 500 });
    }

    return Response.json(product ?? null);
  } catch (error) {
    console.error('[barcode-lookup] error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
});
