import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface CheckupAdvice {
  overall_assessment: string;
  priority_improvements: Array<{
    metric: string;
    current_value: string;
    target: string;
    foods_to_increase: string[];
    foods_to_limit: string[];
    reason: string;
  }>;
  weekly_plan_focus: string[];
  lifestyle_tips: string[];
  next_checkup_note: string;
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

    // Premium-only feature: enforce server-side so the client gate cannot be bypassed.
    const { data: premiumProfile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!premiumProfile?.is_premium) {
      return Response.json({ error: 'Premium required' }, { status: 403 });
    }

    // Per-user daily rate limit (cost guard for the metered AI API).
    const DAILY_LIMIT = 10;
    const { data: usageCount, error: usageError } = await supabase.rpc('increment_ai_usage', {
      p_user_id: user.id,
      p_function: 'health-check-advice',
    });
    if (usageError) {
      console.error('[health-check-advice] rate-limit counter failed:', usageError.message);
    } else if ((usageCount ?? 0) > DAILY_LIMIT) {
      return Response.json(
        { error: '本日のAIアドバイス生成回数の上限に達しました。明日また利用できます。' },
        { status: 429 },
      );
    }

    const { checkup_id } = await req.json().catch(() => ({})) as { checkup_id?: string };
    if (!checkup_id) {
      return Response.json({ error: 'checkup_id is required' }, { status: 400 });
    }

    // 健診データ取得
    const { data: checkup, error: fetchError } = await supabase
      .from('health_checkups')
      .select('*')
      .eq('id', checkup_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !checkup) {
      return Response.json({ error: 'Checkup not found' }, { status: 404 });
    }

    // Anthropic API でアドバイス生成
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return Response.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const prompt = `あなたは栄養学の専門知識を持つAI食事アシスタントです。資格者（医師・管理栄養士など）を名乗らず、診断や治療の判断をせず、一般的な食事改善の情報として、以下の健診結果に基づいた具体的な食事アドバイスを提供してください。受診が必要かどうかの判断には言及せず、気になる数値は医療機関に相談するよう促してください。

## 健診結果
- 検査日: ${checkup.checkup_date}
${checkup.hba1c != null ? `- HbA1c: ${checkup.hba1c}%` : ''}
${checkup.fasting_glucose != null ? `- 空腹時血糖: ${checkup.fasting_glucose} mg/dL` : ''}
${checkup.triglycerides != null ? `- 中性脂肪: ${checkup.triglycerides} mg/dL` : ''}
${checkup.ldl_cholesterol != null ? `- LDLコレステロール: ${checkup.ldl_cholesterol} mg/dL` : ''}
${checkup.hdl_cholesterol != null ? `- HDLコレステロール: ${checkup.hdl_cholesterol} mg/dL` : ''}
${checkup.bmi != null ? `- BMI: ${checkup.bmi}` : ''}
${checkup.systolic_bp != null ? `- 血圧: ${checkup.systolic_bp}/${checkup.diastolic_bp} mmHg` : ''}

以下のJSON形式で食事改善アドバイスを提供してください（コードブロックで囲む）:

\`\`\`json
{
  "overall_assessment": "総合評価（2-3文）",
  "priority_improvements": [
    {
      "metric": "改善が必要な指標名",
      "current_value": "現在値（単位付き）",
      "target": "目標値の説明",
      "foods_to_increase": ["積極的に摂りたい食品1", "食品2"],
      "foods_to_limit": ["控えたい食品1", "食品2"],
      "reason": "改善理由と仕組みの説明（1-2文）"
    }
  ],
  "weekly_plan_focus": ["今週意識したいポイント1", "ポイント2", "ポイント3"],
  "lifestyle_tips": ["食事以外のアドバイス1", "アドバイス2"],
  "next_checkup_note": "次回検査前に注意すべきこと"
}
\`\`\`

注意:
- 正常範囲内の指標はpriority_improvementsに含めない
- 具体的な日本の食材名を使用
- 医療診断ではなく栄養管理の観点からのアドバイスであることを前提とする`;

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      return Response.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const aiJson = await aiResponse.json() as {
      content: Array<{ type: string; text: string }>;
    };
    const rawText = aiJson.content.find((c) => c.type === 'text')?.text ?? '';

    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) ??
      rawText.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      return Response.json({ error: 'Failed to parse AI response' }, { status: 502 });
    }

    const advice: CheckupAdvice = JSON.parse(jsonMatch[1]!);

    // advice_json をDBに保存（health_checkupsテーブルにadvice_jsonカラムがある前提）
    await supabase
      .from('health_checkups')
      .update({ advice_json: advice as unknown as Record<string, unknown> })
      .eq('id', checkup_id);

    return Response.json({ advice });
  } catch (err) {
    console.error('Unexpected error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});
