import type {
  ActivityLevel,
  DietCategory,
  FamilyRelationRole,
  Gender,
  MealType,
  NutritionFocusGoal,
  NutritionPlan,
  UserProfile,
} from "../types";

export interface CategoryMeta {
  id: DietCategory;
  title: string;
  shortLabel: string;
  subtitle: string;
  description: string;
  defaultGender: Gender;
  defaultAge: number;
  defaultWeight: number;
  defaultHeight: number;
  defaultTargetWeight: number;
}

export const CATEGORY_LIST: CategoryMeta[] = [
  {
    id: "postpartum",
    title: "Ibu Setelah Melahirkan",
    shortLabel: "Ibu Pasca-Melahirkan",
    subtitle: "Pasca-Melahirkan & Menyusui",
    description:
      "Fokus pada pemulihan tubuh dan kecukupan nutrisi harian dengan penyesuaian kalori aman untuk produksi ASI.",
    defaultGender: "female",
    defaultAge: 29,
    defaultWeight: 66,
    defaultHeight: 158,
    defaultTargetWeight: 58,
  },
  {
    id: "adult_female",
    title: "Wanita Dewasa",
    shortLabel: "Wanita Dewasa",
    subtitle: "Usia 19 tahun ke atas",
    description:
      "Defisit kalori terukur dengan keseimbangan protein dan serat untuk penurunan berat badan yang sehat.",
    defaultGender: "female",
    defaultAge: 28,
    defaultWeight: 64,
    defaultHeight: 160,
    defaultTargetWeight: 56,
  },
  {
    id: "adult_male",
    title: "Pria Dewasa",
    shortLabel: "Pria Dewasa",
    subtitle: "Usia 19 tahun ke atas",
    description:
      "Perhitungan BMR dan TDEE optimal dengan defisit kalori terkendali untuk menjaga massa otot dan energi.",
    defaultGender: "male",
    defaultAge: 31,
    defaultWeight: 82,
    defaultHeight: 173,
    defaultTargetWeight: 73,
  },
  {
    id: "child_teen",
    title: "Anak / Remaja",
    shortLabel: "Anak / Remaja",
    subtitle: "Usia 5–18 tahun",
    description:
      "Prioritaskan kalori pemeliharaan dan gizi seimbang untuk pertumbuhan optimal tanpa defisit ekstrem.",
    defaultGender: "female",
    defaultAge: 13,
    defaultWeight: 54,
    defaultHeight: 153,
    defaultTargetWeight: 50,
  },
];

export const CATEGORY_MAP: Record<DietCategory, CategoryMeta> = {
  postpartum: CATEGORY_LIST[0],
  adult_female: CATEGORY_LIST[1],
  adult_male: CATEGORY_LIST[2],
  child_teen: CATEGORY_LIST[3],
};

export interface FamilyRoleMeta {
  id: FamilyRelationRole;
  label: string;
  defaultCategory: DietCategory;
  defaultGender: Gender;
  defaultAge: number;
  defaultWeight: number;
  defaultHeight: number;
  defaultTargetWeight: number;
  defaultFocus: NutritionFocusGoal;
}

export const FAMILY_ROLE_OPTIONS: FamilyRoleMeta[] = [
  {
    id: "ibu",
    label: "Ibu",
    defaultCategory: "adult_female",
    defaultGender: "female",
    defaultAge: 32,
    defaultWeight: 60,
    defaultHeight: 159,
    defaultTargetWeight: 56,
    defaultFocus: "gizi_seimbang",
  },
  {
    id: "ayah",
    label: "Ayah",
    defaultCategory: "adult_male",
    defaultGender: "male",
    defaultAge: 34,
    defaultWeight: 76,
    defaultHeight: 172,
    defaultTargetWeight: 70,
    defaultFocus: "penurunan_berat",
  },
  {
    id: "anak",
    label: "Anak",
    defaultCategory: "child_teen",
    defaultGender: "male",
    defaultAge: 9,
    defaultWeight: 29,
    defaultHeight: 133,
    defaultTargetWeight: 29,
    defaultFocus: "pertumbuhan_anak",
  },
  {
    id: "remaja",
    label: "Remaja",
    defaultCategory: "child_teen",
    defaultGender: "female",
    defaultAge: 15,
    defaultWeight: 52,
    defaultHeight: 159,
    defaultTargetWeight: 52,
    defaultFocus: "pertumbuhan_anak",
  },
  {
    id: "lansia",
    label: "Orang Tua / Lansia",
    defaultCategory: "adult_female",
    defaultGender: "female",
    defaultAge: 65,
    defaultWeight: 58,
    defaultHeight: 156,
    defaultTargetWeight: 58,
    defaultFocus: "gizi_seimbang",
  },
  {
    id: "lainnya",
    label: "Anggota Lain",
    defaultCategory: "adult_female",
    defaultGender: "female",
    defaultAge: 26,
    defaultWeight: 60,
    defaultHeight: 162,
    defaultTargetWeight: 56,
    defaultFocus: "gizi_seimbang",
  },
];

