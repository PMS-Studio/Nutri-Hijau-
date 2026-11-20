export type DietCategory = "postpartum" | "adult_female" | "adult_male" | "child_teen";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

export type Gender = "female" | "male";

export type MealType = "sarapan" | "makan_siang" | "makan_malam" | "camilan";

export type LactationStage = "exclusive_0_6" | "partial_6_plus";

export type FamilyRelationRole =
  | "ibu"
  | "ayah"
  | "anak"
  | "remaja"
  | "lansia"
  | "lainnya";

export type NutritionFocusGoal =
  | "penurunan_berat"
  | "gizi_seimbang"
  | "pertumbuhan_anak"
  | "pemulihan_laktasi"
  | "peningkatan_otot"
  | "penambahan_berat";

export type AppTab =
  | "dashboard"
  | "food"
  | "mealplan"
  | "coach"
  | "profile";

export type DietGoalType =
  | "turun_berat"
  | "pemulihan_asi"
  | "pertumbuhan_sehat"
  | "pemeliharaan"
  | "tinggi_protein"
  | "tambah_berat";

export type MenuBudgetStyle =
  | "rumahan_hemat"
  | "praktis_seimbang"
  | "variasi_lengkap";

export type MealPlanDuration = 7 | 14 | 30;

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
  profileCategory?: DietCategory;
  medicalNotesSnapshot?: string;
  targetCaloriesPerDay: number;
  weeklyAverageCalories?: number;
  durationDays?: number;
  planTitle: string;
  nutritionistSummary: string;
  safetyReminder: string;
  days: WeeklyPlanDay[];
  shoppingList: ShoppingCategoryGroup[];
  checkedShoppingItems: string[];
}

export interface FamilyMemberPortion {
  memberId: string;
  memberName: string;
  portionInstruction: string;
  estimatedCalories: number;
}

export interface FamilyPlannedMeal {
  mealType: MealType;
  dishName: string;
  baseIngredientsNote: string;
  prepNote: string;
  memberPortions: FamilyMemberPortion[];
}

export interface FamilyPlanDay {
  dayNumber: number;
  dayName: string;
  dailyTheme: string;
  dailyTip: string;
  meals: FamilyPlannedMeal[];
}

export interface FamilyWeeklyMealPlan {
  id: string;
  generatedAt: string;
  familyName: string;
  budgetStyle: MenuBudgetStyle;
  preferencesNote: string;
  memberIdsSnapshot: string[];
  durationDays?: number;
  planTitle: string;
  nutritionistSummary: string;
  safetyReminder: string;
  days: FamilyPlanDay[];
  shoppingList: ShoppingCategoryGroup[];
  checkedShoppingItems: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  relationRole: FamilyRelationRole;
  category: DietCategory;
  nutritionFocus: NutritionFocusGoal;
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

export interface DetectedFoodItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
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
  detectedItems?: DetectedFoodItem[];
  source: "ai" | "manual";
  createdAt: string;
}

export interface GroceryRecipeIdea {
  title: string;
  cookingTimeMinutes: number;
  mealType: MealType;
  portionNote: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  ingredientsUsed: string[];
  extraPantryItems: string[];
  cookingSteps: string[];
  nutritionAdaptationNote: string;
}

export interface GroceryAnalysisResult {
  summary: string;
  detectedIngredients: string[];
  storageTip: string;
  recipes: GroceryRecipeIdea[];
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

export interface SuggestedMealReplacement {
  mealType: MealType;
  foodName: string;
  portionNote: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  orderingTip?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  hasPhoto?: boolean;
  suggestedMeal?: SuggestedMealReplacement;
}

export interface MemberNutritionData {
  foodLogs: FoodLogEntry[];
  exerciseLogs: ExerciseLogEntry[];
  waterLogs: Record<string, number>;
  weightLogs: WeightLogEntry[];
  coachChats: Record<string, ChatMessage[]>;
  dailyConsultChats?: ChatMessage[];
  weeklyPlan: WeeklyMealPlan | null;
}

export interface FamilyStore {
  familyName: string;
  activeMemberId: string | null;
  members: UserProfile[];
  memberData: Record<string, MemberNutritionData>;
  familyWeeklyPlan: FamilyWeeklyMealPlan | null;
}
