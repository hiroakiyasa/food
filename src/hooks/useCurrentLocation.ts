import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useUIStore, type CurrentLocation } from '@/src/stores/uiStore';

function toCurrentLocation(
  position: Location.LocationObject,
  address: Location.LocationGeocodedAddress | null,
): CurrentLocation {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    city: address?.city ?? address?.district ?? address?.subregion ?? null,
    region: address?.region ?? null,
    country: address?.country ?? address?.isoCountryCode ?? null,
    timezone: address?.timezone ?? null,
    updatedAt: new Date().toISOString(),
  };
}

async function reverseGeocode(position: Location.LocationObject) {
  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    return address ?? null;
  } catch {
    return null;
  }
}

export function useCurrentLocationSetup() {
  const initializedRef = useRef(false);
  const setCurrentLocation = useUIStore((s) => s.setCurrentLocation);
  const setLocationStatus = useUIStore((s) => s.setLocationStatus);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let mounted = true;

    const loadCurrentLocation = async () => {
      setLocationStatus('loading');

      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (mounted) setLocationStatus('unavailable');
          return;
        }

        let permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) {
          permission = await Location.requestForegroundPermissionsAsync();
        }

        if (!permission.granted) {
          if (mounted) setLocationStatus('denied');
          return;
        }

        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 1000 * 60 * 15,
          requiredAccuracy: 3000,
        });
        const position = lastKnown ?? await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const address = await reverseGeocode(position);

        if (!mounted) return;
        setCurrentLocation(toCurrentLocation(position, address));
        setLocationStatus('granted');
      } catch {
        if (mounted) setLocationStatus('error');
      }
    };

    void loadCurrentLocation();

    return () => {
      mounted = false;
    };
  }, [setCurrentLocation, setLocationStatus]);
}
