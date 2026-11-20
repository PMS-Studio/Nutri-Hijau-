import React, { useMemo, useState } from "react";
import {
  Baby,
  CalendarDays,
  Check,
  Droplets,
  Pencil,
  Plus,
  Sprout,
  Trash2,
  User,
  UserCheck,
  Users,
  Utensils,
} from "lucide-react";
import type {
  AppTab,
  DietCategory,
  MemberNutritionData,
  UserProfile,
} from "../types";
import {
  CATEGORY_MAP,
  FAMILY_ROLE_MAP,
  NUTRITION_FOCUS_MAP,
  calculateNutritionPlan,
  getTodayDateKey,
} from "../utils/nutrition";

interface FamilyHubViewProps {
  familyName: string;
  members: UserProfile[];
  activeMemberId: string;
  memberData: Record<string, MemberNutritionData>;
  onUpdateFamilyName: (nextName: string) => void;
  onSelectMember: (memberId: string, navigateToTab?: AppTab) => void;
  onAddNewMember: () => void;
  onEditMember: (memberId: string) => void;
  onDeleteMember: (memberId: string) => void;
  onOpenFamilyMealPlan: () => void;
}

const ROLE_ICON_MAP: Record<
  DietCategory,
  React.ComponentType<{ className?: string }>
> = {
  postpartum: Baby,
  adult_female: User,
  adult_male: UserCheck,
  child_teen: Sprout,
};

