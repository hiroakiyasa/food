import { healthBridge, type HealthData } from './nativeHealthBridge';
import { syncHealthKitData } from './syncHealthKit';
import { toLocalDateString } from '@/src/utils/formatters';

export async function syncHealthData(days = 7): Promise<number> {
  const entries: HealthData[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = toLocalDateString(date);

    const startOfDay = new Date(dateStr + 'T00:00:00');
    const endOfDay = new Date(dateStr + 'T23:59:59');

    const [steps, activeEnergyKcal, restingHeartRate, sleepHours, weight] = await Promise.all([
      healthBridge.getSteps(startOfDay, endOfDay),
      healthBridge.getActiveEnergy(startOfDay, endOfDay),
      healthBridge.getRestingHeartRate(startOfDay, endOfDay),
      healthBridge.getSleepHours(startOfDay, endOfDay),
      i === 0 ? healthBridge.getWeight() : Promise.resolve(null),
    ]);

    entries.push({
      date: dateStr,
      steps: steps ?? undefined,
      activeEnergyKcal: activeEnergyKcal ?? undefined,
      restingHeartRate: restingHeartRate ?? undefined,
      sleepHours: sleepHours ?? undefined,
      weight: weight ?? undefined,
    });
  }

  // Filter out entries with no data
  const validEntries = entries.filter(
    (e) => e.steps != null || e.activeEnergyKcal != null || e.restingHeartRate != null || e.sleepHours != null || e.weight != null,
  );

  if (validEntries.length === 0) return 0;

  // Map to the format expected by the Edge Function
  const mappedEntries = validEntries.map((e) => ({
    date: e.date,
    steps: e.steps,
    active_energy_kcal: e.activeEnergyKcal,
    resting_heart_rate: e.restingHeartRate,
    sleep_hours: e.sleepHours,
    weight_kg: e.weight,
  }));

  return syncHealthKitData(mappedEntries);
}
