import React, { useEffect, useMemo, useState } from "react";
import {
  BotMessageSquare,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  Moon,
  Plus,
  SlidersHorizontal,
  Sun,
  UtensilsCrossed,
} from "lucide-react";
import { AiCoachView } from "./components/AiCoachView";
import {
  BRAND_NAME,
  BRAND_PILLARS,
  BRAND_TAGLINE,
  BrandMark,
} from "./components/BrandMark";
import { DashboardView } from "./components/DashboardView";
import { FamilyHubView } from "./components/FamilyHubView";
import { FoodLoggerView } from "./components/FoodLoggerView";
import { MealPlanView } from "./components/MealPlanView";
import { ProfileSetup } from "./components/ProfileSetup";
import type {
  AppTab,
  ChatMessage,
  ExerciseLogEntry,
  FamilyStore,
  FamilyWeeklyMealPlan,
  FoodLogEntry,
  MemberNutritionData,
  UserProfile,
  WeeklyMealPlan,
} from "./types";
import {
  FAMILY_ROLE_MAP,
  calculateNutritionPlan,
  getTodayDateKey,
} from "./utils/nutrition";
import {
  type ThemeMode,
  createEmptyMemberData,
  loadFamilyStore,
  loadTheme,
  saveFamilyStore,
  saveTheme,
  upsertWeightEntry,
} from "./utils/storage";

