import { supabase } from '@/src/lib/supabase';

type MealAnalysisEvent = {
  userId: string;
  mealId?: string | null;
  eventType: 'analyzed' | 'corrected' | 'accepted' | 'failed';
  model?: string | null;
  detectedItems?: number | null;
  correctedItems?: number;
  latencyMs?: number | null;
  metrics?: Record<string, unknown>;
};

export async function recordMealAnalysisEvent(event: MealAnalysisEvent): Promise<void> {
  const { error } = await supabase.from('meal_analysis_events').insert({
    user_id: event.userId,
    meal_id: event.mealId ?? null,
    event_type: event.eventType,
    model: event.model ?? null,
    detected_items: event.detectedItems ?? null,
    corrected_items: event.correctedItems ?? 0,
    latency_ms: event.latencyMs ?? null,
    metrics: event.metrics ?? {},
  });
  if (error && __DEV__) console.warn('Meal analysis metrics could not be saved', error.message);
}
