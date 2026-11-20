import React, { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  CalendarDays,
  Camera,
  Check,
  Coffee,
  ImagePlus,
  Loader2,
  Plus,
  RotateCcw,
  Send,
  Store,
  User as UserIcon,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type {
  ChatMessage,
  FoodLogEntry,
  MealType,
  NutritionPlan,
  PlannedMealItem,
  SuggestedMealReplacement,
  UserProfile,
  WeeklyMealPlan,
} from "../types";
import { getTodayDateKey } from "../utils/nutrition";
import { postJsonApi } from "../utils/api";
import { compressImageFile } from "../utils/image";

type VenueType = "warteg" | "restoran" | "kantin_katering" | "umum";

interface DailyMenuChatbotProps {
  profile: UserProfile;
  plan: NutritionPlan;
  todayFoods: FoodLogEntry[];
  todaySummary: {
    caloriesIn: number;
    caloriesOut: number;
    remainingCalories: number;
    carbs: number;
    protein: number;
    fat: number;
    waterMl: number;
  };
  weeklyPlan?: WeeklyMealPlan | null;
  fixedDayContext?: {
    dayNumber: number;
    dayName: string;
    meals: PlannedMealItem[];
  } | null;
  messages: ChatMessage[];
  onAppendMessages: (msgs: ChatMessage[]) => void;
  onResetChat: () => void;
  onLogMealToToday: (entry: Omit<FoodLogEntry, "id" | "createdAt">) => void;
}

const VENUE_OPTIONS: Array<{
  id: VenueType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "warteg", label: "Warteg / Warung", icon: Store },
  { id: "restoran", label: "Restoran / RM", icon: UtensilsCrossed },
  { id: "kantin_katering", label: "Kantin / Katering", icon: CalendarDays },
  { id: "umum", label: "Kafe / Camilan", icon: Coffee },
];

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  sarapan: "Sarapan",
  makan_siang: "Makan Siang",
  makan_malam: "Makan Malam",
  camilan: "Camilan",
};

