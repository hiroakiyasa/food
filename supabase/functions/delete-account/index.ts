import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const STORAGE_BUCKETS = ['meal-images', 'checkup-images'];

async function deleteUserStorage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  for (const bucket of STORAGE_BUCKETS) {
    // Objects are stored under `${userId}/...`; list then remove in batches.
    const { data: objects, error: listError } = await supabase.storage
      .from(bucket)
      .list(userId, { limit: 1000 });
    if (listError || !objects?.length) continue;
    const paths = objects.map((obj) => `${userId}/${obj.name}`);
    await supabase.storage.from(bucket).remove(paths);
  }
}

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

    // Require explicit confirmation in the body so the endpoint cannot delete
    // an account via a blind/forged single request.
    const body = await req.json().catch(() => ({})) as { confirm?: string };
    if (body.confirm !== 'DELETE') {
      return Response.json({ error: 'Confirmation required' }, { status: 400 });
    }

    await deleteUserStorage(supabase, user.id);

    // Tables not covered by ON DELETE CASCADE from auth.users are cleaned up
    // via profiles cascade; deleting the auth user removes the rest.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('[delete-account] failed:', deleteError.message);
      return Response.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[delete-account] error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
});
