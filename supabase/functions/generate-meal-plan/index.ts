import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MealPlanMeal {
  name: string;
  description: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: string[];
  recipe: string;
}

interface MealPlanDay {
  date: string;
  day_name: string;
  meals: {
    breakfast: MealPlanMeal;
    lunch: MealPlanMeal;
    dinner: MealPlanMeal;
    snack: MealPlanMeal | null;
  };
  total_kcal: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

interface WeeklyMealPlan {
  days: MealPlanDay[];
  week_summary: {
    avg_kcal: number;
    avg_protein_g: number;
    avg_carbs_g: number;
    avg_fat_g: number;
    theme: string;
    highlights: string[];
  };
}

interface GroceryItem {
  name: string;
  amount: string;
  estimated_cost_yen?: number;
}

interface GroceryCategory {
  name: string;
  emoji: string;
  items: GroceryItem[];
}

interface GroceryList {
  categories: GroceryCategory[];
  total_estimated_cost_yen?: number;
}

// ─── Day name helper ──────────────────────────────────────────────────────────

const DAY_NAMES_JA = ['日', '月', '火', '水', '木', '金', '土'];

function getWeekStart(offsetWeeks = 0): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + offsetWeeks * 7);
  return monday.toISOString().split('T')[0]!;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // JWT からユーザーを取得
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Premium-only feature: enforce server-side so the client gate cannot be bypassed.
    const { data: premiumProfile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!premiumProfile?.is_premium) {
      return Response.json({ error: 'Premium required' }, { status: 403 });
    }

    // Per-user daily rate limit (cost guard; `force` bypasses the plan cache).
    const DAILY_LIMIT = 10;
    const { data: usageCount, error: usageError } = await supabase.rpc('increment_ai_usage', {
      p_user_id: user.id,
      p_function: 'generate-meal-plan',
    });
    if (usageError) {
      console.error('[generate-meal-plan] rate-limit counter failed:', usageError.message);
    } else if ((usageCount ?? 0) > DAILY_LIMIT) {
      return Response.json(
        { error: '本日のプラン生成回数の上限に達しました。明日また利用できます。' },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({})) as { week_offset?: number; force?: boolean };
    const weekOffset = body.week_offset ?? 0;
    const force = body.force ?? false;
    const weekStart = getWeekStart(weekOffset);

    // キャッシュ確認（force=false の場合は既存プランを返す）
    if (!force) {
      const { data: existing } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .maybeSingle();

      if (existing) {
        return Response.json({ plan: existing, cached: true });
      }
    }

    // 栄養目標を取得
    const { data: targetRow } = await supabase
      .from('nutrition_targets')
      .select('energy_kcal, protein_g, fat_g, carbohydrate_g, fiber_g')
      .eq('user_id', user.id)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    const target = targetRow ?? {
      energy_kcal: 2000,
      protein_g: 60,
      fat_g: 55,
      carbohydrate_g: 250,
      fiber_g: 21,
    };

    // 過去7日のサマリーを取得（適応型プランのため）
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const { data: recentSummaries } = await supabase
      .from('daily_summaries')
      .select('date, total_energy_kcal, total_protein_g, total_fat_g, total_carbohydrate_g, total_fiber_g')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // プロフィールを取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('gender, height_cm, weight_kg, active_conditions, goal')
      .eq('user_id', user.id)
      .maybeSingle();

    // Anthropic API でプラン生成
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return Response.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const prompt = buildPrompt({
      target,
      recentSummaries: recentSummaries ?? [],
      profile,
      weekStart,
    });

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      console.error('Anthropic API error:', errBody);
      return Response.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const aiJson = await aiResponse.json() as {
      content: Array<{ type: string; text: string }>;
    };
    const rawText = aiJson.content.find((c) => c.type === 'text')?.text ?? '';

    // JSON 抽出
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) ??
      rawText.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      return Response.json({ error: 'Failed to parse AI response' }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[1]!) as {
      plan: WeeklyMealPlan;
      grocery_list: GroceryList;
    };

    // Supabase に保存 (upsert)
    const { data: saved, error: saveError } = await supabase
      .from('meal_plans')
      .upsert({
        user_id: user.id,
        week_start: weekStart,
        plan_data: parsed.plan as unknown as Record<string, unknown>,
        grocery_list: parsed.grocery_list as unknown as Record<string, unknown>,
        generated_at: new Date().toISOString(),
        accepted: false,
      }, { onConflict: 'user_id,week_start' })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      return Response.json({ error: 'Failed to save plan' }, { status: 500 });
    }

    return Response.json({ plan: saved, cached: false });
  } catch (err) {
    console.error('Unexpected error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(params: {
  target: { energy_kcal: number; protein_g: number; fat_g: number; carbohydrate_g: number; fiber_g: number };
  recentSummaries: Array<{ date: string; total_energy_kcal: number; total_protein_g: number; total_fiber_g: number }>;
  profile: { gender?: string | null; height_cm?: number | null; weight_kg?: number | null; active_conditions?: string[] | null; goal?: string | null } | null;
  weekStart: string;
}): string {
  const { target, recentSummaries, profile, weekStart } = params;

  // 過去実績サマリー
  const avgKcal = recentSummaries.length > 0
    ? Math.round(recentSummaries.reduce((s, r) => s + (r.total_energy_kcal ?? 0), 0) / recentSummaries.length)
    : target.energy_kcal;
  const avgProtein = recentSummaries.length > 0
    ? Math.round(recentSummaries.reduce((s, r) => s + (r.total_protein_g ?? 0), 0) / recentSummaries.length)
    : target.protein_g;

  const conditions = profile?.active_conditions?.join(', ') ?? 'なし';
  const goal = profile?.goal ?? '健康維持';

  // 7日分の日付と曜日を生成
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().split('T')[0]!,
      day_name: DAY_NAMES_JA[d.getDay()]!,
    };
  });

  return `あなたは栄養学の専門知識を持つAI食事アシスタントです。資格者（医師・管理栄養士など）を名乗らず、診断・治療にあたる助言をせず、ユーザーの1週間の食事プランを日本語で作成してください。

## ユーザー情報
- 目標カロリー: ${target.energy_kcal} kcal/日
- 目標タンパク質: ${target.protein_g} g/日
- 目標脂質: ${target.fat_g} g/日
- 目標炭水化物: ${target.carbohydrate_g} g/日
- 目標食物繊維: ${target.fiber_g} g/日
- 過去7日の平均カロリー: ${avgKcal} kcal
- 過去7日の平均タンパク質: ${avgProtein} g
- 健康条件: ${conditions}
- 目標: ${goal}

## 対象週
${days.map((d) => `- ${d.date} (${d.day_name}曜日)`).join('\n')}

## 出力要件
以下の JSON 形式で出力してください（コードブロックで囲む）:

\`\`\`json
{
  "plan": {
    "days": [
      {
        "date": "YYYY-MM-DD",
        "day_name": "月",
        "meals": {
          "breakfast": {
            "name": "メニュー名",
            "description": "一言説明",
            "kcal": 400,
            "protein_g": 15,
            "carbs_g": 60,
            "fat_g": 8,
            "items": ["食材1", "食材2"],
            "recipe": "簡単な調理手順"
          },
          "lunch": { ... },
          "dinner": { ... },
          "snack": null
        },
        "total_kcal": 1800,
        "total_protein_g": 80,
        "total_carbs_g": 220,
        "total_fat_g": 50
      }
    ],
    "week_summary": {
      "avg_kcal": 1800,
      "avg_protein_g": 80,
      "avg_carbs_g": 220,
      "avg_fat_g": 50,
      "theme": "タンパク質強化週",
      "highlights": ["3日に1回魚料理", "毎朝の発酵食品習慣"]
    }
  },
  "grocery_list": {
    "categories": [
      {
        "name": "野菜・果物",
        "emoji": "🥬",
        "items": [
          { "name": "ほうれん草", "amount": "2袋 (400g)", "estimated_cost_yen": 200 }
        ]
      }
    ],
    "total_estimated_cost_yen": 8000
  }
}
\`\`\`

注意:
- 日本のスーパーで買える食材を使用
- 和食を中心に洋食・中食をバランスよく
- 旬の食材を優先
- 調理の手間を考慮（平日は15分以内、週末は30分以内）
- 各日のカロリーは目標±10%以内に収める`;
}