export const FamilyHubView: React.FC<FamilyHubViewProps> = ({
  familyName,
  members,
  activeMemberId,
  memberData,
  onUpdateFamilyName,
  onSelectMember,
  onAddNewMember,
  onEditMember,
  onDeleteMember,
  onOpenFamilyMealPlan,
}) => {
  const todayKey = getTodayDateKey();
  const [editingFamilyName, setEditingFamilyName] = useState(false);
  const [familyNameDraft, setFamilyNameDraft] = useState(familyName);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const memberSnapshots = useMemo(() => {
    return members.map((member) => {
      const plan = calculateNutritionPlan(member);
      const data = memberData[member.id];
      const todayFoods = (data?.foodLogs ?? []).filter((f) => f.date === todayKey);
      const todayExercises = (data?.exerciseLogs ?? []).filter((e) => e.date === todayKey);
      const caloriesIn = todayFoods.reduce((sum, f) => sum + f.calories, 0);
      const caloriesOut = todayExercises.reduce((sum, e) => sum + e.caloriesBurned, 0);
      const proteinIn = Math.round(todayFoods.reduce((sum, f) => sum + f.protein, 0));
      const waterMl = data?.waterLogs?.[todayKey] ?? 0;
      const caloriePct = Math.round(
        (caloriesIn / Math.max(1, plan.dailyCalorieTarget)) * 100
      );
      const waterPct = Math.round((waterMl / Math.max(1, plan.waterTargetMl)) * 100);

      return {
        member,
        plan,
        caloriesIn,
        caloriesOut,
        proteinIn,
        waterMl,
        caloriePct,
        waterPct,
        foodCount: todayFoods.length,
      };
    });
  }, [members, memberData, todayKey]);

  const householdTotals = useMemo(() => {
    const count = memberSnapshots.length;
    const totalCaloriesTarget = memberSnapshots.reduce(
      (s, x) => s + x.plan.dailyCalorieTarget,
      0
    );
    const totalCaloriesIn = memberSnapshots.reduce((s, x) => s + x.caloriesIn, 0);
    const totalWaterMl = memberSnapshots.reduce((s, x) => s + x.waterMl, 0);
    const totalWaterTarget = memberSnapshots.reduce((s, x) => s + x.plan.waterTargetMl, 0);
    const avgCompletion =
      count > 0
        ? Math.round(
            memberSnapshots.reduce((s, x) => s + Math.min(100, x.caloriePct), 0) / count
          )
        : 0;
    const activeLoggedCount = memberSnapshots.filter(
      (x) => x.foodCount > 0 || x.waterMl > 0
    ).length;

    return {
      count,
      totalCaloriesTarget,
      totalCaloriesIn,
      totalWaterMl,
      totalWaterTarget,
      avgCompletion,
      activeLoggedCount,
    };
  }, [memberSnapshots]);

  const handleSaveFamilyName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = familyNameDraft.trim() || "Keluarga Sehat";
    onUpdateFamilyName(cleaned);
    setEditingFamilyName(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          {editingFamilyName ? (
            <form onSubmit={handleSaveFamilyName} className="flex items-center gap-2">
              <input
                type="text"
                value={familyNameDraft}
                onChange={(e) => setFamilyNameDraft(e.target.value)}
                aria-label="Nama keluarga"
                className="h-10 px-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-[#071610] text-base font-bold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                autoFocus
              />
              <button
                type="submit"
                className="h-10 px-3.5 rounded-xl bg-[#10B981] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5]">
                Profil Keluarga · {familyName}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setFamilyNameDraft(familyName);
                  setEditingFamilyName(true);
                }}
                aria-label="Ubah nama keluarga"
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:text-emerald-200/70 dark:hover:text-white cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-emerald-200/75">
            Kelola kebutuhan nutrisi personal tiap anggota keluarga—mulai dari tumbuh kembang anak,
            ibu menyusui, kebugaran, hingga usia lanjut.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenFamilyMealPlan}
            className="h-11 px-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0B1F17] hover:bg-emerald-50 dark:hover:bg-[#102A20] text-[#0F172A] dark:text-[#ECFDF5] text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <CalendarDays className="w-4 h-4 text-[#10B981]" />
            <span>Menu Masak Sekeluarga</span>
          </button>
          <button
            type="button"
            onClick={onAddNewMember}
            className="h-11 px-5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#10B981] text-white text-xs sm:text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Anggota</span>
          </button>
        </div>
      </div>

      {/* 4-Column Household KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white/95 dark:bg-[#0B1F17]/95 border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-5 shadow-sm shadow-emerald-500/5">
          <div className="text-xs text-[#64748B] dark:text-emerald-200/70">
            Anggota Keluarga
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-white mt-1">
            {householdTotals.count} orang
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
            {householdTotals.activeLoggedCount} aktif mencatat hari ini
          </div>
        </div>

        <div className="bg-white/95 dark:bg-[#0B1F17]/95 border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-5 shadow-sm shadow-emerald-500/5">
          <div className="text-xs text-[#64748B] dark:text-emerald-200/70">
            Energi Keluarga Hari Ini
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-white mt-1">
            {householdTotals.totalCaloriesIn.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-[#64748B] dark:text-emerald-200/70 mt-1">
            dari {householdTotals.totalCaloriesTarget.toLocaleString("id-ID")} kkal gabungan
          </div>
        </div>

        <div className="bg-white/95 dark:bg-[#0B1F17]/95 border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-5 shadow-sm shadow-emerald-500/5">
          <div className="text-xs text-[#64748B] dark:text-emerald-200/70">
            Rata-Rata Capaian
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#10B981] dark:text-[#34D399] mt-1">
            {householdTotals.avgCompletion}%
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-emerald-200/70 mt-1">
            pemenuhan target harian
          </div>
        </div>

        <div className="bg-white/95 dark:bg-[#0B1F17]/95 border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-5 shadow-sm shadow-emerald-500/5">
          <div className="text-xs text-[#64748B] dark:text-emerald-200/70">
            Hidrasi Keluarga
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-1">
            {(householdTotals.totalWaterMl / 1000).toFixed(1)} L
          </div>
          <div className="text-[11px] font-mono tabular-nums text-[#64748B] dark:text-emerald-200/70 mt-1">
            target {(householdTotals.totalWaterTarget / 1000).toFixed(1)} L total
          </div>
        </div>
      </section>

      {/* Member Cards Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#ECFDF5] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#10B981]" />
            <span>Daftar Profil Anggota Keluarga</span>
          </h2>
          <span className="text-xs text-[#64748B] dark:text-emerald-200/70">
            Klik anggota untuk memantau atau mencatat asupannya
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memberSnapshots.map(
            ({
              member,
              plan,
              caloriesIn,
              proteinIn,
              waterMl,
              caloriePct,
              waterPct,
            }) => {
              const isActive = member.id === activeMemberId;
              const Icon = ROLE_ICON_MAP[member.category] ?? User;
              const roleLabel =
                FAMILY_ROLE_MAP[member.relationRole]?.label ??
                CATEGORY_MAP[member.category].shortLabel;
              const focusLabel =
                NUTRITION_FOCUS_MAP[member.nutritionFocus]?.shortLabel ??
                "Gizi Seimbang";
              const isConfirmingDelete = confirmDeleteId === member.id;

              return (
                <article
                  key={member.id}
                  className={`rounded-3xl border p-5 transition-all flex flex-col justify-between gap-4 ${
                    isActive
                      ? "border-[#10B981] bg-gradient-to-br from-white via-[#F3FCF7] to-[#E8FAF0] dark:from-[#0E281D] dark:via-[#0B1F17] dark:to-[#081A13] shadow-lg shadow-emerald-500/10"
                      : "border-emerald-100/90 dark:border-emerald-900/60 bg-white/95 dark:bg-[#0B1F17]/95 shadow-sm shadow-emerald-500/5"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Row: Identity & Active Indicator */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                            isActive
                              ? "bg-gradient-to-br from-[#10B981] to-[#34D399] text-white shadow-sm shadow-emerald-500/25"
                              : "bg-emerald-50 dark:bg-emerald-950/60 text-[#10B981] dark:text-[#34D399]"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#ECFDF5] truncate">
                              {member.name}
                            </h3>
                            {isActive && (
                              <span className="text-[11px] font-semibold text-[#10B981] dark:text-[#34D399] shrink-0">
                                · Aktif
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#64748B] dark:text-emerald-200/75 truncate">
                            {roleLabel} · {member.age} thn · {focusLabel}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                          BMI {plan.bmi.toFixed(1)}
                        </div>
                        <div
                          className={`text-[11px] font-medium ${
                            plan.bmiTone === "good"
                              ? "text-emerald-700 dark:text-emerald-300"
                              : plan.bmiTone === "warning"
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-red-700 dark:text-red-400"
                          }`}
                        >
                          {plan.bmiCategory}
                        </div>
                      </div>
                    </div>

                    {/* Daily Calorie & Water Progress */}
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#475569] dark:text-emerald-100/80 flex items-center gap-1.5">
                            <Utensils className="w-3.5 h-3.5 text-[#10B981]" />
                            <span>Energi & Protein Hari Ini</span>
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-[#0F172A] dark:text-white">
                            {caloriesIn.toLocaleString("id-ID")} /{" "}
                            {plan.dailyCalorieTarget.toLocaleString("id-ID")} kkal · P{" "}
                            {proteinIn}/{plan.macroTargets.proteinG}g
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-emerald-950 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#34D399] transition-all duration-500"
                            style={{ width: `${Math.min(100, caloriePct)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#475569] dark:text-emerald-100/80 flex items-center gap-1.5">
                            <Droplets className="w-3.5 h-3.5 text-sky-500" />
                            <span>Hidrasi Harian</span>
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-sky-700 dark:text-sky-300">
                            {waterMl.toLocaleString("id-ID")} /{" "}
                            {plan.waterTargetMl.toLocaleString("id-ID")} ml
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-sky-50 dark:bg-sky-950/60 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500"
                            style={{ width: `${Math.min(100, waterPct)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-emerald-100/80 dark:border-emerald-900/50 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectMember(member.id, "dashboard")}
                        className={`h-9 px-3.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          isActive
                            ? "bg-[#0F172A] dark:bg-[#10B981] text-white"
                            : "bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
                        }`}
                      >
                        {isActive ? "Buka Dashboard" : "Pantau Anggota Ini"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditMember(member.id)}
                        className="h-9 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] hover:bg-emerald-50 dark:hover:bg-[#102A20] text-xs font-medium text-[#334155] dark:text-emerald-100 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Ubah</span>
                      </button>
                    </div>

                    {members.length > 1 && (
                      isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteMember(member.id);
                              setConfirmDeleteId(null);
                            }}
                            className="h-9 px-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-emerald-800 text-xs text-[#64748B] dark:text-emerald-200/70 cursor-pointer whitespace-nowrap"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(member.id)}
                          aria-label={`Hapus ${member.name}`}
                          className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>
      </section>

      {/* Side-by-Side Family Nutrition Comparison Table */}
      <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
            Perbandingan Target Gizi Seluruh Keluarga
          </h2>
          <p className="text-xs text-[#64748B] dark:text-emerald-200/70 mt-0.5">
            Kebutuhan energi, makronutrisi, dan hidrasi dihitung otomatis berdasarkan usia, peran,
            serta standar WHO Asia-Pasifik & WHO 2007.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-emerald-100 dark:border-emerald-900/60 text-[11px] font-semibold text-[#64748B] dark:text-emerald-200/75">
                <th className="py-2.5 pr-3">Anggota</th>
                <th className="py-2.5 px-3">Fokus Nutrisi</th>
                <th className="py-2.5 px-3 text-right">Target Kalori</th>
                <th className="py-2.5 px-3 text-right">Karbo</th>
                <th className="py-2.5 px-3 text-right">Protein</th>
                <th className="py-2.5 px-3 text-right">Lemak</th>
                <th className="py-2.5 px-3 text-right">Air</th>
                <th className="py-2.5 pl-3">Status BMI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100/70 dark:divide-emerald-900/50 text-xs">
              {memberSnapshots.map(({ member, plan }) => (
                <tr
                  key={member.id}
                  onClick={() => onSelectMember(member.id, "dashboard")}
                  className="hover:bg-emerald-50/50 dark:hover:bg-[#102A20]/60 transition-colors cursor-pointer"
                >
                  <td className="py-3 pr-3 font-semibold text-[#0F172A] dark:text-white whitespace-nowrap">
                    {member.name}{" "}
                    <span className="font-normal text-[#64748B] dark:text-emerald-200/70">
                      ({FAMILY_ROLE_MAP[member.relationRole]?.label ?? "Anggota"}, {member.age} thn)
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#334155] dark:text-emerald-100/85 whitespace-nowrap">
                    {NUTRITION_FOCUS_MAP[member.nutritionFocus]?.shortLabel ?? "Gizi Seimbang"}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#10B981] dark:text-[#34D399] whitespace-nowrap">
                    {plan.dailyCalorieTarget.toLocaleString("id-ID")} kkal
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-[#334155] dark:text-emerald-100 whitespace-nowrap">
                    {plan.macroTargets.carbsG}g
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-[#334155] dark:text-emerald-100 whitespace-nowrap">
                    {plan.macroTargets.proteinG}g
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-[#334155] dark:text-emerald-100 whitespace-nowrap">
                    {plan.macroTargets.fatG}g
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-sky-700 dark:text-sky-300 whitespace-nowrap">
                    {(plan.waterTargetMl / 1000).toFixed(1)} L
                  </td>
                  <td className="py-3 pl-3 text-[#475569] dark:text-emerald-200/80 whitespace-nowrap">
                    <span className="font-mono tabular-nums font-semibold text-[#0F172A] dark:text-white">
                      {plan.bmi.toFixed(1)}
                    </span>{" "}
                    · {plan.bmiCategory}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
