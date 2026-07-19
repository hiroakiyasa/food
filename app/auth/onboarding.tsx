import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { signUpWithEmail } from '@/src/lib/auth';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { setGuestModeEnabled } from '@/src/lib/guestMode';
import { useAuthStore } from '@/src/stores/authStore';
import { isValidEmail, isValidPassword } from '@/src/utils/validators';
import {
  GOALS,
  GOAL_LABELS,
  PACES,
  PACE_LABELS,
  APPROACHES,
  APPROACH_LABELS,
  HEALTH_CONCERNS,
  HEALTH_CONCERN_LABELS,
  ACTIVITY_LEVELS,
  ACTIVITY_LEVEL_LABELS,
  type Goal,
  type Pace,
  type Approach,
  type HealthConcern,
  type ActivityLevel,
} from '@/src/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 7;

// Design tokens
const colors = {
  bg: '#FFFFFF',
  surface: '#FFF9EC',
  border: '#E9E5D8',
  primary: '#1E293B',
  accent: '#3B82F6',
  accentLight: '#EFF6FF',
  textPrimary: '#0F172A',
  textSecondary: '#66766F',
  textTertiary: '#8D9993',
  danger: '#EF4444',
};

interface FormData {
  gender: 'male' | 'female' | 'other' | null;
  goal: Goal | null;
  displayName: string;
  birthDate: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
  pace: Pace | null;
  approach: Approach | null;
  healthConcerns: HealthConcern[];
  saltPref: number;
  sweetPref: number;
  spicyPref: number;
  activityLevel: ActivityLevel;
  email: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
}

type BirthDateField = 'year' | 'month' | 'day';

const ONBOARDING_FORM_KEY = 'onboarding_form_v1';

