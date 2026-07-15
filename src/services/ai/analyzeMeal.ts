import { supabase } from '@/src/lib/supabase';
import type { AIFoodAnalysis } from '@/src/types/nutrition';

export async function analyzeFoodImage(imageBase64: string): Promise<AIFoodAnalysis> {
  const { data, error } = await supabase.functions.invoke('analyze-food-image', {
    body: { image_base64: imageBase64 },
  });
  if (error) throw new Error(error.message);
  return data as AIFoodAnalysis;
}
