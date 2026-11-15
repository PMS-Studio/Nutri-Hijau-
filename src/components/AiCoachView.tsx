import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import type {
  ChatMessage,
  ExerciseLogEntry,
  FoodLogEntry,
  NutritionPlan,
  UserProfile,
} from "../types";
import {
  CATEGORY_MAP,
  getQuickPromptsForCategory,
  getTodayDateKey,
} from "../utils/nutrition";

interface AiCoachViewProps {
  profile: UserProfile;
  plan: NutritionPlan;
  foodLogs: FoodLogEntry[];
  exerciseLogs: ExerciseLogEntry[];
  waterLogs: Record<string, number>;
  messages: ChatMessage[];
  onAppendMessages: (msgs: ChatMessage[]) => void;
  onResetChat: () => void;
}

function FormattedReply({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        const renderInline = (content: string) => {
          const parts = content.split(/(\*\*[^*]+\*\*)/g);
          return parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong
                  key={pIdx}
                  className="font-semibold text-[#0F172A] dark:text-white"
                >
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <React.Fragment key={pIdx}>{part}</React.Fragment>;
          });
        };

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-[#10B981] font-bold mt-0.5">•</span>
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+\.)\s(.*)$/);
          if (match) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="font-mono text-xs font-semibold text-[#10B981] dark:text-[#34D399] mt-1 shrink-0">
                  {match[1]}
                </span>
                <span>{renderInline(match[2])}</span>
              </div>
            );
          }
        }

        if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
          const cleanHeading = trimmed.replace(/^#{2,3}\s/, "");
          return (
            <div
              key={idx}
              className="font-semibold text-[#0F172A] dark:text-white pt-1"
            >
              {renderInline(cleanHeading)}
            </div>
          );
        }

        return <p key={idx}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

