import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Baby,
  Check,
  ChevronDown,
  ChevronUp,
  HeartHandshake,
  Info,
  Moon,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sprout,
  Sun,
  Trash2,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import type {
  ActivityLevel,
  DietCategory,
  FamilyRelationRole,
  Gender,
  LactationStage,
  NutritionFocusGoal,
  UserProfile,
} from "../types";
import {
  ACTIVITY_OPTIONS,
  CATEGORY_LIST,
  CATEGORY_MAP,
  FAMILY_ROLE_MAP,
  NUTRITION_FOCUS_MAP,
  NUTRITION_FOCUS_OPTIONS,
  calculateNutritionPlan,
  inferDefaultNutritionFocus,
} from "../utils/nutrition";
import type { ThemeMode } from "../utils/storage";
import {
  BRAND_NAME,
  BRAND_PILLARS,
  BRAND_TAGLINE,
  BrandMark,
} from "./BrandMark";

type ProfileCategorySelection = DietCategory | "family";

interface ProfileSetupProps {
  initialProfile: UserProfile | null;
  mode: "onboarding" | "edit" | "add";
  initialFamilyName?: string;
  existingFamilyMembers?: UserProfile[];
  defaultChoice?: ProfileCategorySelection;
  familyHubContent?: React.ReactNode;
  onSave: (profile: UserProfile, familyName?: string) => void;
  onSaveFamilyOnboarding?: (familyName: string, members: UserProfile[]) => void;
  onRequestAddMember?: () => void;
  onResetToOnboarding?: () => void;
  onCancel?: () => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

const CATEGORY_STYLES: Record<
  DietCategory,
  {
    icon: React.ComponentType<{ className?: string }>;
    selectedCard: string;
    selectedIcon: string;
    idleIcon: string;
  }
> = {
  postpartum: {
    icon: Baby,
    selectedCard:
      "border-rose-300 dark:border-rose-600 bg-gradient-to-br from-rose-50/90 to-emerald-50/50 dark:from-rose-950/40 dark:to-[#0B1F17] ring-1 ring-rose-300 dark:ring-rose-600",
    selectedIcon: "bg-gradient-to-br from-rose-500 to-emerald-500 text-white",
    idleIcon: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300",
  },
  adult_female: {
    icon: User,
    selectedCard:
      "border-emerald-400 dark:border-emerald-500 bg-gradient-to-br from-emerald-50/95 to-teal-50/60 dark:from-emerald-950/50 dark:to-[#0B1F17] ring-1 ring-emerald-400 dark:ring-emerald-500",
    selectedIcon: "bg-gradient-to-br from-[#10B981] to-[#34D399] text-white",
    idleIcon: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300",
  },
  adult_male: {
    icon: UserCheck,
    selectedCard:
      "border-teal-400 dark:border-teal-500 bg-gradient-to-br from-teal-50/90 to-sky-50/50 dark:from-teal-950/45 dark:to-[#0B1F17] ring-1 ring-teal-400 dark:ring-teal-500",
    selectedIcon: "bg-gradient-to-br from-teal-600 to-emerald-500 text-white",
    idleIcon: "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-300",
  },
  child_teen: {
    icon: Sprout,
    selectedCard:
      "border-lime-400 dark:border-lime-500 bg-gradient-to-br from-lime-50/90 to-emerald-50/50 dark:from-lime-950/35 dark:to-[#0B1F17] ring-1 ring-lime-400 dark:ring-lime-500",
    selectedIcon: "bg-gradient-to-br from-lime-600 to-[#10B981] text-white",
    idleIcon: "bg-lime-50 dark:bg-lime-950/40 text-lime-700 dark:text-lime-300",
  },
};

function inferRoleForCategory(cat: DietCategory, ageNum: number): FamilyRelationRole {
  if (cat === "postpartum") return "ibu";
  if (cat === "child_teen") return ageNum >= 13 ? "remaja" : "anak";
  if (ageNum >= 60) return "lansia";
  if (cat === "adult_male") return "ayah";
  return "ibu";
}

interface FamilyDraftRow {
  localId: string;
  name: string;
  relationRole: FamilyRelationRole;
  category: DietCategory;
  nutritionFocus: NutritionFocusGoal;
  gender: Gender;
  age: string;
  currentWeight: string;
  height: string;
  targetWeight: string;
  activityLevel: ActivityLevel;
  isBreastfeeding: boolean;
  lactationStage: LactationStage;
}

function makeDraftRow(
  preset: "ibu" | "ibu_menyusui" | "ayah" | "anak" | "lansia"
): FamilyDraftRow {
  const uid = `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  if (preset === "ibu_menyusui") {
    return {
      localId: uid,
      name: "Ibu",
      relationRole: "ibu",
      category: "postpartum",
      nutritionFocus: "pemulihan_laktasi",
      gender: "female",
      age: "29",
      currentWeight: "64",
      height: "158",
      targetWeight: "58",
      activityLevel: "light",
      isBreastfeeding: true,
      lactationStage: "exclusive_0_6",
    };
  }
  if (preset === "ayah") {
    return {
      localId: uid,
      name: "Ayah",
      relationRole: "ayah",
      category: "adult_male",
      nutritionFocus: "penurunan_berat",
      gender: "male",
      age: "33",
      currentWeight: "76",
      height: "172",
      targetWeight: "70",
      activityLevel: "moderate",
      isBreastfeeding: false,
      lactationStage: "exclusive_0_6",
    };
  }
  if (preset === "anak") {
    return {
      localId: uid,
      name: "Anak",
      relationRole: "anak",
      category: "child_teen",
      nutritionFocus: "pertumbuhan_anak",
      gender: "male",
      age: "10",
      currentWeight: "32",
      height: "138",
      targetWeight: "32",
      activityLevel: "moderate",
      isBreastfeeding: false,
      lactationStage: "exclusive_0_6",
    };
  }
  if (preset === "lansia") {
    return {
      localId: uid,
      name: "Orang Tua / Lansia",
      relationRole: "lansia",
      category: "adult_female",
      nutritionFocus: "gizi_seimbang",
      gender: "female",
      age: "65",
      currentWeight: "58",
      height: "156",
      targetWeight: "58",
      activityLevel: "light",
      isBreastfeeding: false,
      lactationStage: "exclusive_0_6",
    };
  }
  return {
    localId: uid,
    name: "Ibu",
    relationRole: "ibu",
    category: "adult_female",
    nutritionFocus: "gizi_seimbang",
    gender: "female",
    age: "31",
    currentWeight: "58",
    height: "159",
    targetWeight: "55",
    activityLevel: "light",
    isBreastfeeding: false,
    lactationStage: "exclusive_0_6",
  };
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({
  initialProfile,
  mode,
  initialFamilyName = "Keluarga Sehat",
  existingFamilyMembers = [],
  defaultChoice,
  familyHubContent,
  onSave,
  onSaveFamilyOnboarding,
  onRequestAddMember,
  onResetToOnboarding,
  onCancel,
  theme = "light",
  onToggleTheme,
}) => {
  const isOnboarding = mode === "onboarding";
  const isAddMode = mode === "add";

  const [selectedChoice, setSelectedChoice] = useState<ProfileCategorySelection>(
    defaultChoice ?? initialProfile?.category ?? "adult_female"
  );
  const category: DietCategory =
    selectedChoice === "family" ? initialProfile?.category ?? "adult_female" : selectedChoice;

  const [relationRole, setRelationRole] = useState<FamilyRelationRole>(
    initialProfile?.relationRole ?? "ibu"
  );
  const [nutritionFocus, setNutritionFocus] = useState<NutritionFocusGoal>(
    initialProfile?.nutritionFocus ??
      inferDefaultNutritionFocus(
        category,
        initialProfile?.currentWeight ?? CATEGORY_MAP[category].defaultWeight,
        initialProfile?.targetWeight ?? CATEGORY_MAP[category].defaultTargetWeight
      )
  );
  const [name, setName] = useState<string>(initialProfile?.name ?? "");
  const [gender, setGender] = useState<Gender>(
    initialProfile?.gender ?? CATEGORY_MAP[category].defaultGender
  );
  const [age, setAge] = useState<string>(
    String(initialProfile?.age ?? CATEGORY_MAP[category].defaultAge)
  );
  const [currentWeight, setCurrentWeight] = useState<string>(
    String(initialProfile?.currentWeight ?? CATEGORY_MAP[category].defaultWeight)
  );
  const [height, setHeight] = useState<string>(
    String(initialProfile?.height ?? CATEGORY_MAP[category].defaultHeight)
  );
  const [targetWeight, setTargetWeight] = useState<string>(
    String(initialProfile?.targetWeight ?? CATEGORY_MAP[category].defaultTargetWeight)
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initialProfile?.activityLevel ?? "light"
  );
  const [isBreastfeeding, setIsBreastfeeding] = useState<boolean>(
    initialProfile?.isBreastfeeding ?? false
  );
  const [lactationStage, setLactationStage] = useState<LactationStage>(
    initialProfile?.lactationStage ?? "exclusive_0_6"
  );
  const [medicalNotes, setMedicalNotes] = useState<string>(
    initialProfile?.medicalNotes ?? ""
  );
  const [showMethodology, setShowMethodology] = useState<boolean>(false);
  const [confirmResetOnboarding, setConfirmResetOnboarding] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  // Family Builder State (used when selectedChoice === "family" during onboarding)
  const [familyName, setFamilyName] = useState<string>(initialFamilyName);
  const [familyDrafts, setFamilyDrafts] = useState<FamilyDraftRow[]>(() => [
    makeDraftRow("ibu"),
    makeDraftRow("ayah"),
    makeDraftRow("anak"),
  ]);

  const handleCategorySelect = (nextChoice: ProfileCategorySelection) => {
    setSelectedChoice(nextChoice);
    setErrorMsg("");
    if (nextChoice === "family") return;

    const meta = CATEGORY_MAP[nextChoice];
    setGender(meta.defaultGender);
    if (!initialProfile || initialProfile.category !== nextChoice) {
      setAge(String(meta.defaultAge));
      setCurrentWeight(String(meta.defaultWeight));
      setHeight(String(meta.defaultHeight));
      setTargetWeight(String(meta.defaultTargetWeight));
      setRelationRole(inferRoleForCategory(nextChoice, meta.defaultAge));
      setNutritionFocus(
        inferDefaultNutritionFocus(nextChoice, meta.defaultWeight, meta.defaultTargetWeight)
      );
      if (nextChoice === "postpartum") {
        setIsBreastfeeding(true);
      } else {
        setIsBreastfeeding(false);
      }
    }
  };

  const availableFocusOptions = useMemo(() => {
    if (category === "child_teen") {
      return NUTRITION_FOCUS_OPTIONS.filter((f) => f.id === "pertumbuhan_anak");
    }
    if (category === "postpartum") {
      return NUTRITION_FOCUS_OPTIONS.filter(
        (f) =>
          f.id === "pemulihan_laktasi" ||
          f.id === "gizi_seimbang" ||
          f.id === "penurunan_berat" ||
          f.id === "penambahan_berat"
      );
    }
    return NUTRITION_FOCUS_OPTIONS.filter(
      (f) => f.id !== "pertumbuhan_anak" && f.id !== "pemulihan_laktasi"
    );
  }, [category]);

  const draftProfile: UserProfile = useMemo(() => {
    const effectiveGender: Gender =
      category === "adult_male"
        ? "male"
        : category === "postpartum" || category === "adult_female"
          ? "female"
          : gender;

    const numAge = Number(age) || CATEGORY_MAP[category].defaultAge;
    const effectiveFocus: NutritionFocusGoal =
      category === "child_teen"
        ? "pertumbuhan_anak"
        : availableFocusOptions.some((f) => f.id === nutritionFocus)
          ? nutritionFocus
          : availableFocusOptions[0]?.id ?? "gizi_seimbang";

    const derivedRole =
      numAge >= 60 && category !== "postpartum"
        ? "lansia"
        : initialProfile?.relationRole && initialProfile.category === category
          ? initialProfile.relationRole
          : inferRoleForCategory(category, numAge);

    return {
      id:
        initialProfile?.id ??
        `member_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || "Sahabat Sehat",
      relationRole: relationRole || derivedRole,
      category,
      nutritionFocus: effectiveFocus,
      gender: effectiveGender,
      age: numAge,
      currentWeight: Number(currentWeight) || CATEGORY_MAP[category].defaultWeight,
      height: Number(height) || CATEGORY_MAP[category].defaultHeight,
      targetWeight: Number(targetWeight) || CATEGORY_MAP[category].defaultTargetWeight,
      activityLevel,
      isBreastfeeding: category === "postpartum" ? isBreastfeeding : false,
      lactationStage:
        category === "postpartum" && isBreastfeeding ? lactationStage : undefined,
      medicalNotes: medicalNotes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
  }, [
    initialProfile?.id,
    initialProfile?.relationRole,
    initialProfile?.category,
    name,
    relationRole,
    category,
    nutritionFocus,
    availableFocusOptions,
    gender,
    age,
    currentWeight,
    height,
    targetWeight,
    activityLevel,
    isBreastfeeding,
    lactationStage,
    medicalNotes,
  ]);

  const previewPlan = useMemo(
    () => calculateNutritionPlan(draftProfile),
    [draftProfile]
  );

  const bmiGaugePercent = useMemo(() => {
    if (category === "child_teen") {
      const z = previewPlan.childZScore ?? 0;
      if (z < -2) {
        return Math.max(4, Math.min(24, ((z + 3.5) / 1.5) * 25));
      }
      if (z <= 1) {
        return 25 + ((z + 2) / 3) * 50;
      }
      if (z <= 2) {
        return 75 + (z - 1) * 16.67;
      }
      return Math.min(96, 91.67 + ((z - 2) / 1.5) * 8.33);
    }
    const bmi = previewPlan.bmi;
    if (bmi < 18.5) {
      return Math.max(4, Math.min(19, ((bmi - 14) / 4.5) * 20));
    }
    if (bmi < 23.0) {
      return 20 + ((bmi - 18.5) / 4.5) * 20;
    }
    if (bmi < 25.0) {
      return 40 + ((bmi - 23.0) / 2.0) * 20;
    }
    if (bmi < 30.0) {
      return 60 + ((bmi - 25.0) / 5.0) * 20;
    }
    return Math.min(96, 80 + ((bmi - 30.0) / 6.0) * 20);
  }, [category, previewPlan.bmi, previewPlan.childZScore]);

  // Convert FamilyDraftRows to UserProfiles for live preview & submission
  const familyPreviewProfiles = useMemo(() => {
    return familyDrafts.map((row, idx) => {
      const cat = row.category;
      const numAge = Number(row.age) || CATEGORY_MAP[cat].defaultAge;
      const effGender: Gender =
        cat === "adult_male"
          ? "male"
          : cat === "postpartum" || cat === "adult_female"
            ? "female"
            : row.gender;
      const profile: UserProfile = {
        id: `member_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
        name: row.name.trim() || `Anggota ${idx + 1}`,
        relationRole: row.relationRole,
        category: cat,
        nutritionFocus:
          cat === "child_teen" ? "pertumbuhan_anak" : row.nutritionFocus,
        gender: effGender,
        age: numAge,
        currentWeight: Number(row.currentWeight) || CATEGORY_MAP[cat].defaultWeight,
        height: Number(row.height) || CATEGORY_MAP[cat].defaultHeight,
        targetWeight: Number(row.targetWeight) || CATEGORY_MAP[cat].defaultTargetWeight,
        activityLevel: row.activityLevel,
        isBreastfeeding: cat === "postpartum" ? row.isBreastfeeding : false,
        lactationStage:
          cat === "postpartum" && row.isBreastfeeding ? row.lactationStage : undefined,
        updatedAt: new Date().toISOString(),
      };
      return {
        row,
        profile,
        plan: calculateNutritionPlan(profile),
      };
    });
  }, [familyDrafts]);

  const updateFamilyDraft = (
    localId: string,
    patch: Partial<FamilyDraftRow>
  ) => {
    setFamilyDrafts((prev) =>
      prev.map((row) => (row.localId === localId ? { ...row, ...patch } : row))
    );
  };

  const handleFamilyDraftCategoryChange = (
    localId: string,
    nextCat: DietCategory
  ) => {
    const meta = CATEGORY_MAP[nextCat];
    setFamilyDrafts((prev) =>
      prev.map((row) => {
        if (row.localId !== localId) return row;
        return {
          ...row,
          category: nextCat,
          gender: meta.defaultGender,
          age: String(meta.defaultAge),
          currentWeight: String(meta.defaultWeight),
          height: String(meta.defaultHeight),
          targetWeight: String(meta.defaultTargetWeight),
          relationRole: inferRoleForCategory(nextCat, meta.defaultAge),
          nutritionFocus: inferDefaultNutritionFocus(
            nextCat,
            meta.defaultWeight,
            meta.defaultTargetWeight
          ),
          isBreastfeeding: nextCat === "postpartum",
        };
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedChoice === "family" && isOnboarding) {
      if (familyDrafts.length === 0) {
        setErrorMsg("Tambahkan minimal 1 anggota keluarga terlebih dahulu.");
        return;
      }
      for (const { row, profile } of familyPreviewProfiles) {
        const numAge = Number(row.age);
        const numWeight = Number(row.currentWeight);
        const numHeight = Number(row.height);
        const numTarget = Number(row.targetWeight);
        if (!numAge || numAge < 5 || numAge > 100) {
          setErrorMsg(`Periksa usia ${profile.name} (harus antara 5–100 tahun).`);
          return;
        }
        if (row.category === "child_teen" && numAge > 18) {
          setErrorMsg(
            `${profile.name}: Usia di atas 18 tahun sebaiknya memakai kategori Wanita Dewasa, Pria Dewasa, atau Ibu Setelah Melahirkan.`
          );
          return;
        }
        if (row.category !== "child_teen" && numAge < 19) {
          setErrorMsg(
            `${profile.name}: Usia 5–18 tahun harus menggunakan kategori Anak / Remaja agar memakai kurva WHO 2007.`
          );
          return;
        }
        if (!numWeight || numWeight < 15 || numWeight > 250) {
          setErrorMsg(`Periksa berat badan ${profile.name} (15–250 kg).`);
          return;
        }
        if (!numHeight || numHeight < 80 || numHeight > 230) {
          setErrorMsg(`Periksa tinggi badan ${profile.name} (80–230 cm).`);
          return;
        }
        if (!numTarget || numTarget < 15 || numTarget > 250) {
          setErrorMsg(`Periksa berat target ${profile.name} (15–250 kg).`);
          return;
        }
      }
      setErrorMsg("");
      const cleanedProfiles = familyPreviewProfiles.map((x) => x.profile);
      onSaveFamilyOnboarding?.(
        familyName.trim() || "Keluarga Sehat",
        cleanedProfiles
      );
      return;
    }

    const numAge = Number(age);
    const numWeight = Number(currentWeight);
    const numHeight = Number(height);
    const numTarget = Number(targetWeight);

    if (!numAge || numAge < 5 || numAge > 100) {
      setErrorMsg("Masukkan usia yang valid (antara 5 hingga 100 tahun).");
      return;
    }
    if (category === "child_teen" && numAge > 18) {
      setErrorMsg(
        "Untuk usia 19 tahun ke atas, silakan pilih kategori Wanita Dewasa, Pria Dewasa, atau Ibu Setelah Melahirkan."
      );
      return;
    }
    if (category !== "child_teen" && numAge < 19) {
      setErrorMsg(
        "Untuk usia 5–18 tahun, silakan pilih kategori Anak / Remaja agar memakai standar pertumbuhan WHO 2007."
      );
      return;
    }
    if (!numWeight || numWeight < 15 || numWeight > 250) {
      setErrorMsg("Masukkan berat badan saat ini yang valid (15 – 250 kg).");
      return;
    }
    if (!numHeight || numHeight < 80 || numHeight > 230) {
      setErrorMsg("Masukkan tinggi badan yang valid (80 – 230 cm).");
      return;
    }
    if (!numTarget || numTarget < 15 || numTarget > 250) {
      setErrorMsg("Masukkan berat badan target yang valid (15 – 250 kg).");
      return;
    }

    setErrorMsg("");
    onSave(draftProfile);
    if (mode === "edit") {
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2600);
    }
  };

  return (
    <div
      className={
        isOnboarding
          ? "min-h-screen bg-[#F8FAFC] dark:bg-[#06130E] py-8 px-4 sm:px-6 lg:px-8"
          : "space-y-6"
      }
    >
      <div className={isOnboarding ? "max-w-5xl mx-auto space-y-8" : "space-y-6"}>
        {isOnboarding ? (
          <header className="space-y-2 border-b border-emerald-100 dark:border-emerald-900/60 pb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BrandMark size="md" />
                <div>
                  <div className="text-lg sm:text-xl font-bold tracking-wide text-[#0F172A] dark:text-[#ECFDF5] whitespace-nowrap leading-tight">
                    {BRAND_NAME}
                  </div>
                  <div className="text-xs font-medium text-[#10B981] dark:text-[#34D399] leading-tight">
                    {BRAND_TAGLINE}
                  </div>
                </div>
              </div>

              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label="Ganti tema terang atau gelap"
                  className="h-10 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0B1F17] text-xs font-medium text-[#0F172A] dark:text-[#ECFDF5] flex items-center gap-1.5 cursor-pointer"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span>Terang</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-emerald-700" />
                      <span>Gelap</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="pt-3 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-[#64748B] dark:text-emerald-200/75">
                <span className="font-semibold text-[#10B981] dark:text-[#34D399]">
                  {BRAND_TAGLINE}
                </span>
                <span aria-hidden="true">·</span>
                <span>{BRAND_PILLARS}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5]">
                Atur Profil Nutrisi Personal atau Keluarga Anda
              </h1>
            </div>
            <p className="text-sm sm:text-base text-[#64748B] dark:text-emerald-200/75 max-w-2xl leading-relaxed">
              Pilih kategori individu maupun mode Keluarga sekaligus agar perhitungan BMR, TDEE,
              kebutuhan air minum, menu harian, dan saran pelatih AI sesuai untuk semua.
            </p>
          </header>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5]">
                {isAddMode
                  ? "Tambah Anggota Keluarga Baru"
                  : `Profil & Kalkulator Target · ${initialProfile?.name ?? ""}`}
              </h1>
              <p className="text-sm text-[#64748B] dark:text-emerald-200/75">
                {isAddMode
                  ? "Pilih kategori anggota keluarga yang ingin ditambahkan ke rumah tangga Anda."
                  : "Sesuaikan kategori profil, fokus nutrisi, data tubuh, atau kelola anggota keluarga."}
              </p>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="h-10 px-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0B1F17] hover:bg-emerald-50 dark:hover:bg-[#102A20] text-xs font-semibold text-[#0F172A] dark:text-[#ECFDF5] flex items-center gap-1.5 self-start sm:self-auto cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Profil</span>
              </button>
            )}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Preserved 4 Individual Categories + Family Category */}
            <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                  1. Pilih Kategori Profil
                </h2>
                <p className="text-xs text-[#64748B] dark:text-emerald-200/70 mt-0.5">
                  Menentukan rumus energi, target cairan, panduan keamanan, atau pengaturan beberapa anggota keluarga
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORY_LIST.map((item) => {
                  const style = CATEGORY_STYLES[item.id];
                  const Icon = style.icon;
                  const selected = selectedChoice === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleCategorySelect(item.id)}
                      className={`text-left p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between gap-2.5 min-h-[114px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
                        selected
                          ? style.selectedCard
                          : "border-emerald-100 dark:border-emerald-900/60 bg-white dark:bg-[#0D241B]/70 hover:border-emerald-300 dark:hover:border-emerald-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            selected ? style.selectedIcon : style.idleIcon
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        {selected && (
                          <span className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                          {item.title}
                        </div>
                        <div className="text-xs text-[#64748B] dark:text-emerald-200/70 mt-0.5">
                          {item.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* 5th Category Card: Keluarga (Shown in onboarding & edit profile) */}
                {!isAddMode && (
                  <button
                    type="button"
                    onClick={() => handleCategorySelect("family")}
                    className={`sm:col-span-2 text-left p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
                      selectedChoice === "family"
                        ? "border-[#10B981] bg-gradient-to-r from-emerald-50/95 via-teal-50/70 to-lime-50/60 dark:from-emerald-950/60 dark:via-[#0B1F17] dark:to-[#081A13] ring-1 ring-[#10B981]"
                        : "border-emerald-100 dark:border-emerald-900/60 bg-white dark:bg-[#0D241B]/70 hover:border-emerald-300 dark:hover:border-emerald-700"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          selectedChoice === "family"
                            ? "bg-gradient-to-br from-[#10B981] via-[#34D399] to-[#84CC16] text-white"
                            : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                          Keluarga (Multi-Anggota)
                        </div>
                        <div className="text-xs text-[#64748B] dark:text-emerald-200/75 mt-0.5 leading-snug">
                          Gabungan profil Ibu, Ayah, Anak/Remaja, maupun Orang Tua (Lansia) dalam
                          satu rumah dengan menu masak bersama & pelacak personal masing-masing.
                        </div>
                      </div>
                    </div>
                    {selectedChoice === "family" && (
                      <span className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Postpartum Breastfeeding Checkbox & Stage */}
              {selectedChoice === "postpartum" && (
                <div className="space-y-3 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isBreastfeeding}
                      onChange={(e) => setIsBreastfeeding(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded accent-[#10B981] cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                        Sedang Menyusui Eksklusif / Aktif
                      </div>
                      <p className="text-xs text-[#475569] dark:text-emerald-200/75 leading-relaxed">
                        Menambahkan kebutuhan kalori laktasi dan menaikkan target cairan harian agar
                        produksi ASI tetap terjaga.
                      </p>
                    </div>
                  </label>

                  {isBreastfeeding && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {[
                        {
                          id: "exclusive_0_6" as LactationStage,
                          label: "ASI Eksklusif (0–6 bulan)",
                          sub: "+450 kkal · 3.000 ml air",
                        },
                        {
                          id: "partial_6_plus" as LactationStage,
                          label: "Menyusui + MPASI (>6 bulan)",
                          sub: "+330 kkal · 2.750 ml air",
                        },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setLactationStage(st.id)}
                          className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                            lactationStage === st.id
                              ? "border-[#10B981] bg-white dark:bg-[#0B1F17] text-[#0F172A] dark:text-white"
                              : "border-emerald-200/80 dark:border-emerald-800 bg-white/60 dark:bg-[#0B1F17]/50 text-[#475569] dark:text-emerald-200/70 hover:bg-white"
                          }`}
                        >
                          <div className="text-xs font-semibold">{st.label}</div>
                          <div className="text-[11px] font-mono text-[#10B981] dark:text-[#34D399] mt-0.5">
                            {st.sub}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Conditional Section: Family Mode vs Single Profile Form */}
            {selectedChoice === "family" ? (
              isOnboarding ? (
                /* Onboarding Multi-Member Family Builder */
                <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-5">
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                        2. Atur Anggota Keluarga Anda
                      </h2>
                      <p className="text-xs text-[#64748B] dark:text-emerald-200/70 mt-0.5">
                        Sesuaikan daftar anggota keluarga awal; Anda tetap bisa menambah atau
                        mengubahnya kapan saja setelah masuk.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1.5">
                        Nama Keluarga
                      </label>
                      <input
                        type="text"
                        value={familyName}
                        onChange={(e) => setFamilyName(e.target.value)}
                        placeholder="Contoh: Keluarga Pratama atau Keluarga Sehat"
                        className="w-full h-11 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-sm text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                      />
                    </div>

                    {/* Quick Add Member Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] font-medium text-[#64748B] dark:text-emerald-200/70 mr-1">
                        Tambah cepat:
                      </span>
                      {[
                        { preset: "ibu_menyusui" as const, label: "+ Ibu Menyusui" },
                        { preset: "ibu" as const, label: "+ Wanita Dewasa" },
                        { preset: "ayah" as const, label: "+ Pria Dewasa" },
                        { preset: "anak" as const, label: "+ Anak / Remaja" },
                        { preset: "lansia" as const, label: "+ Lansia" },
                      ].map((item) => (
                        <button
                          key={item.preset}
                          type="button"
                          onClick={() =>
                            setFamilyDrafts((prev) => [...prev, makeDraftRow(item.preset)])
                          }
                          className="h-8 px-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] hover:bg-emerald-50 dark:hover:bg-[#143528] text-xs font-semibold text-emerald-700 dark:text-emerald-300 cursor-pointer whitespace-nowrap"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Family Draft Rows */}
                  <div className="divide-y divide-emerald-100 dark:divide-emerald-900/60">
                    {familyDrafts.map((row, index) => (
                      <div key={row.localId} className="py-4 first:pt-1 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#10B981] dark:text-[#34D399]">
                            Anggota #{index + 1}
                          </span>
                          {familyDrafts.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setFamilyDrafts((prev) =>
                                  prev.filter((d) => d.localId !== row.localId)
                                )
                              }
                              className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[11px] text-[#64748B] dark:text-emerald-200/75 mb-1">
                              Nama Panggilan
                            </label>
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) =>
                                updateFamilyDraft(row.localId, { name: e.target.value })
                              }
                              className="w-full h-10 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-sm text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] text-[#64748B] dark:text-emerald-200/75 mb-1">
                              Kategori
                            </label>
                            <select
                              value={row.category}
                              onChange={(e) =>
                                handleFamilyDraftCategoryChange(
                                  row.localId,
                                  e.target.value as DietCategory
                                )
                              }
                              className="w-full h-10 px-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-xs font-medium text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                            >
                              {CATEGORY_LIST.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.shortLabel}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] text-[#64748B] dark:text-emerald-200/75 mb-1">
                              Fokus Nutrisi
                            </label>
                            <select
                              value={
                                row.category === "child_teen"
                                  ? "pertumbuhan_anak"
                                  : row.nutritionFocus
                              }
                              disabled={row.category === "child_teen"}
                              onChange={(e) =>
                                updateFamilyDraft(row.localId, {
                                  nutritionFocus: e.target.value as NutritionFocusGoal,
                                })
                              }
                              className="w-full h-10 px-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-xs font-medium text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981] disabled:opacity-75"
                            >
                              {NUTRITION_FOCUS_OPTIONS.filter((f) =>
                                row.category === "child_teen"
                                  ? f.id === "pertumbuhan_anak"
                                  : row.category === "postpartum"
                                    ? f.id !== "pertumbuhan_anak" && f.id !== "peningkatan_otot"
                                    : f.id !== "pertumbuhan_anak" && f.id !== "pemulihan_laktasi"
                              ).map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.shortLabel}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div>
                            <label className="block text-[11px] text-[#64748B] dark:text-emerald-200/75 mb-1">
                              Usia (thn)
                            </label>
                            <input
                              type="number"
                              min={5}
                              max={100}
                              value={row.age}
                              onChange={(e) =>
                                updateFamilyDraft(row.localId, { age: e.target.value })
                              }
                              className="w-full h-10 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-xs font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#64748B] dark:text-emerald-200/75 mb-1">
                              Tinggi (cm)
                            </label>
                            <input
                              type="number"
                              min={80}
                              max={230}
                              value={row.height}
                              onChange={(e) =>
                                updateFamilyDraft(row.localId, { height: e.target.value })
                              }
                              className="w-full h-10 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-xs font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#64748B] dark:text-emerald-200/75 mb-1">
                              Berat (kg)
                            </label>
                            <input
                              type="number"
                              min={15}
                              max={250}
                              step="0.1"
                              value={row.currentWeight}
                              onChange={(e) =>
                                updateFamilyDraft(row.localId, {
                                  currentWeight: e.target.value,
                                })
                              }
                              className="w-full h-10 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-xs font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#64748B] dark:text-emerald-200/75 mb-1">
                              Target (kg)
                            </label>
                            <input
                              type="number"
                              min={15}
                              max={250}
                              step="0.1"
                              value={row.targetWeight}
                              onChange={(e) =>
                                updateFamilyDraft(row.localId, {
                                  targetWeight: e.target.value,
                                })
                              }
                              className="w-full h-10 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-xs font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                              required
                            />
                          </div>
                        </div>

                        {row.category === "child_teen" && (
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-[#64748B] dark:text-emerald-200/75">
                              Jenis kelamin:
                            </span>
                            {(["female", "male"] as Gender[]).map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() =>
                                  updateFamilyDraft(row.localId, { gender: g })
                                }
                                className={`px-3 py-1 rounded-lg border text-xs font-medium cursor-pointer ${
                                  row.gender === g
                                    ? "border-[#10B981] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                    : "border-emerald-100 dark:border-emerald-900 text-[#64748B]"
                                }`}
                              >
                                {g === "female" ? "Perempuan" : "Laki-laki"}
                              </button>
                            ))}
                          </div>
                        )}

                        {row.category === "postpartum" && (
                          <label className="flex items-center gap-2 text-xs text-[#334155] dark:text-emerald-200/85 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={row.isBreastfeeding}
                              onChange={(e) =>
                                updateFamilyDraft(row.localId, {
                                  isBreastfeeding: e.target.checked,
                                })
                              }
                              className="rounded accent-[#10B981]"
                            />
                            <span>Sedang menyusui aktif (+kalori & hidrasi laktasi)</span>
                          </label>
                        )}
                      </div>
                    ))}
                  </div>

                  {errorMsg && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs sm:text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full h-12 px-6 rounded-2xl bg-gradient-to-r from-[#0F172A] to-[#064E3B] dark:from-[#10B981] dark:to-[#34D399] hover:opacity-95 text-white text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-900/15"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      Simpan Profil Keluarga ({familyDrafts.length} Anggota) & Mulai
                    </span>
                  </button>
                </section>
              ) : (
                /* Inside App (edit mode): Family Management Embedded inside Profile Menu */
                !familyHubContent && (
                  <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                        2. Mode Keluarga ({familyName})
                      </h2>
                      <p className="text-xs text-[#64748B] dark:text-emerald-200/75 mt-0.5">
                        Saat ini terdaftar {existingFamilyMembers.length} anggota keluarga.
                      </p>
                    </div>
                    {onRequestAddMember && (
                      <button
                        type="button"
                        onClick={onRequestAddMember}
                        className="h-11 px-5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#34D399] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah Anggota Keluarga Baru</span>
                      </button>
                    )}
                  </section>
                )
              )
            ) : (
              /* Individual Body Data & Nutrition Focus Form */
              <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                    2. Data Tubuh, Fokus Nutrisi & Aktivitas
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-emerald-200/70 mt-0.5">
                    Digunakan untuk menghitung BMR, TDEE, BMI, makronutrisi, dan kebutuhan cairan
                  </p>
                </div>

                {/* Personal Nutrition Focus Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85">
                    Fokus Nutrisi Personal
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {availableFocusOptions.map((focus) => {
                      const active = draftProfile.nutritionFocus === focus.id;
                      return (
                        <button
                          key={focus.id}
                          type="button"
                          onClick={() => setNutritionFocus(focus.id)}
                          className={`text-left p-3 rounded-2xl border transition-colors cursor-pointer ${
                            active
                              ? "border-[#10B981] bg-emerald-50/90 dark:bg-emerald-950/50"
                              : "border-emerald-100 dark:border-emerald-900/60 bg-white dark:bg-[#0D241B]/70 hover:bg-[#F8FAFC] dark:hover:bg-[#102A20]"
                          }`}
                        >
                          <div className="text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                            {focus.label}
                          </div>
                          <p className="text-[11px] text-[#64748B] dark:text-emerald-200/70 mt-0.5 leading-snug">
                            {focus.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1.5">
                      Nama Panggilan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Ibu Rina, Ayah Budi, atau Adik Sinta"
                      className="w-full h-11 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-emerald-200/40 focus:outline-none focus:border-[#10B981]"
                    />
                  </div>

                  {category === "child_teen" && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1.5">
                        Jenis Kelamin Anak / Remaja
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { id: "female" as Gender, label: "Perempuan" },
                          { id: "male" as Gender, label: "Laki-laki" },
                        ].map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setGender(g.id)}
                            className={`h-11 rounded-2xl border text-sm font-medium transition-colors cursor-pointer ${
                              gender === g.id
                                ? "border-[#10B981] bg-emerald-50 dark:bg-emerald-950/50 text-[#0F172A] dark:text-white"
                                : "border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-[#64748B] dark:text-emerald-200/75"
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1.5">
                      Usia (tahun)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-sm font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1.5">
                      Tinggi Badan (cm)
                    </label>
                    <input
                      type="number"
                      min={80}
                      max={230}
                      step="0.5"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-sm font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1.5">
                      Berat Badan Saat Ini (kg)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={250}
                      step="0.1"
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-sm font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1.5">
                      Berat Badan Target (kg)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={250}
                      step="0.1"
                      value={targetWeight}
                      onChange={(e) => setTargetWeight(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-sm font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85">
                    Tingkat Aktivitas Fisik
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ACTIVITY_OPTIONS.map((act) => {
                      const active = activityLevel === act.id;
                      return (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => setActivityLevel(act.id)}
                          className={`text-left p-3 rounded-2xl border transition-colors cursor-pointer min-h-[60px] ${
                            active
                              ? "border-[#10B981] bg-emerald-50/80 dark:bg-emerald-950/50"
                              : "border-emerald-100 dark:border-emerald-900/60 bg-white dark:bg-[#0D241B]/70 hover:bg-[#F8FAFC] dark:hover:bg-[#102A20]"
                          }`}
                        >
                          <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                            {act.label}
                          </div>
                          <div className="text-xs text-[#64748B] dark:text-emerald-200/70 mt-0.5 leading-snug">
                            {act.detail}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85">
                    Catatan Kondisi Medis / Alergi / Pantangan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    placeholder="Contoh: Riwayat maag/GERD, alergi kacang, pasca-caesar, atau hipertensi ringan"
                    className="w-full h-11 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-emerald-200/40 focus:outline-none focus:border-[#10B981]"
                  />
                  <p className="text-[11px] text-[#64748B] dark:text-emerald-200/65">
                    Membantu Pelatih AI dan Generator Menu menyesuaikan saran yang lebih aman bagi kondisi Anda.
                  </p>
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {savedNotice && (
                  <div className="flex items-center gap-2 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Profil dan target nutrisi harian berhasil diperbarui.</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full h-12 px-6 rounded-2xl bg-gradient-to-r from-[#0F172A] to-[#064E3B] dark:from-[#10B981] dark:to-[#34D399] hover:opacity-95 text-white text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-900/15"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isOnboarding
                      ? "Simpan Profil & Mulai"
                      : isAddMode
                        ? "Tambahkan ke Profil Keluarga"
                        : "Perbarui Profil & Target"}
                  </span>
                </button>
              </section>
            )}
          </div>

          {/* Right Column: Live Preview (Family Summary when "family" is selected, or Individual Calculator) */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
            {selectedChoice === "family" ? (
              <section className="bg-gradient-to-br from-[#0F172A] via-[#0B291E] to-[#064E3B] text-white rounded-3xl p-6 shadow-xl shadow-emerald-900/20 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-200/80">
                    Ringkasan Kalkulator Keluarga
                  </span>
                  <span className="text-xs font-semibold text-[#84CC16]">
                    {isOnboarding
                      ? `${familyPreviewProfiles.length} Anggota`
                      : `${existingFamilyMembers.length} Anggota`}
                  </span>
                </div>

                {(() => {
                  const list = isOnboarding
                    ? familyPreviewProfiles.map((x) => ({
                        profile: x.profile,
                        plan: x.plan,
                      }))
                    : existingFamilyMembers.map((m) => ({
                        profile: m,
                        plan: calculateNutritionPlan(m),
                      }));
                  const totalKcal = list.reduce(
                    (sum, item) => sum + item.plan.dailyCalorieTarget,
                    0
                  );
                  const totalWater = list.reduce(
                    (sum, item) => sum + item.plan.waterTargetMl,
                    0
                  );
                  return (
                    <>
                      <div>
                        <div className="text-xs text-emerald-200/80">
                          Total Energi Gabungan Keluarga
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-4xl font-bold font-mono tabular-nums tracking-tight">
                            {totalKcal.toLocaleString("id-ID")}
                          </span>
                          <span className="text-sm text-emerald-200/80">kkal / hari</span>
                        </div>
                        <div className="text-xs text-emerald-200/75 mt-1 font-mono tabular-nums">
                          Kebutuhan air gabungan {(totalWater / 1000).toFixed(1)} L / hari
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-4 space-y-2.5">
                        {list.map(({ profile: mp, plan: mPlan }) => (
                          <div
                            key={mp.id}
                            className="bg-white/8 rounded-2xl p-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate">
                                {mp.name}{" "}
                                <span className="text-xs font-normal text-emerald-200/75">
                                  ({mp.age} thn)
                                </span>
                              </div>
                              <div className="text-[11px] text-emerald-200/75 truncate">
                                {NUTRITION_FOCUS_MAP[mp.nutritionFocus]?.shortLabel ??
                                  FAMILY_ROLE_MAP[mp.relationRole]?.label} · BMI{" "}
                                {mPlan.bmi.toFixed(1)}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-mono tabular-nums font-bold text-[#34D399]">
                                {mPlan.dailyCalorieTarget.toLocaleString("id-ID")} kkal
                              </div>
                              <div className="text-[11px] font-mono tabular-nums text-emerald-200/75">
                                P {mPlan.macroTargets.proteinG}g ·{" "}
                                {(mPlan.waterTargetMl / 1000).toFixed(1)}L
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </section>
            ) : (
              <>
                <section className="bg-gradient-to-br from-[#0F172A] via-[#0B291E] to-[#064E3B] text-white rounded-3xl p-6 shadow-xl shadow-emerald-900/20 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-200/80">
                      Hasil Kalkulator Otomatis
                    </span>
                    <span className="text-xs font-semibold text-[#84CC16]">
                      {CATEGORY_MAP[category].shortLabel}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs text-emerald-200/80">
                      Target Kalori Harian
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-4xl font-bold font-mono tabular-nums tracking-tight">
                        {previewPlan.dailyCalorieTarget.toLocaleString("id-ID")}
                      </span>
                      <span className="text-sm text-emerald-200/80">kkal / hari</span>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-emerald-200/75">BMR (Metabolisme Basal)</div>
                      <div className="font-mono tabular-nums font-semibold mt-0.5">
                        {previewPlan.bmr.toLocaleString("id-ID")} kkal
                      </div>
                      <div className="text-[11px] text-emerald-200/60 mt-0.5">
                        {previewPlan.bmrFormula}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-emerald-200/75">TDEE (Kebutuhan Total)</div>
                      <div className="font-mono tabular-nums font-semibold mt-0.5">
                        {previewPlan.tdee.toLocaleString("id-ID")} kkal
                      </div>
                      <div className="text-[11px] text-emerald-200/60 mt-0.5">
                        Berdasarkan tingkat aktivitas
                      </div>
                    </div>
                    {previewPlan.lactationBonus > 0 && (
                      <div>
                        <div className="text-xs text-emerald-200/75">Tambahan Menyusui</div>
                        <div className="font-mono tabular-nums font-semibold text-[#34D399] mt-0.5">
                          +{previewPlan.lactationBonus} kkal
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-emerald-200/75">Penyesuaian Kalori</div>
                      <div className="font-mono tabular-nums font-semibold mt-0.5">
                        {previewPlan.calorieAdjustment === 0
                          ? "Pemeliharaan (0)"
                          : `${previewPlan.calorieAdjustment > 0 ? "+" : ""}${previewPlan.calorieAdjustment} kkal`}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <div className="text-xs text-emerald-200/75 mb-2">
                      Target Makronutrisi & Cairan Harian
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-white/8 rounded-2xl py-2.5 px-1.5">
                        <div className="text-[11px] text-emerald-200/75">Karbo</div>
                        <div className="text-sm font-mono tabular-nums font-semibold mt-0.5">
                          {previewPlan.macroTargets.carbsG}g
                        </div>
                      </div>
                      <div className="bg-white/8 rounded-2xl py-2.5 px-1.5">
                        <div className="text-[11px] text-emerald-200/75">Protein</div>
                        <div className="text-sm font-mono tabular-nums font-semibold mt-0.5">
                          {previewPlan.macroTargets.proteinG}g
                        </div>
                      </div>
                      <div className="bg-white/8 rounded-2xl py-2.5 px-1.5">
                        <div className="text-[11px] text-emerald-200/75">Lemak</div>
                        <div className="text-sm font-mono tabular-nums font-semibold mt-0.5">
                          {previewPlan.macroTargets.fatG}g
                        </div>
                      </div>
                      <div className="bg-white/8 rounded-2xl py-2.5 px-1.5">
                        <div className="text-[11px] text-emerald-200/75">Air Minum</div>
                        <div className="text-sm font-mono tabular-nums font-semibold text-[#34D399] mt-0.5">
                          {(previewPlan.waterTargetMl / 1000).toFixed(1)}L
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Visual BMI Gauge Bar Card */}
                <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                      <Activity className="w-4 h-4 text-[#10B981]" />
                      <span>Indeks Massa Tubuh (BMI)</span>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        previewPlan.bmiTone === "good"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : previewPlan.bmiTone === "warning"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {previewPlan.bmiCategory}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-white">
                      {previewPlan.bmi.toFixed(1)}
                    </span>
                    <span className="text-xs text-[#64748B] dark:text-emerald-200/70">
                      kg/m²
                    </span>
                  </div>

                  <div className="pt-4 pb-1 space-y-2">
                    <div className="relative">
                      <div
                        className="absolute -top-5 -translate-x-1/2 flex flex-col items-center transition-all duration-300"
                        style={{ left: `${bmiGaugePercent}%` }}
                      >
                        <span className="px-1.5 py-0.5 rounded-md bg-[#0F172A] dark:bg-[#10B981] text-white text-[10px] font-mono font-bold tabular-nums shadow-sm">
                          {previewPlan.bmi.toFixed(1)}
                        </span>
                        <span className="w-0.5 h-2 bg-[#0F172A] dark:bg-[#10B981]" />
                      </div>

                      {category === "child_teen" ? (
                        <div className="h-3 rounded-full overflow-hidden flex shadow-inner">
                          <div className="w-1/4 bg-sky-400" title="Gizi Kurang" />
                          <div className="w-2/4 bg-gradient-to-r from-[#10B981] to-[#84CC16]" title="Ideal" />
                          <div className="w-1/6 bg-amber-400" title="Berlebih" />
                          <div className="w-1/12 bg-red-500" title="Obesitas" />
                        </div>
                      ) : (
                        <div className="h-3 rounded-full overflow-hidden flex shadow-inner">
                          <div className="w-1/5 bg-sky-400" title="Kurus" />
                          <div className="w-1/5 bg-gradient-to-r from-[#10B981] to-[#34D399]" title="Ideal" />
                          <div className="w-1/5 bg-[#84CC16]" title="Berlebih" />
                          <div className="w-1/5 bg-amber-500" title="Obesitas I" />
                          <div className="w-1/5 bg-red-500" title="Obesitas II" />
                        </div>
                      )}
                    </div>

                    {category === "child_teen" ? (
                      <div className="flex justify-between text-[10px] font-mono tabular-nums text-[#64748B] dark:text-emerald-200/70">
                        <span>Kurus (Z&lt;-2)</span>
                        <span>Ideal (-2..+1)</span>
                        <span>Berlebih</span>
                        <span>&gt;+2 SD</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-[10px] font-mono tabular-nums text-[#64748B] dark:text-emerald-200/70">
                        <span>Kurus &lt;18.5</span>
                        <span>Ideal 18.5–22.9</span>
                        <span>23–24.9</span>
                        <span>25–29.9</span>
                        <span>≥30</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-[#64748B] dark:text-emerald-200/70">
                    Standar:{" "}
                    <strong className="text-[#0F172A] dark:text-white">
                      {previewPlan.bmiStandard}
                    </strong>
                  </div>

                  {previewPlan.childGrowthPercentileLabel && (
                    <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Kurva BMI Usia: {previewPlan.childGrowthPercentileLabel}
                    </div>
                  )}
                  <p className="text-xs text-[#64748B] dark:text-emerald-200/75 leading-relaxed">
                    {previewPlan.bmiDetail}
                  </p>
                </section>

                {/* Category-Specific Safety Banner */}
                {previewPlan.safetyBannerTitle && (
                  <section className="rounded-3xl border border-amber-200 dark:border-amber-700/50 bg-amber-50/80 dark:bg-amber-950/35 p-4 sm:p-5 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-300">
                      {category === "postpartum" ? (
                        <HeartHandshake className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
                      ) : (
                        <Info className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
                      )}
                      <span>{previewPlan.safetyBannerTitle}</span>
                    </div>
                    <p className="text-xs text-amber-900/90 dark:text-amber-200/80 leading-relaxed">
                      {previewPlan.safetyBannerText}
                    </p>
                  </section>
                )}
              </>
            )}

            {/* Methodology & Clinical Reference Card */}
            <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-5 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-2.5">
              <button
                type="button"
                onClick={() => setShowMethodology((prev) => !prev)}
                className="w-full flex items-center justify-between text-left text-xs font-semibold text-[#0F172A] dark:text-[#ECFDF5] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span>Metodologi & Referensi Perhitungan</span>
                </span>
                {showMethodology ? (
                  <ChevronUp className="w-4 h-4 text-[#64748B]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#64748B]" />
                )}
              </button>

              {showMethodology && (
                <div className="pt-2 border-t border-emerald-100 dark:border-emerald-900/60 space-y-2 text-xs text-[#64748B] dark:text-emerald-200/75 leading-relaxed">
                  <p>
                    <strong className="text-[#0F172A] dark:text-white">
                      1. Metabolisme Basal (BMR):
                    </strong>{" "}
                    Dewasa memakai persamaan <em>Mifflin-St Jeor</em>; Anak/Remaja (5–18 tahun)
                    memakai persamaan pediatrik <em>Schofield FAO/WHO</em>.
                  </p>
                  <p>
                    <strong className="text-[#0F172A] dark:text-white">
                      2. Klasifikasi BMI:
                    </strong>{" "}
                    Dewasa mengacu pada batas <em>WHO Asia-Pasifik</em> (ideal 18,5–22,9);
                    Anak/Remaja menggunakan skor-Z <em>WHO Growth Reference 2007 (LMS)</em>.
                  </p>
                  <p>
                    <strong className="text-[#0F172A] dark:text-white">
                      3. Keamanan & Fokus Nutrisi:
                    </strong>{" "}
                    Defisit otomatis dinonaktifkan bila BMI &lt; 18,5 atau pada kategori
                    Anak/Remaja. Ibu menyusui mendapat tambahan +330 s.d. +450 kkal sesuai fase
                    laktasi.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-emerald-200/60">
                    Catatan: Informasi ini bersifat edukatif untuk pemantauan mandiri keluarga dan
                    tidak menggantikan konsultasi dokter atau ahli gizi klinis.
                  </p>
                </div>
              )}
            </section>

            {/* Return to Initial Profile Selection Menu (Edit mode only) */}
            {!isOnboarding && !isAddMode && onResetToOnboarding && (
              <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                    Mulai Ulang Pemilihan Profil
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-emerald-200/70 leading-relaxed">
                    Kembali ke halaman awal pemilihan kategori profil pengguna (atau mode Keluarga).
                  </p>
                </div>
                {confirmResetOnboarding ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmResetOnboarding(false);
                        onResetToOnboarding();
                      }}
                      className="h-9 px-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      Ya, Buka Menu Profil Awal
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetOnboarding(false)}
                      className="h-9 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-[#475569] dark:text-emerald-200/80 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmResetOnboarding(true)}
                    className="h-9 px-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] hover:bg-emerald-50 dark:hover:bg-[#143528] text-xs font-semibold text-[#0F172A] dark:text-[#ECFDF5] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Pilih Ulang Profil Awal</span>
                  </button>
                )}
              </section>
            )}
          </div>
        </form>

        {/* Full Family Management Hub embedded directly inside Profile Menu */}
        {!isOnboarding && !isAddMode && selectedChoice === "family" && familyHubContent && (
          <div className="pt-2 border-t border-emerald-100/80 dark:border-emerald-900/50">
            {familyHubContent}
          </div>
        )}
      </div>
    </div>
  );
};
