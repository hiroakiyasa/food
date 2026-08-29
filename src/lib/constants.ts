export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'public-anon-key-not-configured';

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
};

export const ACTIVITY_LEVELS = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: '座り仕事中心',
  light: '軽い運動',
  moderate: '適度な運動',
  active: '活発に運動',
  very_active: '非常に活発',
};

export const DISEASE_TYPES = [
  'hypertension',
  'diabetes',
  'dyslipidemia',
  'hyperuricemia',
  'kidney_disease',
  'liver_disease',
  'anemia',
] as const;
export type DiseaseType = (typeof DISEASE_TYPES)[number];

export const DISEASE_LABELS: Record<DiseaseType, string> = {
  hypertension: '高血圧',
  diabetes: '糖尿病',
  dyslipidemia: '脂質異常症',
  hyperuricemia: '高尿酸血症',
  kidney_disease: '腎臓病',
  liver_disease: '肝臓病',
  anemia: '貧血',
};

export const TRAFFIC_LIGHT = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
} as const;

export const GOALS = ['diet', 'body_make', 'health', 'none'] as const;
export type Goal = (typeof GOALS)[number];
export const GOAL_LABELS: Record<Goal, string> = {
  diet: 'ダイエット',
  body_make: '筋トレ・ボディメイク',
  health: '健康管理',
  none: '当てはまらない',
};

export const PACES = ['moderate', 'aggressive'] as const;
export type Pace = (typeof PACES)[number];
export const PACE_LABELS: Record<Pace, string> = {
  moderate: 'ゆっくり確実に',
  aggressive: '短期集中',
};

export const APPROACHES = ['diet_focused', 'balanced', 'exercise_focused'] as const;
export type Approach = (typeof APPROACHES)[number];
export const APPROACH_LABELS: Record<Approach, string> = {
  diet_focused: '食事中心',
  balanced: 'バランス型',
  exercise_focused: '運動中心',
};

export const HEALTH_CONCERNS = [
  'stress', 'fatigue', 'sleep', 'skin', 'liver', 'blood_pressure',
  'blood_sugar', 'cholesterol', 'bone', 'aging', 'constipation',
  'swelling', 'cold_sensitivity', 'anemia', 'eye_fatigue',
] as const;
export type HealthConcern = (typeof HEALTH_CONCERNS)[number];
export const HEALTH_CONCERN_LABELS: Record<HealthConcern, string> = {
  stress: 'ストレス',
  fatigue: '疲れやすい',
  sleep: '睡眠の質',
  skin: '肌トラブル',
  liver: '肝機能',
  blood_pressure: '血圧',
  blood_sugar: '血糖値',
  cholesterol: 'コレステロール',
  bone: '骨の健康',
  aging: 'エイジング',
  constipation: '便秘',
  swelling: 'むくみ',
  cold_sensitivity: '冷え',
  anemia: '貧血',
  eye_fatigue: '疲れ目',
};

// RevenueCat (public SDK keys — safe to expose in the client)
export const REVENUECAT_API_KEY_IOS =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
export const REVENUECAT_API_KEY_ANDROID =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
export const PREMIUM_ENTITLEMENT_ID = 'premium';
