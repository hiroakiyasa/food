import { supabase } from '@/src/lib/supabase';
import type { Database } from '@/src/types/database';

type CommercialProduct = Database['public']['Tables']['commercial_products']['Row'];
type TokuhoProduct = Database['public']['Tables']['tokuho_products']['Row'];

export interface BarcodeResult {
  product: CommercialProduct;
  tokuho: TokuhoProduct | null;
}

export async function lookupBarcode(barcode: string): Promise<CommercialProduct | null> {
  const { data, error } = await supabase.functions.invoke('barcode-lookup', {
    body: { barcode },
  });
  if (error) throw new Error(error.message);
  return data as CommercialProduct | null;
}

/**
 * バーコードから商品情報と特保/機能性表示情報を同時に取得する
 */
export async function lookupBarcodeWithTokuho(barcode: string): Promise<BarcodeResult | null> {
  const product = await lookupBarcode(barcode);
  if (!product) return null;

  let tokuho: TokuhoProduct | null = null;

  // 商品に tokuho_id が紐付いている場合はそちらを使用
  if (product.tokuho_id) {
    const { data } = await supabase
      .from('tokuho_products')
      .select('*')
      .eq('id', product.tokuho_id)
      .maybeSingle();
    tokuho = data;
  } else {
    // JANコードで特保DBを検索（バーコードと一致するものを探す）
    const { data } = await supabase
      .from('tokuho_products')
      .select('*')
      .contains('jan_codes', [barcode])
      .maybeSingle();
    tokuho = data;
  }

  return { product, tokuho };
}
