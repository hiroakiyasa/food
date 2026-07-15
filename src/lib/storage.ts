import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

const MEAL_IMAGES_BUCKET = 'meal-images';
const CHECKUP_IMAGES_BUCKET = 'checkup-images';

export async function uploadMealImage(
  userId: string,
  mealId: string,
  base64: string,
): Promise<string> {
  const filePath = `${userId}/${mealId}.jpg`;
  const { error } = await supabase.storage
    .from(MEAL_IMAGES_BUCKET)
    .upload(filePath, decode(base64), {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(MEAL_IMAGES_BUCKET).getPublicUrl(filePath);
  return publicUrl;
}

export async function uploadCheckupImage(
  userId: string,
  checkupId: string,
  base64: string,
): Promise<string> {
  const filePath = `${userId}/${checkupId}.jpg`;
  const { error } = await supabase.storage
    .from(CHECKUP_IMAGES_BUCKET)
    .upload(filePath, decode(base64), {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(CHECKUP_IMAGES_BUCKET).getPublicUrl(filePath);
  return publicUrl;
}
