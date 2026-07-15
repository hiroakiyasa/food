import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/authStore';
import { suggestionsDb, type LocalSuggestion } from '@/src/lib/localDb';
import { supabase } from '@/src/lib/supabase';

export function useSuggestions(limit = 10) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['suggestions', user?.id],
    queryFn: async (): Promise<LocalSuggestion[]> => {
      if (!user) return [];
      return suggestionsDb.getActive(user.id, limit);
    },
    enabled: !!user,
  });
}

export function useDismissSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await suggestionsDb.dismiss(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });
}

export function useGenerateSuggestions() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Call Edge Function to generate suggestions
      const { data, error } = await supabase.functions.invoke('generate-suggestion', {
        body: {},
      });
      if (error) throw new Error(error.message);

      // Save generated suggestions locally
      if (user && Array.isArray(data)) {
        for (const s of data as Omit<LocalSuggestion, 'id' | 'created_at'>[]) {
          await suggestionsDb.insert({ ...s, user_id: user.id });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });
}
