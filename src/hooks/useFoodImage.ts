import { useQuery } from '@tanstack/react-query';
import type { FoodItemSearchResult } from '@/src/services/food/searchFood';
import { fetchFoodImage } from '@/src/services/food/fetchFoodImage';

export function useFoodImage(food: FoodItemSearchResult | null) {
  return useQuery<string | null>({
    queryKey: ['food-image', food?.id, food?.food_name, food?.food_name_en, food?.category_name],
    queryFn: () => fetchFoodImage(food!),
    enabled: !!food,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 3 * 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
