export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          height_cm: number | null;
          weight_kg: number | null;
          birth_date: string | null;
          gender: 'male' | 'female' | 'other' | null;
          activity_level: string;
          goal: string | null;
          target_weight_kg: number | null;
          pace: string | null;
          approach: string | null;
          health_concerns: string[];
          active_conditions: string[] | null;
          is_premium: boolean;
          onboarding_completed: boolean;
          /** 断食機能有効フラグ (migration: 20260303) */
          fasting_enabled: boolean | null;
          /** 断食プロトコル (migration: 20260303) */
          fasting_protocol: string | null;
          /** 食事ウィンドウ開始時間 0-23 (migration: 20260303) */
          fasting_eat_start_hour: number | null;
          /** 食事ウィンドウ終了時間 0-23 (migration: 20260303) */
          fasting_eat_end_hour: number | null;
          /** 月経周期トラッキング有効フラグ (migration: 20260303_add_sleep_and_cycle) */
          cycle_tracking_enabled: boolean | null;
          /** 平均周期長 (migration: 20260303_add_sleep_and_cycle) */
          avg_cycle_length: number | null;
          /** 最後の生理開始日 ISO date (migration: 20260303_add_sleep_and_cycle) */
          last_period_start: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name?: string | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          birth_date?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          activity_level?: string;
          goal?: string | null;
          target_weight_kg?: number | null;
          pace?: string | null;
          approach?: string | null;
          health_concerns?: string[];
          active_conditions?: string[] | null;
          is_premium?: boolean;
          onboarding_completed?: boolean;
          fasting_enabled?: boolean | null;
          fasting_protocol?: string | null;
          fasting_eat_start_hour?: number | null;
          fasting_eat_end_hour?: number | null;
          cycle_tracking_enabled?: boolean | null;
          avg_cycle_length?: number | null;
          last_period_start?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      fasting_sessions: {
        Row: {
          id: string;
          user_id: string;
          protocol: string;
          window_start: string | null;
          window_end: string | null;
          eating_start: string | null;
          eating_end: string | null;
          fast_hours: number;
          eat_hours: number;
          completed: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          protocol: string;
          window_start?: string | null;
          window_end?: string | null;
          eating_start?: string | null;
          eating_end?: string | null;
          fast_hours?: number;
          eat_hours?: number;
          completed?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['fasting_sessions']['Insert']>;
      };
      disease_profiles: {
        Row: {
          id: string;
          user_id: string;
          disease_type: string;
          severity: 'mild' | 'moderate' | 'severe' | null;
          diagnosed_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          disease_type: string;
          severity?: 'mild' | 'moderate' | 'severe' | null;
          diagnosed_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['disease_profiles']['Insert']>;
      };
      taste_preferences: {
        Row: {
          id: string;
          user_id: string;
          salt_preference: number;
          sweet_preference: number;
          spicy_preference: number;
          umami_preference: number;
          dietary_restrictions: string[];
          disliked_ingredients: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          salt_preference?: number;
          sweet_preference?: number;
          spicy_preference?: number;
          umami_preference?: number;
          dietary_restrictions?: string[];
          disliked_ingredients?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['taste_preferences']['Insert']>;
      };
      food_items: {
        Row: {
          id: string;
          food_code: string;
          food_name: string;
          category_name: string;
          energy_kcal: number | null;
          protein_g: number | null;
          fat_g: number | null;
          carbohydrate_g: number | null;
          fiber_g: number | null;
          sodium_mg: number | null;
          salt_equivalent_g: number | null;
          cholesterol_mg: number | null;
          minerals: Json | null;
          vitamins: Json | null;
          amino_acids: Json | null;
          fatty_acids: Json | null;
          nova_classification: number | null;
          traffic_light: Json | null;
          source: string | null;
          food_name_en: string | null;
          data_type: string | null;
          brand_owner: string | null;
          gtin_upc: string | null;
          serving_size: number | null;
          serving_size_unit: string | null;
          data_quality: number | null;
          /** Nutri-Score型グレード (migration: 20260303) */
          food_score_grade: 'A' | 'B' | 'C' | 'D' | 'E' | null;
          /** Nutri-Scoreスコア値 0-100 (migration: 20260303) */
          food_score_value: number | null;
          /** NOVA加工度分類 1-4 (migration: 20260303) */
          processing_level: number | null;
          /** CO₂換算 kg/100g (migration: 20260303_add_carbon_and_glp1) */
          carbon_kg_per_100g: number | null;
          /** 仮想水使用量 L/100g (migration: 20260303_add_carbon_and_glp1) */
          water_liter_per_100g: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          food_code: string;
          food_name: string;
          category_name: string;
          energy_kcal?: number | null;
          protein_g?: number | null;
          fat_g?: number | null;
          carbohydrate_g?: number | null;
          fiber_g?: number | null;
          sodium_mg?: number | null;
          salt_equivalent_g?: number | null;
          cholesterol_mg?: number | null;
          minerals?: Json | null;
          vitamins?: Json | null;
          amino_acids?: Json | null;
          fatty_acids?: Json | null;
          nova_classification?: number | null;
          traffic_light?: Json | null;
          source?: string | null;
          food_name_en?: string | null;
          data_type?: string | null;
          brand_owner?: string | null;
          gtin_upc?: string | null;
          serving_size?: number | null;
          serving_size_unit?: string | null;
          data_quality?: number | null;
          food_score_grade?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
          food_score_value?: number | null;
          processing_level?: number | null;
          carbon_kg_per_100g?: number | null;
          water_liter_per_100g?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['food_items']['Insert']>;
      };
      food_item_details: {
        Row: {
          id: string;
          food_item_id: string;
          amino_acids: Json | null;
          fatty_acids: Json | null;
          organic_acids: Json | null;
          carbohydrate_details: Json | null;
          dietary_fiber: Json | null;
          additional_nutrients: Json | null;
          food_portions: Json | null;
          ingredients: string | null;
          meta_flags: Json | null;
        };
        Insert: {
          id?: string;
          food_item_id: string;
          amino_acids?: Json | null;
          fatty_acids?: Json | null;
          organic_acids?: Json | null;
          carbohydrate_details?: Json | null;
          dietary_fiber?: Json | null;
          additional_nutrients?: Json | null;
          food_portions?: Json | null;
          ingredients?: string | null;
          meta_flags?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['food_item_details']['Insert']>;
      };
      commercial_products: {
        Row: {
          id: string;
          barcode: string;
          product_name: string;
          brand: string | null;
          energy_kcal: number | null;
          protein_g: number | null;
          fat_g: number | null;
          carbohydrate_g: number | null;
          sodium_mg: number | null;
          additives: string[] | null;
          upf_score: number | null;
          nova_classification: number | null;
          image_url: string | null;
          source: string;
          /** 特保/機能性表示食品 FK (migration: 20260303_add_tokuho_and_meal_plans) */
          tokuho_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          barcode: string;
          product_name: string;
          brand?: string | null;
          energy_kcal?: number | null;
          protein_g?: number | null;
          fat_g?: number | null;
          carbohydrate_g?: number | null;
          sodium_mg?: number | null;
          additives?: string[] | null;
          upf_score?: number | null;
          nova_classification?: number | null;
          image_url?: string | null;
          source?: string;
          tokuho_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['commercial_products']['Insert']>;
      };
      meals: {
        Row: {
          id: string;
          user_id: string;
          meal_type: string;
          eaten_at: string;
          image_url: string | null;
          total_energy_kcal: number | null;
          total_protein_g: number | null;
          total_fat_g: number | null;
          total_carbohydrate_g: number | null;
          total_fiber_g: number | null;
          total_sodium_mg: number | null;
          meal_score: number | null;
          traffic_light_overall: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meal_type: string;
          eaten_at?: string;
          image_url?: string | null;
          total_energy_kcal?: number | null;
          total_protein_g?: number | null;
          total_fat_g?: number | null;
          total_carbohydrate_g?: number | null;
          total_fiber_g?: number | null;
          total_sodium_mg?: number | null;
          meal_score?: number | null;
          traffic_light_overall?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['meals']['Insert']>;
      };
      meal_items: {
        Row: {
          id: string;
          meal_id: string;
          food_item_id: string | null;
          commercial_product_id: string | null;
          ai_detected_name: string;
          portion_grams: number | null;
          confidence: number | null;
          energy_kcal: number | null;
          protein_g: number | null;
          fat_g: number | null;
          carbohydrate_g: number | null;
          fiber_g: number | null;
          sodium_mg: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meal_id: string;
          food_item_id?: string | null;
          commercial_product_id?: string | null;
          ai_detected_name: string;
          portion_grams?: number | null;
          confidence?: number | null;
          energy_kcal?: number | null;
          protein_g?: number | null;
          fat_g?: number | null;
          carbohydrate_g?: number | null;
          fiber_g?: number | null;
          sodium_mg?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['meal_items']['Insert']>;
      };
      health_checkups: {
        Row: {
          id: string;
          user_id: string;
          checkup_date: string;
          image_url: string | null;
          ldl_cholesterol: number | null;
          hdl_cholesterol: number | null;
          triglycerides: number | null;
          systolic_bp: number | null;
          diastolic_bp: number | null;
          hba1c: number | null;
          fasting_glucose: number | null;
          uric_acid: number | null;
          alt: number | null;
          ast: number | null;
          gamma_gtp: number | null;
          creatinine: number | null;
          egfr: number | null;
          hemoglobin: number | null;
          bmi: number | null;
          raw_ocr_data: Json | null;
          /** AIによる栄養アドバイス (migration: 20260303_add_carbon_and_glp1) */
          advice_json: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          checkup_date: string;
          image_url?: string | null;
          ldl_cholesterol?: number | null;
          hdl_cholesterol?: number | null;
          triglycerides?: number | null;
          systolic_bp?: number | null;
          diastolic_bp?: number | null;
          hba1c?: number | null;
          fasting_glucose?: number | null;
          uric_acid?: number | null;
          alt?: number | null;
          ast?: number | null;
          gamma_gtp?: number | null;
          creatinine?: number | null;
          egfr?: number | null;
          hemoglobin?: number | null;
          bmi?: number | null;
          raw_ocr_data?: Json | null;
          advice_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['health_checkups']['Insert']>;
      };
      daily_health_data: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          steps: number | null;
          active_energy_kcal: number | null;
          resting_heart_rate: number | null;
          sleep_hours: number | null;
          weight_kg: number | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          steps?: number | null;
          active_energy_kcal?: number | null;
          resting_heart_rate?: number | null;
          sleep_hours?: number | null;
          weight_kg?: number | null;
          source?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['daily_health_data']['Insert']>;
      };
      nutrition_targets: {
        Row: {
          id: string;
          user_id: string;
          energy_kcal: number;
          protein_g: number;
          fat_g: number;
          carbohydrate_g: number;
          fiber_g: number;
          sodium_mg: number;
          salt_g: number;
          cholesterol_mg: number | null;
          potassium_mg: number | null;
          calcium_mg: number | null;
          iron_mg: number | null;
          calculation_basis: Json | null;
          effective_from: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          energy_kcal: number;
          protein_g: number;
          fat_g: number;
          carbohydrate_g: number;
          fiber_g: number;
          sodium_mg: number;
          salt_g: number;
          cholesterol_mg?: number | null;
          potassium_mg?: number | null;
          calcium_mg?: number | null;
          iron_mg?: number | null;
          calculation_basis?: Json | null;
          effective_from?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['nutrition_targets']['Insert']>;
      };
      daily_summaries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          total_energy_kcal: number;
          total_protein_g: number;
          total_fat_g: number;
          total_carbohydrate_g: number;
          total_fiber_g: number;
          total_sodium_mg: number;
          meal_count: number;
          daily_score: number | null;
          buffer_used_kcal: number | null;
          feedback_message: string | null;
          /** 日次平均食品スコア (migration: 20260303) */
          avg_food_score: number | null;
          /** 日次食事品質グレード (migration: 20260303) */
          diet_quality_grade: 'A' | 'B' | 'C' | 'D' | 'E' | null;
          /** カフェイン摂取量mg (migration: 20260303_add_sleep_and_cycle) */
          caffeine_mg: number | null;
          /** 最終食事時刻 HH:MM (migration: 20260303_add_sleep_and_cycle) */
          last_meal_time: string | null;
          /** 夕食以降の炭水化物g (migration: 20260303_add_sleep_and_cycle) */
          evening_carbs_g: number | null;
          /** 日次合計CO₂排出量(kg) (migration: 20260303_add_carbon_and_glp1) */
          total_carbon_kg: number | null;
          /** CO₂グレード A〜E (migration: 20260303_add_carbon_and_glp1) */
          carbon_grade: 'A' | 'B' | 'C' | 'D' | 'E' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          total_energy_kcal?: number;
          total_protein_g?: number;
          total_fat_g?: number;
          total_carbohydrate_g?: number;
          total_fiber_g?: number;
          total_sodium_mg?: number;
          meal_count?: number;
          daily_score?: number | null;
          buffer_used_kcal?: number | null;
          feedback_message?: string | null;
          avg_food_score?: number | null;
          diet_quality_grade?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
          caffeine_mg?: number | null;
          last_meal_time?: string | null;
          evening_carbs_g?: number | null;
          total_carbon_kg?: number | null;
          carbon_grade?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['daily_summaries']['Insert']>;
      };
      suggestions: {
        Row: {
          id: string;
          user_id: string;
          suggestion_type: 'addition' | 'cooking_hack' | 'alternative' | 'recovery';
          title: string;
          description: string;
          reasoning: string | null;
          related_meal_id: string | null;
          suggested_foods: Json | null;
          is_dismissed: boolean;
          is_applied: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          suggestion_type: 'addition' | 'cooking_hack' | 'alternative' | 'recovery';
          title: string;
          description: string;
          reasoning?: string | null;
          related_meal_id?: string | null;
          suggested_foods?: Json | null;
          is_dismissed?: boolean;
          is_applied?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['suggestions']['Insert']>;
      };
      weekly_buffers: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          buffer_total_kcal: number;
          buffer_used_kcal: number;
          buffer_total_sodium_mg: number;
          buffer_used_sodium_mg: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          buffer_total_kcal?: number;
          buffer_used_kcal?: number;
          buffer_total_sodium_mg?: number;
          buffer_used_sodium_mg?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['weekly_buffers']['Insert']>;
      };
      badge_definitions: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          category: string;
          requirement: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          icon: string;
          category: string;
          requirement: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['badge_definitions']['Insert']>;
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_badges']['Insert']>;
      };
      streaks: {
        Row: {
          id: string;
          user_id: string;
          streak_type: string;
          current_count: number;
          longest_count: number;
          last_recorded_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          streak_type: string;
          current_count?: number;
          longest_count?: number;
          last_recorded_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['streaks']['Insert']>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          revenucat_app_user_id: string | null;
          plan: 'free' | 'monthly' | 'yearly' | 'half_yearly';
          status: 'active' | 'canceled' | 'past_due' | 'trialing';
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          revenucat_app_user_id?: string | null;
          plan?: 'free' | 'monthly' | 'yearly' | 'half_yearly';
          status?: 'active' | 'canceled' | 'past_due' | 'trialing';
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: 'ios' | 'android';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: 'ios' | 'android';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['push_tokens']['Insert']>;
      };
      sleep_records: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          duration_minutes: number | null;
          deep_sleep_minutes: number | null;
          rem_sleep_minutes: number | null;
          sleep_score: number | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          duration_minutes?: number | null;
          deep_sleep_minutes?: number | null;
          rem_sleep_minutes?: number | null;
          sleep_score?: number | null;
          source?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sleep_records']['Insert']>;
      };
      menstrual_cycles: {
        Row: {
          id: string;
          user_id: string;
          cycle_start: string;
          cycle_length: number;
          period_length: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          cycle_start: string;
          cycle_length?: number;
          period_length?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['menstrual_cycles']['Insert']>;
      };
      tokuho_products: {
        Row: {
          id: string;
          license_number: string | null;
          product_name: string;
          brand: string | null;
          category: 'tokuho' | 'functional_claim';
          health_claims: string[];
          active_ingredients: Json | null;
          jan_codes: string[];
          expiry_date: string | null;
          product_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          license_number?: string | null;
          product_name: string;
          brand?: string | null;
          category: 'tokuho' | 'functional_claim';
          health_claims?: string[];
          active_ingredients?: Json | null;
          jan_codes?: string[];
          expiry_date?: string | null;
          product_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tokuho_products']['Insert']>;
      };
      meal_plans: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          plan_data: Json;
          grocery_list: Json | null;
          generated_at: string;
          accepted: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          plan_data: Json;
          grocery_list?: Json | null;
          generated_at?: string;
          accepted?: boolean;
        };
        Update: Partial<Database['public']['Tables']['meal_plans']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
