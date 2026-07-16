import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

const MEAL_IMAGES_BUCKET = 'meal-images';
const CHECKUP_IMAGES_BUCKET = 'checkup-images';
const PRIVATE_MEAL_PREFIX = 'private:meal-images/';

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

  return `${PRIVATE_MEAL_PREFIX}${filePath}`;
}

export async function resolvePrivateImageUrl(value: string | null): Promise<string | null> {
  if (!value) return null;
  if (!value.startsWith(PRIVATE_MEAL_PREFIX)) return value;
  const filePath = value.slice(PRIVATE_MEAL_PREFIX.length);
  const { data, error } = await supabase.storage
    .from(MEAL_IMAGES_BUCKET)
    .createSignedUrl(filePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
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
