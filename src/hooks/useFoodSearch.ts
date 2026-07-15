import { useState, useEffect } from 'react';
import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import {
  searchFoodItems,
  searchFoodItemsPaged,
  fetchFoodCategories,
  type FoodItemSearchResult,
  type FoodCategory,
} from '@/src/services/food/searchFood';
import { getLocalCategories } from '@/src/services/food/localFoodSearch';

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useFoodSearch(query: string, category?: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery<FoodItemSearchResult[]>({
    queryKey: ['food-search', debouncedQuery, category],
    queryFn: () => searchFoodItems({ query: debouncedQuery, category }),
    enabled: debouncedQuery.length >= 1 || !!category,
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

const PAGE_SIZE = 50;

export function useFoodSearchInfinite(query: string, category?: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useInfiniteQuery<FoodItemSearchResult[]>({
    queryKey: ['food-search-inf', debouncedQuery, category],
    queryFn: ({ pageParam }) =>
      searchFoodItemsPaged({
        query: debouncedQuery,
        category,
        offset: (pageParam as number) ?? 0,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.flat().length,
    initialPageParam: 0,
    enabled: debouncedQuery.length >= 1 || !!category,
    staleTime: 10 * 60 * 1000,
  });
}

export function useFoodCategories() {
  return useQuery<FoodCategory[]>({
    queryKey: ['food-categories'],
    queryFn: fetchFoodCategories,
    // ローカルデータを即時表示し、Supabase 結果でバックグラウンド補完
    initialData: getLocalCategories,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
