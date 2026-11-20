import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Beef,
  CalendarDays,
  Check,
  Droplet,
  Droplets,
  Flame,
  HeartHandshake,
  Info,
  Minus,
  Moon,
  Plus,
  Scale,
  Sun,
  Sunrise,
  Trash2,
  Utensils,
  Users,
  Wheat,
} from "lucide-react";
import type {
  AppTab,
  ChatMessage,
  ExerciseLogEntry,
  FoodLogEntry,
  NutritionPlan,
  UserProfile,
  WeeklyMealPlan,
  WeightLogEntry,
} from "../types";
import {
  ACTIVITY_OPTIONS,
  CATEGORY_MAP,
  EXERCISE_PRESETS,
  FAMILY_ROLE_MAP,
  NUTRITION_FOCUS_MAP,
  calculateDailyStreak,
  calculateExerciseCalories,
  formatDateIndo,
  getTimeOfDayGreeting,
  getTodayDateKey,
} from "../utils/nutrition";
import { DailyMenuChatbot } from "./DailyMenuChatbot";
import { WeightTrendChart } from "./WeightTrendChart";

interface DashboardViewProps {
  profile: UserProfile;
  plan: NutritionPlan;
  foodLogs: FoodLogEntry[];
  exerciseLogs: ExerciseLogEntry[];
  waterLogs: Record<string, number>;
  weightLogs: WeightLogEntry[];
  familyMembers: UserProfile[];
  weeklyPlan: WeeklyMealPlan | null;
  consultMessages: ChatMessage[];
  onAppendConsultMessages: (msgs: ChatMessage[]) => void;
  onResetConsultChat: () => void;
  onAddFood: (entry: Omit<FoodLogEntry, "id" | "createdAt">) => void;
  onSelectMember: (memberId: string) => void;
  onOpenFamilyManager: () => void;
  onAddWater: (deltaMl: number) => void;
  onLogWeight: (weightKg: number) => void;
  onAddExercise: (entry: Omit<ExerciseLogEntry, "id" | "createdAt">) => void;
  onDeleteExercise: (id: string) => void;
  onNavigateTab: (tab: AppTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  plan,
  foodLogs,
  exerciseLogs,
  waterLogs,
  weightLogs,
  familyMembers,
  weeklyPlan,
  consultMessages,
  onAppendConsultMessages,
  onResetConsultChat,
  onAddFood,
  onSelectMember,
  onOpenFamilyManager,
  onAddWater,
  onLogWeight,
  onAddExercise,
  onDeleteExercise,
  onNavigateTab,
}) => {
  const todayKey = getTodayDateKey();
  const { greeting, period } = getTimeOfDayGreeting();

  const dailyStreak = useMemo(
    () =>
      calculateDailyStreak(
        foodLogs.map((f) => f.date),
        exerciseLogs.map((e) => e.date),
        waterLogs,
        weightLogs.map((w) => w.date)
      ),
    [foodLogs, exerciseLogs, waterLogs, weightLogs]
  );

  const todayFoods = useMemo(
    () => foodLogs.filter((f) => f.date === todayKey),
    [foodLogs, todayKey]
  );
  const todayExercises = useMemo(
    () => exerciseLogs.filter((ex) => ex.date === todayKey),
    [exerciseLogs, todayKey]
  );

  const caloriesIn = todayFoods.reduce((sum, item) => sum + item.calories, 0);
  const caloriesOut = todayExercises.reduce(
    (sum, item) => sum + item.caloriesBurned,
    0
  );
  const carbsIn = Math.round(todayFoods.reduce((sum, item) => sum + item.carbs, 0));
  const proteinIn = Math.round(todayFoods.reduce((sum, item) => sum + item.protein, 0));
  const fatIn = Math.round(todayFoods.reduce((sum, item) => sum + item.fat, 0));

  const isModerateOrActive =
    profile.activityLevel === "moderate" || profile.activityLevel === "active";
  const [includeExerciseInBudget, setIncludeExerciseInBudget] = useState<boolean>(
    !isModerateOrActive
  );

  const effectiveTarget =
    plan.dailyCalorieTarget + (includeExerciseInBudget ? caloriesOut : 0);
  const remainingCalories = effectiveTarget - caloriesIn;
  const progressRatio = Math.min(1, caloriesIn / Math.max(1, effectiveTarget));

  const todayWaterMl = waterLogs[todayKey] ?? 0;
  const waterRatio = Math.min(1, todayWaterMl / Math.max(1, plan.waterTargetMl));
  const glassesCount = Math.round(todayWaterMl / 250);
  const targetGlasses = Math.round(plan.waterTargetMl / 250);

  const [rippleTick, setRippleTick] = useState<number>(0);

  const handleWaterTap = (delta: number) => {
    onAddWater(delta);
    if (delta > 0) {
      setRippleTick((t) => t + 1);
    }
  };

  const latestWeight =
    weightLogs.length > 0
      ? weightLogs[weightLogs.length - 1].weightKg
      : profile.currentWeight;

  const [weightInput, setWeightInput] = useState<string>(String(latestWeight));
  const [weightSavedFeedback, setWeightSavedFeedback] = useState<boolean>(false);

  useEffect(() => {
    setWeightInput(String(latestWeight));
  }, [latestWeight]);

  const [showExerciseForm, setShowExerciseForm] = useState<boolean>(false);
  const [selectedMet, setSelectedMet] = useState<number>(EXERCISE_PRESETS[0].met);
  const [exerciseName, setExerciseName] = useState<string>(EXERCISE_PRESETS[0].name);
  const [exerciseMinutes, setExerciseMinutes] = useState<string>(
    String(EXERCISE_PRESETS[0].defaultMinutes)
  );
  const [exerciseKcal, setExerciseKcal] = useState<string>(() =>
    String(
      calculateExerciseCalories(
        EXERCISE_PRESETS[0].met,
        latestWeight,
        EXERCISE_PRESETS[0].defaultMinutes
      )
    )
  );

  const handlePresetClick = (preset: (typeof EXERCISE_PRESETS)[number]) => {
    setExerciseName(preset.name);
    setSelectedMet(preset.met);
    setExerciseMinutes(String(preset.defaultMinutes));
    setExerciseKcal(
      String(
        calculateExerciseCalories(preset.met, latestWeight, preset.defaultMinutes)
      )
    );
  };

  const handleMinutesChange = (val: string) => {
    setExerciseMinutes(val);
    const mins = Number(val);
    if (mins > 0) {
      setExerciseKcal(
        String(calculateExerciseCalories(selectedMet, latestWeight, mins))
      );
    }
  };

  const handleExerciseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Math.max(1, Number(exerciseMinutes) || 20);
    const kcal = Math.max(1, Math.round(Number(exerciseKcal) || 100));
    onAddExercise({
      date: todayKey,
      name: exerciseName.trim() || "Olahraga Ringan",
      durationMinutes: mins,
      caloriesBurned: kcal,
    });
    setShowExerciseForm(false);
  };

  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(weightInput);
    if (!val || val < 15 || val > 250) return;
    onLogWeight(Math.round(val * 10) / 10);
    setWeightSavedFeedback(true);
    setTimeout(() => setWeightSavedFeedback(false), 2000);
  };

  // SVG Ring math
  const ringSize = 184;
  const strokeWidth = 15;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressRatio);
  const isOverBudget = remainingCalories < 0;

  const TimeIcon = period === "morning" ? Sunrise : period === "afternoon" ? Sun : Moon;

  const macroCards = [
    {
      label: "Karbohidrat",
      val: carbsIn,
      target: plan.macroTargets.carbsG,
      icon: Wheat,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-100/80 dark:bg-emerald-900/50",
      barGradient: "from-[#10B981] to-[#34D399]",
    },
    {
      label: "Protein",
      val: proteinIn,
      target: plan.macroTargets.proteinG,
      icon: Beef,
      iconColor: "text-lime-600 dark:text-lime-400",
      iconBg: "bg-lime-100/80 dark:bg-lime-900/40",
      barGradient: "from-[#65A30D] to-[#84CC16]",
    },
    {
      label: "Lemak",
      val: fatIn,
      target: plan.macroTargets.fatG,
      icon: Droplet,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-100/80 dark:bg-amber-900/40",
      barGradient: "from-amber-500 to-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Dynamic Greeting Hero Banner */}
      <section className="rounded-3xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-br from-white via-[#F1FCF6] to-[#E6FAF0] dark:from-[#0B1F17] dark:via-[#0E281D] dark:to-[#081A13] p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#34D399] text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
            <TimeIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-600 dark:text-emerald-200/80">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                {FAMILY_ROLE_MAP[profile.relationRole]?.label ?? "Anggota"} ·{" "}
                {NUTRITION_FOCUS_MAP[profile.nutritionFocus]?.shortLabel ??
                  CATEGORY_MAP[profile.category].shortLabel}
                {profile.category === "postpartum" && profile.isBreastfeeding
                  ? " (Menyusui)"
                  : ""}
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatDateIndo(todayKey)}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <Flame className="w-3.5 h-3.5" />
                <span>
                  {dailyStreak > 0
                    ? `${dailyStreak} Hari Konsisten`
                    : "Mulai Hari Pertama"}
                </span>
              </span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => onNavigateTab("profile")}
                className="font-semibold text-[#10B981] dark:text-[#34D399] hover:underline cursor-pointer"
              >
                Ubah Profil
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5]">
              {greeting}, {profile.name}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab("food")}
            className="h-11 px-5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#10B981] text-white text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Makanan</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("mealplan")}
            className="h-11 px-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white/80 dark:bg-[#0D241B]/80 hover:bg-white dark:hover:bg-[#123024] text-[#0F172A] dark:text-[#ECFDF5] text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <CalendarDays className="w-4 h-4 text-[#10B981]" />
            <span>Menu 7 Hari</span>
          </button>
        </div>
      </section>

      {/* Quick Family Member Switcher Bar (Shown only when household has >1 member) */}
      {familyMembers.length > 1 && (
        <section className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-[#64748B] dark:text-emerald-200/75 mr-1 inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Anggota:</span>
            </span>
            {familyMembers.map((member) => {
              const active = member.id === profile.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onSelectMember(member.id)}
                  className={`h-8 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-[#0F172A] dark:bg-[#10B981] text-white shadow-xs"
                      : "bg-white dark:bg-[#0B1F17] border border-emerald-100 dark:border-emerald-900/60 text-[#475569] dark:text-emerald-200/80 hover:border-emerald-300"
                  }`}
                >
                  {member.name}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onOpenFamilyManager}
            className="text-xs font-semibold text-[#10B981] dark:text-[#34D399] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>Kelola Keluarga di Profil</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      {/* Safety Notice for Postpartum, Child/Teen, or Underweight */}
      {plan.safetyBannerTitle && (
        <section className="rounded-3xl border border-amber-200/90 dark:border-amber-700/50 bg-amber-50/80 dark:bg-amber-950/35 p-4 sm:p-5 flex items-start gap-3">
          {profile.category === "postpartum" ? (
            <HeartHandshake className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-amber-950 dark:text-amber-200">
              {plan.safetyBannerTitle}
            </div>
            <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-200/80 leading-relaxed">
              {plan.safetyBannerText}
            </p>
          </div>
        </section>
      )}

      {/* Primary Row: Interactive Calorie Ring & Macro Cards + Hydration Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calorie Summary Card */}
        <section className="lg:col-span-7 bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                Ringkasan Kalori Hari Ini
              </h2>
              <p className="text-xs text-[#64748B] dark:text-emerald-200/70">
                Target {plan.dailyCalorieTarget.toLocaleString("id-ID")} kkal · BMI{" "}
                <span className="font-mono tabular-nums font-semibold text-[#0F172A] dark:text-white">
                  {plan.bmi.toFixed(1)}
                </span>{" "}
                ({plan.bmiCategory})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowExerciseForm((prev) => !prev)}
              className="h-10 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] hover:bg-emerald-50 dark:hover:bg-[#143528] text-xs font-semibold text-[#0F172A] dark:text-[#ECFDF5] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Flame className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Catat Olahraga</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            {/* Gradient SVG Progress Ring */}
            <div className="relative shrink-0 flex items-center justify-center">
              <svg
                width={ringSize}
                height={ringSize}
                viewBox={`0 0 ${ringSize} ${ringSize}`}
                className="-rotate-90"
                role="img"
                aria-label="Progres kalori harian"
              >
                <defs>
                  <linearGradient id="calorieRingGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="55%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#84CC16" />
                  </linearGradient>
                </defs>
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  fill="none"
                  className="stroke-emerald-100/80 dark:stroke-emerald-950"
                  strokeWidth={strokeWidth}
                />
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  fill="none"
                  stroke={isOverBudget ? "#EF4444" : "url(#calorieRingGrad)"}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-[stroke-dashoffset] duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                <span className="text-[11px] font-medium text-[#64748B] dark:text-emerald-200/75">
                  {isOverBudget ? "Melebihi Target" : "Sisa Kalori"}
                </span>
                <span
                  className={`text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight ${
                    isOverBudget
                      ? "text-red-600 dark:text-red-400"
                      : "text-[#0F172A] dark:text-[#ECFDF5]"
                  }`}
                >
                  {Math.abs(remainingCalories).toLocaleString("id-ID")}
                </span>
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  kkal
                </span>
              </div>
            </div>

            {/* 3 Metrics + Exercise Toggle */}
            <div className="w-full flex-1 space-y-4">
              <div className="grid grid-cols-3 gap-3 pb-4 border-b border-emerald-100 dark:border-emerald-900/60">
                <div>
                  <div className="text-xs text-[#64748B] dark:text-emerald-200/70">
                    Target
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-white mt-0.5">
                    {plan.dailyCalorieTarget.toLocaleString("id-ID")}
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-emerald-200/60">
                    kkal
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B] dark:text-emerald-200/70">
                    Masuk
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#10B981] dark:text-[#34D399] mt-0.5">
                    {caloriesIn.toLocaleString("id-ID")}
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-emerald-200/60">
                    makanan
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B] dark:text-emerald-200/70">
                    Keluar
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-white mt-0.5">
                    {caloriesOut.toLocaleString("id-ID")}
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-emerald-200/60">
                    olahraga
                  </div>
                </div>
              </div>

              {caloriesOut > 0 && (
                <label className="flex items-start gap-2 text-[11px] text-[#64748B] dark:text-emerald-200/75 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeExerciseInBudget}
                    onChange={(e) => setIncludeExerciseInBudget(e.target.checked)}
                    className="mt-0.5 rounded accent-[#10B981] cursor-pointer"
                  />
                  <span>
                    Tambahkan kalori olahraga ke sisa kalori hari ini (
                    {isModerateOrActive
                      ? `opsional, aktivitas "${ACTIVITY_OPTIONS.find((a) => a.id === profile.activityLevel)?.label}" sudah terhitung di TDEE`
                      : "disarankan untuk aktivitas Jarang/Ringan"}
                    ).
                  </span>
                </label>
              )}

              <div className="text-xs text-[#64748B] dark:text-emerald-200/70">
                Terpakai{" "}
                <strong className="font-mono tabular-nums text-[#0F172A] dark:text-white">
                  {Math.round(progressRatio * 100)}%
                </strong>{" "}
                dari anggaran energi hari ini
              </div>
            </div>
          </div>

          {/* 3 Macro Mini Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {macroCards.map((m) => {
              const MacroIcon = m.icon;
              const pct = Math.min(100, Math.round((m.val / Math.max(1, m.target)) * 100));
              const remainingG = m.target - m.val;
              return (
                <div
                  key={m.label}
                  className="rounded-2xl bg-[#F8FAFC] dark:bg-[#102A20]/80 p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center ${m.iconBg} ${m.iconColor}`}
                      >
                        <MacroIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                        {m.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums font-medium text-[#64748B] dark:text-emerald-200/75">
                      {remainingG > 0 ? `Sisa ${remainingG}g` : "Terpenuhi"}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs font-mono tabular-nums">
                      <strong className="text-sm text-[#0F172A] dark:text-white">
                        {m.val}g
                      </strong>
                      <span className="text-[#64748B] dark:text-emerald-200/60">
                        / {m.target}g
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200/70 dark:bg-emerald-950 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${m.barGradient} transition-all duration-500 ease-out`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inline Exercise Logger */}
          {showExerciseForm && (
            <form
              onSubmit={handleExerciseSubmit}
              className="border-t border-emerald-100 dark:border-emerald-900/60 pt-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                  Tambah Aktivitas Olahraga
                </h3>
                <button
                  type="button"
                  onClick={() => setShowExerciseForm(false)}
                  className="text-xs text-[#64748B] dark:text-emerald-200/70 hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
                >
                  Tutup
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {EXERCISE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      exerciseName === preset.name
                        ? "border-[#10B981] bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                        : "border-emerald-100 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] text-[#64748B] dark:text-emerald-200/80 hover:bg-emerald-50/50"
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/80 mb-1">
                    Jenis Aktivitas
                  </label>
                  <input
                    type="text"
                    value={exerciseName}
                    onChange={(e) => setExerciseName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-sm text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/80 mb-1">
                    Durasi (menit)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={exerciseMinutes}
                    onChange={(e) => handleMinutesChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-sm font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/80 mb-1">
                    Kalori Keluar (kkal)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={2000}
                    value={exerciseKcal}
                    onChange={(e) => setExerciseKcal(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-sm font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-[11px] text-[#64748B] dark:text-emerald-200/70">
                  Dihitung otomatis memakai rumus MET × berat badan Anda ({latestWeight} kg).
                </span>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#0F172A] dark:bg-[#10B981] hover:opacity-90 text-white text-xs font-semibold cursor-pointer self-end"
                >
                  Simpan Olahraga
                </button>
              </div>
            </form>
          )}

          {/* Today's Exercises List */}
          {todayExercises.length > 0 && (
            <div className="border-t border-emerald-100 dark:border-emerald-900/60 pt-4 space-y-2">
              <div className="text-xs font-semibold text-[#64748B] dark:text-emerald-200/75">
                Olahraga Tercatat Hari Ini
              </div>
              <div className="divide-y divide-emerald-100/70 dark:divide-emerald-900/50">
                {todayExercises.map((ex) => (
                  <div
                    key={ex.id}
                    className="py-2 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Activity className="w-4 h-4 text-[#10B981] shrink-0" />
                      <span className="font-medium text-[#0F172A] dark:text-[#ECFDF5] truncate">
                        {ex.name}
                      </span>
                      <span className="text-xs text-[#64748B] dark:text-emerald-200/65 shrink-0">
                        · {ex.durationMinutes} mnt
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono tabular-nums font-semibold text-[#10B981] dark:text-[#34D399]">
                        -{ex.caloriesBurned} kkal
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteExercise(ex.id)}
                        aria-label={`Hapus ${ex.name}`}
                        className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Interactive Water Tracker Card */}
        <section className="lg:col-span-5 bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 flex flex-col justify-between space-y-5">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Droplets className="w-5 h-5" />
                  {rippleTick > 0 && (
                    <span
                      key={rippleTick}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-xl border-2 border-sky-400 animate-water-ripple pointer-events-none"
                    />
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                  Pelacak Air Minum
                </h2>
              </div>
              <span className="text-xs font-medium text-[#64748B] dark:text-emerald-200/75">
                Target {plan.waterTargetMl.toLocaleString("id-ID")} ml
              </span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-emerald-200/70">
              Disesuaikan untuk kategori {CATEGORY_MAP[profile.category].shortLabel}
              {profile.category === "postpartum" && profile.isBreastfeeding
                ? " (Menyusui)"
                : ""}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-white">
                  {todayWaterMl.toLocaleString("id-ID")}
                </span>
                <span className="text-sm text-[#64748B] dark:text-emerald-200/70 ml-1.5">
                  / {plan.waterTargetMl.toLocaleString("id-ID")} ml
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums font-semibold text-sky-600 dark:text-sky-400">
                {glassesCount} / {targetGlasses} gelas
              </span>
            </div>

            <div className="h-3.5 rounded-full bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500 ease-out"
                style={{ width: `${Math.round(waterRatio * 100)}%` }}
              />
            </div>

            {/* Interactive Visual Water Glasses */}
            <div className="grid grid-cols-6 gap-2.5 pt-1">
              {Array.from({ length: Math.min(12, targetGlasses) }).map((_, idx) => {
                const filled = idx < glassesCount;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleWaterTap(filled ? -250 : 250)}
                    aria-label={filled ? "Kurangi 1 gelas air" : "Tambah 1 gelas air"}
                    className={`relative h-11 rounded-xl border overflow-hidden flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      filled
                        ? "border-sky-400 dark:border-sky-500 text-white shadow-xs shadow-sky-500/20"
                        : "bg-[#F8FAFC] dark:bg-[#102A20] border-slate-200 dark:border-emerald-900 text-slate-400 dark:text-emerald-300/40 hover:border-sky-300"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-sky-500 to-cyan-400 transition-all duration-500 ease-out ${
                        filled ? "h-full opacity-100" : "h-0 opacity-0"
                      }`}
                    />
                    <Droplets className="w-4 h-4 relative z-10" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => handleWaterTap(-250)}
              disabled={todayWaterMl <= 0}
              className="h-11 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#102A20] hover:bg-slate-50 dark:hover:bg-[#143528] disabled:opacity-40 text-xs font-semibold text-[#0F172A] dark:text-[#ECFDF5] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>250 ml</span>
            </button>
            <button
              type="button"
              onClick={() => handleWaterTap(250)}
              className="relative overflow-hidden col-span-2 h-11 rounded-2xl bg-gradient-to-r from-[#0F172A] to-[#064E3B] dark:from-[#10B981] dark:to-[#34D399] hover:opacity-95 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/15 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+1 Gelas (250 ml)</span>
            </button>
          </div>
        </section>
      </div>

      {/* Secondary Row: Weight Tracker & Today's Meals Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Weight & Trend Chart */}
        <section className="lg:col-span-7 bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#10B981]" />
                <h2 className="text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                  Catatan Berat Badan Harian
                </h2>
              </div>
              <p className="text-xs text-[#64748B] dark:text-emerald-200/70 mt-0.5">
                Saat ini{" "}
                <strong className="font-mono tabular-nums text-[#0F172A] dark:text-white">
                  {latestWeight} kg
                </strong>{" "}
                · Target{" "}
                <strong className="font-mono tabular-nums text-[#10B981] dark:text-[#34D399]">
                  {profile.targetWeight} kg
                </strong>
              </p>
            </div>

            <form onSubmit={handleWeightSubmit} className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min={15}
                  max={250}
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  aria-label="Berat badan hari ini (kg)"
                  className="w-24 h-11 pl-3 pr-8 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-sm font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B] dark:text-emerald-200/65">
                  kg
                </span>
              </div>
              <button
                type="submit"
                className="h-11 px-4 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#10B981] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-sm shadow-emerald-500/20"
              >
                {weightSavedFeedback ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Tersimpan</span>
                  </>
                ) : (
                  <span>Catat Berat</span>
                )}
              </button>
            </form>
          </div>

          <WeightTrendChart
            entries={weightLogs}
            targetWeight={profile.targetWeight}
          />
        </section>

        {/* Today's Food Snapshot */}
        <section className="lg:col-span-5 bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-[#10B981]" />
                <h2 className="text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                  Makanan Hari Ini
                </h2>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#64748B] dark:text-emerald-200/70">
                {todayFoods.length} item
              </span>
            </div>

            {todayFoods.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-2xl bg-[#F8FAFC] dark:bg-[#102A20]/60 border border-dashed border-emerald-200 dark:border-emerald-800 space-y-2">
                <p className="text-sm font-medium text-[#0F172A] dark:text-[#ECFDF5]">
                  Belum ada makanan tercatat hari ini
                </p>
                <p className="text-xs text-[#64748B] dark:text-emerald-200/70">
                  Ketik menu makan Anda dan biarkan AI menghitung kalori serta makronutrisinya otomatis.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-emerald-100/70 dark:divide-emerald-900/50 max-h-56 overflow-y-auto pr-1">
                {todayFoods.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#0F172A] dark:text-[#ECFDF5] truncate">
                        {item.foodName}
                      </div>
                      <div className="text-xs text-[#64748B] dark:text-emerald-200/70 truncate">
                        {item.mealType.replace("_", " ")} · K {item.carbs}g · P{" "}
                        {item.protein}g · L {item.fat}g
                      </div>
                    </div>
                    <span className="text-sm font-mono tabular-nums font-semibold text-[#0F172A] dark:text-white shrink-0">
                      {item.calories} kkal
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("food")}
            className="w-full h-11 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] hover:bg-emerald-50 dark:hover:bg-[#143528] text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5] transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Buka Pencatat Makanan AI</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </div>

      {/* Daily Menu Consultant Chatbot (Warteg & Restaurant Menu Adjustment) */}
      <DailyMenuChatbot
        profile={profile}
        plan={plan}
        todayFoods={todayFoods}
        todaySummary={{
          caloriesIn,
          caloriesOut,
          remainingCalories,
          carbs: carbsIn,
          protein: proteinIn,
          fat: fatIn,
          waterMl: todayWaterMl,
        }}
        weeklyPlan={weeklyPlan}
        messages={consultMessages}
        onAppendMessages={onAppendConsultMessages}
        onResetChat={onResetConsultChat}
        onLogMealToToday={onAddFood}
      />
    </div>
  );
};
