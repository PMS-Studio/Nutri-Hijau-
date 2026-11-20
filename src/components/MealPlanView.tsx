import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Apple,
  CalendarDays,
  Check,
  CheckCircle2,
  ChefHat,
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
} from "lucide-react";
import type {
  DietGoalType,
  FoodLogEntry,
  MealType,
  MenuBudgetStyle,
  NutritionPlan,
  PlannedMealItem,
  UserProfile,
  WeeklyMealPlan,
} from "../types";
import { CATEGORY_MAP, getTodayDateKey } from "../utils/nutrition";

interface MealPlanViewProps {
  profile: UserProfile;
  plan: NutritionPlan;
  weeklyPlan: WeeklyMealPlan | null;
  onSaveWeeklyPlan: (nextPlan: WeeklyMealPlan | null) => void;
  onToggleShoppingItem: (itemKey: string) => void;
  onLogMealToToday: (entry: Omit<FoodLogEntry, "id" | "createdAt">) => void;
}

const GOAL_OPTIONS: Array<{
  id: DietGoalType;
  label: string;
  desc: string;
}> = [
  {
    id: "turun_berat",
    label: "Turun Berat Bertahap",
    desc: "Defisit aman 300–500 kkal dengan kenyang lebih lama",
  },
  {
    id: "tinggi_protein",
    label: "Tinggi Protein & Otot",
    desc: "Prioritas protein tinggi untuk menjaga massa otot",
  },
  {
    id: "pemeliharaan",
    label: "Jaga Berat Ideal",
    desc: "Kalori seimbang untuk stabilitas energi & berat badan",
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
  if (plan.isDeficitBlockedByUnderweight) return "pemeliharaan";
  if (profile.targetWeight < profile.currentWeight - 0.5) return "turun_berat";
  return "pemeliharaan";
}

export const MealPlanView: React.FC<MealPlanViewProps> = ({
  profile,
  plan,
  weeklyPlan,
  onSaveWeeklyPlan,
  onToggleShoppingItem,
  onLogMealToToday,
}) => {
  const defaultGoal = useMemo(
    () => inferDefaultGoal(profile, plan),
    [profile, plan]
  );

  const availableGoals = useMemo(() => {
    if (profile.category === "child_teen") {
      return GOAL_OPTIONS.filter((g) => g.id === "pertumbuhan_sehat");
    }
    if (profile.category === "postpartum") {
      return GOAL_OPTIONS.filter(
        (g) =>
          g.id === "pemulihan_asi" ||
          (!plan.isDeficitBlockedByUnderweight && g.id === "turun_berat") ||
          g.id === "pemeliharaan"
      );
    }
    if (plan.isDeficitBlockedByUnderweight) {
      return GOAL_OPTIONS.filter((g) => g.id === "pemeliharaan");
    }
    return GOAL_OPTIONS.filter(
      (g) =>
        g.id === "turun_berat" ||
        g.id === "tinggi_protein" ||
        g.id === "pemeliharaan"
    );
  }, [profile.category, plan.isDeficitBlockedByUnderweight]);

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
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [viewMode, setViewMode] = useState<"daily" | "overview" | "shopping">("daily");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [loggedKeys, setLoggedKeys] = useState<Record<string, boolean>>({});
  const [dayLoggedNotice, setDayLoggedNotice] = useState<boolean>(false);

  useEffect(() => {
    const allowedIds = new Set(availableGoals.map((g) => g.id));
    if (!allowedIds.has(dietGoal)) {
      setDietGoal(defaultGoal);
    }
  }, [availableGoals, dietGoal, defaultGoal]);

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;

    setErrorMsg("");
    setIsGenerating(true);

    try {
      const res = await fetch("/api/ai/weekly-meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dietGoal,
          budgetStyle,
          preferencesNote,
          profile,
          nutritionPlan: plan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyusun menu 7 hari saat ini.");
      }

      onSaveWeeklyPlan(data as WeeklyMealPlan);
      setSelectedDayIndex(0);
      setViewMode("daily");
      setLoggedKeys({});
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan jaringan saat menyusun menu mingguan."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogSingleMeal = (dayNum: number, meal: PlannedMealItem, idx: number) => {
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
    const key = `${dayNum}_${idx}`;
    setLoggedKeys((prev) => ({ ...prev, [key]: true }));
  };

  const handleLogAllDayMeals = () => {
    if (!weeklyPlan) return;
    const day = weeklyPlan.days[selectedDayIndex];
    if (!day) return;
    day.meals.forEach((meal, idx) => {
      handleLogSingleMeal(day.dayNumber, meal, idx);
    });
    setDayLoggedNotice(true);
    setTimeout(() => setDayLoggedNotice(false), 2500);
  };

  const activeDay = weeklyPlan?.days[selectedDayIndex] ?? null;

  const totalShoppingCount = useMemo(() => {
    if (!weeklyPlan) return 0;
    return weeklyPlan.shoppingList.reduce((acc, grp) => acc + grp.items.length, 0);
  }, [weeklyPlan]);

  const checkedCount = weeklyPlan?.checkedShoppingItems?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5]">
            Rencana Menu Diet 7 Hari
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-emerald-200/75 mt-0.5">
            Mode:{" "}
            <strong className="text-[#10B981] dark:text-[#34D399]">
              {CATEGORY_MAP[profile.category].shortLabel}
            </strong>{" "}
            · Target{" "}
            <span className="font-mono tabular-nums font-semibold text-[#0F172A] dark:text-white">
              {plan.dailyCalorieTarget.toLocaleString("id-ID")} kkal/hari
            </span>{" "}
            · Protein{" "}
            <span className="font-mono tabular-nums font-semibold text-[#0F172A] dark:text-white">
              {plan.macroTargets.proteinG}g
            </span>
          </p>
        </div>

        {weeklyPlan && (
          <button
            type="button"
            onClick={() => onSaveWeeklyPlan(null)}
            className="h-10 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0B1F17] hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-800 text-xs font-semibold text-[#475569] dark:text-emerald-200 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer whitespace-nowrap transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Rencana</span>
          </button>
        )}
      </div>

      {/* Configurator Form */}
      <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30">
        <form onSubmit={handleGeneratePlan} className="space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
            <ChefHat className="w-4 h-4 text-[#10B981]" />
            <span>Sesuaikan Tujuan & Preferensi Menu Mingguan</span>
          </div>

          {/* Diet Goal Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#334155] dark:text-emerald-200/80">
              Tujuan Diet Utama
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
            {/* Budget / Cooking Style */}
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

            {/* Extra Preferences */}
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

            {/* Submit Button */}
            <div className="lg:col-span-3">
              <button
                type="submit"
                disabled={isGenerating}
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
                    <span>{weeklyPlan ? "Perbarui Menu 7 Hari" : "Susun Menu 7 Hari"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {profile.medicalNotes && (
            <div className="text-[11px] text-[#64748B] dark:text-emerald-200/75 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              <span>
                Catatan medis profil Anda (<strong className="text-[#0F172A] dark:text-white">{profile.medicalNotes}</strong>) otomatis disertakan ke ahli gizi AI.
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

      {/* Botanical Shimmer Loading State */}
      {isGenerating && (
        <section
          aria-live="polite"
          className="bg-white/95 dark:bg-[#0B1F17]/95 border border-emerald-100 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 space-y-5"
        >
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#10B981]" />
            <div>
              <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                Ahli Gizi AI sedang merancang menu 7 hari (Senin–Minggu)...
              </div>
              <div className="text-xs text-[#64748B] dark:text-emerald-200/70">
                Menyelaraskan takaran TKPI, keseimbangan makronutrisi, dan daftar belanja mingguan Anda.
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

      {/* Empty State */}
      {!isGenerating && !weeklyPlan && (
        <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-dashed border-emerald-200 dark:border-emerald-800 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 dark:bg-emerald-900/50 text-[#10B981] mx-auto flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
            Belum Ada Rencana Menu 7 Hari
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-emerald-200/75 max-w-lg mx-auto leading-relaxed">
            Pilih tujuan diet di atas lalu tekan{" "}
            <strong className="text-[#0F172A] dark:text-white">Susun Menu 7 Hari</strong>. Ahli
            gizi AI akan membuat jadwal makan Senin–Minggu dengan takaran porsi Indonesia, total
            kalori harian terukur, serta daftar belanja mingguan yang siap dicentang.
          </p>
        </section>
      )}

      {/* Populated Weekly Plan */}
      {!isGenerating && weeklyPlan && (
        <div className="space-y-6">
          {/* Nutritionist Summary Card */}
          <section className="bg-gradient-to-br from-white via-[#F3FCF7] to-[#E8FAF0] dark:from-[#0B1F17] dark:via-[#0E281D] dark:to-[#081A13] border border-emerald-200/80 dark:border-emerald-800/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#ECFDF5]">
                {weeklyPlan.planTitle}
              </h2>
              <span className="text-xs font-mono tabular-nums text-[#64748B] dark:text-emerald-200/75 whitespace-nowrap">
                Target {weeklyPlan.targetCaloriesPerDay.toLocaleString("id-ID")} kkal/hari
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

          {/* Sub-View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-white dark:bg-[#0B1F17] border border-emerald-100 dark:border-emerald-900/60 shadow-xs">
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
                <span>Ringkasan 7 Hari</span>
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
          </div>

          {/* VIEW 1: Daily Detail */}
          {viewMode === "daily" && activeDay && (
            <div className="space-y-5">
              {/* 7-Day Selector Bar */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {weeklyPlan.days.map((day, idx) => {
                  const isSelected = idx === selectedDayIndex;
                  return (
                    <button
                      key={day.dayName + idx}
                      type="button"
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#10B981] bg-gradient-to-br from-[#10B981] to-[#34D399] text-white shadow-md shadow-emerald-500/20"
                          : "border-emerald-100 dark:border-emerald-900/60 bg-white dark:bg-[#0B1F17] text-[#0F172A] dark:text-[#ECFDF5] hover:border-emerald-300 dark:hover:border-emerald-700"
                      }`}
                    >
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
                })}
              </div>

              {/* Active Day Card */}
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

                {/* 4 Meal Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeDay.meals.map((meal, idx) => {
                    const meta = MEAL_META[meal.mealType] ?? MEAL_META.sarapan;
                    const MealIcon = meta.icon;
                    const isLogged = Boolean(loggedKeys[`${activeDay.dayNumber}_${idx}`]);

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
                            onClick={() =>
                              handleLogSingleMeal(activeDay.dayNumber, meal, idx)
                            }
                            className={`h-8 px-3 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                              isLogged
                                ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200"
                                : "bg-[#0F172A] dark:bg-[#10B981] hover:opacity-90 text-white"
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
            </div>
          )}

          {/* VIEW 2: 7-Day Compact Matrix Overview */}
          {viewMode === "overview" && (
            <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                  Matriks Menu Senin – Minggu
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
                          key={day.dayName + idx}
                          onClick={() => {
                            setSelectedDayIndex(idx);
                            setViewMode("daily");
                          }}
                          className="hover:bg-emerald-50/60 dark:hover:bg-[#102A20]/70 transition-colors cursor-pointer align-top"
                        >
                          <td className="py-3 pr-3 font-semibold text-[#0F172A] dark:text-white whitespace-nowrap">
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

          {/* VIEW 3: Checkable Weekly Shopping List */}
          {viewMode === "shopping" && (
            <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                    Daftar Belanja Mingguan (7 Hari)
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
  );
};
