import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/authStore';
import { weeklyBuffersDb, type LocalWeeklyBuffer } from '@/src/lib/localDb';
import { getWeekStart } from '@/src/utils/formatters';

export function useWeeklyBuffer(date: string) {
  const user = useAuthStore((s) => s.user);
  const weekStart = getWeekStart(date);

  return useQuery({
    queryKey: ['weekly-buffer', user?.id, weekStart],
    queryFn: async (): Promise<LocalWeeklyBuffer | null> => {
      if (!user) return null;
      return weeklyBuffersDb.get(user.id, weekStart);
    },
    enabled: !!user,
  });
}