export const DailyMenuChatbot: React.FC<DailyMenuChatbotProps> = ({
  profile,
  plan,
  todayFoods,
  todaySummary,
  weeklyPlan = null,
  fixedDayContext = null,
  messages,
  onAppendMessages,
  onResetChat,
  onLogMealToToday,
}) => {
  const [venue, setVenue] = useState<VenueType>("warteg");
  const [selectedPlanDayIdx, setSelectedPlanDayIdx] = useState<string>("today");
  const [input, setInput] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loggedSuggestionIds, setLoggedSuggestionIds] = useState<Record<string, boolean>>({});
  const [attachedPhoto, setAttachedPhoto] = useState<{
    base64: string;
    mimeType: string;
    previewDataUrl: string;
    name: string;
  } | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const activeDayContext = useMemo(() => {
    if (fixedDayContext) {
      return {
        label: `Hari ke-${fixedDayContext.dayNumber} (${fixedDayContext.dayName})`,
        meals: fixedDayContext.meals,
      };
    }
    if (weeklyPlan && selectedPlanDayIdx !== "today") {
      const idx = Number(selectedPlanDayIdx);
      const day = weeklyPlan.days[idx];
      if (day) {
        return {
          label: `Hari ke-${day.dayNumber} (${day.dayName})`,
          meals: day.meals,
        };
      }
    }
    return {
      label: "Menu Harian Hari Ini",
      meals: [] as PlannedMealItem[],
    };
  }, [fixedDayContext, weeklyPlan, selectedPlanDayIdx]);

  const quickPrompts = useMemo(() => {
    const dayLabel = fixedDayContext
      ? `menu ${fixedDayContext.dayName}`
      : "menu harian saya";
    return [
      `Lagi di warteg, adanya ayam goreng, telur balado, tumis kangkung, sayur sop, dan orek tempe. Sebaiknya ambil apa untuk ${dayLabel}?`,
      `Menu rekomendasi hari ini tidak tersedia di restoran ini. Apa menu pengganti yang kalorinya mirip dengan sisa kalori saya?`,
      `Saya mampir ke Rumah Makan Padang / warung nasi, bagaimana cara pesan lauk & atur porsi nasi supaya tetap aman?`,
      `Rekomendasi minuman & camilan di kafe/minimarket yang aman untuk sisa kalori hari ini`,
    ];
  }, [fixedDayContext]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    });
  };

  const handleSelectPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErrorMsg("");
    setIsCompressingPhoto(true);
    try {
      const compressed = await compressImageFile(file, 1024, 0.8);
      setAttachedPhoto({
        base64: compressed.base64,
        mimeType: compressed.mimeType,
        previewDataUrl: compressed.previewDataUrl,
        name: file.name || "foto-menu.jpg",
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal memproses foto menu."
      );
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleSend = async (promptText?: string) => {
    const rawText = (promptText ?? input).trim();
    const photoSnapshot = promptText ? null : attachedPhoto;
    const effectiveText =
      rawText ||
      (photoSnapshot
        ? "Tolong baca pilihan lauk atau menu di foto ini, perkirakan kalorinya, dan pilihkan kombinasi paling pas untuk target gizi saya hari ini."
        : "");

    if (!effectiveText || isSending) return;

    const userMsg: ChatMessage = {
      id: `mc_u_${Date.now()}`,
      role: "user",
      text: effectiveText,
      timestamp: new Date().toISOString(),
      hasPhoto: Boolean(photoSnapshot),
    };

    if (!promptText) {
      setInput("");
      setAttachedPhoto(null);
    }
    setErrorMsg("");
    setIsSending(true);
    onAppendMessages([userMsg]);
    scrollToBottom();

    try {
      const data = await postJsonApi<{
        reply: string;
        suggestedMeal?: SuggestedMealReplacement;
      }>(
        "/api/ai/menu-consult",
        {
          message: effectiveText,
          imageBase64: photoSnapshot?.base64,
          imageMimeType: photoSnapshot?.mimeType,
          history: [...messages, userMsg]
            .slice(-8)
            .map((m) => ({ role: m.role, text: m.text })),
          venue,
          selectedDayLabel: activeDayContext.label,
          dayMeals: activeDayContext.meals.map((m) => ({
            mealType: m.mealType,
            foodName: m.foodName,
            portionNote: m.portionNote,
            calories: m.calories,
          })),
          profile: {
            name: profile.name,
            relationRole: profile.relationRole,
            category: profile.category,
            nutritionFocus: profile.nutritionFocus,
            age: profile.age,
            currentWeight: profile.currentWeight,
            targetWeight: profile.targetWeight,
            isBreastfeeding: profile.isBreastfeeding,
            medicalNotes: profile.medicalNotes,
            dailyCalorieTarget: plan.dailyCalorieTarget,
            proteinTargetG: plan.macroTargets.proteinG,
            waterTargetMl: plan.waterTargetMl,
          },
          todaySummary: {
            ...todaySummary,
            loggedFoods: todayFoods.slice(0, 10).map((f) => ({
              mealType: f.mealType,
              foodName: f.foodName,
              calories: f.calories,
            })),
          },
        },
        {
          timeoutMs: 50000,
          fallbackError: "Gagal menghubungi asisten menu harian.",
        }
      );

      const aiMsg: ChatMessage = {
        id: `mc_m_${Date.now()}`,
        role: "model",
        text: data.reply,
        timestamp: new Date().toISOString(),
        suggestedMeal: data.suggestedMeal,
      };
      onAppendMessages([aiMsg]);
      scrollToBottom();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Terjadi gangguan jaringan saat berkonsultasi."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleLogSuggestedMeal = (
    msgId: string,
    meal: SuggestedMealReplacement
  ) => {
    if (loggedSuggestionIds[msgId]) return;
    onLogMealToToday({
      date: getTodayDateKey(),
      mealType: meal.mealType,
      foodName: meal.foodName,
      portionNote: meal.portionNote,
      calories: meal.calories,
      carbs: meal.carbs,
      protein: meal.protein,
      fat: meal.fat,
      nutritionTip: meal.orderingTip,
      source: "ai",
    });
    setLoggedSuggestionIds((prev) => ({ ...prev, [msgId]: true }));
  };

  return (
    <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-200/80 dark:border-emerald-800/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-emerald-100 dark:border-emerald-900/60">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#34D399] text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
            <Store className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
              Konsultan Penyesuaian Menu Harian (Warteg & Restoran)
            </h2>
            <p className="text-xs text-[#64748B] dark:text-emerald-200/75 leading-relaxed">
              Foto etalase warteg, buku menu, atau tulis lauk yang tersedia agar disesuaikan dengan{" "}
              <strong className="font-mono tabular-nums text-[#10B981] dark:text-[#34D399]">
                sisa {todaySummary.remainingCalories.toLocaleString("id-ID")} kkal
              </strong>{" "}
              hari ini.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!fixedDayContext && weeklyPlan && weeklyPlan.days.length > 0 && (
            <select
              value={selectedPlanDayIdx}
              onChange={(e) => setSelectedPlanDayIdx(e.target.value)}
              aria-label="Pilih konteks hari menu"
              className="h-9 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] text-xs font-semibold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#10B981] cursor-pointer"
            >
              <option value="today">Fokus: Asupan Hari Ini</option>
              {weeklyPlan.days.map((d, idx) => (
                <option key={d.dayName + idx} value={String(idx)}>
                  Menu Hari {d.dayNumber} · {d.dayName}
                </option>
              ))}
            </select>
          )}

          {messages.length > 0 && (
            <button
              type="button"
              onClick={onResetChat}
              className="h-9 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#102A20] hover:bg-emerald-50 dark:hover:bg-[#143528] text-xs font-medium text-[#475569] dark:text-emerald-200 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Bersihkan</span>
            </button>
          )}
        </div>
      </div>

      {/* Venue Selector + Active Day Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {VENUE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = venue === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setVenue(opt.id)}
                className={`h-8 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? "border-[#10B981] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200"
                    : "border-emerald-100 dark:border-emerald-900/60 bg-[#F8FAFC] dark:bg-[#071610] text-[#64748B] dark:text-emerald-200/70 hover:border-emerald-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] font-medium text-[#64748B] dark:text-emerald-200/75">
          Konteks:{" "}
          <strong className="text-[#0F172A] dark:text-white">
            {activeDayContext.label}
          </strong>
          {activeDayContext.meals.length > 0 &&
            ` (${activeDayContext.meals.length} menu rencana)`}
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isSending}
            onClick={() => handleSend(prompt)}
            className="text-left px-3 py-1.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] hover:bg-emerald-50 dark:hover:bg-[#143528] text-[11px] sm:text-xs font-medium text-[#334155] dark:text-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Thread */}
      {messages.length > 0 && (
        <div
          ref={scrollContainerRef}
          className="max-h-[360px] overflow-y-auto space-y-3 pr-1 pt-1"
        >
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            const isLogged = Boolean(loggedSuggestionIds[msg.id]);

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#10B981] to-[#34D399] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] space-y-2.5 ${
                    isUser
                      ? "bg-[#0F172A] dark:bg-[#10B981] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-xs sm:text-sm"
                      : "bg-[#F8FAFC] dark:bg-[#102A20] border border-emerald-100 dark:border-emerald-800/70 text-[#0F172A] dark:text-[#ECFDF5] rounded-2xl rounded-tl-sm px-4 py-3 text-xs sm:text-sm"
                  }`}
                >
                  {isUser && msg.hasPhoto && (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300 dark:text-[#062216]">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Foto etalase / menu dilampirkan</span>
                    </div>
                  )}
                  <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>

                  {!isUser && msg.suggestedMeal && (
                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-700/70 bg-white dark:bg-[#0B1F17] p-3.5 space-y-2.5 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-[#10B981] dark:text-[#34D399]">
                            Rekomendasi Pengganti ·{" "}
                            {MEAL_TYPE_LABELS[msg.suggestedMeal.mealType] ?? "Menu"}
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white leading-snug mt-0.5">
                            {msg.suggestedMeal.foodName}
                          </div>
                        </div>
                        <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#10B981] dark:text-[#34D399] shrink-0">
                          {msg.suggestedMeal.calories} kkal
                        </span>
                      </div>

                      <p className="text-[11px] text-[#334155] dark:text-emerald-100/80">
                        Porsi: {msg.suggestedMeal.portionNote}
                      </p>

                      {msg.suggestedMeal.orderingTip && (
                        <p className="text-[11px] text-[#64748B] dark:text-emerald-200/70">
                          Tips pesan: {msg.suggestedMeal.orderingTip}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-100/80 dark:border-emerald-900/60">
                        <span className="text-[11px] font-mono tabular-nums text-[#64748B] dark:text-emerald-200/75">
                          K {msg.suggestedMeal.carbs}g · P {msg.suggestedMeal.protein}g · L{" "}
                          {msg.suggestedMeal.fat}g
                        </span>
                        <button
                          type="button"
                          disabled={isLogged}
                          onClick={() =>
                            handleLogSuggestedMeal(msg.id, msg.suggestedMeal!)
                          }
                          className={`h-8 px-3 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            isLogged
                              ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 cursor-default"
                              : "bg-gradient-to-r from-[#10B981] to-[#34D399] text-white shadow-xs"
                          }`}
                        >
                          {isLogged ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Tercatat Hari Ini</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>Catat ke Hari Ini</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-emerald-200/75 pl-9">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#10B981]" />
              <span>Menyesuaikan pilihan lauk di {VENUE_OPTIONS.find((v) => v.id === venue)?.label}...</span>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="flex items-start gap-2 p-3 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Attached Photo Preview Strip */}
      {attachedPhoto && (
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20]">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={attachedPhoto.previewDataUrl}
              alt="Pratinjau foto menu"
              className="w-11 h-11 rounded-xl object-cover border border-emerald-200 dark:border-emerald-700 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#0F172A] dark:text-white truncate">
                Foto siap dianalisis AI
              </div>
              <div className="text-[11px] text-[#64748B] dark:text-emerald-200/70 truncate">
                {attachedPhoto.name}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAttachedPhoto(null)}
            aria-label="Hapus lampiran foto"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 pt-1"
      >
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleSelectPhoto}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleSelectPhoto}
          className="hidden"
        />
        <button
          type="button"
          disabled={isSending || isCompressingPhoto}
          onClick={() => cameraInputRef.current?.click()}
          title="Ambil foto etalase warteg / menu"
          aria-label="Ambil foto kamera"
          className="h-11 w-11 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] hover:bg-emerald-50 dark:hover:bg-[#143528] text-[#10B981] flex items-center justify-center cursor-pointer shrink-0 disabled:opacity-50"
        >
          {isCompressingPhoto ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </button>
        <button
          type="button"
          disabled={isSending || isCompressingPhoto}
          onClick={() => galleryInputRef.current?.click()}
          title="Unggah foto menu / makanan dari galeri"
          aria-label="Unggah foto dari galeri"
          className="h-11 w-11 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#102A20] hover:bg-emerald-50 dark:hover:bg-[#143528] text-[#334155] dark:text-emerald-200 flex items-center justify-center cursor-pointer shrink-0 disabled:opacity-50"
        >
          <ImagePlus className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isSending}
          placeholder="Foto etalase atau sebutkan lauk yang ada (mis: ayam bakar, lele, capcay)..."
          className="flex-1 min-w-0 h-11 px-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-emerald-200/40 focus:outline-none focus:border-[#10B981] focus:bg-white dark:focus:bg-[#0B1F17]"
        />
        <button
          type="submit"
          disabled={isSending || (!input.trim() && !attachedPhoto)}
          aria-label="Kirim konsultasi menu harian"
          className="h-11 px-4 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#10B981] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer shrink-0 whitespace-nowrap"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Tanya AI</span>
        </button>
      </form>
    </section>
  );
};
