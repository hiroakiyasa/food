import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/src/lib/supabase';
import { useProfile } from '@/src/hooks/useProfile';
import { PremiumLockCard } from '@/src/components/ui/PremiumLockCard';
import { palette, pressed, radius, shadow, spacing, typography, useThemeColors } from '@/src/lib/theme';

type ImportedRecipe = {
  name: string;
  source_url: string;
  servings: number;
  ingredients: string[];
  instructions: string[];
  nutrients_per_serving: Record<string, number | null>;
};

export default function RecipeImportModal() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const colors = useThemeColors(isDark);
  const { data: profile } = useProfile();
  const isPremium = profile?.is_premium ?? false;
  const [url, setUrl] = useState('');
  const [recipe, setRecipe] = useState<ImportedRecipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const importRecipe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-recipe', { body: { url: url.trim() } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRecipe(data as ImportedRecipe);
    } catch (error) {
      Alert.alert('取り込めませんでした', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveRecipe = async () => {
    if (!recipe) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインが必要です');
      const { error } = await supabase.from('user_recipes').insert({ ...recipe, user_id: user.id });
      if (error) throw error;
      Alert.alert('保存しました', 'MYレシピとしていつでも使えます', [{ text: '閉じる', onPress: () => router.dismiss() }]);
    } catch (error) {
      Alert.alert('保存できませんでした', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!isPremium) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: palette.primary }]}>RECIPE IMPORT</Text>
            <Text style={[styles.title, { color: colors.text }]}>レシピURLを取り込む</Text>
          </View>
          <Pressable
            onPress={() => router.dismiss()}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="閉じる"
          >
            <Text style={{ color: colors.text, fontSize: 24 }}>×</Text>
          </Pressable>
        </View>
        <PremiumLockCard
          title="MYレシピ登録"
          description="お気に入りのレシピページのURLを貼るだけで、材料と栄養価を自動で取り込み、いつでも記録に使えます。"
          features={[
            'レシピURLから栄養価を自動計算',
            'MYレシピとして保存・再利用',
          ]}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: palette.primary }]}>RECIPE IMPORT</Text>
          <Text style={[styles.title, { color: colors.text }]}>レシピURLを取り込む</Text>
        </View>
        <Pressable onPress={() => router.dismiss()} style={styles.close}><Text style={{ color: colors.text, fontSize: 24 }}>×</Text></Pressable>
      </View>
      <View style={[styles.inputCard, { backgroundColor: colors.surface }]}>
        <Text style={[typography.bodyBold, { color: colors.text }]}>レシピページのURL</Text>
        <TextInput
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://..."
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          accessibilityLabel="取り込むレシピのURL"
        />
        <Pressable
          onPress={() => void importRecipe()}
          disabled={loading || !/^https?:\/\//.test(url.trim())}
          style={({ pressed: isPressed }) => [styles.importButton, pressed(isPressed), (loading || !url) && { opacity: 0.5 }]}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <><FontAwesome name="magic" size={16} color="#FFFFFF" /><Text style={styles.importButtonText}>取り込む</Text></>}
        </Pressable>
      </View>
      {recipe && (
        <View style={[styles.recipeCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.recipeTitle, { color: colors.text }]}>{recipe.name}</Text>
          <Text style={[typography.caption1, { color: colors.textMuted }]}>{recipe.servings}人分</Text>
          <View style={styles.macroRow}>
            <Text style={styles.kcal}>{Math.round(recipe.nutrients_per_serving.energy_kcal ?? 0)} kcal</Text>
            <Text style={{ color: palette.protein }}>P {recipe.nutrients_per_serving.protein_g ?? '-'}g</Text>
            <Text style={{ color: palette.fat }}>F {recipe.nutrients_per_serving.fat_g ?? '-'}g</Text>
            <Text style={{ color: palette.carbs }}>C {recipe.nutrients_per_serving.carbohydrate_g ?? '-'}g</Text>
          </View>
          <Text style={[typography.bodyBold, { color: colors.text, marginTop: spacing.md }]}>材料</Text>
          {recipe.ingredients.map((ingredient, index) => <Text key={`${ingredient}-${index}`} style={[typography.body, { color: colors.textSecondary }]}>・{ingredient}</Text>)}
          <Pressable onPress={() => void saveRecipe()} disabled={saving} style={({ pressed: isPressed }) => [styles.saveButton, pressed(isPressed)]}>
            <Text style={styles.saveButtonText}>{saving ? '保存中…' : 'MYレシピに保存'}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 60, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { ...typography.caption2, fontWeight: '800', letterSpacing: 1 },
  title: { ...typography.title2, marginTop: 2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  inputCard: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadow.sm },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, ...typography.body },
  importButton: { minHeight: 48, borderRadius: radius.md, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  importButtonText: { ...typography.bodyBold, color: '#FFFFFF' },
  recipeCard: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, ...shadow.md },
  recipeTitle: { ...typography.title2 },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center' },
  kcal: { ...typography.bodyBold, color: palette.primary },
  saveButton: { minHeight: 48, borderRadius: radius.md, marginTop: spacing.lg, backgroundColor: palette.apricot, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { ...typography.bodyBold, color: '#FFFFFF' },
});
