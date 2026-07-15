import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/authStore';
import { useProfile } from '@/src/hooks/useProfile';
import { exportMealsToCSV } from '@/src/services/export/csvExport';

export function useExportMeals() {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (months?: number) => {
      if (!user) throw new Error('Not authenticated');
      if (!profile?.is_premium) throw new Error('Premium required');

      await exportMealsToCSV({ userId: user.id, months });
    },
  });
}
