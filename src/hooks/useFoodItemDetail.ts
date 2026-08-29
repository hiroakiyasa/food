import { useQuery } from '@tanstack/react-query';
import { fetchFoodItemDetail } from '@/src/services/food/fetchFoodDetail';
import type { FoodItemWithDetails } from '@/src/services/food/fetchFoodDetail';

export function useFoodItemDetail(foodItemId: string | null) {
  return useQuery<FoodItemWithDetails | null>({
    queryKey: ['food-item-detail', foodItemId],
    queryFn: () => fetchFoodItemDetail(foodItemId!),
    enabled: !!foodItemId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
