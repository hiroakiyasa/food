export type NextMealSuggestion = {
  title: string;
  message: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  searchTerms: string[];
  tinyAction: string;
  tone: 'celebrate' | 'balance' | 'recover';
};

export function createNextMealSuggestion(input: {
  hour: number;
  calories: number;
  proteinG: number;
  fiberG: number;
  sodiumMg: number;
  targetCalories: number;
  targetProteinG: number;
  targetFiberG: number;
  targetSodiumMg: number;
}): NextMealSuggestion {
  const mealType = input.hour < 10 ? 'breakfast' : input.hour < 15 ? 'lunch' : input.hour < 21 ? 'dinner' : 'snack';
  const proteinRemaining = Math.max(0, input.targetProteinG - input.proteinG);
  const fiberRemaining = Math.max(0, input.targetFiberG - input.fiberG);
  const sodiumRatio = input.targetSodiumMg > 0 ? input.sodiumMg / input.targetSodiumMg : 0;
  const calorieRatio = input.targetCalories > 0 ? input.calories / input.targetCalories : 0;
  if (sodiumRatio >= 0.85) {
    return {
      title: '次は「塩分を足さずに満足」を選ぼう',
      message: `塩分は目安の${Math.round(sodiumRatio * 100)}%。焼き魚や豆腐、温野菜を、レモン・香味野菜で楽しむと整います。`,
      mealType,
      searchTerms: ['鮭 焼き', '冷奴', '温野菜'],
      tinyAction: '汁物を一品だけ外す',
      tone: 'balance',
    };
  }
  if (proteinRemaining >= 25) {
    return {
      title: '次の一食でたんぱく質を補給',
      message: `あと約${Math.round(proteinRemaining)}g。鶏むね、魚、卵や大豆を一品足すだけで十分です。`,
      mealType,
      searchTerms: ['鶏むね肉', '鮭', '納豆'],
      tinyAction: '主菜を先に決める',
      tone: 'balance',
    };
  }
  if (fiberRemaining >= 6) {
    return {
      title: '野菜・海藻を一皿足すと完成',
      message: `食物繊維はあと約${Math.round(fiberRemaining)}g。小松菜、きのこ、海藻の小鉢がおすすめです。`,
      mealType,
      searchTerms: ['小松菜 おひたし', 'きのこ', '海藻サラダ'],
      tinyAction: '緑の小鉢を一つ選ぶ',
      tone: 'celebrate',
    };
  }
  if (calorieRatio > 1.1) {
    return {
      title: '調整は明日ではなく、次の一口から',
      message: '食べ過ぎを取り返す必要はありません。次は空腹を確認して、温かい飲み物か軽い一品から選びましょう。',
      mealType,
      searchTerms: ['無糖ヨーグルト', '果物', '豆腐'],
      tinyAction: '食べる前に空腹を1〜5で確認する',
      tone: 'recover',
    };
  }
  return {
    title: 'いいバランスです。そのまま楽しもう',
    message: '次も主食・主菜・野菜のうち、まだ少ないものを一つ足せば十分です。',
    mealType,
    searchTerms: ['定食', '季節の野菜'],
    tinyAction: '最初の一口をゆっくり味わう',
    tone: 'celebrate',
  };
}
