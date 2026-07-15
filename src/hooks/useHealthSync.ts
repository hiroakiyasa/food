import { useMutation, useQueryClient } from '@tanstack/react-query';
import { healthBridge } from '@/src/services/health/nativeHealthBridge';
import { syncHealthData } from '@/src/services/health/healthSync';
import { useHealthStore } from '@/src/stores/healthStore';

export function useHealthSync() {
  const queryClient = useQueryClient();
  const { setSyncing, setLastSyncAt } = useHealthStore();

  return useMutation({
    mutationFn: async () => {
      setSyncing(true);
      const synced = await syncHealthData(7);
      return synced;
    },
    onSuccess: () => {
      setLastSyncAt(new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: ['health-data'] });
    },
    onSettled: () => {
      setSyncing(false);
    },
  });
}

export function useHealthConnection() {
  const { setConnected, setLastSyncAt } = useHealthStore();

  const connect = async (): Promise<boolean> => {
    const available = await healthBridge.isAvailable();
    if (!available) return false;

    const granted = await healthBridge.requestPermissions();
    if (granted) {
      setConnected(true);
    }
    return granted;
  };

  const disconnect = async (): Promise<void> => {
    await healthBridge.disconnect();
    setConnected(false);
    setLastSyncAt(null);
  };

  return { connect, disconnect };
}
