import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { ocrHealthCheckup } from '@/src/services/health/ocrCheckup';
import type { Database } from '@/src/types/database';

export interface CheckupAdvice {
  overall_assessment: string;
  priority_improvements: string[];
  weekly_plan_focus: string[];
  lifestyle_tips: string[];
  next_checkup_note: string;
}

type HealthCheckup = Database['public']['Tables']['health_checkups']['Row'];

export function useHealthCheckups() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['health-checkups', user?.id],
    queryFn: async (): Promise<HealthCheckup[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('health_checkups')
        .select('*')
        .eq('user_id', user.id)
        .order('checkup_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as HealthCheckup[];
    },
    enabled: !!user,
  });
}

export function useUploadCheckup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (asset: ImagePicker.ImagePickerAsset): Promise<HealthCheckup> => {
      // Convert image URI to base64
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          // Strip data URL prefix
          resolve(result.split(',')[1] ?? result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      return ocrHealthCheckup(base64);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-checkups'] });
    },
  });
}

export function useGenerateCheckupAdvice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checkupId: string): Promise<CheckupAdvice> => {
      const { data, error } = await supabase.functions.invoke('health-check-advice', {
        body: { checkup_id: checkupId },
      });
      if (error) throw error;
      return (data as { advice: CheckupAdvice }).advice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-checkups'] });
    },
  });
}