export const AiCoachView: React.FC<AiCoachViewProps> = ({
  profile,
  plan,
  foodLogs,
  exerciseLogs,
  waterLogs,
  messages,
  onAppendMessages,
  onResetChat,
}) => {
  const [input, setInput] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = useMemo(
    () => getQuickPromptsForCategory(profile.category, profile.isBreastfeeding),
    [profile.category, profile.isBreastfeeding]
  );

  const todaySummary = useMemo(() => {
    const todayKey = getTodayDateKey();
    const foods = foodLogs.filter((f) => f.date === todayKey);
    const exercises = exerciseLogs.filter((ex) => ex.date === todayKey);
    const caloriesIn = foods.reduce((s, f) => s + f.calories, 0);
    const caloriesOut = exercises.reduce((s, e) => s + e.caloriesBurned, 0);
    return {
      caloriesIn,
      caloriesOut,
      remainingCalories: plan.dailyCalorieTarget + caloriesOut - caloriesIn,
      carbs: Math.round(foods.reduce((s, f) => s + f.carbs, 0)),
      protein: Math.round(foods.reduce((s, f) => s + f.protein, 0)),
      fat: Math.round(foods.reduce((s, f) => s + f.fat, 0)),
      waterMl: waterLogs[todayKey] ?? 0,
    };
  }, [foodLogs, exerciseLogs, waterLogs, plan.dailyCalorieTarget]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isSending]);

  const sendPrompt = async (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || isSending) return;

    setErrorMsg("");
    setInput("");
    setIsSending(true);

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      text: clean,
      timestamp: new Date().toISOString(),
    };
    onAppendMessages([userMsg]);

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          profile: {
            ...profile,
            dailyCalorieTarget: plan.dailyCalorieTarget,
            bmrFormula: plan.bmrFormula,
            bmi: plan.bmi,
            bmiStandard: plan.bmiStandard,
            bmiCategory: plan.bmiCategory,
            waterTargetMl: plan.waterTargetMl,
            proteinTargetG: plan.macroTargets.proteinG,
          },
          todaySummary,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Pelatih AI tidak dapat merespons saat ini.");
      }

      const aiMsg: ChatMessage = {
        id: `m_${Date.now()}`,
        role: "model",
        text: data.reply,
        timestamp: new Date().toISOString(),
      };
      onAppendMessages([aiMsg]);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan koneksi dengan Pelatih AI."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendPrompt(input);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#ECFDF5]">
            Pelatih Diet & Olahraga AI
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-emerald-200/75 mt-0.5">
            Dipersonalisasi untuk{" "}
            <strong className="text-[#10B981] dark:text-[#34D399]">
              Mode: {CATEGORY_MAP[profile.category].shortLabel}
              {profile.category === "postpartum" && profile.isBreastfeeding
                ? " (Menyusui)"
                : ""}
            </strong>{" "}
            · Target {plan.dailyCalorieTarget.toLocaleString("id-ID")} kkal/hari
          </p>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={onResetChat}
            className="h-10 px-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0B1F17] hover:bg-emerald-50 dark:hover:bg-[#102A20] text-xs font-semibold text-[#334155] dark:text-[#ECFDF5] flex items-center gap-1.5 self-start sm:self-auto cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Obrolan Baru</span>
          </button>
        )}
      </div>

      {/* Dynamic Quick Prompts */}
      <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-5 shadow-lg shadow-emerald-500/10 dark:shadow-black/30 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#334155] dark:text-emerald-100">
          <Sparkles className="w-4 h-4 text-[#10B981]" />
          <span>
            Rekomendasi Pertanyaan Cepat ({CATEGORY_MAP[profile.category].shortLabel})
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isSending}
              onClick={() => sendPrompt(prompt)}
              className="text-left p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-800/80 bg-[#F8FAFC] dark:bg-[#102A20] hover:bg-emerald-50 dark:hover:bg-[#143528] hover:border-[#10B981]/50 disabled:opacity-50 text-xs sm:text-sm font-medium text-[#0F172A] dark:text-[#ECFDF5] transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      {/* Chat Area */}
      <section className="bg-white/95 dark:bg-[#0B1F17]/95 backdrop-blur-md border border-emerald-100/90 dark:border-emerald-900/60 rounded-3xl shadow-lg shadow-emerald-500/10 dark:shadow-black/30 flex flex-col min-h-[420px] max-h-[600px]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#34D399] text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Bot className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#ECFDF5]">
                  Konsultasi Gizi & Olahraga Personal
                </h2>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-emerald-200/75 leading-relaxed">
                  Pilih salah satu pertanyaan cepat di atas atau ketik pertanyaan Anda sendiri
                  tentang menu harian, pengganti bahan makanan, maupun jadwal olahraga yang aman.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 ${
                      isUser
                        ? "bg-gradient-to-br from-[#0F172A] to-[#064E3B] dark:from-[#10B981] dark:to-[#059669] text-white"
                        : "bg-[#F8FAFC] dark:bg-[#102A20] border border-emerald-100 dark:border-emerald-800/70 text-[#1E293B] dark:text-emerald-50"
                    }`}
                  >
                    {isUser ? (
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    ) : (
                      <FormattedReply text={msg.text} />
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-[#F8FAFC] dark:bg-[#102A20] border border-emerald-100 dark:border-emerald-800/70 text-xs sm:text-sm text-[#64748B] dark:text-emerald-200 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#10B981]" />
                <span>Pelatih AI sedang menyusun rekomendasi untuk Anda...</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-emerald-100 dark:border-emerald-900/60 p-3 sm:p-4 flex items-center gap-2.5 bg-white/90 dark:bg-[#0B1F17]/90 rounded-b-3xl"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanyakan menu makan, kalori camilan, atau saran olahraga..."
            className="flex-1 h-11 px-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-[#F8FAFC] dark:bg-[#071610] text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-emerald-200/40 focus:outline-none focus:border-[#10B981] focus:bg-white dark:focus:bg-[#0B1F17]"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="h-11 px-4 sm:px-5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#10B981] disabled:opacity-50 text-white text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 shadow-md shadow-emerald-500/20"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Kirim</span>
          </button>
        </form>
      </section>

      <p className="text-[11px] text-[#64748B] dark:text-emerald-200/65 leading-relaxed px-1">
        Saran Pelatih AI diselaraskan dengan perhitungan target nutrisi Anda ({plan.bmrFormula}, standar{" "}
        {plan.bmiStandard}) sebagai panduan edukatif, bukan pengganti konsultasi medis atau ahli gizi klinis.
      </p>
    </div>
  );
};