export const FAMILY_ROLE_MAP: Record<FamilyRelationRole, FamilyRoleMeta> = {
  ibu: FAMILY_ROLE_OPTIONS[0],
  ayah: FAMILY_ROLE_OPTIONS[1],
  anak: FAMILY_ROLE_OPTIONS[2],
  remaja: FAMILY_ROLE_OPTIONS[3],
  lansia: FAMILY_ROLE_OPTIONS[4],
  lainnya: FAMILY_ROLE_OPTIONS[5],
};

export interface NutritionFocusMeta {
  id: NutritionFocusGoal;
  label: string;
  shortLabel: string;
  description: string;
}

export const NUTRITION_FOCUS_OPTIONS: NutritionFocusMeta[] = [
  {
    id: "gizi_seimbang",
    label: "Gizi Seimbang & Vitalitas",
    shortLabel: "Gizi Seimbang",
    description:
      "Pemeliharaan kalori seimbang harian agar energi, daya tahan tubuh, dan metabolisme keluarga tetap optimal.",
  },
  {
    id: "penurunan_berat",
    label: "Penurunan Berat Sehat",
    shortLabel: "Turun Berat",
    description:
      "Defisit kalori terukur 300–500 kkal dengan protein cukup agar lemak berkurang tanpa rasa lemas.",
  },
  {
    id: "pemulihan_laktasi",
    label: "Pemulihan & Nutrisi ASI",
    shortLabel: "Pemulihan & ASI",
    description:
      "Prioritas pemulihan pasca-melahirkan, kecukupan cairan, zat besi, kalsium, dan kalori aman menyusui.",
  },
  {
    id: "pertumbuhan_anak",
    label: "Tumbuh Kembang Anak & Remaja",
    shortLabel: "Tumbuh Kembang",
    description:
      "Nutrisi penuh untuk pertumbuhan tinggi badan, konsentrasi belajar, dan energi bermain tanpa diet ketat.",
  },
  {
    id: "peningkatan_otot",
    label: "Massa Otot & Kebugaran",
    shortLabel: "Massa Otot",
    description:
      "Optimalisasi protein harian dan asupan energi untuk kekuatan otot serta kebugaran aktif.",
  },
  {
    id: "penambahan_berat",
    label: "Pemulihan / Tambah Berat Sehat",
    shortLabel: "Tambah Berat",
    description:
      "Surplus kalori bertahap (+250–300 kkal) dari makanan padat gizi untuk menaikkan berat secara sehat.",
  },
];

export const NUTRITION_FOCUS_MAP: Record<NutritionFocusGoal, NutritionFocusMeta> = {
  gizi_seimbang: NUTRITION_FOCUS_OPTIONS[0],
  penurunan_berat: NUTRITION_FOCUS_OPTIONS[1],
  pemulihan_laktasi: NUTRITION_FOCUS_OPTIONS[2],
  pertumbuhan_anak: NUTRITION_FOCUS_OPTIONS[3],
  peningkatan_otot: NUTRITION_FOCUS_OPTIONS[4],
  penambahan_berat: NUTRITION_FOCUS_OPTIONS[5],
};

export function inferDefaultNutritionFocus(
  category: DietCategory,
  currentWeight: number,
  targetWeight: number
): NutritionFocusGoal {
  if (category === "child_teen") return "pertumbuhan_anak";
  if (category === "postpartum") return "pemulihan_laktasi";
  if (targetWeight < currentWeight - 0.5) return "penurunan_berat";
  if (targetWeight > currentWeight + 0.5) return "penambahan_berat";
  return "gizi_seimbang";
}

export const ACTIVITY_OPTIONS: Array<{
  id: ActivityLevel;
  label: string;
  detail: string;
  multiplier: number;
}> = [
  {
    id: "sedentary",
    label: "Jarang Olahraga",
    detail: "Banyak duduk, minim aktivitas fisik terstruktur",
    multiplier: 1.2,
  },
  {
    id: "light",
    label: "Ringan",
    detail: "Aktivitas harian atau olahraga ringan 1–3 hari/minggu",
    multiplier: 1.375,
  },
  {
    id: "moderate",
    label: "Sedang",
    detail: "Olahraga teratur 3–5 hari/minggu",
    multiplier: 1.55,
  },
  {
    id: "active",
    label: "Aktif",
    detail: "Olahraga intens atau aktivitas fisik berat 6–7 hari/minggu",
    multiplier: 1.725,
  },
];

