import React, { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Apple,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Moon,
  Pencil,
  Plus,
  ReceiptText,
  Sparkles,
  Sun,
  Sunrise,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import type {
  DetectedFoodItem,
  FoodLogEntry,
  MealType,
  UserProfile,
} from "../types";
import {
  FOOD_EXAMPLE_PROMPTS,
  MEAL_OPTIONS,
  formatDateIndo,
  getTodayDateKey,
} from "../utils/nutrition";
import { postJsonApi } from "../utils/api";
import { compressImageFile } from "../utils/image";

interface FoodLoggerViewProps {
  profile: UserProfile;
  foodLogs: FoodLogEntry[];
  dailyCalorieTarget: number;
  onAddFood: (entry: Omit<FoodLogEntry, "id" | "createdAt">) => void;
  onUpdateFood: (
    id: string,
    updates: Partial<Pick<FoodLogEntry, "portionNote" | "calories" | "carbs" | "protein" | "fat">>
  ) => void;
  onDeleteFood: (id: string) => void;
}

const MEAL_ICONS: Record<MealType, React.ComponentType<{ className?: string }>> = {
  sarapan: Sunrise,
  makan_siang: Sun,
  makan_malam: Moon,
  camilan: Apple,
};

export const FoodLoggerView: React.FC<FoodLoggerViewProps> = ({
  profile,
  foodLogs,
  dailyCalorieTarget,
  onAddFood,
  onUpdateFood,
  onDeleteFood,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateKey());
  const [mealType, setMealType] = useState<MealType>("sarapan");
  const [entryMode, setEntryMode] = useState<"ai" | "photo" | "manual">("ai");

  // AI Mode state
  const [aiDescription, setAiDescription] = useState<string>("");
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");
  const [pendingReceipt, setPendingReceipt] = useState<Omit<
    FoodLogEntry,
    "id" | "createdAt"
  > | null>(null);
  const [savedToast, setSavedToast] = useState<string>("");

  // Photo Scan Mode state
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [photoBase64, setPhotoBase64] = useState<string>("");
  const [photoMimeType, setPhotoMimeType] = useState<string>("image/jpeg");
  const [photoNote, setPhotoNote] = useState<string>("");
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const photoGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const photoCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Manual Mode state
  const [manualName, setManualName] = useState<string>("");
  const [manualPortion, setManualPortion] = useState<string>("1 porsi");
  const [manualCalories, setManualCalories] = useState<string>("");
  const [manualCarbs, setManualCarbs] = useState<string>("");
  const [manualProtein, setManualProtein] = useState<string>("");
  const [manualFat, setManualFat] = useState<string>("");

  // Inline Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPortion, setEditPortion] = useState<string>("");
  const [editCalories, setEditCalories] = useState<string>("");
  const [editCarbs, setEditCarbs] = useState<string>("");
  const [editProtein, setEditProtein] = useState<string>("");
  const [editFat, setEditFat] = useState<string>("");

  const dayFoods = useMemo(
    () => foodLogs.filter((item) => item.date === selectedDate),
    [foodLogs, selectedDate]
  );

  const mealCaloriesMap = useMemo(() => {
    const map: Record<MealType, number> = {
      sarapan: 0,
      makan_siang: 0,
      makan_malam: 0,
      camilan: 0,
    };
    dayFoods.forEach((f) => {
      map[f.mealType] += f.calories;
    });
    return map;
  }, [dayFoods]);

  const dayTotals = useMemo(() => {
    return dayFoods.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
        protein: Math.round((acc.protein + item.protein) * 10) / 10,
        fat: Math.round((acc.fat + item.fat) * 10) / 10,
      }),
      { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );
  }, [dayFoods]);

  const handleAiEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = aiDescription.trim();
    if (!trimmed || isEstimating) return;

    setIsEstimating(true);
    setAiError("");
    setPendingReceipt(null);
    setSavedToast("");

    try {
      const mealLabel =
        MEAL_OPTIONS.find((m) => m.id === mealType)?.label ?? "Makanan";

      const data = await postJsonApi<{
        foodName: string;
        portionNote: string;
        calories: number;
        carbs: number;
        protein: number;
        fat: number;
        assumptions?: string;
        calorieRange?: string;
        confidenceLevel?: "tinggi" | "sedang" | "perkiraan_kasar";
        nutritionTip?: string;
      }>(
        "/api/ai/estimate-food",
        {
          description: trimmed,
          mealType: mealLabel,
          userCategory: profile.category,
          isBreastfeeding: profile.isBreastfeeding,
          medicalNotes: profile.medicalNotes,
        },
        {
          timeoutMs: 50000,
          fallbackError: "Gagal menghitung estimasi gizi dengan AI.",
        }
      );

      setPendingReceipt({
        date: selectedDate,
        mealType,
        foodName: data.foodName,
        portionNote: data.portionNote,
        calories: data.calories,
        carbs: data.carbs,
        protein: data.protein,
        fat: data.fat,
        assumptions: data.assumptions,
        calorieRange: data.calorieRange,
        confidenceLevel: data.confidenceLevel,
        nutritionTip: data.nutritionTip,
        source: "ai",
      });
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menghubungi layanan AI."
      );
    } finally {
      setIsEstimating(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAiError("");
    setSavedToast("");
    setPendingReceipt(null);
    setIsCompressingPhoto(true);
    try {
      const compressed = await compressImageFile(file, 1024, 0.82);
      setPhotoPreview(compressed.previewDataUrl);
      setPhotoBase64(compressed.base64);
      setPhotoMimeType(compressed.mimeType);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : "Gagal memproses file foto makanan."
      );
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handlePhotoEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoBase64 || isEstimating) return;

    setIsEstimating(true);
    setAiError("");
    setPendingReceipt(null);
    setSavedToast("");

    try {
      const mealLabel =
        MEAL_OPTIONS.find((m) => m.id === mealType)?.label ?? "Makanan";

      const data = await postJsonApi<{
        foodName: string;
        portionNote: string;
        calories: number;
        carbs: number;
        protein: number;
        fat: number;
        assumptions?: string;
        calorieRange?: string;
        confidenceLevel?: "tinggi" | "sedang" | "perkiraan_kasar";
        nutritionTip?: string;
        detectedItems?: DetectedFoodItem[];
      }>(
        "/api/ai/analyze-food-photo",
        {
          imageBase64: photoBase64,
          mimeType: photoMimeType,
          mealType: mealLabel,
          contextNote: photoNote.trim(),
          userCategory: profile.category,
          isBreastfeeding: profile.isBreastfeeding,
          medicalNotes: profile.medicalNotes,
        },
        {
          timeoutMs: 55000,
          fallbackError: "Gagal membaca foto makanan dengan AI.",
        }
      );

      setPendingReceipt({
        date: selectedDate,
        mealType,
        foodName: data.foodName,
        portionNote: data.portionNote,
        calories: data.calories,
        carbs: data.carbs,
        protein: data.protein,
        fat: data.fat,
        assumptions: data.assumptions,
        calorieRange: data.calorieRange,
        confidenceLevel: data.confidenceLevel,
        nutritionTip: data.nutritionTip,
        detectedItems: data.detectedItems,
        source: "ai",
      });
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menganalisis foto makanan."
      );
    } finally {
      setIsEstimating(false);
    }
  };

  const handleConfirmSaveReceipt = () => {
    if (!pendingReceipt) return;
    onAddFood({
      ...pendingReceipt,
      date: selectedDate,
      mealType,
    });
    setSavedToast(`${pendingReceipt.foodName} (${pendingReceipt.calories} kkal) tersimpan.`);
    setPendingReceipt(null);
    setAiDescription("");
    setPhotoNote("");
    setPhotoPreview("");
    setPhotoBase64("");
    setTimeout(() => setSavedToast(""), 3000);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = manualName.trim();
    const kcal = Math.round(Number(manualCalories) || 0);
    if (!name || kcal <= 0) return;

    onAddFood({
      date: selectedDate,
      mealType,
      foodName: name,
      portionNote: manualPortion.trim() || "1 porsi",
      calories: kcal,
      carbs: Math.max(0, Number(manualCarbs) || 0),
      protein: Math.max(0, Number(manualProtein) || 0),
      fat: Math.max(0, Number(manualFat) || 0),
      source: "manual",
    });

    setManualName("");
    setManualCalories("");
    setManualCarbs("");
    setManualProtein("");
    setManualFat("");
  };

  const startEdit = (item: FoodLogEntry) => {
    setEditingId(item.id);
    setEditPortion(item.portionNote);
    setEditCalories(String(item.calories));
    setEditCarbs(String(item.carbs));
    setEditProtein(String(item.protein));
    setEditFat(String(item.fat));
  };

  const saveEdit = (id: string) => {
    onUpdateFood(id, {
      portionNote: editPortion.trim() || "1 porsi",
      calories: Math.max(0, Math.round(Number(editCalories) || 0)),
      carbs: Math.max(0, Math.round((Number(editCarbs) || 0) * 10) / 10),
      protein: Math.max(0, Math.round((Number(editProtein) || 0) * 10) / 10),
      fat: Math.max(0, Math.round((Number(editFat) || 0) * 10) / 10),
    });
    setEditingId(null);
  };

  const getConfidenceMeta = (level?: FoodLogEntry["confidenceLevel"]) => {
    if (level === "tinggi") {
      return {
        label: "Keyakinan Tinggi",
        textClass: "text-emerald-700 dark:text-emerald-300",
      };
    }
    if (level === "perkiraan_kasar") {
      return {
        label: "Perkiraan Kasar",
        textClass: "text-amber-700 dark:text-amber-400",
      };
    }
    return {
      label: "Keyakinan Sedang",
      textClass: "text-sky-700 dark:text-sky-300",
    };
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5]">
            Pencatat Makanan & Estimasi AI
          </h1>
          <p className="text-sm text-[#64748B] dark:text-emerald-200/75">
            Pencatatan untuk{" "}
            <strong className="text-[#10B981] dark:text-[#34D399]">{profile.name}</strong> · Tulis
            menu makanan dan tinjau struk estimasi gizinya sebelum disimpan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Calendar className="w-4 h-4 text-[#10B981]" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value || getTodayDateKey())}
            aria-label="Pilih tanggal pencatatan makanan"
            className="h-10 px-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0B1F17] text-sm font-mono text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
          />
        </div>
      </div>

      {/* Expressive Meal Time Mini Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {MEAL_OPTIONS.map((meal) => {
          const Icon = MEAL_ICONS[meal.id];
          const active = mealType === meal.id;
          const mealKcal = mealCaloriesMap[meal.id];
          return (
            <button
              key={meal.id}
              type="button"
              onClick={() => setMealType(meal.id)}
              className={`p-4 rounded-3xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-3 min-h-[104px] ${
                active
                  ? "border-[#10B981] bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/70 dark:to-[#0B1F17] shadow-md shadow-emerald-500/15 ring-1 ring-[#10B981]"
                  : "border-emerald-100/90 dark:border-emerald-900/60 bg-white/95 dark:bg-[#0B1F17]/95 hover:border-emerald-300 dark:hover:border-emerald-700"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    active
                      ? "bg-gradient-to-br from-[#10B981] to-[#34D399] text-white"
                      : "bg-[#F8FAFC] dark:bg-[#102A20] text-[#10B981]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-mono tabular-nums font-semibold text-[#10B981] dark:text-[#34D399]">
                  {mealKcal} kkal
                </span>
              </div>
              <div>
                <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                  {meal.label}
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-emerald-200/65">
                  {meal.timeHint}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Input Card */}
      <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-5">
        {/* Mode Switch: AI Text vs Scan Photo vs Manual */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-[#F1F5F9] dark:bg-[#071610]">
            <button
              type="button"
              onClick={() => {
                setEntryMode("ai");
                setAiError("");
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                entryMode === "ai"
                  ? "bg-white dark:bg-[#123024] text-[#0F172A] dark:text-white shadow-xs"
                  : "text-[#64748B] dark:text-emerald-200/70 hover:text-[#0F172A] dark:hover:text-white"
              }`}
            >
              Teks AI
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryMode("photo");
                setAiError("");
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                entryMode === "photo"
                  ? "bg-white dark:bg-[#123024] text-[#0F172A] dark:text-white shadow-xs"
                  : "text-[#64748B] dark:text-emerald-200/70 hover:text-[#0F172A] dark:hover:text-white"
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Scan Foto Makanan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryMode("manual");
                setAiError("");
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                entryMode === "manual"
                  ? "bg-white dark:bg-[#123024] text-[#0F172A] dark:text-white shadow-xs"
                  : "text-[#64748B] dark:text-emerald-200/70 hover:text-[#0F172A] dark:hover:text-white"
              }`}
            >
              Input Manual
            </button>
          </div>
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Untuk: {MEAL_OPTIONS.find((m) => m.id === mealType)?.label}
          </span>
        </div>

        {entryMode === "ai" || entryMode === "photo" ? (
          <div className="space-y-4">
            {entryMode === "ai" ? (
              <form onSubmit={handleAiEstimate} className="space-y-4">
                <div>
                  <label
                    htmlFor="ai-food-input"
                    className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1.5"
                  >
                    Deskripsikan makanan & porsinya
                  </label>
                  <textarea
                    id="ai-food-input"
                    rows={3}
                    value={aiDescription}
                    onChange={(e) => setAiDescription(e.target.value)}
                    placeholder="Contoh: 1 mangkuk sayur katuk, nasi merah, dan ayam bakar"
                    className="w-full p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-emerald-200/40 focus:outline-none focus:border-[#10B981] focus:bg-white dark:focus:bg-[#0B1F17] resize-none transition-colors"
                    required
                  />
                </div>

                {/* Quick Example Chips */}
                <div className="space-y-1.5">
                  <div className="text-xs text-[#64748B] dark:text-emerald-200/70">
                    Contoh cepat (klik untuk mengisi):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FOOD_EXAMPLE_PROMPTS.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setAiDescription(example)}
                        className="text-left px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800/80 bg-[#F8FAFC] dark:bg-[#102A20] hover:bg-emerald-50 dark:hover:bg-[#143528] text-xs text-[#334155] dark:text-emerald-100 transition-colors cursor-pointer"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                {aiError && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{aiError}</span>
                  </div>
                )}

                {savedToast && (
                  <div className="flex items-center gap-2 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{savedToast}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-[11px] text-[#64748B] dark:text-emerald-200/65 leading-relaxed">
                    Estimasi mengacu pada TKPI & prinsip energi Atwater. Anda dapat meninjau struk gizi
                    sebelum menyimpannya.
                  </p>
                  <button
                    type="submit"
                    disabled={isEstimating || !aiDescription.trim()}
                    className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-[#0F172A] dark:bg-gradient-to-r dark:from-[#10B981] dark:to-[#34D399] hover:opacity-95 disabled:opacity-50 text-white text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-md shadow-emerald-900/15"
                  >
                    {isEstimating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menghitung gizi...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Hitung dengan AI</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePhotoEstimate} className="space-y-4">
                <input
                  ref={photoGalleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <input
                  ref={photoCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {!photoPreview ? (
                  <div className="rounded-3xl border border-dashed border-emerald-300 dark:border-emerald-700/80 bg-[#F8FAFC] dark:bg-[#071610] p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 dark:bg-emerald-900/50 text-[#10B981] mx-auto flex items-center justify-center">
                      {isCompressingPhoto ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                        Foto Piring Warteg, Restoran, atau Masakan Rumah
                      </p>
                      <p className="text-xs text-[#64748B] dark:text-emerald-200/70 max-w-md mx-auto">
                        AI akan membaca tiap jenis lauk di foto, memperkirakan porsi, kalori, serta rincian karbohidrat, protein, dan lemaknya.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                      <button
                        type="button"
                        disabled={isCompressingPhoto}
                        onClick={() => photoCameraInputRef.current?.click()}
                        className="h-10 px-4 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#34D399] hover:opacity-95 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 shadow-sm shadow-emerald-500/20"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Ambil Foto Kamera</span>
                      </button>
                      <button
                        type="button"
                        disabled={isCompressingPhoto}
                        onClick={() => photoGalleryInputRef.current?.click()}
                        className="h-10 px-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#102A20] hover:bg-emerald-50 dark:hover:bg-[#143528] text-xs font-semibold text-[#0F172A] dark:text-[#ECFDF5] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <ImagePlus className="w-4 h-4 text-[#10B981]" />
                        <span>Pilih dari Galeri</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] p-4 flex flex-col sm:flex-row gap-4 items-start">
                    <div className="relative w-full sm:w-44 h-44 rounded-2xl overflow-hidden border border-emerald-200/80 dark:border-emerald-800 shrink-0 bg-black/5">
                      <img
                        src={photoPreview}
                        alt="Pratinjau foto makanan"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview("");
                          setPhotoBase64("");
                          setPendingReceipt(null);
                        }}
                        aria-label="Hapus foto makanan"
                        className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-black/65 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 w-full space-y-3">
                      <div>
                        <label
                          htmlFor="photo-food-note"
                          className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1.5"
                        >
                          Catatan tambahan (opsional)
                        </label>
                        <input
                          id="photo-food-note"
                          type="text"
                          value={photoNote}
                          onChange={(e) => setPhotoNote(e.target.value)}
                          placeholder="Contoh: nasi cuma setengah porsi, kuah rendang dipisah, tanpa kulit"
                          className="w-full h-11 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0B1F17] text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-emerald-200/40 focus:outline-none focus:border-[#10B981]"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => photoGalleryInputRef.current?.click()}
                          className="h-9 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#102A20] text-xs font-medium text-[#334155] dark:text-emerald-200 hover:bg-emerald-50 cursor-pointer whitespace-nowrap"
                        >
                          Ganti Foto
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {aiError && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{aiError}</span>
                  </div>
                )}

                {savedToast && (
                  <div className="flex items-center gap-2 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{savedToast}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-[11px] text-[#64748B] dark:text-emerald-200/65 leading-relaxed">
                    Cocok untuk foto piring warteg, masakan Padang, prasmanan, atau menu kafe sebelum Anda menyantapnya.
                  </p>
                  <button
                    type="submit"
                    disabled={isEstimating || !photoBase64 || isCompressingPhoto}
                    className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-[#0F172A] dark:bg-gradient-to-r dark:from-[#10B981] dark:to-[#34D399] hover:opacity-95 disabled:opacity-50 text-white text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-md shadow-emerald-900/15"
                  >
                    {isEstimating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Membaca foto & gizi...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Baca Nutrisi Foto</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Botanical Shimmer Skeleton while AI computes */}
            {isEstimating && (
              <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] p-5 space-y-4 animate-shimmer">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-44 rounded-lg bg-emerald-200/60 dark:bg-emerald-900/60" />
                  <div className="h-5 w-20 rounded-lg bg-emerald-200/60 dark:bg-emerald-900/60" />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((k) => (
                    <div
                      key={k}
                      className="h-14 rounded-2xl bg-emerald-100/70 dark:bg-emerald-900/40"
                    />
                  ))}
                </div>
                <div className="h-3 w-3/4 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40" />
              </div>
            )}

            {/* Nutrition Receipt Card ("Struk Gizi Estimasi AI") */}
            {pendingReceipt && !isEstimating && (
              <div className="rounded-3xl border border-emerald-300 dark:border-emerald-700 bg-gradient-to-b from-[#F4FCF8] to-white dark:from-[#0E281D] dark:to-[#071610] p-5 sm:p-6 space-y-4 shadow-md shadow-emerald-500/10">
                <div className="flex items-start justify-between gap-3 border-b border-dashed border-emerald-200 dark:border-emerald-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <ReceiptText className="w-4 h-4" />
                      <span>Struk Gizi Estimasi AI</span>
                      <span aria-hidden="true">·</span>
                      <span className={getConfidenceMeta(pendingReceipt.confidenceLevel).textClass}>
                        {getConfidenceMeta(pendingReceipt.confidenceLevel).label}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
                      {pendingReceipt.foodName}
                    </h3>
                    <p className="text-xs text-[#64748B] dark:text-emerald-200/70">
                      {pendingReceipt.portionNote}
                      {pendingReceipt.calorieRange
                        ? ` · Rentang wajar ${pendingReceipt.calorieRange}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingReceipt(null)}
                    aria-label="Tutup struk estimasi"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Receipt Nutrition Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="rounded-2xl bg-white dark:bg-[#0B1F17] p-3 border border-emerald-100 dark:border-emerald-900">
                    <div className="text-[11px] text-[#64748B] dark:text-emerald-200/65">
                      Energi Total
                    </div>
                    <div className="text-lg font-bold font-mono tabular-nums text-[#0F172A] dark:text-white mt-0.5">
                      {pendingReceipt.calories} <span className="text-xs font-normal">kkal</span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-[#0B1F17] p-3 border border-emerald-100 dark:border-emerald-900">
                    <div className="text-[11px] text-[#64748B] dark:text-emerald-200/65">
                      Karbohidrat
                    </div>
                    <div className="text-lg font-bold font-mono tabular-nums text-[#10B981] dark:text-[#34D399] mt-0.5">
                      {pendingReceipt.carbs}g
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-[#0B1F17] p-3 border border-emerald-100 dark:border-emerald-900">
                    <div className="text-[11px] text-[#64748B] dark:text-emerald-200/65">
                      Protein
                    </div>
                    <div className="text-lg font-bold font-mono tabular-nums text-lime-600 dark:text-lime-400 mt-0.5">
                      {pendingReceipt.protein}g
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-[#0B1F17] p-3 border border-emerald-100 dark:border-emerald-900">
                    <div className="text-[11px] text-[#64748B] dark:text-emerald-200/65">
                      Lemak
                    </div>
                    <div className="text-lg font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">
                      {pendingReceipt.fat}g
                    </div>
                  </div>
                </div>

                {pendingReceipt.detectedItems && pendingReceipt.detectedItems.length > 0 && (
                  <div className="rounded-2xl bg-white dark:bg-[#0B1F17] border border-emerald-100 dark:border-emerald-900/70 p-3.5 space-y-2">
                    <div className="text-[11px] font-semibold text-[#334155] dark:text-emerald-200/85">
                      Komponen Terdeteksi di Foto ({pendingReceipt.detectedItems.length} item)
                    </div>
                    <div className="divide-y divide-emerald-100/70 dark:divide-emerald-900/50">
                      {pendingReceipt.detectedItems.map((det, idx) => (
                        <div
                          key={`${det.name}_${idx}`}
                          className="py-1.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-medium text-[#0F172A] dark:text-white">
                              {det.name}
                            </span>
                            <span className="text-[#64748B] dark:text-emerald-200/70">
                              {" "}· {det.portion}
                            </span>
                          </div>
                          <span className="font-mono tabular-nums text-[11px] text-[#10B981] dark:text-[#34D399] shrink-0">
                            {det.calories} kkal · P {det.protein}g
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pendingReceipt.assumptions && (
                  <p className="text-xs text-[#334155] dark:text-emerald-100/80">
                    <strong className="text-[#0F172A] dark:text-white">Asumsi bahan:</strong>{" "}
                    {pendingReceipt.assumptions}
                  </p>
                )}

                {pendingReceipt.nutritionTip && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    <strong className="font-semibold">Catatan Gizi:</strong>{" "}
                    {pendingReceipt.nutritionTip}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row sm:justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setPendingReceipt(null)}
                    className="h-11 px-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-[#64748B] dark:text-emerald-200/80 hover:bg-slate-50 dark:hover:bg-[#102A20] cursor-pointer"
                  >
                    Ulangi Input
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSaveReceipt}
                    className="h-11 px-6 rounded-2xl bg-gradient-to-r from-[#10B981] via-[#34D399] to-[#84CC16] hover:opacity-95 text-[#062216] text-sm font-bold shadow-md shadow-emerald-500/25 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan ke Daftar Harian</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1">
                  Nama Makanan
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Contoh: Dada ayam panggang"
                  className="w-full h-11 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-sm text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1">
                  Takaran / Porsi
                </label>
                <input
                  type="text"
                  value={manualPortion}
                  onChange={(e) => setManualPortion(e.target.value)}
                  placeholder="Contoh: 150 gram / 1 porsi"
                  className="w-full h-11 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-sm text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1">
                  Kalori (kkal) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                  placeholder="250"
                  className="w-full h-11 px-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-sm font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1">
                  Karbo (g)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={manualCarbs}
                  onChange={(e) => setManualCarbs(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 px-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-sm font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1">
                  Protein (g)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={manualProtein}
                  onChange={(e) => setManualProtein(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 px-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-sm font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#334155] dark:text-emerald-200/85 mb-1">
                  Lemak (g)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={manualFat}
                  onChange={(e) => setManualFat(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 px-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-sm font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#10B981] text-white text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah ke Daftar</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Daily Food List Grouped by Meal Time */}
      <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-100 dark:border-emerald-900/60 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
              Daftar Makanan · {formatDateIndo(selectedDate)}
            </h2>
            <p className="text-xs text-[#64748B] dark:text-emerald-200/70 font-mono tabular-nums mt-0.5">
              Total: {dayTotals.calories.toLocaleString("id-ID")} /{" "}
              {dailyCalorieTarget.toLocaleString("id-ID")} kkal · Karbo{" "}
              {dayTotals.carbs}g · Protein {dayTotals.protein}g · Lemak{" "}
              {dayTotals.fat}g
            </p>
          </div>
        </div>

        {dayFoods.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Utensils className="w-8 h-8 text-emerald-400/70 mx-auto" />
            <p className="text-sm font-medium text-[#0F172A] dark:text-[#ECFDF5]">
              Belum ada makanan yang dicatat pada tanggal ini
            </p>
            <p className="text-xs text-[#64748B] dark:text-emerald-200/65 max-w-md mx-auto">
              Gunakan kolom Estimasi Otomatis AI di atas untuk mencatat makanan pertama Anda hari ini.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {MEAL_OPTIONS.map((meal) => {
              const items = dayFoods.filter((f) => f.mealType === meal.id);
              if (items.length === 0) return null;
              const mealKcal = items.reduce((sum, i) => sum + i.calories, 0);

              return (
                <div key={meal.id} className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#334155] dark:text-emerald-100">
                    <span>{meal.label}</span>
                    <span className="font-mono tabular-nums text-[#10B981] dark:text-[#34D399]">
                      {mealKcal.toLocaleString("id-ID")} kkal
                    </span>
                  </div>

                  <div className="divide-y divide-emerald-100/70 dark:divide-emerald-900/50 border-t border-b border-emerald-100/70 dark:border-emerald-900/50">
                    {items.map((item) => {
                      const isEditing = editingId === item.id;
                      if (isEditing) {
                        return (
                          <div key={item.id} className="py-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                                Edit: {item.foodName}
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="text-xs text-[#64748B] dark:text-emerald-200/70 hover:text-[#0F172A] flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Batal</span>
                              </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                              <div className="col-span-2 sm:col-span-1">
                                <label className="block text-[11px] text-[#64748B] dark:text-emerald-200/70 mb-1">
                                  Porsi
                                </label>
                                <input
                                  type="text"
                                  value={editPortion}
                                  onChange={(e) => setEditPortion(e.target.value)}
                                  className="w-full h-9 px-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-[#64748B] dark:text-emerald-200/70 mb-1">
                                  Kalori (kkal)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={editCalories}
                                  onChange={(e) => setEditCalories(e.target.value)}
                                  className="w-full h-9 px-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-xs font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-[#64748B] dark:text-emerald-200/70 mb-1">
                                  Karbo (g)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.1"
                                  value={editCarbs}
                                  onChange={(e) => setEditCarbs(e.target.value)}
                                  className="w-full h-9 px-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-xs font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-[#64748B] dark:text-emerald-200/70 mb-1">
                                  Protein (g)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.1"
                                  value={editProtein}
                                  onChange={(e) => setEditProtein(e.target.value)}
                                  className="w-full h-9 px-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-xs font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-[#64748B] dark:text-emerald-200/70 mb-1">
                                  Lemak (g)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.1"
                                  value={editFat}
                                  onChange={(e) => setEditFat(e.target.value)}
                                  className="w-full h-9 px-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#071610] text-xs font-mono tabular-nums text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981]"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const atwater = Math.round(
                                    (Number(editCarbs) || 0) * 4 +
                                      (Number(editProtein) || 0) * 4 +
                                      (Number(editFat) || 0) * 9
                                  );
                                  if (atwater > 0) setEditCalories(String(atwater));
                                }}
                                className="text-[11px] font-medium text-[#10B981] dark:text-[#34D399] hover:underline text-left cursor-pointer"
                              >
                                Samakan kalori dengan makro Atwater (
                                {Math.round(
                                  (Number(editCarbs) || 0) * 4 +
                                    (Number(editProtein) || 0) * 4 +
                                    (Number(editFat) || 0) * 9
                                )}{" "}
                                kkal)
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEdit(item.id)}
                                className="h-9 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer self-end"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Simpan Perubahan</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={item.id}
                          className="py-3 flex items-start justify-between gap-4"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-sm font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                                {item.foodName}
                              </span>
                              <span className="text-[11px] text-[#64748B] dark:text-emerald-200/70">
                                · {item.portionNote}
                              </span>
                              {item.source === "ai" && item.confidenceLevel && (
                                <span
                                  className={`text-[11px] font-medium ${getConfidenceMeta(item.confidenceLevel).textClass}`}
                                >
                                  · {getConfidenceMeta(item.confidenceLevel).label}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono tabular-nums text-[#64748B] dark:text-emerald-200/75">
                              Karbo {item.carbs}g · Protein {item.protein}g · Lemak{" "}
                              {item.fat}g
                              {item.calorieRange ? ` · Rentang ${item.calorieRange}` : ""}
                            </div>
                            {item.detectedItems && item.detectedItems.length > 0 && (
                              <p className="text-[11px] text-[#64748B] dark:text-emerald-200/70">
                                Terbaca di foto:{" "}
                                {item.detectedItems
                                  .map((d) => `${d.name} (${d.calories} kkal)`)
                                  .join(" · ")}
                              </p>
                            )}
                            {item.assumptions && (
                              <p className="text-[11px] text-[#64748B] dark:text-emerald-200/65">
                                Asumsi: {item.assumptions}
                              </p>
                            )}
                            {item.nutritionTip && (
                              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                {item.nutritionTip}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-sm font-mono tabular-nums font-bold text-[#0F172A] dark:text-white mr-1">
                              {item.calories} kkal
                            </span>
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              aria-label={`Edit ${item.foodName}`}
                              className="min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteFood(item.id)}
                              aria-label={`Hapus ${item.foodName}`}
                              className="min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
