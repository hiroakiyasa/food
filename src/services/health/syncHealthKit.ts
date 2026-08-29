import { supabase } from '@/src/lib/supabase';

interface HealthKitEntry {
  date: string;
  steps?: number;
  active_energy_kcal?: number;
  resting_heart_rate?: number;
  sleep_hours?: number;
  weight_kg?: number;
}

export async function syncHealthKitData(entries: HealthKitEntry[]): Promise<number> {
  const { data, error } = await supabase.functions.invoke('sync-healthkit', {
    body: { entries },
  });
  if (error) throw new Error(error.message);
  return data.synced;
}
