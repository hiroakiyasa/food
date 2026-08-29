import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { dailySummariesDb, type LocalDailySummary } from '@/src/lib/localDb';
import { toLocalDateString } from '@/src/utils/formatters';
import type { Database } from '@/src/types/database';

type DailyHealthData = Database['public']['Tables']['daily_health_data']['Row'];

export interface InsightsData {
  dailySummaries: LocalDailySummary[];
  healthData: DailyHealthData[];
}

function getDateRange(period: '1W' | '1M' | '3M'): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case '1W':
      start.setDate(end.getDate() - 7);
      break;
    case '1M':
      start.setMonth(end.getMonth() - 1);
      break;
    case '3M':
      start.setMonth(end.getMonth() - 3);
      break;
  }
  return {
    start: toLocalDateString(start),
    end: toLocalDateString(end),
  };
}

export function useInsightsData(period: '1W' | '1M' | '3M') {
  const user = useAuthStore((s) => s.user);
  const { start, end } = getDateRange(period);

  return useQuery({
    queryKey: ['insights-data', user?.id, period],
    queryFn: async (): Promise<InsightsData> => {
      if (!user) return { dailySummaries: [], healthData: [] };

      const [summaries, healthResult] = await Promise.all([
        dailySummariesDb.getRange(user.id, start, end),
        supabase
          .from('daily_health_data')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: true }),
      ]);

      if (healthResult.error) throw healthResult.error;

      return {
        dailySummaries: summaries,
        healthData: (healthResult.data ?? []) as DailyHealthData[],
      };
    },
    enabled: !!user,
  });
}
