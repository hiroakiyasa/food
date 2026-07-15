import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import type { Database } from '@/src/types/database';

type HealthCheckup = Database['public']['Tables']['health_checkups']['Row'];
type DailyHealthData = Database['public']['Tables']['daily_health_data']['Row'];

export function useLatestCheckup() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['latest-checkup', user?.id],
    queryFn: async (): Promise<HealthCheckup | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('health_checkups')
        .select('*')
        .eq('user_id', user.id)
        .order('checkup_date', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useHealthDataRange(startDate: string, endDate: string) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['health-data', user?.id, startDate, endDate],
    queryFn: async (): Promise<DailyHealthData[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('daily_health_data')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}
