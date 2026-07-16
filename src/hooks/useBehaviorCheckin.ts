import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/src/stores/authStore';
import { supabase } from '@/src/lib/supabase';
import { getToday } from '@/src/utils/formatters';

export type BehaviorCheckinInput = {
  hunger?: number;
  energy?: number;
  mood?: number;
  context?: string;
  tiny_action?: string;
  completed?: boolean;
};

export function useBehaviorCheckin() {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['behavior-checkin', user?.id, getToday()],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from('behavior_checkins').select('*')
        .eq('user_id', user.id).eq('checkin_date', getToday()).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSaveBehaviorCheckin() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BehaviorCheckinInput) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('behavior_checkins').upsert({
        user_id: user.id,
        checkin_date: getToday(),
        ...input,
      }, { onConflict: 'user_id,checkin_date' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['behavior-checkin'] }),
  });
}
