import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { streaksDb, type LocalStreak } from '@/src/lib/localDb';
import type { Database } from '@/src/types/database';

type BadgeDefinition = Database['public']['Tables']['badge_definitions']['Row'];
type UserBadge = Database['public']['Tables']['user_badges']['Row'];

export interface BadgeWithStatus extends BadgeDefinition {
  earned: boolean;
  earned_at: string | null;
}

export function useBadges() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['badges', user?.id],
    queryFn: async (): Promise<BadgeWithStatus[]> => {
      const { data: definitions, error: defError } = await supabase
        .from('badge_definitions')
        .select('*')
        .order('category');
      if (defError) throw defError;

      const defs = (definitions ?? []) as BadgeDefinition[];

      if (!user) {
        return defs.map((d) => ({ ...d, earned: false, earned_at: null }));
      }

      const { data: userBadges, error: ubError } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id);
      if (ubError) throw ubError;

      const badges = (userBadges ?? []) as UserBadge[];
      const earnedMap = new Map(badges.map((ub) => [ub.badge_id, ub.earned_at]));

      return defs.map((d) => ({
        ...d,
        earned: earnedMap.has(d.id),
        earned_at: earnedMap.get(d.id) ?? null,
      }));
    },
  });
}

// Streaks are stored locally
export function useStreaks() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['streaks', user?.id],
    queryFn: async (): Promise<LocalStreak[]> => {
      if (!user) return [];
      return streaksDb.getAll(user.id);
    },
    enabled: !!user,
  });
}
