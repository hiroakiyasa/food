import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/authStore';
import { dailySummariesDb, type LocalDailySummary } from '@/src/lib/localDb';

export function useDailySummary(date: string) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['daily-summary', user?.id, date],
    queryFn: async (): Promise<LocalDailySummary | null> => {
      if (!user) return null;
      return dailySummariesDb.get(user.id, date);
    },
    enabled: !!user,
  });
}
