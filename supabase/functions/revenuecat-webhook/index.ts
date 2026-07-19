// Supabase Edge Function: RevenueCat Webhook Handler
// Receives webhook events from RevenueCat and updates subscription status
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id?: string;
  expiration_at_ms?: number;
  purchased_at_ms?: number;
  period_type?: string;
}

interface WebhookBody {
  api_version: string;
  event: RevenueCatEvent;
}

function getPlanFromProductId(productId: string | undefined): 'monthly' | 'half_yearly' | 'yearly' {
  if (!productId) return 'monthly';
  if (productId.includes('half_year') || productId.includes('6month') || productId.includes('six_month')) {
    return 'half_yearly';
  }
  if (productId.includes('year') || productId.includes('annual')) {
    return 'yearly';
  }
  return 'monthly';
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify webhook authorization. Fail closed: an unset secret must reject
  // every request — otherwise anyone could grant themselves premium for free.
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.error('[revenuecat-webhook] REVENUECAT_WEBHOOK_SECRET is not configured');
    return new Response('Webhook not configured', { status: 500 });
  }
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const body: WebhookBody = await req.json();
    const { event } = body;
    const userId = event.app_user_id;

    const plan = getPlanFromProductId(event.product_id);
    const now = new Date().toISOString();

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL': {
        const periodEnd = event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toISOString()
          : null;
        const periodStart = event.purchased_at_ms
          ? new Date(event.purchased_at_ms).toISOString()
          : now;

        await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            plan,
            status: 'active',
            current_period_start: periodStart,
            current_period_end: periodEnd,
            revenucat_app_user_id: userId,
            updated_at: now,
          },
          { onConflict: 'user_id' },
        );

        await supabase
          .from('profiles')
          .update({ is_premium: true, updated_at: now })
          .eq('user_id', userId);

        break;
      }

      case 'CANCELLATION': {
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: now })
          .eq('user_id', userId);

        break;
      }

      case 'EXPIRATION': {
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: now })
          .eq('user_id', userId);

        await supabase
          .from('profiles')
          .update({ is_premium: false, updated_at: now })
          .eq('user_id', userId);

        break;
      }

      default:
        // Ignore other event types (PRODUCT_CHANGE, BILLING_ISSUE, etc.)
        break;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
