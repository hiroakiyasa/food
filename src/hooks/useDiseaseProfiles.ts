import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import type { Database } from '@/src/types/database';

type DiseaseProfile = Database['public']['Tables']['disease_profiles']['Row'];

export function useDiseaseProfiles() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['disease-profiles', user?.id],
    queryFn: async (): Promise<DiseaseProfile[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('disease_profiles')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data ?? []) as DiseaseProfile[];
    },
    enabled: !!user,
  });
}

export function useUpdateDiseaseProfiles() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (diseaseTypes: string[]) => {
      if (!user) throw new Error('Not authenticated');

      // Delete existing
      await supabase.from('disease_profiles').delete().eq('user_id', user.id);

      // Insert new
      if (diseaseTypes.length > 0) {
        const rows = diseaseTypes.map((d) => ({
          user_id: user.id,
          disease_type: d,
        }));
        const { error } = await supabase
          .from('disease_profiles')
          .insert(rows as Record<string, unknown>[]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disease-profiles', user?.id] });
    },
  });
}
