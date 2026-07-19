import { supabase } from '@/src/lib/supabase';
import { mealsDb, dailySummariesDb, streaksDb } from '@/src/lib/localDb';
import { addDays, getToday } from '@/src/utils/formatters';

interface BadgeRequirement {
  type: string;
  threshold: number;
}

// Evaluates every badge requirement against current data and inserts any
// newly earned user_badges rows. Fire-and-forget after meal writes — a
// failure here must never break recording.
export async function evaluateAndAwardBadges(userId: string): Promise<string[]> {
  const [defsResponse, earnedResponse] = await Promise.all([
    supabase.from('badge_definitions').select('id, requirement'),
    supabase.from('user_badges').select('badge_id').eq('user_id', userId),
  ]);
  if (defsResponse.error || !defsResponse.data?.length) return [];
  const earned = new Set((earnedResponse.data ?? []).map((row) => String(row.badge_id)));
  const candidates = defsResponse.data.filter((def) => !earned.has(String(def.id)));
  if (candidates.length === 0) return [];

  const today = getToday();
  const [meals, streaks, summaries, checkupResponse] = await Promise.all([
    mealsDb.getAllWithItems(userId),
    streaksDb.getAll(userId),
    dailySummariesDb.getRange(userId, addDays(today, -30), today),
    supabase.from('health_checkups').select('id').eq('user_id', userId).limit(1),
  ]);

  const mealCount = meals.length;
  const streakDays = streaks.find((s) => s.streak_type === 'daily_logging')?.current_count ?? 0;
  const breakfastDays = new Set(
    meals.filter((m) => m.meal_type === 'breakfast').map((m) => m.eaten_at.slice(0, 10)),
  ).size;
  const hasBalancedDay = summaries.some((s) => (s.daily_score ?? 0) >= 80);
  const veggieDays = summaries.filter((s) => (s.total_fiber_g ?? 0) >= 15).length;
  const hasCheckup = (checkupResponse.data?.length ?? 0) > 0;

  const meetsRequirement = (req: BadgeRequirement): boolean => {
    switch (req.type) {
      case 'meal_count':
        return mealCount >= req.threshold;
      case 'streak_days':
        return streakDays >= req.threshold;
      case 'breakfast_days':
        return breakfastDays >= req.threshold;
      case 'balanced_day':
        return hasBalancedDay;
      case 'veggie_week':
        return veggieDays >= req.threshold;
      case 'checkup_import':
        return hasCheckup;
      default:
        return false;
    }
  };

  const newlyEarned = candidates
    .filter((def) => {
      const req = def.requirement as unknown as BadgeRequirement | null;
      return req?.type != null && meetsRequirement(req);
    })
    .map((def) => String(def.id));

  if (newlyEarned.length === 0) return [];

  const { error } = await supabase.from('user_badges').insert(
    newlyEarned.map((badgeId) => ({ user_id: userId, badge_id: badgeId })),
  );
  if (error) return [];
  return newlyEarned;
}
