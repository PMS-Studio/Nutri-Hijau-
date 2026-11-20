export type DietCategory = "postpartum" | "adult_female" | "adult_male" | "child_teen";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

export type Gender = "female" | "male";

export type MealType = "sarapan" | "makan_siang" | "makan_malam" | "camilan";

export type LactationStage = "exclusive_0_6" | "partial_6_plus";

export type AppTab = "dashboard" | "food" | "mealplan" | "coach" | "profile";

export type DietGoalType =
  | "turun_berat"
  | "pemulihan_asi"
  | "pertumbuhan_sehat"
  | "pemeliharaan"
  | "tinggi_protein";

export type MenuBudgetStyle =
  | "rumahan_hemat"
  | "praktis_seimbang"
  | "variasi_lengkap";

export interface PlannedMealItem {
  mealType: MealType;
  foodName: string;
  portionNote: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  prepNote: string;
}

export interface WeeklyPlanDay {
  dayNumber: number;
  dayName: string;
  dailyTheme: string;
  dailyTip: string;
  meals: PlannedMealItem[];
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
}

export interface ShoppingCategoryGroup {
  category: string;
  items: string[];
}

export interface WeeklyMealPlan {
  id: string;
  generatedAt: string;
  dietGoal: DietGoalType;
  budgetStyle: MenuBudgetStyle;
  preferencesNote: string;
  targetCaloriesPerDay: number;
  planTitle: string;
  nutritionistSummary: string;
  safetyReminder: string;
  days: WeeklyPlanDay[];
  shoppingList: ShoppingCategoryGroup[];
  checkedShoppingItems: string[];
}

export interface UserProfile {
  name: string;
  category: DietCategory;
  gender: Gender;
  age: number;
  currentWeight: number;
  height: number;
  targetWeight: number;
  activityLevel: ActivityLevel;
  isBreastfeeding: boolean;
  lactationStage?: LactationStage;
  medicalNotes?: string;
  updatedAt: string;
}

export interface MacroTargets {
  carbsG: number;
  proteinG: number;
  fatG: number;
}

export interface NutritionPlan {
  bmr: number;
  bmrFormula: string;
  tdee: number;
  lactationBonus: number;
  calorieAdjustment: number;
  dailyCalorieTarget: number;
  waterTargetMl: number;
  macroTargets: MacroTargets;
  bmi: number;
  bmiStandard: string;
  bmiCategory: string;
  bmiTone: "good" | "warning" | "alert";
  bmiDetail: string;
  isDeficitBlockedByUnderweight?: boolean;
  safetyBannerTitle?: string;
  safetyBannerText?: string;
  childGrowthPercentileLabel?: string;
  childZScore?: number;
}

export interface FoodLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodName: string;
  portionNote: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  nutritionTip?: string;
  assumptions?: string;
  calorieRange?: string;
  confidenceLevel?: "tinggi" | "sedang" | "perkiraan_kasar";
  source: "ai" | "manual";
  createdAt: string;
}

export interface ExerciseLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  durationMinutes: number;
  caloriesBurned: number;
  createdAt: string;
}

export interface WeightLogEntry {
  date: string; // YYYY-MM-DD
  weightKg: number;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}
