import React, { useEffect, useMemo, useState } from "react";
import {
  BotMessageSquare,
  LayoutDashboard,
  Moon,
  Plus,
  SlidersHorizontal,
  Sun,
  UtensilsCrossed,
} from "lucide-react";
import { AiCoachView } from "./components/AiCoachView";
import { DashboardView } from "./components/DashboardView";
import { FoodLoggerView } from "./components/FoodLoggerView";
import { ProfileSetup } from "./components/ProfileSetup";
import type {
  AppTab,
  ChatMessage,
  ExerciseLogEntry,
  FoodLogEntry,
  UserProfile,
  WeightLogEntry,
} from "./types";
import {
  CATEGORY_MAP,
  calculateNutritionPlan,
  getTodayDateKey,
} from "./utils/nutrition";
import {
  type ThemeMode,
  loadCoachChats,
  loadExerciseLogs,
  loadFoodLogs,
  loadProfile,
  loadTheme,
  loadWaterLogs,
  loadWeightLogs,
  saveCoachChats,
  saveExerciseLogs,
  saveFoodLogs,
  saveProfile,
  saveTheme,
  saveWaterLogs,
  upsertTodayWeight,
} from "./utils/storage";

const NAV_ITEMS: Array<{
  id: AppTab;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "dashboard",
    label: "Dashboard Harian",
    mobileLabel: "Beranda",
    icon: LayoutDashboard,
  },
  {
    id: "food",
    label: "Catat Makanan",
    mobileLabel: "Makanan",
    icon: UtensilsCrossed,
  },
  {
    id: "coach",
    label: "Pelatih AI",
    mobileLabel: "Pelatih",
    icon: BotMessageSquare,
  },
  {
    id: "profile",
    label: "Profil & Target",
    mobileLabel: "Profil",
    icon: SlidersHorizontal,
  },
];

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [foodLogs, setFoodLogs] = useState<FoodLogEntry[]>(() => loadFoodLogs());
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLogEntry[]>(() =>
    loadExerciseLogs()
  );
  const [waterLogs, setWaterLogs] = useState<Record<string, number>>(() =>
    loadWaterLogs()
  );
  const [weightLogs, setWeightLogs] = useState<WeightLogEntry[]>(() =>
    loadWeightLogs()
  );
  const [coachChats, setCoachChats] = useState<Record<string, ChatMessage[]>>(() =>
    loadCoachChats()
  );
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const plan = useMemo(() => {
    if (!profile) return null;
    return calculateNutritionPlan(profile);
  }, [profile]);

  const handleSaveProfile = (nextProfile: UserProfile) => {
    saveProfile(nextProfile);
    setProfile(nextProfile);

    const todayKey = getTodayDateKey();
    const hasTodayWeight = weightLogs.some((w) => w.date === todayKey);
    if (!hasTodayWeight || weightLogs.length === 0) {
      const updatedWeights = upsertTodayWeight(
        weightLogs,
        nextProfile.currentWeight,
        todayKey
      );
      setWeightLogs(updatedWeights);
    }

    if (!profile) {
      setActiveTab("dashboard");
    }
  };

  const handleAddWater = (deltaMl: number) => {
    const todayKey = getTodayDateKey();
    const current = waterLogs[todayKey] ?? 0;
    const nextVal = Math.max(0, current + deltaMl);
    const nextLogs = { ...waterLogs, [todayKey]: nextVal };
    setWaterLogs(nextLogs);
    saveWaterLogs(nextLogs);
  };

  const handleLogWeight = (weightKg: number) => {
    const updated = upsertTodayWeight(weightLogs, weightKg, getTodayDateKey());
    setWeightLogs(updated);
    if (profile) {
      const nextProfile: UserProfile = {
        ...profile,
        currentWeight: weightKg,
        updatedAt: new Date().toISOString(),
      };
      setProfile(nextProfile);
      saveProfile(nextProfile);
    }
  };

  const handleAddFood = (entry: Omit<FoodLogEntry, "id" | "createdAt">) => {
    const newEntry: FoodLogEntry = {
      ...entry,
      id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const next = [newEntry, ...foodLogs];
    setFoodLogs(next);
    saveFoodLogs(next);
  };

  const handleDeleteFood = (id: string) => {
    const next = foodLogs.filter((item) => item.id !== id);
    setFoodLogs(next);
    saveFoodLogs(next);
  };

  const handleUpdateFood = (
    id: string,
    updates: Partial<Pick<FoodLogEntry, "portionNote" | "calories" | "carbs" | "protein" | "fat">>
  ) => {
    const next = foodLogs.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    setFoodLogs(next);
    saveFoodLogs(next);
  };

  const handleAddExercise = (entry: Omit<ExerciseLogEntry, "id" | "createdAt">) => {
    const newEntry: ExerciseLogEntry = {
      ...entry,
      id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const next = [newEntry, ...exerciseLogs];
    setExerciseLogs(next);
    saveExerciseLogs(next);
  };

  const handleDeleteExercise = (id: string) => {
    const next = exerciseLogs.filter((item) => item.id !== id);
    setExerciseLogs(next);
    saveExerciseLogs(next);
  };

  const handleAppendCoachMessages = (newMsgs: ChatMessage[]) => {
    if (!profile) return;
    const catKey = profile.category;
    const existing = coachChats[catKey] ?? [];
    const nextChats = {
      ...coachChats,
      [catKey]: [...existing, ...newMsgs],
    };
    setCoachChats(nextChats);
    saveCoachChats(nextChats);
  };

  const handleResetCoachChat = () => {
    if (!profile) return;
    const nextChats = {
      ...coachChats,
      [profile.category]: [],
    };
    setCoachChats(nextChats);
    saveCoachChats(nextChats);
  };

  if (!profile || !plan) {
    return (
      <ProfileSetup
        initialProfile={null}
        isOnboarding={true}
        onSave={handleSaveProfile}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  const activeChatMessages = coachChats[profile.category] ?? [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#06130E] text-[#0F172A] dark:text-[#ECFDF5] flex flex-col lg:flex-row transition-colors duration-200">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:justify-between bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border-r border-emerald-100 dark:border-emerald-900/60 sticky top-0 h-screen p-5">
        <div className="space-y-8">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#10B981] to-[#34D399] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-500/20">
                NH
              </div>
              <span className="text-lg font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5] whitespace-nowrap">
                NutriHijau
              </span>
            </div>
          </div>

          <nav className="space-y-1.5" aria-label="Navigasi utama">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full h-11 px-3.5 rounded-2xl flex items-center gap-3 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-gradient-to-r from-[#10B981] to-[#34D399] text-white font-semibold shadow-md shadow-emerald-500/20"
                      : "text-[#475569] dark:text-emerald-200/75 hover:bg-emerald-50/70 dark:hover:bg-[#102A20] hover:text-[#0F172A] dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Active Profile Summary & Theme Toggle in Sidebar */}
        <div className="space-y-4 border-t border-emerald-100 dark:border-emerald-900/60 pt-4 px-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full h-10 px-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] hover:bg-emerald-50 dark:hover:bg-[#143528] text-xs font-semibold text-[#0F172A] dark:text-[#ECFDF5] flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>{theme === "dark" ? "Mode Terang" : "Mode Gelap Emerald"}</span>
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-emerald-700" />
            )}
          </button>

          <div className="space-y-0.5 px-1">
            <div className="text-xs font-semibold text-[#10B981] dark:text-[#34D399]">
              Mode: {CATEGORY_MAP[profile.category].shortLabel}
            </div>
            <div className="text-xs text-[#64748B] dark:text-emerald-200/70 font-mono tabular-nums">
              Target {plan.dailyCalorieTarget.toLocaleString("id-ID")} kkal · BMI{" "}
              {plan.bmi.toFixed(1)}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Compact Top Header (48px) */}
      <header className="lg:hidden sticky top-0 z-30 h-12 bg-white/90 dark:bg-[#0B1F17]/90 backdrop-blur-md border-b border-emerald-100 dark:border-emerald-900/60 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#10B981] to-[#34D399] text-white flex items-center justify-center font-bold text-xs">
            NH
          </div>
          <span className="text-sm font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5]">
            NutriHijau
          </span>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold text-[#10B981] dark:text-[#34D399] truncate">
            {CATEGORY_MAP[profile.category].shortLabel}
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Ganti mode terang atau gelap"
            className="w-9 h-9 rounded-xl border border-emerald-200/80 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] flex items-center justify-center shrink-0 cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-emerald-700" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 pb-24 lg:pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
          {activeTab === "dashboard" && (
            <DashboardView
              profile={profile}
              plan={plan}
              foodLogs={foodLogs}
              exerciseLogs={exerciseLogs}
              waterLogs={waterLogs}
              weightLogs={weightLogs}
              onAddWater={handleAddWater}
              onLogWeight={handleLogWeight}
              onAddExercise={handleAddExercise}
              onDeleteExercise={handleDeleteExercise}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === "food" && (
            <FoodLoggerView
              profile={profile}
              foodLogs={foodLogs}
              dailyCalorieTarget={plan.dailyCalorieTarget}
              onAddFood={handleAddFood}
              onUpdateFood={handleUpdateFood}
              onDeleteFood={handleDeleteFood}
            />
          )}

          {activeTab === "coach" && (
            <AiCoachView
              profile={profile}
              plan={plan}
              foodLogs={foodLogs}
              exerciseLogs={exerciseLogs}
              waterLogs={waterLogs}
              messages={activeChatMessages}
              onAppendMessages={handleAppendCoachMessages}
              onResetChat={handleResetCoachChat}
            />
          )}

          {activeTab === "profile" && (
            <ProfileSetup
              initialProfile={profile}
              isOnboarding={false}
              onSave={handleSaveProfile}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          )}
        </div>
      </main>

      {/* Mobile Floating Glassmorphic Bottom Bar with Center Quick Action */}
      <nav
        className="lg:hidden fixed bottom-2.5 left-3 right-3 z-40 h-14 rounded-2xl bg-white/90 dark:bg-[#0B1F17]/90 backdrop-blur-xl border border-emerald-200/80 dark:border-emerald-800/70 shadow-xl shadow-emerald-950/15 dark:shadow-black/50 grid grid-cols-5 items-center px-1.5"
        aria-label="Navigasi mengambang bawah"
      >
        <button
          type="button"
          onClick={() => setActiveTab("dashboard")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === "dashboard"
              ? "text-[#10B981] dark:text-[#34D399] font-semibold"
              : "text-[#64748B] dark:text-emerald-200/70"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] leading-none whitespace-nowrap">Beranda</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("food")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === "food"
              ? "text-[#10B981] dark:text-[#34D399] font-semibold"
              : "text-[#64748B] dark:text-emerald-200/70"
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span className="text-[10px] leading-none whitespace-nowrap">Makanan</span>
        </button>

        {/* Center Quick Action Button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => setActiveTab("food")}
            aria-label="Catat makanan cepat"
            className="w-11 h-11 -mt-4 rounded-2xl bg-gradient-to-br from-[#10B981] via-[#34D399] to-[#84CC16] text-[#062216] shadow-lg shadow-emerald-500/35 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab("coach")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === "coach"
              ? "text-[#10B981] dark:text-[#34D399] font-semibold"
              : "text-[#64748B] dark:text-emerald-200/70"
          }`}
        >
          <BotMessageSquare className="w-4 h-4" />
          <span className="text-[10px] leading-none whitespace-nowrap">Pelatih</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === "profile"
              ? "text-[#10B981] dark:text-[#34D399] font-semibold"
              : "text-[#64748B] dark:text-emerald-200/70"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-[10px] leading-none whitespace-nowrap">Profil</span>
        </button>
      </nav>
    </div>
  );
}
