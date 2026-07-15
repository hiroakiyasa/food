import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import type { Database } from '@/src/types/database';

type TokuhoProduct = Database['public']['Tables']['tokuho_products']['Row'];

/**
 * バーコードから特保/機能性表示食品情報を取得するフック
 */
export function useTokuhoByBarcode(barcode: string | null | undefined) {
  return useQuery({
    queryKey: ['tokuho', 'barcode', barcode],
    queryFn: async (): Promise<TokuhoProduct | null> => {
      if (!barcode) return null;

      // jan_codes 配列にバーコードが含まれる製品を検索
      const { data, error } = await supabase
        .from('tokuho_products')
        .select('*')
        .contains('jan_codes', [barcode])
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!barcode,
    staleTime: 24 * 60 * 60 * 1000, // 24時間キャッシュ（マスタデータ）
  });
}

/**
 * tokuho_id から特保/機能性表示食品情報を取得するフック
 */
export function useTokuhoById(tokuhoId: string | null | undefined) {
  return useQuery({
    queryKey: ['tokuho', 'id', tokuhoId],
    queryFn: async (): Promise<TokuhoProduct | null> => {
      if (!tokuhoId) return null;

      const { data, error } = await supabase
        .from('tokuho_products')
        .select('*')
        .eq('id', tokuhoId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!tokuhoId,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

/**
 * 商品名で特保/機能性表示食品を検索するフック
 */
export function useTokuhoSearch(query: string) {
  return useQuery({
    queryKey: ['tokuho', 'search', query],
    queryFn: async (): Promise<TokuhoProduct[]> => {
      if (!query || query.length < 2) return [];

      const { data, error } = await supabase
        .from('tokuho_products')
        .select('*')
        .ilike('product_name', `%${query}%`)
        .order('product_name')
        .limit(20);

      if (error) throw error;
      return data ?? [];
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}
