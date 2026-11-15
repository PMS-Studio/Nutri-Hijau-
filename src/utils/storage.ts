import type {
  ChatMessage,
  ExerciseLogEntry,
  FoodLogEntry,
  UserProfile,
  WeightLogEntry,
} from "../types";
import { getTodayDateKey } from "./nutrition";

const KEYS = {
  PROFILE: "nutrihijau_profile_v1",
  FOOD_LOGS: "nutrihijau_food_logs_v1",
  EXERCISE_LOGS: "nutrihijau_exercise_logs_v1",
  WATER_LOGS: "nutrihijau_water_logs_v1",
  WEIGHT_LOGS: "nutrihijau_weight_logs_v1",
  COACH_CHATS: "nutrihijau_coach_chats_v1",
  THEME: "nutrihijau_theme_v1",
};

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

export function loadProfile(): UserProfile | null {
  return safeRead<UserProfile | null>(KEYS.PROFILE, null);
}

export function saveProfile(profile: UserProfile): void {
  safeWrite(KEYS.PROFILE, profile);
}

export function loadFoodLogs(): FoodLogEntry[] {
  return safeRead<FoodLogEntry[]>(KEYS.FOOD_LOGS, []);
}

export function saveFoodLogs(logs: FoodLogEntry[]): void {
  safeWrite(KEYS.FOOD_LOGS, logs);
}

export function loadExerciseLogs(): ExerciseLogEntry[] {
  return safeRead<ExerciseLogEntry[]>(KEYS.EXERCISE_LOGS, []);
}

export function saveExerciseLogs(logs: ExerciseLogEntry[]): void {
  safeWrite(KEYS.EXERCISE_LOGS, logs);
}

export function loadWaterLogs(): Record<string, number> {
  return safeRead<Record<string, number>>(KEYS.WATER_LOGS, {});
}

export function saveWaterLogs(logs: Record<string, number>): void {
  safeWrite(KEYS.WATER_LOGS, logs);
}

export function loadWeightLogs(): WeightLogEntry[] {
  return safeRead<WeightLogEntry[]>(KEYS.WEIGHT_LOGS, []);
}

export function saveWeightLogs(logs: WeightLogEntry[]): void {
  safeWrite(KEYS.WEIGHT_LOGS, logs);
}

export function upsertTodayWeight(
  existing: WeightLogEntry[],
  weightKg: number,
  dateKey = getTodayDateKey()
): WeightLogEntry[] {
  const now = new Date().toISOString();
  const filtered = existing.filter((entry) => entry.date !== dateKey);
  const next = [...filtered, { date: dateKey, weightKg, updatedAt: now }].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  saveWeightLogs(next);
  return next;
}

export function loadCoachChats(): Record<string, ChatMessage[]> {
  return safeRead<Record<string, ChatMessage[]>>(KEYS.COACH_CHATS, {});
}

export function saveCoachChats(chats: Record<string, ChatMessage[]>): void {
  safeWrite(KEYS.COACH_CHATS, chats);
}

export type ThemeMode = "light" | "dark";

export function loadTheme(): ThemeMode {
  const stored = safeRead<string | null>(KEYS.THEME, null);
  return stored === "dark" ? "dark" : "light";
}

export function saveTheme(theme: ThemeMode): void {
  safeWrite(KEYS.THEME, theme);
}
