import { useQuery } from '@tanstack/react-query';

import { resolvePrivateImageUrl } from '@/src/lib/storage';

export function usePrivateImageUrl(value: string | null | undefined) {
  return useQuery({
    queryKey: ['private-image', value],
    queryFn: () => resolvePrivateImageUrl(value ?? null),
    enabled: !!value,
    staleTime: 45 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
