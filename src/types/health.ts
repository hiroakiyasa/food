export interface HealthCheckupData {
  ldl_cholesterol?: number;
  hdl_cholesterol?: number;
  triglycerides?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  hba1c?: number;
  fasting_glucose?: number;
  uric_acid?: number;
  alt?: number;
  ast?: number;
  gamma_gtp?: number;
  creatinine?: number;
  egfr?: number;
  hemoglobin?: number;
  bmi?: number;
}

export interface HealthCheckupRanges {
  label: string;
  unit: string;
  normal_min: number;
  normal_max: number;
  warning_min?: number;
  warning_max?: number;
}

export const CHECKUP_RANGES: Record<keyof HealthCheckupData, HealthCheckupRanges> = {
  ldl_cholesterol: { label: 'LDLコレステロール', unit: 'mg/dL', normal_min: 70, normal_max: 139 },
  hdl_cholesterol: { label: 'HDLコレステロール', unit: 'mg/dL', normal_min: 40, normal_max: 100 },
  triglycerides: { label: '中性脂肪', unit: 'mg/dL', normal_min: 30, normal_max: 149 },
  systolic_bp: { label: '収縮期血圧', unit: 'mmHg', normal_min: 90, normal_max: 129 },
  diastolic_bp: { label: '拡張期血圧', unit: 'mmHg', normal_min: 60, normal_max: 84 },
  hba1c: { label: 'HbA1c', unit: '%', normal_min: 4.6, normal_max: 6.2 },
  fasting_glucose: { label: '空腹時血糖', unit: 'mg/dL', normal_min: 70, normal_max: 109 },
  uric_acid: { label: '尿酸値', unit: 'mg/dL', normal_min: 2.1, normal_max: 7.0 },
  alt: { label: 'ALT(GPT)', unit: 'U/L', normal_min: 5, normal_max: 45 },
  ast: { label: 'AST(GOT)', unit: 'U/L', normal_min: 10, normal_max: 40 },
  gamma_gtp: { label: 'γ-GTP', unit: 'U/L', normal_min: 0, normal_max: 80 },
  creatinine: { label: 'クレアチニン', unit: 'mg/dL', normal_min: 0.6, normal_max: 1.1 },
  egfr: { label: 'eGFR', unit: 'mL/min', normal_min: 60, normal_max: 200 },
  hemoglobin: { label: 'ヘモグロビン', unit: 'g/dL', normal_min: 12.0, normal_max: 17.5 },
  bmi: { label: 'BMI', unit: 'kg/m²', normal_min: 18.5, normal_max: 24.9 },
};

export interface DailyHealthData {
  steps: number | null;
  active_energy_kcal: number | null;
  resting_heart_rate: number | null;
  sleep_hours: number | null;
  weight_kg: number | null;
}
