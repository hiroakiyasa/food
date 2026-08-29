import { supabase } from '@/src/lib/supabase';
import type { Database } from '@/src/types/database';

type HealthCheckup = Database['public']['Tables']['health_checkups']['Row'];

export async function ocrHealthCheckup(imageBase64: string): Promise<HealthCheckup> {
  const { data, error } = await supabase.functions.invoke('ocr-health-checkup', {
    body: { image_base64: imageBase64 },
  });
  if (error) throw new Error(error.message);
  return data as HealthCheckup;
}
