import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Apple,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  ImagePlus,
  Info,
  Loader2,
  Moon,
  Plus,
  ShoppingBasket,
  Sparkles,
  Sun,
  Sunrise,
  Table2,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import type {
  ChatMessage,
  DietGoalType,
  FamilyWeeklyMealPlan,
  FoodLogEntry,
  GroceryAnalysisResult,
  GroceryRecipeIdea,
  MealPlanDuration,
  MealType,
  MenuBudgetStyle,
  NutritionPlan,
  PlannedMealItem,
  ShoppingCategoryGroup,
  UserProfile,
  WeeklyMealPlan,
} from "../types";
import {
  CATEGORY_MAP,
  NUTRITION_FOCUS_MAP,
  calculateNutritionPlan,
  getTodayDateKey,
} from "../utils/nutrition";
import { DailyMenuChatbot } from "./DailyMenuChatbot";
import { postJsonApi } from "../utils/api";
import { compressImageFile } from "../utils/image";

interface MealPlanViewProps {
  profile: UserProfile;
  plan: NutritionPlan;
  weeklyPlan: WeeklyMealPlan | null;
  todayFoods: FoodLogEntry[];
  familyName: string;
  familyMembers: UserProfile[];
  familyWeeklyPlan: FamilyWeeklyMealPlan | null;
  preferredScope?: "personal" | "family";
  todaySummary: {
    caloriesIn: number;
    caloriesOut: number;
    remainingCalories: number;
    carbs: number;
    protein: number;
    fat: number;
    waterMl: number;
  };
  consultMessages: ChatMessage[];
  onAppendConsultMessages: (msgs: ChatMessage[]) => void;
  onResetConsultChat: () => void;
  onSaveWeeklyPlan: (nextPlan: WeeklyMealPlan | null) => void;
  onToggleShoppingItem: (itemKey: string) => void;
  onSaveFamilyWeeklyPlan: (nextPlan: FamilyWeeklyMealPlan | null) => void;
  onToggleFamilyShoppingItem: (itemKey: string) => void;
  onLogMealToToday: (entry: Omit<FoodLogEntry, "id" | "createdAt">) => void;
  onAddFamilyMember: () => void;
}

const GOAL_OPTIONS: Array<{
  id: DietGoalType;
  label: string;
  desc: string;
}> = [
  {
    id: "pemeliharaan",
    label: "Gizi Seimbang",
    desc: "Kalori seimbang untuk energi stabil & kesehatan menyeluruh",
  },
  {
    id: "turun_berat",
    label: "Turun Berat Bertahap",
    desc: "Defisit aman 300–500 kkal dengan kenyang lebih lama",
  },
  {
    id: "tinggi_protein",
    label: "Tinggi Protein & Otot",
    desc: "Prioritas protein tinggi untuk kekuatan & massa otot",
  },
  {
    id: "tambah_berat",
    label: "Padat Gizi & Tambah Berat",
    desc: "Surplus sehat dari lauk bergizi dan karbohidrat kompleks",
  },
  {
    id: "pemulihan_asi",
    label: "Pemulihan & Nutrisi ASI",
    desc: "Mendukung pemulihan pasca-melahirkan & kualitas ASI",
  },
  {
    id: "pertumbuhan_sehat",
    label: "Pertumbuhan Sehat Anak",
    desc: "Gizi seimbang usia sekolah/remaja tanpa diet ketat",
  },
];

const BUDGET_OPTIONS: Array<{
  id: MenuBudgetStyle;
  label: string;
}> = [
  { id: "rumahan_hemat", label: "Rumahan Hemat" },
  { id: "praktis_seimbang", label: "Praktis 15–20 Menit" },
  { id: "variasi_lengkap", label: "Variasi Nusantara" },
];

const DURATION_OPTIONS: Array<{
  id: MealPlanDuration;
  label: string;
}> = [
  { id: 7, label: "7 Hari (1 Minggu)" },
  { id: 14, label: "14 Hari (2 Minggu)" },
  { id: 30, label: "30 Hari (1 Bulan)" },
];

function buildDayChunks(totalDays: number): Array<{ startDay: number; daysCount: number }> {
  if (totalDays <= 9) return [{ startDay: 1, daysCount: totalDays }];
  if (totalDays === 14) {
    return [
      { startDay: 1, daysCount: 7 },
      { startDay: 8, daysCount: 7 },
    ];
  }
  const chunks: Array<{ startDay: number; daysCount: number }> = [];
  let cursor = 1;
  while (cursor <= totalDays) {
    const remaining = totalDays - cursor + 1;
    const count = remaining <= 9 ? remaining : remaining >= 16 ? 8 : 7;
    chunks.push({ startDay: cursor, daysCount: count });
    cursor += count;
  }
  return chunks;
}

function mergeShoppingLists(
  existing: ShoppingCategoryGroup[],
  incoming: ShoppingCategoryGroup[]
): ShoppingCategoryGroup[] {
  const map = new Map<string, string[]>();
  const addItems = (groups: ShoppingCategoryGroup[]) => {
    for (const grp of groups) {
      const key = grp.category.trim() || "Bahan Makanan";
      const list = map.get(key) ?? [];
      for (const item of grp.items) {
        const normalized = item.trim();
        if (
          normalized &&
          !list.some((x) => x.toLowerCase() === normalized.toLowerCase())
        ) {
          list.push(normalized);
        }
      }
      map.set(key, list);
    }
  };
  addItems(existing);
  addItems(incoming);
  return Array.from(map.entries()).map(([category, items]) => ({
    category,
    items,
  }));
}

const MEAL_META: Record<
  MealType,
  {
    label: string;
    timeHint: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
  }