export const MEAL_OPTIONS: Array<{
  id: MealType;
  label: string;
  timeHint: string;
}> = [
  { id: "sarapan", label: "Sarapan", timeHint: "06.00 – 09.30" },
  { id: "makan_siang", label: "Makan Siang", timeHint: "12.00 – 14.00" },
  { id: "makan_malam", label: "Makan Malam", timeHint: "18.00 – 20.30" },
  { id: "camilan", label: "Camilan", timeHint: "Antar waktu makan" },
];

export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateIndo(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDateIndo(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

export function getTimeOfDayGreeting(): {
  greeting: string;
  period: "morning" | "afternoon" | "evening";
} {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) {
    return { greeting: "Selamat Pagi", period: "morning" };
  }
  if (hour >= 11 && hour < 15) {
    return { greeting: "Selamat Siang", period: "afternoon" };
  }
  if (hour >= 15 && hour < 18) {
    return { greeting: "Selamat Sore", period: "afternoon" };
  }
  return { greeting: "Selamat Malam", period: "evening" };
}

export function calculateDailyStreak(
  foodDates: string[],
  exerciseDates: string[],
  waterLogs: Record<string, number>,
  weightDates: string[]
): number {
  const activeSet = new Set<string>();
  foodDates.forEach((d) => activeSet.add(d));
  exerciseDates.forEach((d) => activeSet.add(d));
  weightDates.forEach((d) => activeSet.add(d));
  Object.entries(waterLogs).forEach(([d, ml]) => {
    if (ml > 0) activeSet.add(d);
  });

  if (activeSet.size === 0) return 0;

  const toKey = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const cursor = new Date();
  // If user hasn't logged yet today, check if yesterday started a live streak
  if (!activeSet.has(toKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeSet.has(toKey(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (activeSet.has(toKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// WHO Growth Reference 2007 LMS Parameters (BMI-for-age 5 to 18 years, exact age in years)
// L = Box-Cox power, M = Median BMI, S = Coefficient of Variation
interface LmsEntry {
  L: number;
  M: number;
  S: number;
}

const WHO_LMS_MALE: Record<number, LmsEntry> = {
  5: { L: -0.7387, M: 15.2641, S: 0.08390 },
  6: { L: -1.0459, M: 15.2768, S: 0.08703 },
  7: { L: -1.3210, M: 15.4894, S: 0.09166 },
  8: { L: -1.5194, M: 15.7478, S: 0.09725 },
  9: { L: -1.6203, M: 16.0488, S: 0.10328 },
  10: { L: -1.6305, M: 16.4430, S: 0.10918 },
  11: { L: -1.5646, M: 16.9255, S: 0.11457 },
  12: { L: -1.4426, M: 17.4959, S: 0.11906 },
  13: { L: -1.2921, M: 18.1816, S: 0.12232 },
  14: { L: -1.1329, M: 18.9698, S: 0.12432 },
  15: { L: -0.9781, M: 19.7664, S: 0.12516 },
  16: { L: -0.8358, M: 20.4958, S: 0.12500 },
  17: { L: -0.7105, M: 21.1489, S: 0.12405 },
  18: { L: -0.6020, M: 21.7165, S: 0.12257 },
};

const WHO_LMS_FEMALE: Record<number, LmsEntry> = {
  5: { L: -0.8886, M: 15.2441, S: 0.09692 },
  6: { L: -1.1239, M: 15.2651, S: 0.10212 },
  7: { L: -1.2747, M: 15.4426, S: 0.10796 },
  8: { L: -1.3372, M: 15.7204, S: 0.11391 },
  9: { L: -1.3266, M: 16.1011, S: 0.11955 },
  10: { L: -1.2627, M: 16.5931, S: 0.12457 },
  11: { L: -1.1646, M: 17.2111, S: 0.12867 },
  12: { L: -1.0493, M: 17.9597, S: 0.13163 },
  13: { L: -0.9317, M: 18.7793, S: 0.13339 },
  14: { L: -0.8226, M: 19.5855, S: 0.13407 },
  15: { L: -0.7285, M: 20.2330, S: 0.13393 },
  16: { L: -0.6518, M: 20.7279, S: 0.13322 },
  17: { L: -0.5917, M: 21.0510, S: 0.13224 },
  18: { L: -0.5453, M: 21.2587, S: 0.13122 },
};

// Standard normal CDF approximation (Abramowitz & Stegun) for percentile display
function zToPercentile(z: number): number {
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  const cdf = z > 0 ? 1 - p : p;
  return Math.max(0.1, Math.min(99.9, Math.round(cdf * 1000) / 10));
}

function evaluateChildTeenBmi(age: number, gender: Gender, bmi: number): {
  category: string;
  tone: "good" | "warning" | "alert";
  detail: string;
  curveLabel: string;
  zScore: number;
} {
  const clampedAge = Math.max(5, Math.min(18, Math.round(age)));
  const lms = gender === "male" ? WHO_LMS_MALE[clampedAge] : WHO_LMS_FEMALE[clampedAge];

  // WHO Box-Cox LMS Z-score formula
  const rawZ =
    Math.abs(lms.L) < 1e-6
      ? Math.log(bmi / lms.M) / lms.S
      : (Math.pow(bmi / lms.M, lms.L) - 1) / (lms.L * lms.S);
  const zScore = Math.round(rawZ * 100) / 100;
  const percentile = zToPercentile(zScore);

  if (zScore < -2) {
    return {
      category: "Gizi Kurang (Kurva WHO 2007)",
      tone: "warning",
      detail: `Skor-Z BMI (${zScore.toFixed(2)} SD) berada di bawah -2 SD untuk usia ${clampedAge} tahun (median ${lms.M.toFixed(1)}). Fokus pada asupan padat gizi dan protein untuk mengejar pertumbuhan.`,
      curveLabel: `Z-Score ${zScore.toFixed(2)} · Persentil ~${percentile}% (< -2 SD)`,
      zScore,
    };
  }
  if (zScore <= 1) {
    return {
      category: "Gizi Baik / Pertumbuhan Normal",
      tone: "good",
      detail: `Skor-Z BMI (${zScore >= 0 ? "+" : ""}${zScore.toFixed(2)} SD) berada pada rentang sehat WHO 2007 (-2 SD hingga +1 SD) untuk usia ${clampedAge} tahun (median ${lms.M.toFixed(1)}).`,
      curveLabel: `Z-Score ${zScore >= 0 ? "+" : ""}${zScore.toFixed(2)} · Persentil ~${percentile}% (Rentang Sehat)`,
      zScore,
    };
  }
  if (zScore <= 2) {
    return {
      category: "Risiko Berat Berlebih (Overweight)",
      tone: "warning",
      detail: `Skor-Z BMI (+${zScore.toFixed(2)} SD) berada antara +1 SD hingga +2 SD untuk usia ${clampedAge} tahun (median ${lms.M.toFixed(1)}). Prioritaskan gizi seimbang dan aktivitas fisik rutin tanpa membatasi nutrisi pertumbuhan.`,
      curveLabel: `Z-Score +${zScore.toFixed(2)} · Persentil ~${percentile}% (+1 SD s.d. +2 SD)`,
      zScore,
    };
  }
  return {
    category: "Obesitas Anak / Remaja",
    tone: "alert",
    detail: `Skor-Z BMI (+${zScore.toFixed(2)} SD) berada di atas +2 SD untuk usia ${clampedAge} tahun (median ${lms.M.toFixed(1)}). Konsultasikan rencana perbaikan pola makan dengan dokter anak atau ahli gizi.`,
    curveLabel: `Z-Score +${zScore.toFixed(2)} · Persentil ~${percentile}% (> +2 SD)`,
    zScore,
  };
}

// Schofield (1985) Pediatric BMR equation (FAO/WHO/UNU)
function calculatePediatricBmr(age: number, gender: Gender, weightKg: number, heightCm: number): number {
  if (age < 10) {
    return gender === "male"
      ? 19.6 * weightKg + 1.303 * heightCm + 414.9
      : 16.97 * weightKg + 1.618 * heightCm + 371.2;
  }
  return gender === "male"
    ? 16.25 * weightKg + 1.372 * heightCm + 515.5
    : 8.365 * weightKg + 4.65 * heightCm + 200.0;
}

export function calculateNutritionPlan(profile: UserProfile): NutritionPlan {
  const weight = Math.max(15, Number(profile.currentWeight) || 60);
  const height = Math.max(80, Number(profile.height) || 160);
  const age = Math.max(5, Number(profile.age) || 25);
  const targetWeight = Math.max(15, Number(profile.targetWeight) || weight);

  const effectiveGender: Gender =
    profile.category === "adult_male"
      ? "male"
      : profile.category === "postpartum" || profile.category === "adult_female"
        ? "female"
        : profile.gender;

  let bmrRaw = 0;
  let bmrFormula = "Mifflin-St Jeor (Dewasa)";

  if (profile.category === "child_teen") {
    bmrRaw = calculatePediatricBmr(age, effectiveGender, weight, height);
    bmrFormula = "Schofield FAO/WHO (Pediatrik 5–18 thn)";
  } else {
    bmrRaw =
      effectiveGender === "male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
  }
  const bmr = Math.round(bmrRaw);

  const activityMultiplier =
    ACTIVITY_OPTIONS.find((a) => a.id === profile.activityLevel)?.multiplier ?? 1.375;
  const tdee = Math.round(bmr * activityMultiplier);

  // BMI
  const heightM = height / 100;
  const bmi = Math.round((weight / (heightM * heightM)) * 10) / 10;

  let bmiStandard = "WHO Asia-Pasifik";
  let bmiCategory = "Normal / Ideal";
  let bmiTone: "good" | "warning" | "alert" = "good";
  let bmiDetail = "Berat badan berada pada rentang seimbang untuk tinggi badan Anda.";
  let childGrowthPercentileLabel: string | undefined;
  let childZScore: number | undefined;
  let isUnderweight = false;

  if (profile.category === "child_teen") {
    bmiStandard = "WHO Growth Reference 2007 (LMS)";
    const childEval = evaluateChildTeenBmi(age, effectiveGender, bmi);
    bmiCategory = childEval.category;
    bmiTone = childEval.tone;
    bmiDetail = childEval.detail;
    childGrowthPercentileLabel = childEval.curveLabel;
    childZScore = childEval.zScore;
    isUnderweight = childEval.zScore < -2;
  } else {
    // WHO Asia-Pacific BMI cutoffs (appropriate for Indonesian adults)
    if (bmi < 18.5) {
      bmiCategory = "Berat Badan Kurang";
      bmiTone = "warning";
      bmiDetail =
        "BMI di bawah 18,5 (WHO Asia-Pasifik). Defisit kalori dinonaktifkan agar kesehatan dan massa tubuh tetap terjaga.";
      isUnderweight = true;
    } else if (bmi < 23.0) {
      bmiCategory = "Normal / Ideal";
      bmiTone = "good";
      bmiDetail =
        "BMI berada pada rentang ideal populasi Asia-Pasifik (18,5–22,9). Pertahankan komposisi tubuh yang sehat.";
    } else if (bmi < 25.0) {
      bmiCategory = "Berlebih (Overweight Asia)";
      bmiTone = "warning";
      bmiDetail =
        "BMI berada pada rentang 23,0–24,9 (batas risiko metabolik Asia-Pasifik). Penyesuaian kalori ringan dan aktivitas teratur sangat efektif.";
    } else if (bmi < 30.0) {
      bmiCategory = "Obesitas Tingkat I";
      bmiTone = "alert";
      bmiDetail =
        "BMI berada pada rentang 25,0–29,9 (WHO Asia-Pasifik). Penurunan berat badan bertahap bersama asupan protein cukup sangat dianjurkan.";
    } else {
      bmiCategory = "Obesitas Tingkat II";
      bmiTone = "alert";
      bmiDetail =
        "BMI ≥ 30,0 (WHO Asia-Pasifik). Terapkan defisit kalori terukur dan pertimbangkan pemantauan berkala bersama dokter atau ahli gizi.";
    }
  }

  const effectiveFocus: NutritionFocusGoal =
    profile.category === "child_teen"
      ? "pertumbuhan_anak"
      : profile.nutritionFocus ||
        inferDefaultNutritionFocus(profile.category, weight, targetWeight);
  const isSenior = age >= 60;

  let lactationBonus = 0;
  let calorieAdjustment = 0;
  let dailyCalorieTarget = tdee;
  let waterTargetMl = 2000;
  let isDeficitBlockedByUnderweight = false;
  let safetyBannerTitle: string | undefined;
  let safetyBannerText: string | undefined;

  if (profile.category === "postpartum") {
    const stage = profile.lactationStage ?? "exclusive_0_6";
    lactationBonus = profile.isBreastfeeding
      ? stage === "exclusive_0_6"
        ? 450
        : 330
      : 0;
    const baseNeed = tdee + lactationBonus;

    if (isUnderweight) {
      isDeficitBlockedByUnderweight = true;
      calorieAdjustment =
        targetWeight > weight + 0.5 || effectiveFocus === "penambahan_berat" ? 250 : 0;
      dailyCalorieTarget = baseNeed + calorieAdjustment;
    } else if (
      effectiveFocus === "gizi_seimbang" ||
      (effectiveFocus === "pemulihan_laktasi" && targetWeight >= weight - 0.5)
    ) {
      calorieAdjustment = 0;
      dailyCalorieTarget = Math.max(profile.isBreastfeeding ? 1800 : 1500, baseNeed);
    } else if (effectiveFocus === "penambahan_berat") {
      calorieAdjustment = 250;
      dailyCalorieTarget = baseNeed + calorieAdjustment;
    } else {
      const rawDeficit = targetWeight < weight - 0.5 ? -250 : 0;
      const safeFloor = profile.isBreastfeeding ? 1800 : 1500;
      dailyCalorieTarget = Math.max(safeFloor, baseNeed + rawDeficit);
      calorieAdjustment = dailyCalorieTarget - baseNeed;
    }

    waterTargetMl = profile.isBreastfeeding
      ? stage === "exclusive_0_6"
        ? 3000
        : 2750
      : 2500;

    if (isDeficitBlockedByUnderweight) {
      safetyBannerTitle = "Prioritas Pemulihan Berat & Nutrisi Ibu";
      safetyBannerText =
        "Karena BMI Anda berada di bawah 18,5, aplikasi menonaktifkan defisit kalori untuk melindungi kesehatan ibu dan kecukupan nutrisi pemulihan.";
    } else {
      safetyBannerTitle = profile.isBreastfeeding
        ? stage === "exclusive_0_6"
          ? "Panduan Pemulihan & Menyusui Eksklusif (0–6 Bulan)"
          : "Panduan Menyusui Lanjutan (>6 Bulan + MPASI)"
        : "Panduan Pemulihan Pasca-Melahirkan";
      safetyBannerText = profile.isBreastfeeding
        ? `Kebutuhan kalori Anda telah ditambah +${lactationBonus} kkal untuk mendukung produksi ASI. Fokuskan pada pemulihan tubuh, kecukupan cairan (${waterTargetMl.toLocaleString("id-ID")} ml/hari), zat besi, kalsium, dan protein seimbang.`
        : "Fokuskan pola makan pada pemulihan energi, perbaikan jaringan tubuh, dan nutrisi seimbang agar stamina harian tetap prima.";
    }
  } else if (profile.category === "child_teen") {
    lactationBonus = 0;
    const ageFloor = age < 8 ? 1150 : age < 11 ? 1300 : 1450;
    if (isUnderweight) {
      isDeficitBlockedByUnderweight = true;
      calorieAdjustment = 200;
      dailyCalorieTarget = Math.max(ageFloor, tdee + calorieAdjustment);
      safetyBannerTitle = "Prioritas Pemulihan Gizi & Pertumbuhan Anak";
      safetyBannerText =
        "Skor-Z BMI berada di bawah -2 SD (Gizi Kurang). Target kalori ditambah bertahap (+200 kkal dari kebutuhan pemeliharaan) untuk mendukung kejar tumbuh dengan pendampingan orang tua dan dokter/ahli gizi.";
    } else {
      calorieAdjustment = 0;
      dailyCalorieTarget = Math.max(ageFloor, tdee);
      const isLowerTargetEntered = targetWeight < weight - 0.5 && bmiTone === "good";
      safetyBannerTitle = "Mode Pertumbuhan Sehat (Tanpa Defisit Ekstrem)";
      safetyBannerText = isLowerTargetEntered
        ? "Skor-Z BMI anak/remaja sudah dalam rentang sehat WHO 2007. Target kalori tetap dipertahankan pada level pemeliharaan untuk mendukung pertambahan tinggi badan dan perkembangan organ; lakukan pemantauan rutin bersama orang tua dan dokter/ahli gizi."
        : "Target kalori dihitung memakai rumus pediatrik Schofield dan difokuskan pada pemeliharaan energi (maintenance) untuk mendukung tinggi badan serta perkembangan optimal. Pengaturan pola makan anak/remaja harus dalam pengawasan orang tua dan dokter/ahli gizi.";
    }
    waterTargetMl = age < 10 ? 1500 : age < 14 ? 1800 : 2100;
  } else {
    // Adult Male & Adult Female (including Senior 60+)
    if (isUnderweight) {
      isDeficitBlockedByUnderweight = true;
      calorieAdjustment =
        targetWeight > weight + 0.5 || effectiveFocus === "penambahan_berat" ? 250 : 0;
      dailyCalorieTarget = tdee + calorieAdjustment;
      safetyBannerTitle = "Defisit Kalori Dinonaktifkan (BMI < 18,5)";
      safetyBannerText =
        "BMI tergolong Berat Badan Kurang. Demi keamanan, target kalori diarahkan ke pemeliharaan atau pemulihan berat sehat padat gizi.";
    } else if (effectiveFocus === "gizi_seimbang") {
      calorieAdjustment = 0;
      dailyCalorieTarget = tdee;
    } else if (effectiveFocus === "penambahan_berat") {
      calorieAdjustment = 300;
      dailyCalorieTarget = tdee + calorieAdjustment;
    } else if (effectiveFocus === "peningkatan_otot") {
      const diff = weight - targetWeight;
      calorieAdjustment = diff > 2 ? -200 : 200;
      const safeFloor = profile.category === "adult_male" ? 1600 : 1350;
      dailyCalorieTarget = Math.max(safeFloor, tdee + calorieAdjustment);
      calorieAdjustment = dailyCalorieTarget - tdee;
    } else {
      const diff = weight - targetWeight;
      if (diff > 0.5) {
        const rawDeficit = diff >= 8 ? -500 : diff >= 3 ? -400 : -300;
        calorieAdjustment = isSenior ? Math.max(-300, rawDeficit) : rawDeficit;
      } else if (diff < -0.5) {
        calorieAdjustment = 250;
      } else {
        calorieAdjustment = 0;
      }
      const safeFloor = profile.category === "adult_male" ? 1500 : 1200;
      dailyCalorieTarget = Math.max(safeFloor, tdee + calorieAdjustment);
      calorieAdjustment = dailyCalorieTarget - tdee;
    }

    if (isSenior && !safetyBannerTitle) {
      safetyBannerTitle = "Prioritas Nutrisi Usia Lanjut (60+ Tahun)";
      safetyBannerText =
        "Pada usia 60+ tahun, fokus utama adalah menjaga massa otot (kecukupan protein), kepadatan tulang (kalsium & vitamin D), serat, dan hidrasi tanpa defisit kalori yang terlalu drastis.";
    }

    waterTargetMl = isSenior ? 1800 : 2000;
  }

  // Reference weight-anchored protein calculation (aligned with AKG Kemenkes RI & AMDR)
  let proteinG = 0;
  let fatG = 0;
  let carbsG = 0;

  if (profile.category === "child_teen") {
    proteinG = Math.round((dailyCalorieTarget * 0.2) / 4);
    fatG = Math.round((dailyCalorieTarget * 0.28) / 9);
    carbsG = Math.max(110, Math.round((dailyCalorieTarget - proteinG * 4 - fatG * 9) / 4));
  } else {
    // Reference ideal BMI ~22 for Asian adults
    const idealWeight = 22 * heightM * heightM;
    const referenceWeight =
      bmi > 25 ? idealWeight + 0.25 * (weight - idealWeight) : weight;
    const proteinPerKg =
      effectiveFocus === "peningkatan_otot"
        ? 1.7
        : profile.category === "postpartum"
          ? 1.35
          : isSenior
            ? 1.3
            : effectiveFocus === "penurunan_berat"
              ? 1.45
              : 1.25;
    const lactationProteinBonus =
      profile.category === "postpartum" && profile.isBreastfeeding
        ? (profile.lactationStage ?? "exclusive_0_6") === "exclusive_0_6"
          ? 18
          : 12
        : 0;
    const minProt = Math.round((dailyCalorieTarget * 0.2) / 4);
    const maxProt = Math.round((dailyCalorieTarget * 0.34) / 4);
    proteinG = Math.max(
      minProt,
      Math.min(maxProt, Math.round(referenceWeight * proteinPerKg + lactationProteinBonus))
    );
    fatG = Math.round((dailyCalorieTarget * 0.28) / 9);
    carbsG = Math.max(100, Math.round((dailyCalorieTarget - proteinG * 4 - fatG * 9) / 4));
  }

  return {
    bmr,
    bmrFormula,
    tdee,
    lactationBonus,
    calorieAdjustment,
    dailyCalorieTarget,
    waterTargetMl,
    macroTargets: { carbsG, proteinG, fatG },
    bmi,
    bmiStandard,
    bmiCategory,
    bmiTone,
    bmiDetail,
    isDeficitBlockedByUnderweight,
    safetyBannerTitle,
    safetyBannerText,
    childGrowthPercentileLabel,
    childZScore,
  };
}

export function getQuickPromptsForCategory(
  category: DietCategory,
  isBreastfeeding?: boolean,
  nutritionFocus?: NutritionFocusGoal,
  age?: number
): string[] {
  if (age && age >= 60) {
    return [
      "Menu rumahan lembut tinggi protein & kalsium untuk lansia",
      "Olahraga ringan 15 menit untuk menjaga kekuatan otot dan sendi",
      "Ide sarapan ramah lambung dan gula darah stabil",
      "Cara mencukupi serat dan cairan harian di usia lanjut",
    ];
  }

  if (nutritionFocus === "peningkatan_otot") {
    return [
      "Menu makan harian tinggi protein dengan bahan lokal terjangkau",
      "Latihan kekuatan di rumah 20 menit tanpa alat berat",
      "Ide camilan pemulihan otot setelah berolahraga",
      "Cara membagi asupan protein agar penyerapan optimal",
    ];
  }

  if (nutritionFocus === "gizi_seimbang") {
    return [
      "Ide menu makan keluarga seimbang sesuai Isi Piringku",
      "Sarapan praktis 15 menit yang menjaga energi hingga siang",
      "Camilan sore sehat rendah gula untuk seluruh keluarga",
      "Aktivitas fisik ringan 20 menit bersama keluarga di akhir pekan",
    ];
  }

  if (nutritionFocus === "penambahan_berat") {
    return [
      "Menu padat gizi tinggi protein untuk menaikkan berat badan sehat",
      "Ide camilan kalori sehat tanpa gorengan atau gula berlebih",
      "Kombinasi latihan beban ringan dan nutrisi pemulihan",
      "Cara menambah porsi makan bertahap tanpa terasa begah",
    ];
  }

  switch (category) {
    case "postpartum":
      return [
        "Menu pelancar ASI yang bergizi dan seimbang",
        "Olahraga ringan pemulihan otot perut (diastasis recti)",
        isBreastfeeding
          ? "Camilan sehat anti lapar saat menyusui malam"
          : "Menu makan siang tinggi zat besi untuk pemulihan",
        "Tips menjaga berat badan dan energi pasca-melahirkan",
      ];
    case "child_teen":
      return [
        "Ide bekal sekolah sehat dan bergizi seimbang",
        "Aktivitas fisik menyenangkan 20 menit untuk anak",
        "Camilan sore bergizi pengganti jajanan manis",
        "Cara mengatur porsi makan seimbang untuk tumbuh kembang",
      ];
    case "adult_male":
      return [
        "Menu makan siang tinggi protein di bawah 500 kalori",
        "Olahraga kardio di rumah 15 menit",
        "Rekomendasi sarapan praktis 400 kalori sebelum kerja",
        "Strategi menjaga massa otot selama defisit kalori",
      ];
    case "adult_female":
    default:
      return [
        "Menu makan siang tinggi protein di bawah 500 kalori",
        "Olahraga kardio di rumah 15 menit",
        "Ide makan malam ringan yang mengenyangkan",
        "Cara mengatasi keinginan ngemil manis di sore hari",
      ];
  }
}

// Compendium of Physical Activities (MET values)
export const EXERCISE_PRESETS = [
  { name: "Jalan Santai", defaultMinutes: 30, met: 3.5 },
  { name: "Jalan Cepat", defaultMinutes: 30, met: 4.8 },
  { name: "Kardio di Rumah", defaultMinutes: 20, met: 6.5 },
  { name: "Yoga / Peregangan Pemulihan", defaultMinutes: 25, met: 2.8 },
  { name: "Bersepeda Santai", defaultMinutes: 30, met: 5.5 },
  { name: "Latihan Kekuatan Ringan", defaultMinutes: 25, met: 4.5 },
];

export function calculateExerciseCalories(
  met: number,
  weightKg: number,
  durationMinutes: number
): number {
  const safeWeight = Math.max(20, weightKg || 60);
  const safeMins = Math.max(1, durationMinutes || 1);
  // Standard ACSM metabolic equation: kcal/min = (MET * 3.5 * weight_kg) / 200
  return Math.max(1, Math.round(((met * 3.5 * safeWeight) / 200) * safeMins));
}

export const FOOD_EXAMPLE_PROMPTS = [
  "1 mangkuk sayur katuk, nasi merah, dan ayam bakar",
  "2 butir telur rebus, 2 lembar roti gandum, dan 1/2 alpukat",
  "1 piring gado-gado lontong dengan bumbu kacang sedang",
  "1 mangkuk soto ayam bening tanpa kulit dan 1/2 porsi nasi",
];
