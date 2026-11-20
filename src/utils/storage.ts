import type {
  ChatMessage,
  ExerciseLogEntry,
  FamilyRelationRole,
  FamilyStore,
  FoodLogEntry,
  MemberNutritionData,
  UserProfile,
  WeeklyMealPlan,
  WeightLogEntry,
} from "../types";
import { getTodayDateKey, inferDefaultNutritionFocus } from "./nutrition";

const LEGACY_KEYS = {
  PROFILE: "nutrihijau_profile_v1",
  FOOD_LOGS: "nutrihijau_food_logs_v1",
  EXERCISE_LOGS: "nutrihijau_exercise_logs_v1",
  WATER_LOGS: "nutrihijau_water_logs_v1",
  WEIGHT_LOGS: "nutrihijau_weight_logs_v1",
  COACH_CHATS: "nutrihijau_coach_chats_v1",
  WEEKLY_PLAN: "nutrihijau_weekly_plan_v1",
};

const STORE_KEY = "nutrihijau_family_store_v2";
const THEME_KEY = "nutrihijau_theme_v1";

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors silently
  }
}

export function createEmptyMemberData(): MemberNutritionData {
  return {
    foodLogs: [],
    exerciseLogs: [],
    waterLogs: {},
    weightLogs: [],
    coachChats: {},
    dailyConsultChats: [],
    weeklyPlan: null,
  };
}

function inferRoleFromLegacyProfile(p: Partial<UserProfile>): FamilyRelationRole {
  if (p.category === "postpartum") return "ibu";
  if (p.category === "child_teen") {
    return (p.age ?? 10) >= 13 ? "remaja" : "anak";
  }
  if ((p.age ?? 30) >= 60) return "lansia";
  if (p.category === "adult_male") return "ayah";
  return "ibu";
}

function normalizeMemberProfile(raw: Partial<UserProfile>, fallbackId: string): UserProfile {
  const category = raw.category ?? "adult_female";
  const currentWeight = Number(raw.currentWeight) || 60;
  const targetWeight = Number(raw.targetWeight) || currentWeight;
  return {
    id: raw.id || fallbackId,
    name: raw.name || "Sahabat Sehat",
    relationRole: raw.relationRole || inferRoleFromLegacyProfile(raw),
    category,
    nutritionFocus:
      raw.nutritionFocus ||
      inferDefaultNutritionFocus(category, currentWeight, targetWeight),
    gender: raw.gender ?? (category === "adult_male" ? "male" : "female"),
    age: Number(raw.age) || 28,
    currentWeight,
    height: Number(raw.height) || 160,
    targetWeight,
    activityLevel: raw.activityLevel ?? "light",
    isBreastfeeding: Boolean(raw.isBreastfeeding),
    lactationStage: raw.lactationStage,
    medicalNotes: raw.medicalNotes,
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function loadFamilyStore(): FamilyStore {
  const existingV2 = safeRead<FamilyStore | null>(STORE_KEY, null);
  if (existingV2 && Array.isArray(existingV2.members)) {
    const normalizedMembers = existingV2.members.map((m, idx) =>
      normalizeMemberProfile(m, `member_${idx + 1}`)
    );
    const activeMemberId =
      existingV2.activeMemberId &&
      normalizedMembers.some((m) => m.id === existingV2.activeMemberId)
        ? existingV2.activeMemberId
        : normalizedMembers[0]?.id ?? null;

    const memberData: Record<string, MemberNutritionData> = {};
    normalizedMembers.forEach((m) => {
      const data = existingV2.memberData?.[m.id];
      const normalizedCoachChats: Record<string, ChatMessage[]> = {};
      if (data?.coachChats && typeof data.coachChats === "object") {
        for (const [k, list] of Object.entries(data.coachChats)) {
          if (Array.isArray(list)) {
            normalizedCoachChats[k] = list.slice(-40);
          }
        }
      }
      memberData[m.id] = {
        foodLogs: Array.isArray(data?.foodLogs) ? data.foodLogs : [],
        exerciseLogs: Array.isArray(data?.exerciseLogs) ? data.exerciseLogs : [],
        waterLogs: data?.waterLogs && typeof data.waterLogs === "object" ? data.waterLogs : {},
        weightLogs: Array.isArray(data?.weightLogs) ? data.weightLogs : [],
        coachChats: normalizedCoachChats,
        dailyConsultChats: Array.isArray(data?.dailyConsultChats)
          ? data.dailyConsultChats.slice(-40)
          : [],
        weeklyPlan: data?.weeklyPlan ?? null,
      };
    });

    return {
      familyName: existingV2.familyName || "Keluarga Sehat",
      activeMemberId,
      members: normalizedMembers,
      memberData,
      familyWeeklyPlan: existingV2.familyWeeklyPlan ?? null,
    };
  }

  // Migrate legacy single-user v1 store if present
  const legacyProfile = safeRead<Partial<UserProfile> | null>(LEGACY_KEYS.PROFILE, null);
  if (legacyProfile) {
    const primaryId = "member_primary";
    const migratedMember = normalizeMemberProfile(legacyProfile, primaryId);
    const legacyFoods = safeRead<FoodLogEntry[]>(LEGACY_KEYS.FOOD_LOGS, []);
    const legacyExercises = safeRead<ExerciseLogEntry[]>(LEGACY_KEYS.EXERCISE_LOGS, []);
    const legacyWater = safeRead<Record<string, number>>(LEGACY_KEYS.WATER_LOGS, {});
    const legacyWeights = safeRead<WeightLogEntry[]>(LEGACY_KEYS.WEIGHT_LOGS, []);
    const legacyChats = safeRead<Record<string, ChatMessage[]>>(LEGACY_KEYS.COACH_CHATS, {});
    const legacyPlan = safeRead<WeeklyMealPlan | null>(LEGACY_KEYS.WEEKLY_PLAN, null);

    const migratedStore: FamilyStore = {
      familyName: "Keluarga Sehat",
      activeMemberId: primaryId,
      members: [migratedMember],
      memberData: {
        [primaryId]: {
          foodLogs: legacyFoods,
          exerciseLogs: legacyExercises,
          waterLogs: legacyWater,
          weightLogs: legacyWeights,
          coachChats: legacyChats,
          weeklyPlan: legacyPlan,
        },
      },
      familyWeeklyPlan: null,
    };
    saveFamilyStore(migratedStore);
    return migratedStore;
  }

  return {
    familyName: "Keluarga Sehat",
    activeMemberId: null,
    members: [],
    memberData: {},
    familyWeeklyPlan: null,
  };
}

export function saveFamilyStore(store: FamilyStore): void {
  safeWrite(STORE_KEY, store);
}

export function upsertWeightEntry(
  existing: WeightLogEntry[],
  weightKg: number,
  dateKey = getTodayDateKey()
): WeightLogEntry[] {
  const now = new Date().toISOString();
  const filtered = existing.filter((entry) => entry.date !== dateKey);
  return [...filtered, { date: dateKey, weightKg, updatedAt: now }].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

export type ThemeMode = "light" | "dark";

export function loadTheme(): ThemeMode {
  const stored = safeRead<string | null>(THEME_KEY, null);
  return stored === "dark" ? "dark" : "light";
}

export function saveTheme(theme: ThemeMode): void {
  safeWrite(THEME_KEY, theme);
}