> = {
  sarapan: {
    label: "Sarapan",
    timeHint: "06.00 – 09.30",
    icon: Sunrise,
    iconBg: "bg-amber-100/90 dark:bg-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  makan_siang: {
    label: "Makan Siang",
    timeHint: "12.00 – 14.00",
    icon: Sun,
    iconBg: "bg-emerald-100/90 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  makan_malam: {
    label: "Makan Malam",
    timeHint: "18.00 – 20.30",
    icon: Moon,
    iconBg: "bg-indigo-100/80 dark:bg-indigo-900/40",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  camilan: {
    label: "Camilan",
    timeHint: "Antar waktu makan",
    icon: Apple,
    iconBg: "bg-lime-100/90 dark:bg-lime-900/40",
    iconColor: "text-lime-700 dark:text-lime-400",
  },
};

function inferDefaultGoal(profile: UserProfile, plan: NutritionPlan): DietGoalType {
  if (profile.category === "child_teen") return "pertumbuhan_sehat";
  if (profile.category === "postpartum" && profile.isBreastfeeding) return "pemulihan_asi";
  if (profile.nutritionFocus === "penambahan_berat" || plan.isDeficitBlockedByUnderweight) {
    return profile.targetWeight > profile.currentWeight + 0.5
      ? "tambah_berat"
      : "pemeliharaan";
  }
  if (profile.nutritionFocus === "peningkatan_otot") return "tinggi_protein";
  if (profile.nutritionFocus === "gizi_seimbang") return "pemeliharaan";
  if (profile.targetWeight < profile.currentWeight - 0.5) return "turun_berat";
  return "pemeliharaan";
}

export const MealPlanView: React.FC<MealPlanViewProps> = ({
  profile,
  plan,
  weeklyPlan,
  todayFoods,
  familyName,
  familyMembers,
  familyWeeklyPlan,
  preferredScope = "personal",
  todaySummary,
  consultMessages,
  onAppendConsultMessages,
  onResetConsultChat,
  onSaveWeeklyPlan,
  onToggleShoppingItem,
  onSaveFamilyWeeklyPlan,
  onToggleFamilyShoppingItem,
  onLogMealToToday,
  onAddFamilyMember,
}) => {
  const [planScope, setPlanScope] = useState<"personal" | "family" | "grocery">(
    preferredScope
  );

  useEffect(() => {
    setPlanScope(preferredScope);
  }, [preferredScope]);

  const defaultGoal = useMemo(
    () => inferDefaultGoal(profile, plan),
    [profile, plan]
  );

  const isWeightLossGoalActive =
    profile.targetWeight < profile.currentWeight - 0.5 &&
    profile.nutritionFocus !== "gizi_seimbang" &&
    profile.nutritionFocus !== "penambahan_berat";

  const availableGoals = useMemo(() => {
    if (profile.category === "child_teen") {
      return GOAL_OPTIONS.filter((g) => g.id === "pertumbuhan_sehat");
    }
    if (profile.category === "postpartum") {
      return GOAL_OPTIONS.filter(
        (g) =>
          g.id === "pemulihan_asi" ||
          g.id === "pemeliharaan" ||
          (!plan.isDeficitBlockedByUnderweight &&
            isWeightLossGoalActive &&
            g.id === "turun_berat")
      );
    }
    if (plan.isDeficitBlockedByUnderweight) {
      return GOAL_OPTIONS.filter(
        (g) => g.id === "pemeliharaan" || g.id === "tambah_berat"
      );
    }
    return GOAL_OPTIONS.filter(
      (g) =>
        g.id === "pemeliharaan" ||
        g.id === "tinggi_protein" ||
        g.id === "tambah_berat" ||
        (isWeightLossGoalActive && g.id === "turun_berat")
    );
  }, [
    profile.category,
    plan.isDeficitBlockedByUnderweight,
    isWeightLossGoalActive,
  ]);

  // Personal state
  const [selectedDuration, setSelectedDuration] = useState<MealPlanDuration>(
    weeklyPlan?.durationDays === 30
      ? 30
      : weeklyPlan?.durationDays === 14
      ? 14
      : 7
  );
  const [dietGoal, setDietGoal] = useState<DietGoalType>(
    weeklyPlan?.dietGoal ?? defaultGoal
  );
  const [budgetStyle, setBudgetStyle] = useState<MenuBudgetStyle>(
    weeklyPlan?.budgetStyle ?? "rumahan_hemat"
  );
  const [preferencesNote, setPreferencesNote] = useState<string>(
    weeklyPlan?.preferencesNote ?? ""
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isExtendingPersonal, setIsExtendingPersonal] = useState<boolean>(false);
  const [personalProgress, setPersonalProgress] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [viewMode, setViewMode] = useState<"daily" | "overview" | "shopping">("daily");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [dayLoggedNotice, setDayLoggedNotice] = useState<boolean>(false);

  // Family plan state
  const [familyDuration, setFamilyDuration] = useState<MealPlanDuration>(
    familyWeeklyPlan?.durationDays === 30
      ? 30
      : familyWeeklyPlan?.durationDays === 14
      ? 14
      : 7
  );
  const [familyBudget, setFamilyBudget] = useState<MenuBudgetStyle>(
    familyWeeklyPlan?.budgetStyle ?? "rumahan_hemat"
  );
  const [familyPrefs, setFamilyPrefs] = useState<string>(
    familyWeeklyPlan?.preferencesNote ?? ""
  );
  const [isGeneratingFamily, setIsGeneratingFamily] = useState<boolean>(false);
  const [isExtendingFamily, setIsExtendingFamily] = useState<boolean>(false);
  const [familyProgress, setFamilyProgress] = useState<string>("");
  const [familyError, setFamilyError] = useState<string>("");
  const [familyViewMode, setFamilyViewMode] = useState<"daily" | "shopping">("daily");
  const [familyDayIndex, setFamilyDayIndex] = useState<number>(0);

  // Grocery Photo -> Recipes state
  const [groceryPreview, setGroceryPreview] = useState<string>("");
  const [groceryBase64, setGroceryBase64] = useState<string>("");
  const [groceryMimeType, setGroceryMimeType] = useState<string>("image/jpeg");
  const [groceryPrefNote, setGroceryPrefNote] = useState<string>("");
  const [groceryAudience, setGroceryAudience] = useState<"personal" | "family">(
    familyMembers.length > 1 ? "family" : "personal"
  );
  const [isCompressingGrocery, setIsCompressingGrocery] = useState<boolean>(false);
  const [isAnalyzingGrocery, setIsAnalyzingGrocery] = useState<boolean>(false);
  const [groceryError, setGroceryError] = useState<string>("");
  const [groceryResult, setGroceryResult] = useState<GroceryAnalysisResult | null>(null);
  const [loggedRecipeMap, setLoggedRecipeMap] = useState<Record<string, boolean>>({});
  const groceryGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const groceryCameraInputRef = useRef<HTMLInputElement | null>(null);

  const familySummaries = useMemo(() => {
    return familyMembers.map((m) => {
      const mPlan = calculateNutritionPlan(m);
      return {
        id: m.id,
        name: m.name,
        relationRole: m.relationRole,
        category: m.category,
        nutritionFocus: m.nutritionFocus,
        age: m.age,
        isBreastfeeding: m.isBreastfeeding,
        medicalNotes: m.medicalNotes,
        dailyCalorieTarget: mPlan.dailyCalorieTarget,
        proteinTargetG: mPlan.macroTargets.proteinG,
        waterTargetMl: mPlan.waterTargetMl,
      };
    });
  }, [familyMembers]);

  const isPlanStale = useMemo(() => {
    if (!weeklyPlan) return false;
    const calorieDrift = Math.abs(
      weeklyPlan.targetCaloriesPerDay - plan.dailyCalorieTarget
    );
    const categoryChanged =
      weeklyPlan.profileCategory !== undefined &&
      weeklyPlan.profileCategory !== profile.category;
    const medicalChanged =
      weeklyPlan.medicalNotesSnapshot !== undefined &&
      weeklyPlan.medicalNotesSnapshot !== (profile.medicalNotes?.trim() || "");
    return calorieDrift > 50 || categoryChanged || medicalChanged;
  }, [weeklyPlan, plan.dailyCalorieTarget, profile.category, profile.medicalNotes]);

  const isFamilyPlanStale = useMemo(() => {
    if (!familyWeeklyPlan) return false;
    const currentIds = familyMembers.map((m) => m.id).join(",");
    const snapIds = (familyWeeklyPlan.memberIdsSnapshot || []).join(",");
    return currentIds !== snapIds;
  }, [familyWeeklyPlan, familyMembers]);

  const isMealLoggedToday = (meal: PlannedMealItem) =>
    todayFoods.some(
      (f) => f.mealType === meal.mealType && f.foodName === meal.foodName
    );

  useEffect(() => {
    const allowedIds = new Set(availableGoals.map((g) => g.id));
    if (!allowedIds.has(dietGoal)) {
      setDietGoal(defaultGoal);
    }
  }, [availableGoals, dietGoal, defaultGoal]);

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating || isExtendingPersonal) return;

    setErrorMsg("");
    setIsGenerating(true);
    const chunks = buildDayChunks(selectedDuration);
    let accumulatedPlan: WeeklyMealPlan | null = null;
    const recentDishes: string[] = [];

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const endDay = chunk.startDay + chunk.daysCount - 1;
        setPersonalProgress(
          chunks.length > 1
            ? `Tahap ${i + 1}/${chunks.length}: Menyusun Hari ${chunk.startDay}–${endDay} dari ${selectedDuration} hari...`
            : `Menyusun menu Hari 1–${selectedDuration} dan daftar belanja...`
        );

        const data = await postJsonApi<WeeklyMealPlan>(
          "/api/ai/weekly-meal-plan",
          {
            dietGoal,
            budgetStyle,
            preferencesNote,
            startDayNumber: chunk.startDay,
            daysCount: chunk.daysCount,
            totalPlannedDays: selectedDuration,
            avoidDishes: recentDishes.slice(-24),
            profile,
            nutritionPlan: plan,
          },
          {
            timeoutMs: 60000,
            fallbackError: `Gagal menyusun menu Hari ${chunk.startDay}–${endDay}.`,
          }
        );

        data.days.forEach((d) => {
          d.meals.forEach((m) => {
            if (m.mealType === "makan_siang" || m.mealType === "makan_malam") {
              recentDishes.push(m.foodName);
            }
          });
        });

        if (!accumulatedPlan) {
          accumulatedPlan = {
            ...data,
            durationDays: selectedDuration,
          };
        } else {
          const prevPlan: WeeklyMealPlan = accumulatedPlan;
          const combinedDays: WeeklyMealPlan["days"] = [
            ...prevPlan.days,
            ...data.days,
          ];
          const avgCal = Math.round(
            combinedDays.reduce((s, d) => s + d.totalCalories, 0) /
              Math.max(1, combinedDays.length)
          );
          accumulatedPlan = {
            ...prevPlan,
            durationDays: combinedDays.length,
            weeklyAverageCalories: avgCal,
            days: combinedDays,
            shoppingList: mergeShoppingLists(
              prevPlan.shoppingList,
              data.shoppingList
            ),
          };
        }

        onSaveWeeklyPlan(accumulatedPlan);
      }

      setSelectedDayIndex(0);
      setViewMode("daily");
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan jaringan saat menyusun menu."
      );
    } finally {
      setIsGenerating(false);
      setPersonalProgress("");
    }
  };

  const handleExtendPersonalPlan = async () => {
    if (!weeklyPlan || isGenerating || isExtendingPersonal) return;
    setErrorMsg("");
    setIsExtendingPersonal(true);
    const startDay = weeklyPlan.days.length + 1;
    const nextTotal = weeklyPlan.days.length + 7;
    const recentDishes = weeklyPlan.days
      .slice(-7)
      .flatMap((d) =>
        d.meals
          .filter((m) => m.mealType === "makan_siang" || m.mealType === "makan_malam")
          .map((m) => m.foodName)
      );

    try {
      const data = await postJsonApi<WeeklyMealPlan>(
        "/api/ai/weekly-meal-plan",
        {
          dietGoal: weeklyPlan.dietGoal,
          budgetStyle: weeklyPlan.budgetStyle,
          preferencesNote: weeklyPlan.preferencesNote,
          startDayNumber: startDay,
          daysCount: 7,
          totalPlannedDays: nextTotal,
          avoidDishes: recentDishes.slice(-24),
          profile,
          nutritionPlan: plan,
        },
        {
          timeoutMs: 60000,
          fallbackError: `Gagal menambah menu Hari ${startDay}–${nextTotal}.`,
        }
      );

      const combinedDays = [...weeklyPlan.days, ...data.days];
      const avgCal = Math.round(
        combinedDays.reduce((s, d) => s + d.totalCalories, 0) /
          Math.max(1, combinedDays.length)
      );
      onSaveWeeklyPlan({
        ...weeklyPlan,
        durationDays: combinedDays.length,
        weeklyAverageCalories: avgCal,
        planTitle: `Rencana Menu ${combinedDays.length} Hari · ${profile.name}`,
        days: combinedDays,
        shoppingList: mergeShoppingLists(
          weeklyPlan.shoppingList,
          data.shoppingList
        ),
      });
      setSelectedDayIndex(startDay - 1);
      setViewMode("daily");
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Gagal menambahkan 7 hari berikutnya."
      );
    } finally {
      setIsExtendingPersonal(false);
    }
  };

  const handleGenerateFamilyPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGeneratingFamily || isExtendingFamily) return;

    setFamilyError("");
    setIsGeneratingFamily(true);
    const chunks = buildDayChunks(familyDuration);
    let accumulatedFam: FamilyWeeklyMealPlan | null = null;
    const recentDishes: string[] = [];

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const endDay = chunk.startDay + chunk.daysCount - 1;
        setFamilyProgress(
          chunks.length > 1
            ? `Tahap ${i + 1}/${chunks.length}: Menyusun Menu Keluarga Hari ${chunk.startDay}–${endDay} dari ${familyDuration} hari...`
            : `Menyusun menu keluarga Hari 1–${familyDuration} untuk ${familyMembers.length} anggota...`
        );

        const data = await postJsonApi<FamilyWeeklyMealPlan>(
          "/api/ai/family-meal-plan",
          {
            familyName,
            budgetStyle: familyBudget,
            preferencesNote: familyPrefs,
            startDayNumber: chunk.startDay,
            daysCount: chunk.daysCount,
            totalPlannedDays: familyDuration,
            avoidDishes: recentDishes.slice(-24),
            members: familySummaries,
          },
          {
            timeoutMs: 60000,
            fallbackError: `Gagal menyusun menu keluarga Hari ${chunk.startDay}–${endDay}.`,
          }
        );

        data.days.forEach((d) => {
          d.meals.forEach((m) => {
            if (m.mealType === "makan_siang" || m.mealType === "makan_malam") {
              recentDishes.push(m.dishName);
            }
          });
        });

        if (!accumulatedFam) {
          accumulatedFam = {
            ...data,
            durationDays: familyDuration,
          };
        } else {
          const prevFam: FamilyWeeklyMealPlan = accumulatedFam;
          const combinedDays: FamilyWeeklyMealPlan["days"] = [
            ...prevFam.days,
            ...data.days,
          ];
          accumulatedFam = {
            ...prevFam,
            durationDays: combinedDays.length,
            days: combinedDays,
            shoppingList: mergeShoppingLists(
              prevFam.shoppingList,
              data.shoppingList
            ),
          };
        }

        onSaveFamilyWeeklyPlan(accumulatedFam);
      }

      setFamilyDayIndex(0);
      setFamilyViewMode("daily");
    } catch (err) {
      setFamilyError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan jaringan saat menyusun menu keluarga."
      );
    } finally {
      setIsGeneratingFamily(false);
      setFamilyProgress("");
    }
  };

  const handleExtendFamilyPlan = async () => {
    if (!familyWeeklyPlan || isGeneratingFamily || isExtendingFamily) return;
    setFamilyError("");
    setIsExtendingFamily(true);
    const startDay = familyWeeklyPlan.days.length + 1;
    const nextTotal = familyWeeklyPlan.days.length + 7;
    const recentDishes = familyWeeklyPlan.days
      .slice(-7)
      .flatMap((d) =>
        d.meals
          .filter((m) => m.mealType === "makan_siang" || m.mealType === "makan_malam")
          .map((m) => m.dishName)
      );

    try {
      const data = await postJsonApi<FamilyWeeklyMealPlan>(
        "/api/ai/family-meal-plan",
        {
          familyName,
          budgetStyle: familyWeeklyPlan.budgetStyle,
          preferencesNote: familyWeeklyPlan.preferencesNote,
          startDayNumber: startDay,
          daysCount: 7,
          totalPlannedDays: nextTotal,
          avoidDishes: recentDishes.slice(-24),
          members: familySummaries,
        },
        {
          timeoutMs: 60000,
          fallbackError: `Gagal menambah menu keluarga Hari ${startDay}–${nextTotal}.`,
        }
      );

      const combinedDays = [...familyWeeklyPlan.days, ...data.days];
      onSaveFamilyWeeklyPlan({
        ...familyWeeklyPlan,
        durationDays: combinedDays.length,
        planTitle: `Menu Keluarga ${combinedDays.length} Hari — ${familyName}`,
        days: combinedDays,
        shoppingList: mergeShoppingLists(
          familyWeeklyPlan.shoppingList,
          data.shoppingList
        ),
      });
      setFamilyDayIndex(startDay - 1);
      setFamilyViewMode("daily");
    } catch (err) {
      setFamilyError(
        err instanceof Error
          ? err.message
          : "Gagal menambahkan 7 hari berikutnya untuk keluarga."
      );
    } finally {
      setIsExtendingFamily(false);
    }
  };

  const handleLogSingleMeal = (meal: PlannedMealItem) => {
    if (isMealLoggedToday(meal)) return;
    onLogMealToToday({
      date: getTodayDateKey(),
      mealType: meal.mealType,
      foodName: meal.foodName,
      portionNote: meal.portionNote,
      calories: meal.calories,
      carbs: meal.carbs,
      protein: meal.protein,
      fat: meal.fat,
      nutritionTip: meal.prepNote,
      source: "ai",
    });
  };

  const handleLogAllDayMeals = () => {
    if (!weeklyPlan) return;
    const day = weeklyPlan.days[selectedDayIndex];
    if (!day) return;
    day.meals.forEach((meal) => {
      handleLogSingleMeal(meal);
    });
    setDayLoggedNotice(true);
    setTimeout(() => setDayLoggedNotice(false), 2500);
  };

  const activeDay = weeklyPlan?.days[selectedDayIndex] ?? weeklyPlan?.days[0] ?? null;
  const activeFamilyDay =
    familyWeeklyPlan?.days[familyDayIndex] ?? familyWeeklyPlan?.days[0] ?? null;

  const totalShoppingCount = useMemo(() => {
    if (!weeklyPlan) return 0;
    return weeklyPlan.shoppingList.reduce((acc, grp) => acc + grp.items.length, 0);
  }, [weeklyPlan]);

  const checkedCount = weeklyPlan?.checkedShoppingItems?.length ?? 0;

  const totalFamilyShoppingCount = useMemo(() => {
    if (!familyWeeklyPlan) return 0;
    return familyWeeklyPlan.shoppingList.reduce((acc, grp) => acc + grp.items.length, 0);
  }, [familyWeeklyPlan]);

  const checkedFamilyCount = familyWeeklyPlan?.checkedShoppingItems?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header & Personal / Family Scope Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5]">
            {planScope === "family"
              ? `Menu Masak Sekeluarga ${familyWeeklyPlan?.days.length ?? familyDuration} Hari · ${familyName}`
              : planScope === "grocery"
              ? "Scan Foto Belanjaan → Aneka Rekomendasi Masakan"
              : `Rencana Menu ${weeklyPlan?.days.length ?? selectedDuration} Hari · ${profile.name}`}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-emerald-200/75 mt-0.5">
            {planScope === "family" ? (
              <>
                Satu masakan induk untuk{" "}
                <strong className="text-[#10B981] dark:text-[#34D399]">
                  {familyMembers.length} anggota keluarga
                </strong>{" "}
                dengan panduan takaran porsi per individu.
              </>
            ) : planScope === "grocery" ? (
              <>
                Foto isi kulkas, belanjaan pasar, atau bahan dapur untuk langsung dibuatkan{" "}
                <strong className="text-[#10B981] dark:text-[#34D399]">
                  4 resep bergizi lengkap
                </strong>{" "}
                sesuai target kalori.
              </>
            ) : (
              <>
                Mode:{" "}
                <strong className="text-[#10B981] dark:text-[#34D399]">
                  {CATEGORY_MAP[profile.category].shortLabel} ·{" "}
                  {NUTRITION_FOCUS_MAP[profile.nutritionFocus]?.shortLabel ?? "Gizi Seimbang"}
                </strong>{" "}
                · Target{" "}
                <span className="font-mono tabular-nums font-semibold text-[#0F172A] dark:text-white">
                  {plan.dailyCalorieTarget.toLocaleString("id-ID")} kkal/hari
                </span>{" "}
                · Protein{" "}
                <span className="font-mono tabular-nums font-semibold text-[#0F172A] dark:text-white">
                  {plan.macroTargets.proteinG}g
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-white dark:bg-[#0B1F17] border border-emerald-100 dark:border-emerald-900/60 shadow-xs">
            <button
              type="button"
              onClick={() => setPlanScope("personal")}
              className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                planScope === "personal"
                  ? "bg-gradient-to-r from-[#10B981] to-[#34D399] text-white shadow-xs"
                  : "text-[#64748B] dark:text-emerald-200/75 hover:text-[#0F172A] dark:hover:text-white"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Menu Personal</span>
            </button>
            <button
              type="button"
              onClick={() => setPlanScope("family")}
              className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                planScope === "family"
                  ? "bg-gradient-to-r from-[#10B981] to-[#34D399] text-white shadow-xs"
                  : "text-[#64748B] dark:text-emerald-200/75 hover:text-[#0F172A] dark:hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Sekeluarga ({familyMembers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setPlanScope("grocery")}
              className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                planScope === "grocery"
                  ? "bg-gradient-to-r from-[#10B981] to-[#34D399] text-white shadow-xs"
                  : "text-[#64748B] dark:text-emerald-200/75 hover:text-[#0F172A] dark:hover:text-white"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Foto Belanjaan</span>
            </button>
          </div>

          {planScope === "personal" && weeklyPlan && (
            <button
              type="button"
              onClick={() => onSaveWeeklyPlan(null)}
              className="h-10 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0B1F17] hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold text-[#475569] dark:text-emerald-200 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          )}

          {planScope === "family" && familyWeeklyPlan && (
            <button
              type="button"
              onClick={() => onSaveFamilyWeeklyPlan(null)}
              className="h-10 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0B1F17] hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold text-[#475569] dark:text-emerald-200 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          )}
        </div>
      </div>

      {planScope === "grocery" ? (
        /* ========================= PHOTO BELANJAAN -> ANEKA MASAKAN ========================= */
        <div className="space-y-6">
          <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-5">
            <input
              ref={groceryGalleryInputRef}
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setGroceryError("");
                setIsCompressingGrocery(true);
                try {
                  const compressed = await compressImageFile(file, 1024, 0.8);
                  setGroceryPreview(compressed.previewDataUrl);
                  setGroceryBase64(compressed.base64);
                  setGroceryMimeType(compressed.mimeType);
                } catch (err) {
                  setGroceryError(
                    err instanceof Error
                      ? err.message
                      : "Gagal membaca file foto belanjaan."
                  );
                } finally {
                  setIsCompressingGrocery(false);
                }
              }}
              className="hidden"
            />
            <input
              ref={groceryCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setGroceryError("");
                setIsCompressingGrocery(true);
                try {
                  const compressed = await compressImageFile(file, 1024, 0.8);
                  setGroceryPreview(compressed.previewDataUrl);
                  setGroceryBase64(compressed.base64);
                  setGroceryMimeType(compressed.mimeType);
                } catch (err) {
                  setGroceryError(
                    err instanceof Error
                      ? err.message
                      : "Gagal memproses foto belanjaan."
                  );
                } finally {
                  setIsCompressingGrocery(false);
                }
              }}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                <ShoppingBasket className="w-4 h-4 text-[#10B981]" />
                <span>Unggah Foto Bahan Belanjaan atau Isi Kulkas</span>
              </div>
              {familyMembers.length > 1 && (
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F1F5F9] dark:bg-[#071610] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setGroceryAudience("personal")}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                      groceryAudience === "personal"
                        ? "bg-white dark:bg-[#123024] text-[#0F172A] dark:text-white shadow-xs"
                        : "text-[#64748B] dark:text-emerald-200/70"
                    }`}
                  >
                    Untuk {profile.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroceryAudience("family")}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                      groceryAudience === "family"
                        ? "bg-white dark:bg-[#123024] text-[#0F172A] dark:text-white shadow-xs"
                        : "text-[#64748B] dark:text-emerald-200/70"
                    }`}
                  >
                    Sekeluarga ({familyMembers.length})
                  </button>
                </div>
              )}
            </div>

            {!groceryPreview ? (
              <div className="rounded-3xl border border-dashed border-emerald-300 dark:border-emerald-700/80 bg-[#F8FAFC] dark:bg-[#071610] p-7 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 dark:bg-emerald-900/50 text-[#10B981] mx-auto flex items-center justify-center">
                  {isCompressingGrocery ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm sm:text-base font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                    Bingung Belanjaan Ini Mau Dimasak Apa?
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-emerald-200/70 max-w-lg mx-auto leading-relaxed">
                    Foto sayuran, ikan, daging, tahu/tempe, atau isi kulkas Anda. AI akan mengenali setiap bahan dan meracik 4 ide masakan rumahan lengkap dengan takaran kalori dan langkah memasak.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isCompressingGrocery}
                    onClick={() => groceryCameraInputRef.current?.click()}
                    className="h-10 px-4 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#34D399] hover:opacity-95 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 shadow-sm shadow-emerald-500/20"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Ambil Foto Belanjaan</span>
                  </button>
                  <button
                    type="button"
                    disabled={isCompressingGrocery}
                    onClick={() => groceryGalleryInputRef.current?.click()}
                    className="h-10 px-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#102A20] hover:bg-emerald-50 dark:hover:bg-[#143528] text-xs font-semibold text-[#0F172A] dark:text-[#ECFDF5] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <ImagePlus className="w-4 h-4 text-[#10B981]" />
                    <span>Pilih dari Galeri</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-4 relative h-48 rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-800 bg-black/5">
                  <img
                    src={groceryPreview}
                    alt="Pratinjau foto belanjaan"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setGroceryPreview("");
                      setGroceryBase64("");
                      setGroceryResult(null);
                    }}
                    aria-label="Hapus foto belanjaan"
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-xl bg-black/65 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="lg:col-span-8 space-y-3.5">
                  <div>
                    <label
                      htmlFor="grocery-preference-input"
                      className="block text-xs font-semibold text-[#334155] dark:text-emerald-200/80 mb-1.5"
                    >
                      Preferensi Masakan / Kondisi Bahan (Opsional)
                    </label>
                    <input
                      id="grocery-preference-input"
                      type="text"
                      value={groceryPrefNote}
                      onChange={(e) => setGroceryPrefNote(e.target.value)}
                      placeholder="Contoh: masakan berkuah, tidak pedas untuk anak, minim minyak goreng"
                      className="w-full h-11 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-emerald-200/40 focus:outline-none focus:border-[#10B981]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() => groceryGalleryInputRef.current?.click()}
                      className="h-10 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] text-xs font-semibold text-[#334155] dark:text-emerald-200 hover:bg-emerald-50 cursor-pointer whitespace-nowrap"
                    >
                      Ganti Foto Belanjaan
                    </button>

                    <button
                      type="button"
                      disabled={isAnalyzingGrocery || !groceryBase64 || isCompressingGrocery}
                      onClick={async () => {
                        if (!groceryBase64 || isAnalyzingGrocery) return;
                        setIsAnalyzingGrocery(true);
                        setGroceryError("");
                        try {
                          const data = await postJsonApi<GroceryAnalysisResult>(
                            "/api/ai/ingredients-to-recipes",
                            {
                              imageBase64: groceryBase64,
                              mimeType: groceryMimeType,
                              preferenceNote: groceryPrefNote.trim(),
                              scope: groceryAudience,
                              profile: {
                                name: profile.name,
                                category: profile.category,
                                nutritionFocus: profile.nutritionFocus,
                                dailyCalorieTarget: plan.dailyCalorieTarget,
                                isBreastfeeding: profile.isBreastfeeding,
                                medicalNotes: profile.medicalNotes,
                              },
                              familyMembers:
                                groceryAudience === "family"
                                  ? familySummaries.map((m) => ({
                                      name: m.name,
                                      relationRole: m.relationRole,
                                      age: m.age,
                                      nutritionFocus: m.nutritionFocus,
                                      dailyCalorieTarget: m.dailyCalorieTarget,
                                      medicalNotes: m.medicalNotes,
                                    }))
                                  : undefined,
                            },
                            {
                              timeoutMs: 55000,
                              fallbackError:
                                "Gagal membaca bahan belanjaan dari foto.",
                            }
                          );
                          setGroceryResult(data);
                          setLoggedRecipeMap({});
                        } catch (err) {
                          setGroceryError(
                            err instanceof Error
                              ? err.message
                              : "Terjadi kendala saat menganalisis foto belanjaan."
                          );
                        } finally {
                          setIsAnalyzingGrocery(false);
                        }
                      }}
                      className="h-11 px-5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#10B981] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {isAnalyzingGrocery ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Meracik 4 Ide Masakan...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Analisis & Buat Rekomendasi Masakan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {groceryError && (
            <div className="flex items-start gap-2.5 p-4 rounded-3xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{groceryError}</span>
            </div>
          )}

          {isAnalyzingGrocery && (
            <section className="bg-white/95 dark:bg-[#0B1F17]/95 border border-emerald-100 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#10B981]" />
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                    AI sedang mengenali bahan makanan di foto & menghitung gizinya...
                  </div>
                  <div className="text-xs text-[#64748B] dark:text-emerald-200/70">
                    Menyusun 4 variasi resep praktis lengkap dengan langkah masak dan estimasi makro per porsi.
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((slot) => (
                  <div
                    key={slot}
                    className="h-36 rounded-2xl border border-emerald-100/70 dark:border-emerald-900/50 bg-[#F8FAFC] dark:bg-[#102A20]/60 animate-shimmer"
                  />
                ))}
              </div>
            </section>
          )}

          {!isAnalyzingGrocery && groceryResult && (
            <div className="space-y-6">
              {/* Ingredients & Storage Summary */}
              <section className="bg-gradient-to-br from-white via-[#F3FCF7] to-[#E8FAF0] dark:from-[#0B1F17] dark:via-[#0E281D] dark:to-[#081A13] border border-emerald-200/80 dark:border-emerald-800/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-3">
                <div className="text-xs font-semibold text-[#10B981] dark:text-[#34D399]">
                  Hasil Pembacaan Bahan Belanjaan
                </div>
                <p className="text-xs sm:text-sm text-[#0F172A] dark:text-[#ECFDF5] leading-relaxed">
                  {groceryResult.summary}
                </p>
                {groceryResult.detectedIngredients.length > 0 && (
                  <p className="text-xs text-[#334155] dark:text-emerald-100/85">
                    <strong className="text-[#0F172A] dark:text-white">
                      Bahan terbaca ({groceryResult.detectedIngredients.length}):
                    </strong>{" "}
                    {groceryResult.detectedIngredients.join(" · ")}
                  </p>
                )}
                {groceryResult.storageTip && (
                  <p className="text-xs text-[#64748B] dark:text-emerald-200/75">
                    <strong className="text-[#0F172A] dark:text-emerald-200">
                      Tips simpan bahan:
                    </strong>{" "}
                    {groceryResult.storageTip}
                  </p>
                )}
              </section>

              {/* 4 Recipe Recommendation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groceryResult.recipes.map((recipe: GroceryRecipeIdea, idx: number) => {
                  const recipeKey = `${recipe.title}_${idx}`;
                  const isLogged = Boolean(loggedRecipeMap[recipeKey]);
                  const meta = MEAL_META[recipe.mealType] ?? MEAL_META.makan_siang;

                  return (
                    <article
                      key={recipeKey}
                      className="bg-white/95 dark:bg-[#0B1F17]/95 border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-md shadow-emerald-500/10 dark:shadow-black/30"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="text-[11px] font-semibold text-[#10B981] dark:text-[#34D399] flex items-center gap-1.5">
                              <span>{meta.label}</span>
                              <span aria-hidden="true">·</span>
                              <Clock className="w-3 h-3" />
                              <span className="font-mono tabular-nums">
                                {recipe.cookingTimeMinutes} menit
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-[#0F172A] dark:text-white leading-snug">
                              {recipe.title}
                            </h3>
                            <p className="text-xs text-[#64748B] dark:text-emerald-200/75">
                              Porsi: {recipe.portionNote}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-bold font-mono tabular-nums text-[#10B981] dark:text-[#34D399]">
                              {recipe.calories} kkal
                            </div>
                            <div className="text-[11px] font-mono tabular-nums text-[#64748B] dark:text-emerald-200/70">
                              K {recipe.carbs}g · P {recipe.protein}g · L {recipe.fat}g
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-[#334155] dark:text-emerald-100/85 space-y-1">
                          <div>
                            <strong className="text-[#0F172A] dark:text-white">
                              Dari foto Anda:
                            </strong>{" "}
                            {recipe.ingredientsUsed.join(" · ")}
                          </div>
                          {recipe.extraPantryItems.length > 0 && (
                            <div className="text-[#64748B] dark:text-emerald-200/75">
                              <strong className="text-[#334155] dark:text-emerald-200">
                                Bumbu / pelengkap dapur:
                              </strong>{" "}
                              {recipe.extraPantryItems.join(" · ")}
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl bg-[#F8FAFC] dark:bg-[#102A20]/70 border border-emerald-100/80 dark:border-emerald-900/60 p-3.5 space-y-1.5">
                          <div className="text-[11px] font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                            Cara Memasak Singkat
                          </div>
                          <ol className="list-decimal list-inside space-y-1 text-xs text-[#334155] dark:text-emerald-100/85 leading-relaxed">
                            {recipe.cookingSteps.map((step: string, sIdx: number) => (
                              <li key={sIdx}>{step}</li>
                            ))}
                          </ol>
                        </div>

                        {recipe.nutritionAdaptationNote && (
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                            <strong className="font-semibold">Penyesuaian Gizi:</strong>{" "}
                            {recipe.nutritionAdaptationNote}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end pt-2 border-t border-emerald-100/80 dark:border-emerald-900/60">
                        <button
                          type="button"
                          disabled={isLogged}
                          onClick={() => {
                            if (isLogged) return;
                            onLogMealToToday({
                              date: getTodayDateKey(),
                              mealType: recipe.mealType,
                              foodName: recipe.title,
                              portionNote: recipe.portionNote,
                              calories: recipe.calories,
                              carbs: recipe.carbs,
                              protein: recipe.protein,
                              fat: recipe.fat,
                              nutritionTip: recipe.nutritionAdaptationNote,
                              source: "ai",
                            });
                            setLoggedRecipeMap((prev) => ({
                              ...prev,
                              [recipeKey]: true,
                            }));
                          }}
                          className={`h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                            isLogged
                              ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 cursor-default"
                              : "bg-[#0F172A] dark:bg-[#10B981] hover:opacity-90 text-white cursor-pointer"
                          }`}
                        >
                          {isLogged ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Tercatat Hari Ini</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Catat ke Hari Ini</span>
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : planScope === "family" ? (
        /* ========================= FAMILY MULTI-DAY MEAL PLANNER ========================= */
        <div className="space-y-6">
          <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                <ChefHat className="w-4 h-4 text-[#10B981]" />
                <span>Rancang Satu Hidangan Induk untuk Semua Anggota Keluarga</span>
              </div>
              {familyMembers.length === 1 && (
                <button
                  type="button"
                  onClick={onAddFamilyMember}
                  className="text-xs font-semibold text-[#10B981] dark:text-[#34D399] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Anggota Keluarga Lain</span>
                </button>
              )}
            </div>

            {/* Household Roster Strip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#475569] dark:text-emerald-100/80 border-b border-emerald-100 dark:border-emerald-900/60 pb-4">
              {familySummaries.map((m) => (
                <span key={m.id} className="inline-flex items-center gap-1.5">
                  <strong className="text-[#0F172A] dark:text-white">{m.name}</strong>
                  <span className="font-mono tabular-nums text-[#10B981] dark:text-[#34D399]">
                    ({m.dailyCalorieTarget.toLocaleString("id-ID")} kkal)
                  </span>
                </span>
              ))}
            </div>

            <form onSubmit={handleGenerateFamilyPlan} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#334155] dark:text-emerald-200/80">
                  Durasi Jadwal Menu Keluarga
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map((opt) => {
                    const active = familyDuration === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFamilyDuration(opt.id)}
                        className={`h-10 px-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                          active
                            ? "border-[#10B981] bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 shadow-xs"
                            : "border-emerald-100 dark:border-emerald-800/80 bg-[#F8FAFC] dark:bg-[#071610] text-[#64748B] dark:text-emerald-200/70 hover:border-emerald-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                <div className="lg:col-span-5 space-y-2">
                  <label className="block text-xs font-semibold text-[#334155] dark:text-emerald-200/80">
                    Gaya Masakan & Anggaran Keluarga
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#F8FAFC] dark:bg-[#071610] border border-emerald-100 dark:border-emerald-900">
                    {BUDGET_OPTIONS.map((opt) => {
                      const active = familyBudget === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFamilyBudget(opt.id)}
                          className={`h-9 px-2 rounded-xl text-[11px] sm:text-xs font-medium transition-colors cursor-pointer whitespace-nowrap truncate ${
                            active
                              ? "bg-white dark:bg-[#102A20] text-[#0F172A] dark:text-white shadow-xs font-semibold"
                              : "text-[#64748B] dark:text-emerald-200/70 hover:text-[#0F172A] dark:hover:text-white"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-2">
                  <label
                    htmlFor="family-menu-preferences"
                    className="block text-xs font-semibold text-[#334155] dark:text-emerald-200/80"
                  >
                    Preferensi / Pantangan Keluarga (Opsional)
                  </label>
                  <input
                    id="family-menu-preferences"
                    type="text"
                    value={familyPrefs}
                    onChange={(e) => setFamilyPrefs(e.target.value)}
                    placeholder="Contoh: tidak terlalu pedas untuk anak, tanpa santan kental"
                    className="w-full h-11 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-emerald-200/40 focus:outline-none focus:border-[#10B981]"
                  />
                </div>

                <div className="lg:col-span-3">
                  <button
                    type="submit"
                    disabled={isGeneratingFamily || isExtendingFamily}
                    className="w-full h-11 px-4 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#10B981] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 whitespace-nowrap"
                  >
                    {isGeneratingFamily ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyusun Menu...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {familyWeeklyPlan
                            ? `Perbarui ${familyDuration} Hari`
                            : `Susun Menu ${familyDuration} Hari`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </section>

          {familyError && (
            <div className="flex items-start gap-2.5 p-4 rounded-3xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{familyError}</span>
            </div>
          )}

          {isGeneratingFamily && (
            <section
              aria-live="polite"
              className="bg-white/95 dark:bg-[#0B1F17]/95 border border-emerald-100 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 space-y-5"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#10B981]" />
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                    {familyProgress ||
                      `Ahli Gizi AI sedang merancang menu keluarga ${familyDuration} hari untuk ${familyMembers.length} anggota...`}
                  </div>
                  <div className="text-xs text-[#64748B] dark:text-emerald-200/70">
                    Menyelaraskan satu hidangan praktis dengan takaran porsi berbeda untuk tiap usia & kebutuhan.
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[1, 2, 3, 4].map((slot) => (
                  <div
                    key={slot}
                    className="h-28 rounded-2xl border border-emerald-100/70 dark:border-emerald-900/50 bg-[#F8FAFC] dark:bg-[#102A20]/60 animate-shimmer p-4"
                  />
                ))}
              </div>
            </section>
          )}

          {!isGeneratingFamily && !familyWeeklyPlan && (
            <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-dashed border-emerald-200 dark:border-emerald-800 rounded-3xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 dark:bg-emerald-900/50 text-[#10B981] mx-auto flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                Belum Ada Menu Masak Sekeluarga ({familyDuration} Hari)
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-emerald-200/75 max-w-lg mx-auto leading-relaxed">
                Pilih durasi 7 hari, 14 hari, atau 30 hari (1 bulan). AI akan membuat{" "}
                <strong className="text-[#0F172A] dark:text-white">satu jadwal masakan keluarga</strong>{" "}
                lengkap dengan panduan porsi khusus untuk masing-masing anggota dan daftar belanja gabungan.
              </p>
            </section>
          )}

          {!isGeneratingFamily && familyWeeklyPlan && (
            <div className="space-y-6">
              {isFamilyPlanStale && (
                <div className="rounded-3xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/40 p-4 flex items-start gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                  <span>
                    Daftar anggota keluarga Anda telah berubah sejak rencana menu ini dibuat. Tekan{" "}
                    <strong>Perbarui Menu Keluarga</strong> agar porsi seluruh anggota terbaru ikut terhitung.
                  </span>
                </div>
              )}

              <section className="bg-gradient-to-br from-white via-[#F3FCF7] to-[#E8FAF0] dark:from-[#0B1F17] dark:via-[#0E281D] dark:to-[#081A13] border border-emerald-200/80 dark:border-emerald-800/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#ECFDF5]">
                  {familyWeeklyPlan.planTitle}
                </h2>
                {familyWeeklyPlan.nutritionistSummary && (
                  <p className="text-xs sm:text-sm text-[#334155] dark:text-emerald-100/85 leading-relaxed">
                    {familyWeeklyPlan.nutritionistSummary}
                  </p>
                )}
                {familyWeeklyPlan.safetyReminder && (
                  <div className="rounded-2xl border border-amber-200/80 dark:border-amber-700/50 bg-amber-50/75 dark:bg-amber-950/35 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200/90 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                    <span>{familyWeeklyPlan.safetyReminder}</span>
                  </div>
                )}
              </section>

              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-white dark:bg-[#0B1F17] border border-emerald-100 dark:border-emerald-900/60 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setFamilyViewMode("daily")}
                    className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      familyViewMode === "daily"
                        ? "bg-gradient-to-r from-[#10B981] to-[#34D399] text-white shadow-xs"
                        : "text-[#64748B] dark:text-emerald-200/75 hover:text-[#0F172A] dark:hover:text-white"
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Jadwal & Porsi Anggota</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFamilyViewMode("shopping")}
                    className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      familyViewMode === "shopping"
                        ? "bg-gradient-to-r from-[#10B981] to-[#34D399] text-white shadow-xs"
                        : "text-[#64748B] dark:text-emerald-200/75 hover:text-[#0F172A] dark:hover:text-white"
                    }`}
                  >
                    <ShoppingBasket className="w-3.5 h-3.5" />
                    <span>
                      Belanja Keluarga ({checkedFamilyCount}/{totalFamilyShoppingCount})
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isExtendingFamily || isGeneratingFamily}
                  onClick={handleExtendFamilyPlan}
                  className="h-9 px-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0B1F17] hover:bg-emerald-50 dark:hover:bg-[#102A20] disabled:opacity-50 text-xs font-semibold text-[#10B981] dark:text-[#34D399] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isExtendingFamily ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menambah 7 Hari...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah 7 Hari Berikutnya</span>
                    </>
                  )}
                </button>
              </div>

              {familyViewMode === "daily" && activeFamilyDay && (
                <div className="space-y-4">
                  {familyWeeklyPlan.days.length > 7 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {Array.from(
                        { length: Math.ceil(familyWeeklyPlan.days.length / 7) },
                        (_, wIdx) => {
                          const startIdx = wIdx * 7;
                          const endIdx = Math.min(
                            familyWeeklyPlan.days.length - 1,
                            startIdx + 6
                          );
                          const isCurrentWeek =
                            familyDayIndex >= startIdx && familyDayIndex <= endIdx;
                          return (
                            <button
                              key={wIdx}
                              type="button"
                              onClick={() => setFamilyDayIndex(startIdx)}
                              className={`h-8 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                                isCurrentWeek
                                  ? "bg-[#0F172A] dark:bg-[#10B981] text-white"
                                  : "bg-white dark:bg-[#0B1F17] border border-emerald-100 dark:border-emerald-900/60 text-[#64748B] dark:text-emerald-200/75 hover:border-emerald-300"
                              }`}
                            >
                              Minggu {wIdx + 1} (Hari {startIdx + 1}–{endIdx + 1})
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {(() => {
                      const weekStart = Math.floor(familyDayIndex / 7) * 7;
                      return familyWeeklyPlan.days
                        .slice(weekStart, weekStart + 7)
                        .map((day, offset) => {
                          const idx = weekStart + offset;
                          const isSelected = idx === familyDayIndex;
                          return (
                            <button
                              key={`${day.dayNumber}_${day.dayName}`}
                              type="button"
                              onClick={() => setFamilyDayIndex(idx)}
                              className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? "border-[#10B981] bg-gradient-to-br from-[#10B981] to-[#34D399] text-white shadow-md shadow-emerald-500/20"
                                  : "border-emerald-100 dark:border-emerald-900/60 bg-white dark:bg-[#0B1F17] text-[#0F172A] dark:text-[#ECFDF5] hover:border-emerald-300"
                              }`}
                            >
                              <div className="text-xs font-bold whitespace-nowrap">{day.dayName}</div>
                              <div
                                className={`text-[11px] font-mono tabular-nums mt-0.5 whitespace-nowrap ${
                                  isSelected ? "text-white/90" : "text-[#64748B] dark:text-emerald-200/70"
                                }`}
                              >
                                Hari {day.dayNumber}
                              </div>
                            </button>
                          );
                        });
                    })()}
                  </div>

                  <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-5">
                    <div className="pb-4 border-b border-emerald-100 dark:border-emerald-900/60 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B] dark:text-emerald-200/75">
                        <span className="font-semibold text-[#10B981] dark:text-[#34D399]">
                          Hari ke-{activeFamilyDay.dayNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{activeFamilyDay.dailyTheme}</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#ECFDF5]">
                        Hidangan Keluarga · {activeFamilyDay.dayName}
                      </h3>
                      <p className="text-xs text-[#64748B] dark:text-emerald-200/75">
                        {activeFamilyDay.dailyTip}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeFamilyDay.meals.map((meal, idx) => {
                        const meta = MEAL_META[meal.mealType] ?? MEAL_META.sarapan;
                        const MealIcon = meta.icon;
                        return (
                          <div
                            key={`${meal.mealType}_${idx}`}
                            className="rounded-2xl border border-emerald-100/90 dark:border-emerald-800/70 bg-[#F8FAFC]/80 dark:bg-[#102A20]/70 p-4 space-y-3"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center ${meta.iconBg} ${meta.iconColor}`}
                              >
                                <MealIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                                  {meta.label}
                                </div>
                                <div className="text-[11px] text-[#64748B] dark:text-emerald-200/65">
                                  {meta.timeHint}
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-[#0F172A] dark:text-white leading-snug">
                                {meal.dishName}
                              </h4>
                              {meal.baseIngredientsNote && (
                                <p className="text-xs text-[#334155] dark:text-emerald-100/80 mt-1">
                                  Bahan utama: {meal.baseIngredientsNote}
                                </p>
                              )}
                              {meal.prepNote && (
                                <p className="text-[11px] text-[#64748B] dark:text-emerald-200/70 mt-1 leading-relaxed">
                                  Cara saji: {meal.prepNote}
                                </p>
                              )}
                            </div>

                            <div className="pt-2.5 border-t border-emerald-100/80 dark:border-emerald-900/60 space-y-2">
                              <div className="text-[11px] font-semibold text-[#10B981] dark:text-[#34D399]">
                                Penyesuaian Porsi per Anggota:
                              </div>
                              <div className="divide-y divide-emerald-100/60 dark:divide-emerald-900/50">
                                {meal.memberPortions.map((mp) => (
                                  <div
                                    key={mp.memberId + mp.memberName}
                                    className="py-1.5 flex items-start justify-between gap-2 text-xs"
                                  >
                                    <div className="min-w-0">
                                      <span className="font-semibold text-[#0F172A] dark:text-white">
                                        {mp.memberName}:
                                      </span>{" "}
                                      <span className="text-[#475569] dark:text-emerald-100/80">
                                        {mp.portionInstruction}
                                      </span>
                                    </div>
                                    <span className="font-mono tabular-nums text-[11px] font-semibold text-[#10B981] dark:text-[#34D399] shrink-0">
                                      ~{mp.estimatedCalories} kkal
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              )}

              {familyViewMode === "shopping" && (
                <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                        Daftar Belanja Gabungan Sekeluarga ({familyWeeklyPlan.days.length} Hari)
                      </h3>
                      <p className="text-xs text-[#64748B] dark:text-emerald-200/70">
                        Takaran gabungan untuk {familyMembers.length} anggota keluarga.
                      </p>
                    </div>
                    <span className="text-xs font-mono tabular-nums font-semibold text-[#10B981] dark:text-[#34D399]">
                      {checkedFamilyCount} / {totalFamilyShoppingCount} bahan siap
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {familyWeeklyPlan.shoppingList.map((group) => (
                      <div
                        key={group.category}
                        className="rounded-2xl border border-emerald-100 dark:border-emerald-800/70 bg-[#F8FAFC] dark:bg-[#102A20]/70 p-4 space-y-2.5"
                      >
                        <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#ECFDF5]">
                          {group.category}
                        </h4>
                        <div className="space-y-1.5">
                          {group.items.map((item) => {
                            const key = `${group.category}::${item}`;
                            const isChecked =
                              familyWeeklyPlan.checkedShoppingItems.includes(key);
                            return (
                              <label
                                key={key}
                                className="flex items-start gap-2.5 text-xs sm:text-sm cursor-pointer select-none py-0.5"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => onToggleFamilyShoppingItem(key)}
                                  className="mt-1 rounded accent-[#10B981] cursor-pointer"
                                />
                                <span
                                  className={
                                    isChecked
                                      ? "line-through text-slate-400 dark:text-emerald-200/40"
                                      : "text-[#1E293B] dark:text-emerald-50"
                                  }
                                >
                                  {item}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ========================= PERSONAL MULTI-DAY MEAL PLANNER ========================= */
        <div className="space-y-6">
          {/* Configurator Form */}
          <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30">
            <form onSubmit={handleGeneratePlan} className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                  <ChefHat className="w-4 h-4 text-[#10B981]" />
                  <span>Sesuaikan Durasi, Tujuan & Preferensi Menu ({profile.name})</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#334155] dark:text-emerald-200/80">
                  Durasi Program Menu
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map((opt) => {
                    const active = selectedDuration === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedDuration(opt.id)}
                        className={`h-10 px-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                          active
                            ? "border-[#10B981] bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 shadow-xs"
                            : "border-emerald-100 dark:border-emerald-800/80 bg-[#F8FAFC] dark:bg-[#071610] text-[#64748B] dark:text-emerald-200/70 hover:border-emerald-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#334155] dark:text-emerald-200/80">
                  Fokus Rencana Menu
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {availableGoals.map((goal) => {
                    const selected = dietGoal === goal.id;
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => setDietGoal(goal.id)}
                        className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          selected
                            ? "border-[#10B981] bg-emerald-50/90 dark:bg-emerald-900/40 shadow-sm shadow-emerald-500/10"
                            : "border-emerald-100 dark:border-emerald-800/80 bg-[#F8FAFC] dark:bg-[#102A20]/70 hover:border-emerald-300 dark:hover:border-emerald-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                            {goal.label}
                          </span>
                          {selected && (
                            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#64748B] dark:text-emerald-200/70 mt-1 leading-relaxed">
                          {goal.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                <div className="lg:col-span-5 space-y-2">
                  <label className="block text-xs font-semibold text-[#334155] dark:text-emerald-200/80">
                    Gaya Masakan & Anggaran
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#F8FAFC] dark:bg-[#071610] border border-emerald-100 dark:border-emerald-900">
                    {BUDGET_OPTIONS.map((opt) => {
                      const active = budgetStyle === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setBudgetStyle(opt.id)}
                          className={`h-9 px-2 rounded-xl text-[11px] sm:text-xs font-medium transition-colors cursor-pointer whitespace-nowrap truncate ${
                            active
                              ? "bg-white dark:bg-[#102A20] text-[#0F172A] dark:text-white shadow-xs font-semibold"
                              : "text-[#64748B] dark:text-emerald-200/70 hover:text-[#0F172A] dark:hover:text-white"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-2">
                  <label
                    htmlFor="menu-preferences"
                    className="block text-xs font-semibold text-[#334155] dark:text-emerald-200/80"
                  >
                    Pantangan / Preferensi Bahan (Opsional)
                  </label>
                  <input
                    id="menu-preferences"
                    type="text"
                    value={preferencesNote}
                    onChange={(e) => setPreferencesNote(e.target.value)}
                    placeholder="Contoh: tanpa udang, suka tempe, tidak pedas"
                    className="w-full h-11 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-emerald-200/40 focus:outline-none focus:border-[#10B981] focus:bg-white dark:focus:bg-[#0B1F17]"
                  />
                </div>

                <div className="lg:col-span-3">
                  <button
                    type="submit"
                    disabled={isGenerating || isExtendingPersonal}
                    className="w-full h-11 px-4 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#10B981] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 whitespace-nowrap"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyusun Menu...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {weeklyPlan
                            ? `Perbarui ${selectedDuration} Hari`
                            : `Susun Menu ${selectedDuration} Hari`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {profile.medicalNotes && (
                <div className="text-[11px] text-[#64748B] dark:text-emerald-200/75 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  <span>
                    Catatan medis {profile.name} (
                    <strong className="text-[#0F172A] dark:text-white">{profile.medicalNotes}</strong>
                    ) otomatis disertakan ke ahli gizi AI.
                  </span>
                </div>
              )}
            </form>
          </section>

          {errorMsg && (
            <div className="flex items-start gap-2.5 p-4 rounded-3xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isGenerating && (
            <section
              aria-live="polite"
              className="bg-white/95 dark:bg-[#0B1F17]/95 border border-emerald-100 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 space-y-5"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#10B981]" />
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                    {personalProgress ||
                      `Ahli Gizi AI sedang merancang menu ${selectedDuration} hari untuk ${profile.name}...`}
                  </div>
                  <div className="text-xs text-[#64748B] dark:text-emerald-200/70">
                    Menyelaraskan takaran TKPI, keseimbangan makronutrisi, variasi harian, dan daftar belanja.
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[1, 2, 3, 4].map((slot) => (
                  <div
                    key={slot}
                    className="h-28 rounded-2xl border border-emerald-100/70 dark:border-emerald-900/50 bg-[#F8FAFC] dark:bg-[#102A20]/60 animate-shimmer p-4"
                  />
                ))}
              </div>
            </section>
          )}

          {!isGenerating && !weeklyPlan && (
            <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-dashed border-emerald-200 dark:border-emerald-800 rounded-3xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 dark:bg-emerald-900/50 text-[#10B981] mx-auto flex items-center justify-center">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                Belum Ada Rencana Menu ({selectedDuration} Hari) untuk {profile.name}
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-emerald-200/75 max-w-lg mx-auto leading-relaxed">
                Pilih durasi <strong className="text-[#0F172A] dark:text-white">7, 14, atau 30 hari (1 bulan)</strong> lalu tekan{" "}
                <strong className="text-[#0F172A] dark:text-white">Susun Menu</strong>, atau
                beralih ke tab <strong className="text-[#0F172A] dark:text-white">Sekeluarga</strong> /{" "}
                <strong className="text-[#0F172A] dark:text-white">Foto Belanjaan</strong>.
              </p>
            </section>
          )}

          {!isGenerating && weeklyPlan && (
            <div className="space-y-6">
              {isPlanStale && (
                <div className="rounded-3xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/40 p-4 flex items-start gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                  <span>
                    Profil, catatan medis, atau target kalori {profile.name} kini{" "}
                    <strong className="font-mono tabular-nums">
                      {plan.dailyCalorieTarget.toLocaleString("id-ID")} kkal/hari
                    </strong>{" "}
                    (berbeda dari menu tersimpan{" "}
                    <strong className="font-mono tabular-nums">
                      {weeklyPlan.targetCaloriesPerDay.toLocaleString("id-ID")} kkal/hari
                    </strong>
                    ). Tekan <strong>Perbarui Menu</strong> agar jadwal makan tetap akurat.
                  </span>
                </div>
              )}

              <section className="bg-gradient-to-br from-white via-[#F3FCF7] to-[#E8FAF0] dark:from-[#0B1F17] dark:via-[#0E281D] dark:to-[#081A13] border border-emerald-200/80 dark:border-emerald-800/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#ECFDF5]">
                    {weeklyPlan.planTitle}
                  </h2>
                  <span className="text-xs font-mono tabular-nums text-[#64748B] dark:text-emerald-200/75 whitespace-nowrap">
                    Rata-rata{" "}
                    {(
                      weeklyPlan.weeklyAverageCalories ??
                      weeklyPlan.targetCaloriesPerDay
                    ).toLocaleString("id-ID")}{" "}
                    / Target{" "}
                    {weeklyPlan.targetCaloriesPerDay.toLocaleString("id-ID")} kkal
                  </span>
                </div>
                {weeklyPlan.nutritionistSummary && (
                  <p className="text-xs sm:text-sm text-[#334155] dark:text-emerald-100/85 leading-relaxed">
                    {weeklyPlan.nutritionistSummary}
                  </p>
                )}
                {weeklyPlan.safetyReminder && (
                  <div className="rounded-2xl border border-amber-200/80 dark:border-amber-700/50 bg-amber-50/75 dark:bg-amber-950/35 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200/90 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                    <span>{weeklyPlan.safetyReminder}</span>
                  </div>
                )}
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-white dark:bg-[#0B1F17] border border-emerald-100 dark:border-emerald-900/60 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("daily")}
                    className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      viewMode === "daily"
                        ? "bg-gradient-to-r from-[#10B981] to-[#34D399] text-white shadow-xs"
                        : "text-[#64748B] dark:text-emerald-200/75 hover:text-[#0F172A] dark:hover:text-white"
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Detail Harian</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("overview")}
                    className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      viewMode === "overview"
                        ? "bg-gradient-to-r from-[#10B981] to-[#34D399] text-white shadow-xs"
                        : "text-[#64748B] dark:text-emerald-200/75 hover:text-[#0F172A] dark:hover:text-white"
                    }`}
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    <span>Ringkasan {weeklyPlan.days.length} Hari</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("shopping")}
                    className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      viewMode === "shopping"
                        ? "bg-gradient-to-r from-[#10B981] to-[#34D399] text-white shadow-xs"
                        : "text-[#64748B] dark:text-emerald-200/75 hover:text-[#0F172A] dark:hover:text-white"
                    }`}
                  >
                    <ShoppingBasket className="w-3.5 h-3.5" />
                    <span>Daftar Belanja ({checkedCount}/{totalShoppingCount})</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isExtendingPersonal || isGenerating}
                  onClick={handleExtendPersonalPlan}
                  className="h-9 px-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0B1F17] hover:bg-emerald-50 dark:hover:bg-[#102A20] disabled:opacity-50 text-xs font-semibold text-[#10B981] dark:text-[#34D399] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isExtendingPersonal ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menambah 7 Hari...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah 7 Hari Berikutnya</span>
                    </>
                  )}
                </button>
              </div>

              {viewMode === "daily" && activeDay && (
                <div className="space-y-4">
                  {weeklyPlan.days.length > 7 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {Array.from(
                        { length: Math.ceil(weeklyPlan.days.length / 7) },
                        (_, wIdx) => {
                          const startIdx = wIdx * 7;
                          const endIdx = Math.min(
                            weeklyPlan.days.length - 1,
                            startIdx + 6
                          );
                          const isCurrentWeek =
                            selectedDayIndex >= startIdx && selectedDayIndex <= endIdx;
                          return (
                            <button
                              key={wIdx}
                              type="button"
                              onClick={() => setSelectedDayIndex(startIdx)}
                              className={`h-8 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                                isCurrentWeek
                                  ? "bg-[#0F172A] dark:bg-[#10B981] text-white"
                                  : "bg-white dark:bg-[#0B1F17] border border-emerald-100 dark:border-emerald-900/60 text-[#64748B] dark:text-emerald-200/75 hover:border-emerald-300"
                              }`}
                            >
                              Minggu {wIdx + 1} (Hari {startIdx + 1}–{endIdx + 1})
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {(() => {
                      const weekStart = Math.floor(selectedDayIndex / 7) * 7;
                      return weeklyPlan.days
                        .slice(weekStart, weekStart + 7)
                        .map((day, offset) => {
                          const idx = weekStart + offset;
                          const isSelected = idx === selectedDayIndex;
                          return (
                            <button
                              key={`${day.dayNumber}_${day.dayName}`}
                              type="button"
                              onClick={() => setSelectedDayIndex(idx)}
                              className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? "border-[#10B981] bg-gradient-to-br from-[#10B981] to-[#34D399] text-white shadow-md shadow-emerald-500/20"
                                  : "border-emerald-100 dark:border-emerald-900/60 bg-white dark:bg-[#0B1F17] text-[#0F172A] dark:text-[#ECFDF5] hover:border-emerald-300 dark:hover:border-emerald-700"
                              }`}
                            >
                              <div className="text-[10px] font-mono tabular-nums opacity-85 whitespace-nowrap">
                                Hari {day.dayNumber}
                              </div>
                              <div className="text-xs font-bold whitespace-nowrap">
                                {day.dayName}
                              </div>
                              <div
                                className={`text-[11px] font-mono tabular-nums mt-0.5 whitespace-nowrap ${
                                  isSelected
                                    ? "text-white/95"
                                    : "text-[#64748B] dark:text-emerald-200/70"
                                }`}
                              >
                                {day.totalCalories} kkal
                              </div>
                            </button>
                          );
                        });
                    })()}
                  </div>

                  <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-emerald-100 dark:border-emerald-900/60">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B] dark:text-emerald-200/75">
                          <span className="font-semibold text-[#10B981] dark:text-[#34D399]">
                            Hari ke-{activeDay.dayNumber}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{activeDay.dailyTheme}</span>
                        </div>
                        <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#ECFDF5]">
                          Menu {activeDay.dayName}
                        </h3>
                        <p className="text-xs text-[#64748B] dark:text-emerald-200/75">
                          {activeDay.dailyTip}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <div className="text-left md:text-right">
                          <div className="text-lg font-bold font-mono tabular-nums text-[#0F172A] dark:text-white">
                            {activeDay.totalCalories.toLocaleString("id-ID")} kkal
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-[#64748B] dark:text-emerald-200/70">
                            K {activeDay.totalCarbs}g · P {activeDay.totalProtein}g · L {activeDay.totalFat}g
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleLogAllDayMeals}
                          className="h-10 px-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] hover:bg-emerald-50 dark:hover:bg-[#143528] text-xs font-semibold text-[#0F172A] dark:text-[#ECFDF5] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                        >
                          {dayLoggedNotice ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#10B981]" />
                              <span>Semua Dicatat</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 text-[#10B981]" />
                              <span>Catat Semua ke Hari Ini</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeDay.meals.map((meal, idx) => {
                        const meta = MEAL_META[meal.mealType] ?? MEAL_META.sarapan;
                        const MealIcon = meta.icon;
                        const isLogged = isMealLoggedToday(meal);

                        return (
                          <div
                            key={`${meal.mealType}_${idx}`}
                            className="rounded-2xl border border-emerald-100/90 dark:border-emerald-800/70 bg-[#F8FAFC]/80 dark:bg-[#102A20]/70 p-4 flex flex-col justify-between gap-3.5"
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${meta.iconBg} ${meta.iconColor}`}
                                  >
                                    <MealIcon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                                      {meta.label}
                                    </div>
                                    <div className="text-[11px] text-[#64748B] dark:text-emerald-200/65">
                                      {meta.timeHint}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-sm font-bold font-mono tabular-nums text-[#10B981] dark:text-[#34D399]">
                                  {meal.calories} kkal
                                </span>
                              </div>

                              <div>
                                <h4 className="text-sm font-bold text-[#0F172A] dark:text-white leading-snug">
                                  {meal.foodName}
                                </h4>
                                <p className="text-xs text-[#334155] dark:text-emerald-100/80 mt-1">
                                  Takaran: {meal.portionNote}
                                </p>
                                {meal.prepNote && (
                                  <p className="text-[11px] text-[#64748B] dark:text-emerald-200/70 mt-1 leading-relaxed">
                                    Cara saji: {meal.prepNote}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-emerald-100/80 dark:border-emerald-900/60">
                              <span className="text-[11px] font-mono tabular-nums text-[#64748B] dark:text-emerald-200/75">
                                K {meal.carbs}g · P {meal.protein}g · L {meal.fat}g
                              </span>
                              <button
                                type="button"
                                disabled={isLogged}
                                onClick={() => handleLogSingleMeal(meal)}
                                className={`h-8 px-3 rounded-xl text-[11px] font-semibold transition-colors flex items-center gap-1 whitespace-nowrap ${
                                  isLogged
                                    ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 cursor-default"
                                    : "bg-[#0F172A] dark:bg-[#10B981] hover:opacity-90 text-white cursor-pointer"
                                }`}
                              >
                                {isLogged ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Tercatat</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3" />
                                    <span>Catat Hari Ini</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Warteg / Restaurant Menu Substitution Chatbot for Selected Day */}
                  <DailyMenuChatbot
                    profile={profile}
                    plan={plan}
                    todayFoods={todayFoods}
                    todaySummary={todaySummary}
                    fixedDayContext={{
                      dayNumber: activeDay.dayNumber,
                      dayName: activeDay.dayName,
                      meals: activeDay.meals,
                    }}
                    messages={consultMessages}
                    onAppendMessages={onAppendConsultMessages}
                    onResetChat={onResetConsultChat}
                    onLogMealToToday={onLogMealToToday}
                  />
                </div>
              )}

              {viewMode === "overview" && (
                <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                      Matriks Menu {weeklyPlan.days.length} Hari
                    </h3>
                    <p className="text-xs text-[#64748B] dark:text-emerald-200/70">
                      Klik salah satu hari untuk melihat takaran detail, cara saji, dan tombol catat ke log harian.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[760px]">
                      <thead>
                        <tr className="border-b border-emerald-100 dark:border-emerald-900/60 text-[11px] font-semibold text-[#64748B] dark:text-emerald-200/75">
                          <th className="py-2.5 pr-3">Hari</th>
                          <th className="py-2.5 px-3">Sarapan</th>
                          <th className="py-2.5 px-3">Makan Siang</th>
                          <th className="py-2.5 px-3">Makan Malam</th>
                          <th className="py-2.5 px-3">Camilan</th>
                          <th className="py-2.5 pl-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100/70 dark:divide-emerald-900/50 text-xs">
                        {weeklyPlan.days.map((day, idx) => {
                          const getMeal = (t: MealType) =>
                            day.meals.find((m) => m.mealType === t);
                          const breakfast = getMeal("sarapan");
                          const lunch = getMeal("makan_siang");
                          const dinner = getMeal("makan_malam");
                          const snack = getMeal("camilan");
                          return (
                            <tr
                              key={`${day.dayNumber}_${day.dayName}`}
                              onClick={() => {
                                setSelectedDayIndex(idx);
                                setViewMode("daily");
                              }}
                              className="hover:bg-emerald-50/60 dark:hover:bg-[#102A20]/70 transition-colors cursor-pointer align-top"
                            >
                              <td className="py-3 pr-3 font-semibold text-[#0F172A] dark:text-white whitespace-nowrap">
                                <span className="font-mono tabular-nums text-[#10B981] dark:text-[#34D399] mr-1.5">
                                  H{day.dayNumber}
                                </span>
                                {day.dayName}
                              </td>
                              <td className="py-3 px-3 text-[#334155] dark:text-emerald-100/85">
                                {breakfast?.foodName ?? "-"}
                              </td>
                              <td className="py-3 px-3 text-[#334155] dark:text-emerald-100/85">
                                {lunch?.foodName ?? "-"}
                              </td>
                              <td className="py-3 px-3 text-[#334155] dark:text-emerald-100/85">
                                {dinner?.foodName ?? "-"}
                              </td>
                              <td className="py-3 px-3 text-[#334155] dark:text-emerald-100/85">
                                {snack?.foodName ?? "-"}
                              </td>
                              <td className="py-3 pl-3 text-right font-mono tabular-nums font-semibold text-[#10B981] dark:text-[#34D399] whitespace-nowrap">
                                {day.totalCalories} kkal
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {viewMode === "shopping" && (
                <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                        Daftar Belanja {weeklyPlan.days.length} Hari ({profile.name})
                      </h3>
                      <p className="text-xs text-[#64748B] dark:text-emerald-200/70">
                        Centang bahan yang sudah tersedia di dapur atau sudah dibeli.
                      </p>
                    </div>
                    <span className="text-xs font-mono tabular-nums font-semibold text-[#10B981] dark:text-[#34D399]">
                      {checkedCount} / {totalShoppingCount} bahan siap
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {weeklyPlan.shoppingList.map((group) => (
                      <div
                        key={group.category}
                        className="rounded-2xl border border-emerald-100 dark:border-emerald-800/70 bg-[#F8FAFC] dark:bg-[#102A20]/70 p-4 space-y-2.5"
                      >
                        <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#ECFDF5]">
                          {group.category}
                        </h4>
                        <div className="space-y-1.5">
                          {group.items.map((item) => {
                            const key = `${group.category}::${item}`;
                            const isChecked =
                              weeklyPlan.checkedShoppingItems.includes(key);
                            return (
                              <label
                                key={key}
                                className="flex items-start gap-2.5 text-xs sm:text-sm cursor-pointer select-none py-0.5"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => onToggleShoppingItem(key)}
                                  className="mt-1 rounded accent-[#10B981] cursor-pointer"
                                />
                                <span
                                  className={
                                    isChecked
                                      ? "line-through text-slate-400 dark:text-emerald-200/40"
                                      : "text-[#1E293B] dark:text-emerald-50"
                                  }
                                >
                                  {item}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
