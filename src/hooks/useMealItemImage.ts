import { useQuery } from '@tanstack/react-query';
import { fetchMealItemImage } from '@/src/services/food/fetchFoodImage';

/**
 * Fetch an Unsplash image for a meal item by its detected name.
 * Returns the first item's image when given an array of names.
 */
export function useMealItemImage(name: string | null | undefined) {
  return useQuery<string | null>({
    queryKey: ['meal-item-image', name],
    queryFn: () => fetchMealItemImage(name!, 'small'),
    enabled: !!name?.trim(),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 3 * 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

export function useMealItemThumb(name: string | null | undefined) {
  return useQuery<string | null>({
    queryKey: ['meal-item-thumb', name],
    queryFn: () => fetchMealItemImage(name!, 'thumb'),
    enabled: !!name?.trim(),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 3 * 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
