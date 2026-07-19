import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

const MEAL_IMAGES_BUCKET = 'meal-images';
const CHECKUP_IMAGES_BUCKET = 'checkup-images';
const PRIVATE_MEAL_PREFIX = 'private:meal-images/';
const PRIVATE_CHECKUP_PREFIX = 'private:checkup-images/';

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
  const prefixToBucket: Array<[string, string]> = [
    [PRIVATE_MEAL_PREFIX, MEAL_IMAGES_BUCKET],
    [PRIVATE_CHECKUP_PREFIX, CHECKUP_IMAGES_BUCKET],
  ];
  if (!value) return null;
  for (const [prefix, bucket] of prefixToBucket) {
    if (!value.startsWith(prefix)) continue;
    const filePath = value.slice(prefix.length);
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60);
    if (error) throw error;
    return data.signedUrl;
  }
  return value;
}

// Checkup images contain sensitive medical information — the bucket must stay
// private, so callers get an opaque `private:` reference resolved on demand
// via resolvePrivateImageUrl, never a public URL.
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

  return `${PRIVATE_CHECKUP_PREFIX}${filePath}`;
}
