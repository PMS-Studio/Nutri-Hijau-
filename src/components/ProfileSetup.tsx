import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Baby,
  Check,
  ChevronDown,
  ChevronUp,
  HeartHandshake,
  Info,
  Moon,
  ShieldCheck,
  Sprout,
  Sun,
  User,
  UserCheck,
} from "lucide-react";
import type {
  ActivityLevel,
  DietCategory,
  Gender,
  LactationStage,
  UserProfile,
} from "../types";
import {
  ACTIVITY_OPTIONS,
  CATEGORY_LIST,
  CATEGORY_MAP,
  calculateNutritionPlan,
} from "../utils/nutrition";
import type { ThemeMode } from "../utils/storage";

interface ProfileSetupProps {
  initialProfile: UserProfile | null;
  isOnboarding: boolean;
  onSave: (profile: UserProfile) => void;
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

export const ProfileSetup: React.FC<ProfileSetupProps> = ({
  initialProfile,
  isOnboarding,
  onSave,
  theme = "light",
  onToggleTheme,
}) => {
  const [category, setCategory] = useState<DietCategory>(
    initialProfile?.category ?? "adult_female"
  );
  const [name, setName] = useState<string>(initialProfile?.name ?? "");
  const [gender, setGender] = useState<Gender>(
    initialProfile?.gender ?? "female"
  );
  const [age, setAge] = useState<string>(
    String(
      initialProfile?.age ??
        CATEGORY_MAP[initialProfile?.category ?? "adult_female"].defaultAge
    )
  );
  const [currentWeight, setCurrentWeight] = useState<string>(
    String(
      initialProfile?.currentWeight ??
        CATEGORY_MAP[initialProfile?.category ?? "adult_female"].defaultWeight
    )
  );
  const [height, setHeight] = useState<string>(
    String(
      initialProfile?.height ??
        CATEGORY_MAP[initialProfile?.category ?? "adult_female"].defaultHeight
    )
  );
  const [targetWeight, setTargetWeight] = useState<string>(
    String(
      initialProfile?.targetWeight ??
        CATEGORY_MAP[initialProfile?.category ?? "adult_female"].defaultTargetWeight
    )
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initialProfile?.activityLevel ?? "light"
  );
  const [isBreastfeeding, setIsBreastfeeding] = useState<boolean>(
    initialProfile?.isBreastfeeding ?? true
  );
  const [lactationStage, setLactationStage] = useState<LactationStage>(
    initialProfile?.lactationStage ?? "exclusive_0_6"
  );
  const [medicalNotes, setMedicalNotes] = useState<string>(
    initialProfile?.medicalNotes ?? ""
  );
  const [showMethodology, setShowMethodology] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const handleCategorySelect = (nextCat: DietCategory) => {
    setCategory(nextCat);
    setErrorMsg("");
    const meta = CATEGORY_MAP[nextCat];
    setGender(meta.defaultGender);
    if (!initialProfile || initialProfile.category !== nextCat) {
      setAge(String(meta.defaultAge));
      setCurrentWeight(String(meta.defaultWeight));
      setHeight(String(meta.defaultHeight));
      setTargetWeight(String(meta.defaultTargetWeight));
      if (nextCat === "postpartum") {
        setIsBreastfeeding(true);
      }
    }
  };

  const draftProfile: UserProfile = useMemo(() => {
    const effectiveGender: Gender =
      category === "adult_male"
        ? "male"
        : category === "postpartum" || category === "adult_female"
          ? "female"
          : gender;

    return {
      name: name.trim() || "Sahabat Sehat",
      category,
      gender: effectiveGender,
      age: Number(age) || CATEGORY_MAP[category].defaultAge,
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
    name,
    category,
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

  // Compute live gauge pin position (%) along spectrum bar
  const bmiGaugePercent = useMemo(() => {
    if (category === "child_teen") {
      const z = previewPlan.childZScore ?? 0;
      // Map Z-score [-3 .. +3] to [4% .. 96%]
      return Math.max(4, Math.min(96, ((z + 3) / 6) * 100));
    }
    // Map adult BMI [15 .. 35] cleanly across 5 equal segments:
    // <18.5 (0-20%), 18.5-22.9 (20-40%), 23-24.9 (40-60%), 25-29.9 (60-80%), >=30 (80-100%)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        "Untuk usia di atas 18 tahun, silakan pilih kategori Wanita Dewasa atau Pria Dewasa."
      );
      return;
    }
    if (category !== "child_teen" && numAge < 18) {
      setErrorMsg(
        "Untuk usia di bawah 18 tahun, silakan pilih kategori Anak / Remaja."
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
    if (!isOnboarding) {
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
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#10B981] to-[#34D399] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-500/20">
                  NH
                </div>
                <span className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5]">
                  NutriHijau
                </span>
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5] pt-2">
              Atur Profil & Target Kalori Personal Anda
            </h1>
            <p className="text-sm sm:text-base text-[#64748B] dark:text-emerald-200/75 max-w-2xl leading-relaxed">
              Pilih kategori kondisi tubuh Anda terlebih dahulu agar perhitungan BMR, TDEE,
              kebutuhan air minum, dan saran pelatih AI sesuai dengan kebutuhan gizi yang aman.
            </p>
          </header>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5]">
                Profil & Kalkulator Target
              </h1>
              <p className="text-sm text-[#64748B] dark:text-emerald-200/75">
                Sesuaikan kategori diet, data tubuh, dan aktivitas untuk memperbarui target harian Anda.
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left Column: Category Selection + Profile Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: 4 Category Cards with distinct soft pastel accents */}
            <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                  1. Pilih Kategori Diet
                </h2>
                <p className="text-xs text-[#64748B] dark:text-emerald-200/70 mt-0.5">
                  Menentukan rumus defisit kalori, target cairan, dan panduan keamanan AI
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORY_LIST.map((item) => {
                  const style = CATEGORY_STYLES[item.id];
                  const Icon = style.icon;
                  const selected = category === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleCategorySelect(item.id)}
                      className={`text-left p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between gap-2.5 min-h-[118px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
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
              </div>

              {/* Postpartum Breastfeeding Checkbox & Stage */}
              {category === "postpartum" && (
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

            {/* Step 2: Body Data Form */}
            <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                  2. Data Tubuh & Aktivitas Harian
                </h2>
                <p className="text-xs text-[#64748B] dark:text-emerald-200/70 mt-0.5">
                  Digunakan untuk menghitung BMR, TDEE, BMI, dan kebutuhan kalori harian
                </p>
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
                    placeholder="Contoh: Ibu Rina, Budi, atau Sinta"
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
                  Catatan Kondisi Medis / Pantangan Makanan (Opsional)
                </label>
                <input
                  type="text"
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="Contoh: Riwayat maag/GERD, alergi kacang, pasca-caesar, atau hipertensi ringan"
                  className="w-full h-11 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-emerald-200/40 focus:outline-none focus:border-[#10B981]"
                />
                <p className="text-[11px] text-[#64748B] dark:text-emerald-200/65">
                  Membantu Pelatih AI dan estimator makanan menyesuaikan saran yang lebih aman bagi kondisi Anda.
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
                    ? "Simpan Profil & Mulai Lacak Kalori"
                    : "Perbarui Profil & Target"}
                </span>
              </button>
            </section>
          </div>

          {/* Right Column: Live Calculation Preview */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
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
                  Target Kalori Harian Anda
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

              {/* BMI Spectrum Gauge with Live Marker Pin */}
              <div className="pt-4 pb-1 space-y-2">
                <div className="relative">
                  {/* Pin */}
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
                      3. Keamanan Defisit:
                    </strong>{" "}
                    Defisit otomatis dinonaktifkan bila BMI &lt; 18,5 atau pada kategori
                    Anak/Remaja. Ibu menyusui mendapat tambahan +330 s.d. +450 kkal sesuai fase
                    laktasi.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-emerald-200/60">
                    Catatan: Informasi ini bersifat edukatif untuk pemantauan mandiri dan tidak
                    menggantikan konsultasi dokter atau ahli gizi klinis.
                  </p>
                </div>
              )}
            </section>
          </div>
        </form>
      </div>
    </div>
  );
};