function getDaysInMonth(year: number | null, month: number | null): number {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

function formatBirthDate(year: number, month: number, day: number): string {
  const monthPart = String(month).padStart(2, '0');
  const dayPart = String(day).padStart(2, '0');
  return `${year}-${monthPart}-${dayPart}`;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [planResult, setPlanResult] = useState<{
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    isMinor: boolean;
  } | null>(null);

  const [form, setForm] = useState<FormData>({
    gender: null,
    goal: null,
    displayName: '',
    birthDate: '',
    heightCm: '',
    weightKg: '',
    targetWeightKg: '',
    pace: null,
    approach: null,
    healthConcerns: [],
    saltPref: 3,
    sweetPref: 3,
    spicyPref: 3,
    activityLevel: 'moderate',
    email: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: false,
  });
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  const [birthDay, setBirthDay] = useState<number | null>(null);
  const [openBirthDateField, setOpenBirthDateField] = useState<BirthDateField | null>(null);

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const yearOptions = useMemo(
    () => Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i),
    [currentYear],
  );
  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i + 1),
    [],
  );
  const dayOptions = useMemo(() => {
    const maxDays = getDaysInMonth(birthYear, birthMonth);
    return Array.from({ length: maxDays }, (_, i) => i + 1);
  }, [birthYear, birthMonth]);

  const updateForm = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleHealthConcern = useCallback((concern: HealthConcern) => {
    setForm((prev) => ({
      ...prev,
      healthConcerns: prev.healthConcerns.includes(concern)
        ? prev.healthConcerns.filter((c) => c !== concern)
        : [...prev.healthConcerns, concern],
    }));
  }, []);

  useEffect(() => {
    const nextBirthDate = (
      birthYear && birthMonth && birthDay
        ? formatBirthDate(birthYear, birthMonth, birthDay)
        : ''
    );
    if (form.birthDate !== nextBirthDate) {
      updateForm('birthDate', nextBirthDate);
    }
  }, [birthYear, birthMonth, birthDay, form.birthDate, updateForm]);

  useEffect(() => {
    if (step !== 2 && openBirthDateField) {
      setOpenBirthDateField(null);
    }
  }, [step, openBirthDateField]);

  const toggleBirthDateField = useCallback((field: BirthDateField) => {
    setOpenBirthDateField((prev) => (prev === field ? null : field));
  }, []);

  const selectBirthDateValue = useCallback((value: number) => {
    if (openBirthDateField === 'year') {
      setBirthYear(value);
      setBirthDay((prev) => {
        if (!prev) return prev;
        return Math.min(prev, getDaysInMonth(value, birthMonth));
      });
      setOpenBirthDateField(null);
      return;
    }

    if (openBirthDateField === 'month') {
      setBirthMonth(value);
      setBirthDay((prev) => {
        if (!prev) return prev;
        return Math.min(prev, getDaysInMonth(birthYear, value));
      });
      setOpenBirthDateField(null);
      return;
    }

    if (openBirthDateField === 'day') {
      setBirthDay(value);
      setOpenBirthDateField(null);
    }
  }, [openBirthDateField, birthMonth, birthYear]);

  const activeBirthDateOptions = useMemo(() => {
    if (openBirthDateField === 'year') return yearOptions;
    if (openBirthDateField === 'month') return monthOptions;
    if (openBirthDateField === 'day') return dayOptions;
    return [];
  }, [openBirthDateField, yearOptions, monthOptions, dayOptions]);

  const activeBirthDateUnit = openBirthDateField === 'year'
    ? '年'
    : openBirthDateField === 'month'
      ? '月'
      : '日';

  const activeBirthDateValue = openBirthDateField === 'year'
    ? birthYear
    : openBirthDateField === 'month'
      ? birthMonth
      : birthDay;

  // If user is already authenticated (e.g. came from login), restore any
  // inputs saved before the email-confirmation round trip and skip to step 4.
  useEffect(() => {
    if (!session || step >= 4) return;
    let mounted = true;
    AsyncStorage.getItem(ONBOARDING_FORM_KEY)
      .then((raw) => {
        if (!mounted) return;
        if (raw) {
          const saved = JSON.parse(raw) as {
            form?: Partial<FormData>;
            birthYear?: number | null;
            birthMonth?: number | null;
            birthDay?: number | null;
          };
          if (saved.form) {
            setForm((prev) => ({
              ...prev,
              ...saved.form,
              password: '',
              confirmPassword: '',
            }));
          }
          if (saved.birthYear) setBirthYear(saved.birthYear);
          if (saved.birthMonth) setBirthMonth(saved.birthMonth);
          if (saved.birthDay) setBirthDay(saved.birthDay);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setStep(4);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Determine if step 4 (target/pace/approach) should be skipped
  const shouldSkipTarget =
    form.goal === 'health' || form.goal === 'none' || form.goal === null;

  // Get the effective step index accounting for skips
  const getNextStep = (currentStep: number): number => {
    const next = currentStep + 1;
    if (next === 4 && shouldSkipTarget) return 5;
    return next;
  };

  const getPrevStep = (currentStep: number): number => {
    const prev = currentStep - 1;
    if (prev === 4 && shouldSkipTarget) return 3;
    return prev;
  };

  // Calculate calories based on user data (Mifflin-St Jeor)
  const calculatePlan = useCallback(() => {
    const weight = Number(form.weightKg) || 60;
    const height = Number(form.heightCm) || 165;
    const birthYear = form.birthDate
      ? new Date(form.birthDate).getFullYear()
      : 1990;
    const age = new Date().getFullYear() - birthYear;
    const isMinor = form.birthDate !== '' && age < 18;

    let bmr: number;
    if (form.gender === 'female') {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    }

    const activityMultipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    let tdee = bmr * activityMultipliers[form.activityLevel];

    // Adjust for goal. Minors never get a calorie deficit — growth-phase
    // restriction is unsafe, so their target stays at maintenance.
    if (form.goal === 'diet' && !isMinor) {
      tdee = form.pace === 'aggressive' ? tdee - 500 : tdee - 300;
    } else if (form.goal === 'body_make') {
      tdee = tdee + 200;
    }

    // Safety floor: never below BMR, and never below the commonly-accepted
    // adult minimum (women 1200 / men 1500 kcal).
    const genderFloor = form.gender === 'female' ? 1200 : 1500;
    const floor = Math.max(genderFloor, Math.round(bmr));
    const calories = Math.max(Math.round(tdee), floor);
    const protein = Math.round(weight * (form.goal === 'body_make' ? 2.0 : 1.2));
    const fat = Math.round((calories * 0.25) / 9);
    const carbs = Math.round(Math.max(0, calories - protein * 4 - fat * 9) / 4);

    return { calories, protein, fat, carbs, isMinor };
  }, [form]);

  // Persist non-sensitive onboarding inputs so they survive the
  // email-confirmation round trip (sign up -> confirm -> log in -> resume).
  const persistOnboardingForm = async () => {
    const { password: _pw, confirmPassword: _cpw, ...safeForm } = form;
    await AsyncStorage.setItem(
      ONBOARDING_FORM_KEY,
      JSON.stringify({ form: safeForm, birthYear, birthMonth, birthDay }),
    ).catch(() => {});
  };

  // Handle account creation (Step 3)
  const handleSignUp = async () => {
    if (!isValidEmail(form.email)) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください');
      return;
    }
    if (!isValidPassword(form.password)) {
      Alert.alert('エラー', 'パスワードは8文字以上で入力してください');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('エラー', 'パスワードが一致しません');
      return;
    }
    if (!form.agreedToTerms) {
      Alert.alert('エラー', '利用規約に同意してください');
      return;
    }

    setLoading(true);
    try {
      await persistOnboardingForm();
      const { session: newSession } = await signUpWithEmail(form.email, form.password);
      if (!newSession) {
        // Email confirmation is required — the profile can only be saved
        // after the user confirms and signs in. Inputs are already persisted.
        Alert.alert(
          '確認メールを送信しました',
          `${form.email} 宛に確認メールを送信しました。メール内のリンクを開いて確認を完了し、ログインしてください。入力いただいた内容は保存されているので、続きから設定できます。`,
          [{ text: 'ログイン画面へ', onPress: () => router.replace('/auth/login') }],
        );
        return;
      }
      setStep(getNextStep(3));
    } catch (error) {
      Alert.alert('登録エラー', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Handle final completion (Step 6)
  const handleComplete = async () => {
    const currentUser = useAuthStore.getState().user;

    setGenerating(true);
    setGenerationProgress(0);

    // Simulate plan generation with progress
    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      if (!currentUser) {
        clearInterval(progressInterval);
        setGenerationProgress(100);
        const plan = calculatePlan();
        setPlanResult(plan);
        return;
      }

      // Save profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: currentUser.id,
          display_name: form.displayName || null,
          height_cm: form.heightCm ? Number(form.heightCm) : null,
          weight_kg: form.weightKg ? Number(form.weightKg) : null,
          birth_date: form.birthDate || null,
          gender: form.gender,
          activity_level: form.activityLevel,
          goal: form.goal,
          target_weight_kg: form.targetWeightKg
            ? Number(form.targetWeightKg)
            : null,
          pace: form.pace,
          approach: form.approach,
          health_concerns: form.healthConcerns,
          onboarding_completed: true,
        } as Record<string, unknown>);

      if (profileError) throw profileError;

      // Save taste preferences
      await supabase.from('taste_preferences').upsert({
        user_id: currentUser.id,
        salt_preference: form.saltPref,
        sweet_preference: form.sweetPref,
        spicy_preference: form.spicyPref,
        umami_preference: 3,
        dietary_restrictions: [],
        disliked_ingredients: [],
      } as Record<string, unknown>);

      clearInterval(progressInterval);
      setGenerationProgress(100);

      // Calculate plan
      const plan = calculatePlan();
      setPlanResult(plan);

      // Save nutrition targets
      await supabase.from('nutrition_targets').upsert({
        user_id: currentUser.id,
        energy_kcal: plan.calories,
        protein_g: plan.protein,
        fat_g: plan.fat,
        carbohydrate_g: plan.carbs,
        fiber_g: 20,
        sodium_mg: 2300,
        salt_g: 6,
      } as Record<string, unknown>);

      await AsyncStorage.removeItem(ONBOARDING_FORM_KEY).catch(() => {});
    } catch (error) {
      clearInterval(progressInterval);
      setGenerating(false);
      Alert.alert('エラー', (error as Error).message);
    }
  };

  const handleFinish = () => {
    const complete = async () => {
      if (!useAuthStore.getState().user) {
        await setGuestModeEnabled(true);
      }
      // Ask for notification permission at a meaningful moment (plan just
      // created) and turn on the default meal reminders when granted.
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        const status = existing === 'granted'
          ? existing
          : (await Notifications.requestPermissionsAsync()).status;
        if (status === 'granted') {
          useNotificationStore.getState().setMealReminders(true);
        }
      } catch {
        // Notifications unavailable (e.g. web/simulator) — not fatal.
      }
      router.replace('/(tabs)');
    };
    complete().catch(() => {
      router.replace('/(tabs)');
    });
  };

  // ─── Step Components ───────────────────────────────────────

  const renderStep0 = () => (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
    >
      <Text style={styles.welcomeTitle}>あなたに最適な{'\n'}栄養プランを作成します</Text>
      <Text style={styles.welcomeSubtitle}>
        まずはいくつかの質問に答えてください
      </Text>

      <View style={styles.sectionSpacing}>
        <Text style={styles.sectionLabel}>性別</Text>
        <View style={styles.genderRow}>
          {(['male', 'female'] as const).map((g) => (
            <Pressable
              key={g}
              onPress={() => updateForm('gender', g)}
              style={[
                styles.genderCard,
                form.gender === g && styles.genderCardActive,
              ]}
            >
              <Text style={styles.genderIcon}>
                {g === 'male' ? '♂' : '♀'}
              </Text>
              <Text
                style={[
                  styles.genderLabel,
                  form.gender === g && styles.genderLabelActive,
                ]}
              >
                {g === 'male' ? '男性' : '女性'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => updateForm('gender', 'other')}>
          <Text
            style={[
              styles.otherGenderLink,
              form.gender === 'other' && styles.otherGenderLinkActive,
            ]}
          >
            その他
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );

  const renderStep1 = () => (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
    >
      <Text style={styles.stepTitle}>目標を教えてください</Text>
      <Text style={styles.stepSubtitle}>あなたに合ったプランを提案します</Text>

      <View style={styles.goalGrid}>
        {GOALS.map((g) => (
          <Pressable
            key={g}
            onPress={() => updateForm('goal', g)}
            style={[
              styles.goalCard,
              form.goal === g && styles.goalCardActive,
            ]}
          >
            <Text style={styles.goalIcon}>
              {g === 'diet'
                ? '📉'
                : g === 'body_make'
                  ? '💪'
                  : g === 'health'
                    ? '🫀'
                    : '🔍'}
            </Text>
            <Text
              style={[
                styles.goalLabel,
                form.goal === g && styles.goalLabelActive,
              ]}
            >
              {GOAL_LABELS[g]}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionSpacing}>
        <Text style={styles.sectionLabel}>ニックネーム</Text>
        <TextInput
          style={styles.input}
          placeholder="お名前やニックネーム"
          placeholderTextColor={colors.textTertiary}
          value={form.displayName}
          onChangeText={(v) => updateForm('displayName', v)}
        />
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
    >
      <Text style={styles.stepTitle}>身体情報</Text>
      <Text style={styles.stepSubtitle}>
        正確な栄養計算のために必要です
      </Text>

      <View style={styles.sectionSpacing}>
        <Text style={styles.sectionLabel}>生年月日</Text>
        <View style={styles.birthDateRow}>
          <Pressable
            onPress={() => toggleBirthDateField('year')}
            style={[
              styles.birthDateSelector,
              openBirthDateField === 'year' && styles.birthDateSelectorActive,
            ]}
          >
            <Text
              style={[
                styles.birthDateSelectorText,
                birthYear === null && styles.birthDatePlaceholderText,
              ]}
            >
              {birthYear ? `${birthYear}年` : '年'}
            </Text>
            <Text style={styles.birthDateChevron}>
              {openBirthDateField === 'year' ? '▲' : '▼'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => toggleBirthDateField('month')}
            style={[
              styles.birthDateSelector,
              openBirthDateField === 'month' && styles.birthDateSelectorActive,
            ]}
          >
            <Text
              style={[
                styles.birthDateSelectorText,
                birthMonth === null && styles.birthDatePlaceholderText,
              ]}
            >
              {birthMonth ? `${birthMonth}月` : '月'}
            </Text>
            <Text style={styles.birthDateChevron}>
              {openBirthDateField === 'month' ? '▲' : '▼'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => toggleBirthDateField('day')}
            style={[
              styles.birthDateSelector,
              openBirthDateField === 'day' && styles.birthDateSelectorActive,
            ]}
          >
            <Text
              style={[
                styles.birthDateSelectorText,
                birthDay === null && styles.birthDatePlaceholderText,
              ]}
            >
              {birthDay ? `${birthDay}日` : '日'}
            </Text>
            <Text style={styles.birthDateChevron}>
              {openBirthDateField === 'day' ? '▲' : '▼'}
            </Text>
          </Pressable>
        </View>

        {openBirthDateField && (
          <View style={styles.birthDateDropdown}>
            <ScrollView
              nestedScrollEnabled
              style={styles.birthDateDropdownScroll}
              showsVerticalScrollIndicator={false}
            >
              {activeBirthDateOptions.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => selectBirthDateValue(value)}
                  style={[
                    styles.birthDateOption,
                    activeBirthDateValue === value && styles.birthDateOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.birthDateOptionText,
                      activeBirthDateValue === value && styles.birthDateOptionTextActive,
                    ]}
                  >
                    {value}
                    {activeBirthDateUnit}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.rowInputs}>
        <View style={styles.halfInputContainer}>
          <Text style={styles.sectionLabel}>身長</Text>
          <View style={styles.inputWithUnit}>
            <TextInput
              style={[styles.input, styles.flex1]}
              placeholder="165"
              placeholderTextColor={colors.textTertiary}
              value={form.heightCm}
              onChangeText={(v) => updateForm('heightCm', v)}
              keyboardType="numeric"
            />
            <Text style={styles.unitLabel}>cm</Text>
          </View>
        </View>
        <View style={styles.halfInputContainer}>
          <Text style={styles.sectionLabel}>体重</Text>
          <View style={styles.inputWithUnit}>
            <TextInput
              style={[styles.input, styles.flex1]}
              placeholder="60"
              placeholderTextColor={colors.textTertiary}
              value={form.weightKg}
              onChangeText={(v) => updateForm('weightKg', v)}
              keyboardType="numeric"
            />
            <Text style={styles.unitLabel}>kg</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
    >
      <Text style={styles.stepTitle}>アカウント作成</Text>
      <Text style={styles.stepSubtitle}>
        あなた専用プランの作成へ進みましょう
      </Text>

      <View style={styles.sectionSpacing}>
        <View style={styles.accountBenefitCard}>
          <Text style={styles.accountBenefitTitle}>登録するとできること</Text>
          {[
            '食事データをクラウドに保存',
            '機種変更後も記録を引き継ぎ',
            'AI提案の精度を継続改善',
            '通知・目標設定を同期',
          ].map((item) => (
            <View key={item} style={styles.accountBenefitRow}>
              <Text style={styles.accountBenefitDot}>•</Text>
              <Text style={styles.accountBenefitText}>{item}</Text>
            </View>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          placeholderTextColor={colors.textTertiary}
          value={form.email}
          onChangeText={(v) => updateForm('email', v)}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          placeholder="パスワード（8文字以上）"
          placeholderTextColor={colors.textTertiary}
          value={form.password}
          onChangeText={(v) => updateForm('password', v)}
          secureTextEntry
          textContentType="newPassword"
        />
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          placeholder="パスワード（確認）"
          placeholderTextColor={colors.textTertiary}
          value={form.confirmPassword}
          onChangeText={(v) => updateForm('confirmPassword', v)}
          secureTextEntry
          textContentType="newPassword"
        />

        <Pressable
          style={styles.checkboxRow}
          onPress={() => updateForm('agreedToTerms', !form.agreedToTerms)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.agreedToTerms }}
          accessibilityLabel="利用規約とプライバシーポリシーに同意します"
        >
          <View
            style={[
              styles.checkbox,
              form.agreedToTerms && styles.checkboxActive,
            ]}
          >
            {form.agreedToTerms && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            利用規約・プライバシーポリシーに同意します
          </Text>
        </Pressable>
        <View style={styles.legalLinkRow}>
          <Pressable
            onPress={() => router.push({ pathname: '/(modals)/legal', params: { doc: 'terms' } } as never)}
            style={styles.legalLink}
            accessibilityRole="link"
            accessibilityLabel="利用規約を読む"
          >
            <Text style={styles.legalLinkText}>利用規約を読む</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/(modals)/legal', params: { doc: 'privacy' } } as never)}
            style={styles.legalLink}
            accessibilityRole="link"
            accessibilityLabel="プライバシーポリシーを読む"
          >
            <Text style={styles.legalLinkText}>プライバシーポリシーを読む</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={handleSignUp}
        disabled={loading}
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        accessibilityRole="button"
        accessibilityLabel="アカウントを作成"
      >
        <Text style={styles.primaryButtonText}>
          {loading ? '登録中...' : 'アカウントを作成'}
        </Text>
      </Pressable>

      {/* NOTE: guest mode (後で登録する) removed — recording requires an
          account, so the skip path only led to a dead end. */}

      <Pressable
        onPress={() => router.push('/auth/login')}
        style={styles.linkContainer}
        accessibilityRole="button"
        accessibilityLabel="ログイン画面へ"
      >
        <Text style={styles.linkText}>
          すでにアカウントをお持ちの方は{' '}
          <Text style={styles.link}>ログイン</Text>
        </Text>
      </Pressable>
    </Animated.View>
  );

  const renderStep4 = () => (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
    >
      <Text style={styles.stepTitle}>目標設定</Text>
      <Text style={styles.stepSubtitle}>
        理想の体型に近づくためのプランを作成します
      </Text>

      <View style={styles.sectionSpacing}>
        <Text style={styles.sectionLabel}>目標体重</Text>
        <View style={styles.targetWeightRow}>
          <View style={styles.weightDisplay}>
            <Text style={styles.weightValue}>
              {form.weightKg || '—'}
            </Text>
            <Text style={styles.weightUnit}>kg</Text>
            <Text style={styles.weightCaption}>現在</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
          <View style={styles.weightDisplay}>
            <TextInput
              style={styles.weightInput}
              placeholder="55"
              placeholderTextColor={colors.textTertiary}
              value={form.targetWeightKg}
              onChangeText={(v) => updateForm('targetWeightKg', v)}
              keyboardType="numeric"
            />
            <Text style={styles.weightUnit}>kg</Text>
            <Text style={styles.weightCaption}>目標</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionSpacing}>
        <Text style={styles.sectionLabel}>ペース</Text>
        <View style={styles.optionRow}>
          {PACES.map((p) => (
            <Pressable
              key={p}
              onPress={() => updateForm('pace', p)}
              style={[
                styles.optionCard,
                form.pace === p && styles.optionCardActive,
              ]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  form.pace === p && styles.optionLabelActive,
                ]}
              >
                {PACE_LABELS[p]}
              </Text>
              {p === 'moderate' && (
                <Text style={styles.recommendTag}>おすすめ</Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.sectionSpacing}>
        <Text style={styles.sectionLabel}>アプローチ</Text>
        <View style={styles.optionRow}>
          {APPROACHES.map((a) => (
            <Pressable
              key={a}
              onPress={() => updateForm('approach', a)}
              style={[
                styles.optionCard,
                styles.optionCardSmall,
                form.approach === a && styles.optionCardActive,
              ]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  form.approach === a && styles.optionLabelActive,
                ]}
              >
                {APPROACH_LABELS[a]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );

  const renderStep5 = () => (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
    >
      <Text style={styles.stepTitle}>あなたについて</Text>
      <Text style={styles.stepSubtitle}>
        より精度の高いプランのために教えてください（スキップ可）
      </Text>

      <View style={styles.sectionSpacing}>
        <Text style={styles.sectionLabel}>気になる健康の悩み</Text>
        <View style={styles.concernGrid}>
          {HEALTH_CONCERNS.map((c) => (
            <Pressable
              key={c}
              onPress={() => toggleHealthConcern(c)}
              style={[
                styles.concernChip,
                form.healthConcerns.includes(c) && styles.concernChipActive,
              ]}
            >
              <Text
                style={[
                  styles.concernChipText,
                  form.healthConcerns.includes(c) &&
                    styles.concernChipTextActive,
                ]}
              >
                {HEALTH_CONCERN_LABELS[c]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.sectionSpacing}>
        <Text style={styles.sectionLabel}>味覚嗜好</Text>
        {[
          {
            label: '塩味',
            value: form.saltPref,
            setter: (v: number) => updateForm('saltPref', v),
          },
          {
            label: '甘味',
            value: form.sweetPref,
            setter: (v: number) => updateForm('sweetPref', v),
          },
          {
            label: '辛味',
            value: form.spicyPref,
            setter: (v: number) => updateForm('spicyPref', v),
          },
        ].map(({ label, value, setter }) => (
          <View key={label} style={styles.prefRow}>
            <Text style={styles.prefLabel}>{label}</Text>
            <View style={styles.segmentRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setter(n)}
                  style={[
                    styles.segment,
                    value === n && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      value === n && styles.segmentTextActive,
                    ]}
                  >
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionSpacing}>
        <Text style={styles.sectionLabel}>活動レベル</Text>
        <View style={styles.activityColumn}>
          {ACTIVITY_LEVELS.map((level) => (
            <Pressable
              key={level}
              onPress={() => updateForm('activityLevel', level)}
              style={[
                styles.activityOption,
                form.activityLevel === level && styles.activityOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.activityLabel,
                  form.activityLevel === level && styles.activityLabelActive,
                ]}
              >
                {ACTIVITY_LEVEL_LABELS[level]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );

  const renderStep6 = () => {
    const hasUser = !!useAuthStore.getState().user;

    if (generating && !planResult) {
      return (
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.generatingContainer}
        >
          <Text style={styles.generatingTitle}>
            あなた専用プランを{'\n'}作成しています
          </Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(generationProgress, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.generatingHint}>
            {generationProgress < 30
              ? '身体データを分析中...'
              : generationProgress < 60
                ? '栄養バランスを最適化中...'
                : generationProgress < 90
                  ? 'プランを生成中...'
                  : '完了しました'}
          </Text>
        </Animated.View>
      );
    }

    if (planResult) {
      return (
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.stepContainer}
        >
          <Text style={styles.resultTitle}>
            あなた専用プランが{'\n'}完成しました
          </Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>1日の目標</Text>
            <View style={styles.resultGrid}>
              <View style={styles.resultItem}>
                <Text style={styles.resultValue}>{planResult.calories}</Text>
                <Text style={styles.resultUnit}>kcal</Text>
                <Text style={styles.resultLabel}>カロリー</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultValue}>{planResult.protein}</Text>
                <Text style={styles.resultUnit}>g</Text>
                <Text style={styles.resultLabel}>タンパク質</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultValue}>{planResult.fat}</Text>
                <Text style={styles.resultUnit}>g</Text>
                <Text style={styles.resultLabel}>脂質</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultValue}>{planResult.carbs}</Text>
                <Text style={styles.resultUnit}>g</Text>
                <Text style={styles.resultLabel}>炭水化物</Text>
              </View>
            </View>
          </View>

          {planResult.isMinor && (
            <Text style={styles.minorNote}>
              18歳未満の方は成長期のため、減量ではなく現状維持のカロリーを設定しています。食事について気になることは保護者や医師にご相談ください。
            </Text>
          )}

          {form.displayName ? (
            <Text style={styles.resultMessage}>
              {form.displayName}さん、一緒に頑張りましょう
            </Text>
          ) : null}

          {!hasUser && (
            <Text style={styles.guestResultHint}>
              このプランを保存・同期するにはアカウント登録が必要です
            </Text>
          )}

          <Pressable onPress={handleFinish} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {hasUser ? '始める' : 'このまま始める'}
            </Text>
          </Pressable>
        </Animated.View>
      );
    }

    // Initial state of step 6 — trigger generation
    return (
      <Animated.View
        entering={SlideInRight.duration(300)}
        style={styles.stepContainer}
      >
        <Text style={styles.stepTitle}>準備完了</Text>
        <Text style={styles.stepSubtitle}>
          入力いただいた情報をもとに、あなた専用の栄養プランを作成します
        </Text>
        <Pressable onPress={handleComplete} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>プランを作成する</Text>
        </Pressable>
      </Animated.View>
    );
  };

  // ─── Navigation ────────────────────────────────────────────

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return form.gender !== null;
      case 1:
        return form.goal !== null;
      case 2:
        // Birth date is required: age drives the BMR calculation and the
        // minor-safety gates, so a default-age fallback would be unsafe.
        return form.heightCm !== '' && form.weightKg !== '' && form.birthDate !== '';
      case 3:
        return false; // Handled by handleSignUp
      case 4:
        return true;
      case 5:
        return true;
      case 6:
        return false; // Handled by handleComplete/handleFinish
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 3) return; // Auth step has its own button
    if (step === 6) return; // Final step has its own button
    setStep(getNextStep(step));
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep(getPrevStep(step));
  };

  // Don't show standard nav on auth step or final step
  const showStandardNav = step !== 3 && step !== 6;

  // ─── Render ────────────────────────────────────────────────

  const renderCurrentStep = () => {
    switch (step) {
      case 0:
        return renderStep0();
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress bar */}
        {!planResult && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: `${((step + 1) / TOTAL_STEPS) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {step + 1} / {TOTAL_STEPS}
            </Text>
          </View>
        )}

        {renderCurrentStep()}

        {/* Navigation buttons */}
        {showStandardNav && !planResult && !generating && (
          <View style={styles.navRow}>
            {step > 0 && (
              <Pressable onPress={handleBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>戻る</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleNext}
              disabled={!canProceed()}
              style={[
                styles.nextButton,
                !canProceed() && styles.buttonDisabled,
                step === 0 && styles.nextButtonFull,
              ]}
            >
              <Text style={styles.nextButtonText}>
                {step === 5 ? '次へ' : '次へ'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 72 : 48,
    paddingBottom: 48,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 13,
    color: colors.textTertiary,
    fontWeight: '500',
  },

  // Step container
  stepContainer: {
    minHeight: 400,
  },

  // Welcome (Step 0)
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 38,
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 40,
  },

  // Step titles
  stepTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },

  // Sections
  sectionSpacing: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Gender cards
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderCard: {
    flex: 1,
    paddingVertical: 24,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  genderCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  genderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  genderLabelActive: {
    color: colors.accent,
  },
  otherGenderLink: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
    color: colors.textTertiary,
  },
  otherGenderLinkActive: {
    color: colors.accent,
    fontWeight: '600',
  },

  // Goal cards
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  goalCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  goalCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  goalIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  goalLabelActive: {
    color: colors.accent,
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputSpacing: {
    marginTop: 12,
  },
  flex1: {
    flex: 1,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  halfInputContainer: {
    flex: 1,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  birthDateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  birthDateSelector: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  birthDateSelectorActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  birthDateSelectorText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  birthDatePlaceholderText: {
    color: colors.textTertiary,
    fontWeight: '400',
  },
  birthDateChevron: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  birthDateDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  birthDateDropdownScroll: {
    maxHeight: 220,
  },
  birthDateOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  birthDateOptionActive: {
    backgroundColor: colors.accentLight,
  },
  birthDateOptionText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  birthDateOptionTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },

  // Auth step
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  legalLinkRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
    marginLeft: 34,
  },
  legalLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  legalLinkText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  linkContainer: {
    marginTop: 20,
  },
  linkText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textSecondary,
  },
  link: {
    color: colors.accent,
    fontWeight: '600',
  },
  accountBenefitCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 14,
    gap: 6,
  },
  accountBenefitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  accountBenefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  accountBenefitDot: {
    color: colors.accent,
    fontSize: 14,
    lineHeight: 18,
  },
  accountBenefitText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  skipAuthButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  skipAuthButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Target weight
  targetWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 20,
  },
  weightDisplay: {
    alignItems: 'center',
  },
  weightValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  weightInput: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.accent,
    textAlign: 'center',
    minWidth: 60,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: 4,
  },
  weightUnit: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  weightCaption: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  arrow: {
    fontSize: 24,
    color: colors.textTertiary,
  },

  // Option cards (pace, approach)
  optionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  optionCardSmall: {
    paddingVertical: 14,
  },
  optionCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionLabelActive: {
    color: colors.accent,
  },
  recommendTag: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 4,
    backgroundColor: colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // Health concerns
  concernGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  concernChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  concernChipActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent,
  },
  concernChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  concernChipTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },

  // Taste preferences
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  prefLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    width: 50,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Activity level
  activityColumn: {
    gap: 8,
  },
  activityOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  activityOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  activityLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  activityLabelActive: {
    color: colors.accent,
    fontWeight: '600',
  },

  // Plan generation
  generatingContainer: {
    flex: 1,
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  generatingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 34,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  generatingHint: {
    fontSize: 14,
    color: colors.textTertiary,
  },

  // Result
  resultTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 32,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  resultCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 20,
    textAlign: 'center',
  },
  resultGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resultItem: {
    alignItems: 'center',
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resultUnit: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  resultLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  resultMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  guestResultHint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 18,
  },
  minorNote: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    backgroundColor: '#FFF6E5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },

  // Buttons
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.4,
  },

  // Navigation
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    gap: 12,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