const NAV_ITEMS: Array<{
  id: AppTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "dashboard", label: "Dashboard Harian", icon: LayoutDashboard },
  { id: "food", label: "Catat Makanan", icon: UtensilsCrossed },
  { id: "mealplan", label: "Menu 7 Hari", icon: CalendarDays },
  { id: "coach", label: "Pelatih AI", icon: BotMessageSquare },
  { id: "profile", label: "Profil & Target", icon: SlidersHorizontal },
];

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [store, setStore] = useState<FamilyStore>(() => loadFamilyStore());
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  const [isAddingMember, setIsAddingMember] = useState<boolean>(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [openFamilyInProfile, setOpenFamilyInProfile] = useState<boolean>(false);
  const [mealPlanPreferredScope, setMealPlanPreferredScope] = useState<
    "personal" | "family"
  >("personal");

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

  const commitStore = (updater: (prev: FamilyStore) => FamilyStore) => {
    setStore((prev) => {
      const next = updater(prev);
      saveFamilyStore(next);
      return next;
    });
  };

  const activeMember = useMemo(() => {
    if (store.members.length === 0) return null;
    return (
      store.members.find((m) => m.id === store.activeMemberId) ?? store.members[0]
    );
  }, [store.members, store.activeMemberId]);

  const activeMemberData: MemberNutritionData = useMemo(() => {
    if (!activeMember) return createEmptyMemberData();
    return store.memberData[activeMember.id] ?? createEmptyMemberData();
  }, [activeMember, store.memberData]);

  const plan = useMemo(() => {
    if (!activeMember) return null;
    return calculateNutritionPlan(activeMember);
  }, [activeMember]);

  const updateActiveMemberData = (
    updater: (prev: MemberNutritionData) => MemberNutritionData
  ) => {
    if (!activeMember) return;
    const memberId = activeMember.id;
    commitStore((prev) => {
      const currentData = prev.memberData[memberId] ?? createEmptyMemberData();
      return {
        ...prev,
        memberData: {
          ...prev.memberData,
          [memberId]: updater(currentData),
        },
      };
    });
  };

  const handleOnboardingSave = (nextProfile: UserProfile, nextFamilyName?: string) => {
    const todayKey = getTodayDateKey();
    commitStore((prev) => ({
      ...prev,
      familyName: nextFamilyName || prev.familyName || "Keluarga Sehat",
      activeMemberId: nextProfile.id,
      members: [nextProfile],
      memberData: {
        [nextProfile.id]: {
          ...createEmptyMemberData(),
          weightLogs: upsertWeightEntry([], nextProfile.currentWeight, todayKey),
        },
      },
    }));
    setActiveTab("dashboard");
  };

  const handleOnboardingFamilySave = (
    nextFamilyName: string,
    members: UserProfile[]
  ) => {
    if (members.length === 0) return;
    const todayKey = getTodayDateKey();
    const nextMemberData: Record<string, MemberNutritionData> = {};
    for (const member of members) {
      nextMemberData[member.id] = {
        ...createEmptyMemberData(),
        weightLogs: upsertWeightEntry([], member.currentWeight, todayKey),
      };
    }
    commitStore((prev) => ({
      ...prev,
      familyName: nextFamilyName.trim() || prev.familyName || "Keluarga Sehat",
      activeMemberId: members[0].id,
      members,
      memberData: nextMemberData,
      familyWeeklyPlan: null,
    }));
    setOpenFamilyInProfile(false);
    setActiveTab("dashboard");
  };

  const handleSaveNewMember = (nextProfile: UserProfile) => {
    const todayKey = getTodayDateKey();
    commitStore((prev) => ({
      ...prev,
      activeMemberId: nextProfile.id,
      members: [...prev.members, nextProfile],
      memberData: {
        ...prev.memberData,
        [nextProfile.id]: {
          ...createEmptyMemberData(),
          weightLogs: upsertWeightEntry([], nextProfile.currentWeight, todayKey),
        },
      },
    }));
    setIsAddingMember(false);
    setOpenFamilyInProfile(true);
    setActiveTab("profile");
  };

  const handleSaveEditedMember = (nextProfile: UserProfile) => {
    const todayKey = getTodayDateKey();
    commitStore((prev) => {
      const existingMember = prev.members.find((m) => m.id === nextProfile.id);
      const currentData = prev.memberData[nextProfile.id] ?? createEmptyMemberData();
      const hasTodayWeight = currentData.weightLogs.some((w) => w.date === todayKey);
      const weightChanged =
        existingMember && existingMember.currentWeight !== nextProfile.currentWeight;

      const updatedWeights =
        !hasTodayWeight || currentData.weightLogs.length === 0 || weightChanged
          ? upsertWeightEntry(currentData.weightLogs, nextProfile.currentWeight, todayKey)
          : currentData.weightLogs;

      return {
        ...prev,
        members: prev.members.map((m) =>
          m.id === nextProfile.id ? nextProfile : m
        ),
        memberData: {
          ...prev.memberData,
          [nextProfile.id]: {
            ...currentData,
            weightLogs: updatedWeights,
          },
        },
      };
    });
    if (editingMemberId) {
      setEditingMemberId(null);
      setOpenFamilyInProfile(true);
      setActiveTab("profile");
    }
  };

  const handleSelectMember = (memberId: string, navigateToTab?: AppTab) => {
    commitStore((prev) => ({
      ...prev,
      activeMemberId: memberId,
    }));
    setIsAddingMember(false);
    setEditingMemberId(null);
    if (navigateToTab) {
      setActiveTab(navigateToTab);
    }
  };

  const handleDeleteMember = (memberId: string) => {
    commitStore((prev) => {
      if (prev.members.length <= 1) return prev;
      const nextMembers = prev.members.filter((m) => m.id !== memberId);
      const nextMemberData = { ...prev.memberData };
      delete nextMemberData[memberId];
      const nextActive =
        prev.activeMemberId === memberId
          ? nextMembers[0]?.id ?? null
          : prev.activeMemberId;
      return {
        ...prev,
        activeMemberId: nextActive,
        members: nextMembers,
        memberData: nextMemberData,
      };
    });
  };

  const handleUpdateFamilyName = (nextName: string) => {
    commitStore((prev) => ({
      ...prev,
      familyName: nextName,
    }));
  };

  const handleResetToOnboarding = () => {
    commitStore(() => ({
      familyName: "Keluarga Sehat",
      activeMemberId: null,
      members: [],
      memberData: {},
      familyWeeklyPlan: null,
    }));
    setIsAddingMember(false);
    setEditingMemberId(null);
    setOpenFamilyInProfile(false);
    setActiveTab("dashboard");
  };

  const handleAddWater = (deltaMl: number) => {
    const todayKey = getTodayDateKey();
    updateActiveMemberData((data) => {
      const current = data.waterLogs[todayKey] ?? 0;
      const nextVal = Math.max(0, current + deltaMl);
      return {
        ...data,
        waterLogs: { ...data.waterLogs, [todayKey]: nextVal },
      };
    });
  };

  const handleLogWeight = (weightKg: number) => {
    if (!activeMember) return;
    const todayKey = getTodayDateKey();
    const memberId = activeMember.id;
    commitStore((prev) => {
      const data = prev.memberData[memberId] ?? createEmptyMemberData();
      const updatedWeights = upsertWeightEntry(data.weightLogs, weightKg, todayKey);
      return {
        ...prev,
        members: prev.members.map((m) =>
          m.id === memberId
            ? { ...m, currentWeight: weightKg, updatedAt: new Date().toISOString() }
            : m
        ),
        memberData: {
          ...prev.memberData,
          [memberId]: {
            ...data,
            weightLogs: updatedWeights,
          },
        },
      };
    });
  };

  const handleAddFood = (entry: Omit<FoodLogEntry, "id" | "createdAt">) => {
    const newEntry: FoodLogEntry = {
      ...entry,
      id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    updateActiveMemberData((data) => ({
      ...data,
      foodLogs: [newEntry, ...data.foodLogs],
    }));
  };

  const handleDeleteFood = (id: string) => {
    updateActiveMemberData((data) => ({
      ...data,
      foodLogs: data.foodLogs.filter((item) => item.id !== id),
    }));
  };

  const handleUpdateFood = (
    id: string,
    updates: Partial<
      Pick<FoodLogEntry, "portionNote" | "calories" | "carbs" | "protein" | "fat">
    >
  ) => {
    updateActiveMemberData((data) => ({
      ...data,
      foodLogs: data.foodLogs.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  };

  const handleAddExercise = (entry: Omit<ExerciseLogEntry, "id" | "createdAt">) => {
    const newEntry: ExerciseLogEntry = {
      ...entry,
      id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    updateActiveMemberData((data) => ({
      ...data,
      exerciseLogs: [newEntry, ...data.exerciseLogs],
    }));
  };

  const handleDeleteExercise = (id: string) => {
    updateActiveMemberData((data) => ({
      ...data,
      exerciseLogs: data.exerciseLogs.filter((item) => item.id !== id),
    }));
  };

  const handleAppendCoachMessages = (newMsgs: ChatMessage[]) => {
    if (!activeMember) return;
    const catKey = activeMember.category;
    updateActiveMemberData((data) => {
      const existing = data.coachChats[catKey] ?? [];
      return {
        ...data,
        coachChats: {
          ...data.coachChats,
          [catKey]: [...existing, ...newMsgs],
        },
      };
    });
  };

  const handleResetCoachChat = () => {
    if (!activeMember) return;
    const catKey = activeMember.category;
    updateActiveMemberData((data) => ({
      ...data,
      coachChats: {
        ...data.coachChats,
        [catKey]: [],
      },
    }));
  };

  const handleAppendConsultMessages = (newMsgs: ChatMessage[]) => {
    updateActiveMemberData((data) => ({
      ...data,
      dailyConsultChats: [...(data.dailyConsultChats ?? []), ...newMsgs],
    }));
  };

  const handleResetConsultChat = () => {
    updateActiveMemberData((data) => ({
      ...data,
      dailyConsultChats: [],
    }));
  };

  const handleSaveWeeklyPlan = (nextPlan: WeeklyMealPlan | null) => {
    updateActiveMemberData((data) => ({
      ...data,
      weeklyPlan: nextPlan,
    }));
  };

  const handleToggleShoppingItem = (itemKey: string) => {
    updateActiveMemberData((data) => {
      if (!data.weeklyPlan) return data;
      const exists = data.weeklyPlan.checkedShoppingItems.includes(itemKey);
      const nextChecked = exists
        ? data.weeklyPlan.checkedShoppingItems.filter((k) => k !== itemKey)
        : [...data.weeklyPlan.checkedShoppingItems, itemKey];
      return {
        ...data,
        weeklyPlan: {
          ...data.weeklyPlan,
          checkedShoppingItems: nextChecked,
        },
      };
    });
  };

  const handleSaveFamilyWeeklyPlan = (nextPlan: FamilyWeeklyMealPlan | null) => {
    commitStore((prev) => ({
      ...prev,
      familyWeeklyPlan: nextPlan,
    }));
  };

  const handleToggleFamilyShoppingItem = (itemKey: string) => {
    commitStore((prev) => {
      if (!prev.familyWeeklyPlan) return prev;
      const exists = prev.familyWeeklyPlan.checkedShoppingItems.includes(itemKey);
      const nextChecked = exists
        ? prev.familyWeeklyPlan.checkedShoppingItems.filter((k) => k !== itemKey)
        : [...prev.familyWeeklyPlan.checkedShoppingItems, itemKey];
      return {
        ...prev,
        familyWeeklyPlan: {
          ...prev.familyWeeklyPlan,
          checkedShoppingItems: nextChecked,
        },
      };
    });
  };

  if (!activeMember || !plan) {
    return (
      <ProfileSetup
        initialProfile={null}
        mode="onboarding"
        initialFamilyName={store.familyName}
        onSave={handleOnboardingSave}
        onSaveFamilyOnboarding={handleOnboardingFamilySave}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  const editingTargetMember = editingMemberId
    ? store.members.find((m) => m.id === editingMemberId) ?? null
    : null;

  const activeChatMessages =
    activeMemberData.coachChats[activeMember.category] ?? [];

  const activeConsultMessages = activeMemberData.dailyConsultChats ?? [];

  const todayKey = getTodayDateKey();
  const todayFoods = activeMemberData.foodLogs.filter((f) => f.date === todayKey);
  const todayExercises = activeMemberData.exerciseLogs.filter((e) => e.date === todayKey);
  const todayCaloriesIn = todayFoods.reduce((sum, f) => sum + f.calories, 0);
  const todayCaloriesOut = todayExercises.reduce((sum, e) => sum + e.caloriesBurned, 0);
  const todaySummaryForConsult = {
    caloriesIn: todayCaloriesIn,
    caloriesOut: todayCaloriesOut,
    remainingCalories: plan.dailyCalorieTarget - todayCaloriesIn,
    carbs: Math.round(todayFoods.reduce((sum, f) => sum + f.carbs, 0)),
    protein: Math.round(todayFoods.reduce((sum, f) => sum + f.protein, 0)),
    fat: Math.round(todayFoods.reduce((sum, f) => sum + f.fat, 0)),
    waterMl: activeMemberData.waterLogs[todayKey] ?? 0,
  };

  const handleTabSwitch = (tab: AppTab) => {
    setIsAddingMember(false);
    setEditingMemberId(null);
    setOpenFamilyInProfile(false);
    if (tab === "mealplan") {
      setMealPlanPreferredScope("personal");
    }
    setActiveTab(tab);
  };

  const handleOpenFamilyInsideProfile = () => {
    setIsAddingMember(false);
    setEditingMemberId(null);
    setOpenFamilyInProfile(true);
    setActiveTab("profile");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#06130E] text-[#0F172A] dark:text-[#ECFDF5] flex flex-col lg:flex-row transition-colors duration-200">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:justify-between bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border-r border-emerald-100 dark:border-emerald-900/60 sticky top-0 h-screen p-5">
        <div className="space-y-6">
          <div className="px-1 space-y-1.5">
            <div className="flex items-center gap-2.5">
              <BrandMark size="md" />
              <div className="min-w-0">
                <div className="text-lg font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5] whitespace-nowrap leading-tight">
                  {BRAND_NAME}
                </div>
                <div className="text-[11px] font-medium text-[#10B981] dark:text-[#34D399] leading-tight">
                  {BRAND_TAGLINE}
                </div>
              </div>
            </div>
          </div>

          {/* Active Family Member Switcher (only shown when household has multiple members) */}
          {store.members.length > 1 && (
            <div className="space-y-1.5">
              <div className="px-1 text-[11px] font-medium text-[#64748B] dark:text-emerald-200/70 truncate">
                {store.familyName}
              </div>
              <div className="relative">
                <select
                  value={activeMember.id}
                  onChange={(e) => handleSelectMember(e.target.value)}
                  aria-label="Pilih anggota keluarga aktif"
                  className="w-full h-10 pl-3 pr-8 rounded-xl border border-emerald-200/90 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] text-xs font-semibold text-[#0F172A] dark:text-white appearance-none focus:outline-none focus:border-[#10B981] cursor-pointer"
                >
                  {store.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({FAMILY_ROLE_MAP[m.relationRole]?.label ?? "Anggota"})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#64748B] dark:text-emerald-200/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          <nav className="space-y-1" aria-label="Navigasi utama">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && !isAddingMember && !editingMemberId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabSwitch(item.id)}
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
            <div className="text-xs font-semibold text-[#10B981] dark:text-[#34D399] truncate">
              {activeMember.name} · {FAMILY_ROLE_MAP[activeMember.relationRole]?.label ?? "Anggota"}
            </div>
            <div className="text-xs text-[#64748B] dark:text-emerald-200/70 font-mono tabular-nums">
              Target {plan.dailyCalorieTarget.toLocaleString("id-ID")} kkal · BMI{" "}
              {plan.bmi.toFixed(1)}
            </div>
            <div className="pt-2 text-[10px] tracking-wide text-[#64748B] dark:text-emerald-200/55">
              {BRAND_PILLARS}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Compact Top Header (48px) */}
      <header className="lg:hidden sticky top-0 z-30 h-12 bg-white/90 dark:bg-[#0B1F17]/90 backdrop-blur-md border-b border-emerald-100 dark:border-emerald-900/60 px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <BrandMark size="sm" />
          <span className="text-sm font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5] whitespace-nowrap shrink-0">
            {BRAND_NAME}
          </span>
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          {store.members.length > 1 && (
            <div className="relative max-w-[122px]">
              <select
                value={activeMember.id}
                onChange={(e) => handleSelectMember(e.target.value)}
                aria-label="Pilih anggota keluarga"
                className="h-8 pl-2.5 pr-6 rounded-xl border border-emerald-200/80 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] text-xs font-semibold text-emerald-700 dark:text-emerald-300 appearance-none truncate focus:outline-none cursor-pointer"
              >
                {store.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
          <button
            type="button"
            onClick={() => handleTabSwitch("profile")}
            aria-label="Menu pilih kategori profil"
            className={`h-8 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition-colors ${
              activeTab === "profile" && !isAddingMember && !editingMemberId
                ? "border-[#10B981] bg-[#10B981] text-white"
                : "border-emerald-200/80 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] text-[#0F172A] dark:text-[#ECFDF5]"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Profil</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Ganti mode terang atau gelap"
            className="w-8 h-8 rounded-xl border border-emerald-200/80 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] flex items-center justify-center shrink-0 cursor-pointer"
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
          {isAddingMember ? (
            <ProfileSetup
              initialProfile={null}
              mode="add"
              onSave={(prof) => handleSaveNewMember(prof)}
              onCancel={() => {
                setIsAddingMember(false);
                setOpenFamilyInProfile(true);
                setActiveTab("profile");
              }}
            />
          ) : editingTargetMember ? (
            <ProfileSetup
              key={editingTargetMember.id}
              initialProfile={editingTargetMember}
              mode="edit"
              initialFamilyName={store.familyName}
              existingFamilyMembers={store.members}
              onSave={(prof) => handleSaveEditedMember(prof)}
              onRequestAddMember={() => {
                setEditingMemberId(null);
                setIsAddingMember(true);
                setActiveTab("profile");
              }}
              onCancel={() => {
                setEditingMemberId(null);
                setOpenFamilyInProfile(true);
                setActiveTab("profile");
              }}
            />
          ) : (
            <>
              {activeTab === "dashboard" && (
                <DashboardView
                  profile={activeMember}
                  plan={plan}
                  foodLogs={activeMemberData.foodLogs}
                  exerciseLogs={activeMemberData.exerciseLogs}
                  waterLogs={activeMemberData.waterLogs}
                  weightLogs={activeMemberData.weightLogs}
                  familyMembers={store.members}
                  weeklyPlan={activeMemberData.weeklyPlan}
                  consultMessages={activeConsultMessages}
                  onAppendConsultMessages={handleAppendConsultMessages}
                  onResetConsultChat={handleResetConsultChat}
                  onAddFood={handleAddFood}
                  onSelectMember={(id) => handleSelectMember(id)}
                  onOpenFamilyManager={handleOpenFamilyInsideProfile}
                  onAddWater={handleAddWater}
                  onLogWeight={handleLogWeight}
                  onAddExercise={handleAddExercise}
                  onDeleteExercise={handleDeleteExercise}
                  onNavigateTab={handleTabSwitch}
                />
              )}

              {activeTab === "food" && (
                <FoodLoggerView
                  profile={activeMember}
                  foodLogs={activeMemberData.foodLogs}
                  dailyCalorieTarget={plan.dailyCalorieTarget}
                  onAddFood={handleAddFood}
                  onUpdateFood={handleUpdateFood}
                  onDeleteFood={handleDeleteFood}
                />
              )}

              {activeTab === "mealplan" && (
                <MealPlanView
                  key={activeMember.id}
                  profile={activeMember}
                  plan={plan}
                  weeklyPlan={activeMemberData.weeklyPlan}
                  todayFoods={todayFoods}
                  todaySummary={todaySummaryForConsult}
                  consultMessages={activeConsultMessages}
                  onAppendConsultMessages={handleAppendConsultMessages}
                  onResetConsultChat={handleResetConsultChat}
                  familyName={store.familyName}
                  familyMembers={store.members}
                  familyWeeklyPlan={store.familyWeeklyPlan}
                  preferredScope={mealPlanPreferredScope}
                  onSaveWeeklyPlan={handleSaveWeeklyPlan}
                  onToggleShoppingItem={handleToggleShoppingItem}
                  onSaveFamilyWeeklyPlan={handleSaveFamilyWeeklyPlan}
                  onToggleFamilyShoppingItem={handleToggleFamilyShoppingItem}
                  onLogMealToToday={handleAddFood}
                  onAddFamilyMember={() => {
                    setIsAddingMember(true);
                    setActiveTab("profile");
                  }}
                />
              )}

              {activeTab === "coach" && (
                <AiCoachView
                  profile={activeMember}
                  plan={plan}
                  foodLogs={activeMemberData.foodLogs}
                  exerciseLogs={activeMemberData.exerciseLogs}
                  waterLogs={activeMemberData.waterLogs}
                  familyName={store.familyName}
                  familyMembers={store.members}
                  messages={activeChatMessages}
                  onAppendMessages={handleAppendCoachMessages}
                  onResetChat={handleResetCoachChat}
                />
              )}

              {activeTab === "profile" && (
                <ProfileSetup
                  key={`${activeMember.id}_${openFamilyInProfile ? "fam" : "ind"}`}
                  initialProfile={activeMember}
                  mode="edit"
                  initialFamilyName={store.familyName}
                  existingFamilyMembers={store.members}
                  defaultChoice={openFamilyInProfile ? "family" : undefined}
                  onSave={(prof) => handleSaveEditedMember(prof)}
                  onRequestAddMember={() => {
                    setEditingMemberId(null);
                    setIsAddingMember(true);
                  }}
                  onResetToOnboarding={handleResetToOnboarding}
                  familyHubContent={
                    <FamilyHubView
                      familyName={store.familyName}
                      members={store.members}
                      activeMemberId={activeMember.id}
                      memberData={store.memberData}
                      onUpdateFamilyName={handleUpdateFamilyName}
                      onSelectMember={(id, tab) => handleSelectMember(id, tab)}
                      onAddNewMember={() => setIsAddingMember(true)}
                      onEditMember={(id) => setEditingMemberId(id)}
                      onDeleteMember={handleDeleteMember}
                      onOpenFamilyMealPlan={() => {
                        setMealPlanPreferredScope("family");
                        setActiveTab("mealplan");
                      }}
                    />
                  }
                />
              )}
            </>
          )}

          <footer className="mt-10 pt-5 border-t border-emerald-100/80 dark:border-emerald-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-xs text-[#64748B] dark:text-emerald-200/65">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                {BRAND_NAME}
              </span>
              <span aria-hidden="true">—</span>
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                {BRAND_TAGLINE}
              </span>
            </div>
            <div className="text-[11px] tracking-wide">{BRAND_PILLARS}</div>
          </footer>
        </div>
      </main>

      {/* Mobile Floating Glassmorphic Bottom Bar with Centered Catat Action (5 Tabs) */}
      <nav
        className="lg:hidden fixed bottom-2.5 left-3 right-3 z-40 h-14 rounded-2xl bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-xl border border-emerald-200/80 dark:border-emerald-800/70 shadow-xl shadow-emerald-950/15 dark:shadow-black/50 grid grid-cols-5 items-center px-1.5"
        aria-label="Navigasi mengambang bawah"
      >
        <button
          type="button"
          onClick={() => handleTabSwitch("dashboard")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === "dashboard" && !isAddingMember && !editingMemberId
              ? "text-[#10B981] dark:text-[#34D399] font-semibold"
              : "text-[#64748B] dark:text-emerald-200/70"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] leading-none whitespace-nowrap">Beranda</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch("mealplan")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === "mealplan" && !isAddingMember && !editingMemberId
              ? "text-[#10B981] dark:text-[#34D399] font-semibold"
              : "text-[#64748B] dark:text-emerald-200/70"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span className="text-[10px] leading-none whitespace-nowrap">Menu 7H</span>
        </button>

        {/* Center Quick Action Button -> Catat Makanan */}
        <div className="flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={() => handleTabSwitch("food")}
            aria-label="Catat makanan cepat"
            className={`w-10 h-10 -mt-3 rounded-2xl bg-gradient-to-br from-[#10B981] via-[#34D399] to-[#84CC16] text-[#062216] shadow-lg shadow-emerald-500/35 flex items-center justify-center active:scale-95 transition-transform cursor-pointer ${
              activeTab === "food" && !isAddingMember && !editingMemberId
                ? "ring-2 ring-[#0F172A] dark:ring-white"
                : ""
            }`}
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
          <span
            className={`text-[10px] leading-none mt-0.5 whitespace-nowrap ${
              activeTab === "food" && !isAddingMember && !editingMemberId
                ? "text-[#10B981] dark:text-[#34D399] font-semibold"
                : "text-[#64748B] dark:text-emerald-200/70"
            }`}
          >
            Catat
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleTabSwitch("coach")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === "coach" && !isAddingMember && !editingMemberId
              ? "text-[#10B981] dark:text-[#34D399] font-semibold"
              : "text-[#64748B] dark:text-emerald-200/70"
          }`}
        >
          <BotMessageSquare className="w-4 h-4" />
          <span className="text-[10px] leading-none whitespace-nowrap">Pelatih</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch("profile")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === "profile" || isAddingMember || Boolean(editingMemberId)
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
