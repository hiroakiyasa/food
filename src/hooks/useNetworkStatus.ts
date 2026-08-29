import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false;
      setIsOnline(online);
      onlineManager.setOnline(online);
    });

    return () => unsubscribe();
  }, []);

  return isOnline;
}
