import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import type { Database } from '@/src/types/database';

type TastePreference = Database['public']['Tables']['taste_preferences']['Row'];
type TastePreferenceUpdate = Database['public']['Tables']['taste_preferences']['Update'];

export function useTastePreferences() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['taste-preferences', user?.id],
    queryFn: async (): Promise<TastePreference | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('taste_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as TastePreference | null;
    },
    enabled: !!user,
  });
}

export function useUpdateTastePreferences() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: TastePreferenceUpdate) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('taste_preferences')
        .upsert({ user_id: user.id, ...updates } as Record<string, unknown>);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taste-preferences', user?.id] });
    },
  });
}
