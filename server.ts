import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const prefix = `${flag}=`;
  const eqArg = process.argv.find((arg) => arg.startsWith(prefix));
  return eqArg ? eqArg.slice(prefix.length) : undefined;
}

const PORT = Number(getArgValue("--port")) || Number(process.env.PORT) || 3000;
const HOST = getArgValue("--host") || "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production";

let genaiModulePromise: Promise<typeof import("@google/genai")> | null = null;
function loadGenAIModule() {
  if (!genaiModulePromise) {
    genaiModulePromise = import("@google/genai");
  }
  return genaiModulePromise;
}

async function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum tersedia di konfigurasi server.");
  }
  const { GoogleGenAI, Type, ThinkingLevel } = await loadGenAIModule();
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  return { ai, Type, ThinkingLevel };
}

function getFriendlyGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("GEMINI_API_KEY")) {
    return {
      status: 500,
      message: "Kunci API Gemini belum dikonfigurasi. Silakan periksa panel Settings > Secrets.",
    };
  }
  if (raw.includes("PERMISSION_DENIED") || raw.includes("API_KEY_INVALID") || raw.includes("403") || raw.includes("400")) {
    return {
      status: 400,
      message: "Kunci API Gemini tidak valid atau ditolak. Silakan periksa kunci API di panel Settings > Secrets.",
    };
  }
  if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes("429")) {
    return {
      status: 429,
      message: "Batas kuota permintaan AI sementara tercapai. Silakan coba lagi beberapa saat lagi.",
    };
  }
  return {
    status: 500,
    message: "Gagal memproses permintaan AI saat ini. Silakan coba lagi.",
  };
}

async function withGeminiRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const raw = err instanceof Error ? err.message : String(err);
      const isNonRetryable =
        raw.includes("GEMINI_API_KEY") ||
        raw.includes("PERMISSION_DENIED") ||
        raw.includes("API_KEY_INVALID") ||
        raw.includes("403") ||
        raw.includes("400");
      if (isNonRetryable || attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw lastError;
}

function parseJsonSafely<T>(rawText: string, fallback = "{}"): T {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned || fallback) as T;
}

interface EstimateFoodBody {
  description?: string;
  mealType?: string;
  userCategory?: string;
  isBreastfeeding?: boolean;
  medicalNotes?: string;
}

interface CoachBody {
  message?: string;
  history?: Array<{ role: "user" | "model"; text: string }>;
  profile?: {
    name?: string;
    relationRole?: string;
    category?: string;
    nutritionFocus?: string;
    age?: number;
    gender?: string;
    currentWeight?: number;
    targetWeight?: number;
    height?: number;
    activityLevel?: string;
    isBreastfeeding?: boolean;
    lactationStage?: string;
    medicalNotes?: string;
    dailyCalorieTarget?: number;
    bmrFormula?: string;
    bmi?: number;
    bmiStandard?: string;
    bmiCategory?: string;
    waterTargetMl?: number;
    proteinTargetG?: number;
  };
  todaySummary?: {
    caloriesIn?: number;
    caloriesOut?: number;
    remainingCalories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    waterMl?: number;
  };
  familyContext?: {
    familyName?: string;
    members?: Array<{
      name: string;
      relationRole: string;
      age: number;
      nutritionFocus: string;
      dailyCalorieTarget: number;
      medicalNotes?: string;
    }>;
  };
}

interface WeeklyMealPlanBody {
  dietGoal?: string;
  budgetStyle?: string;
  preferencesNote?: string;
  profile?: {
    name?: string;
    relationRole?: string;
    category?: string;
    nutritionFocus?: string;
    age?: number;
    gender?: string;
    currentWeight?: number;
    targetWeight?: number;
    height?: number;
    activityLevel?: string;
    isBreastfeeding?: boolean;
    lactationStage?: string;
    medicalNotes?: string;
  };
  nutritionPlan?: {
    dailyCalorieTarget?: number;
    waterTargetMl?: number;
    bmrFormula?: string;
    bmi?: number;
    bmiStandard?: string;
    bmiCategory?: string;
    isDeficitBlockedByUnderweight?: boolean;
    macroTargets?: {
      carbsG?: number;
      proteinG?: number;
      fatG?: number;
    };
  };
}

interface FamilyMealPlanBody {
  familyName?: string;
  budgetStyle?: string;
  preferencesNote?: string;
  members?: Array<{
    id: string;
    name: string;
    relationRole: string;
    category: string;
    nutritionFocus: string;
    age: number;
    isBreastfeeding?: boolean;
    medicalNotes?: string;
    dailyCalorieTarget: number;
    proteinTargetG: number;
    waterTargetMl: number;
  }>;
}

interface MenuConsultBody {
  message?: string;
  history?: Array<{ role: "user" | "model"; text: string }>;
  venue?: string;
  selectedDayLabel?: string;
  dayMeals?: Array<{
    mealType: string;
    foodName: string;
    portionNote: string;
    calories: number;
  }>;
  profile?: CoachBody["profile"];
  todaySummary?: CoachBody["todaySummary"] & {
    loggedFoods?: Array<{ mealType: string; foodName: string; calories: number }>;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  postpartum: "Ibu Setelah Melahirkan (Pasca-Melahirkan / Menyusui)",
  adult_female: "Wanita Dewasa",
  adult_male: "Pria Dewasa",
  child_teen: "Anak / Remaja",
};

const FOCUS_LABELS: Record<string, string> = {
  penurunan_berat: "Penurunan Berat Badan Sehat",
  gizi_seimbang: "Gizi Seimbang & Pemeliharaan Energi",
  pertumbuhan_anak: "Tumbuh Kembang Anak & Remaja",
  pemulihan_laktasi: "Pemulihan & Dukungan Produksi ASI",
  peningkatan_otot: "Penguatan Massa Otot & Kebugaran",
  penambahan_berat: "Pemulihan / Penambahan Berat Badan Sehat",
};

const GOAL_LABELS: Record<string, string> = {
  turun_berat: "Penurunan Berat Badan Bertahap (Defisit Kalori Aman)",
  pemulihan_asi: "Pemulihan Pasca-Melahirkan & Dukungan Produksi ASI",
  pertumbuhan_sehat: "Pertumbuhan Sehat & Gizi Seimbang Anak/Remaja (Tanpa Defisit Ekstrem)",
  pemeliharaan: "Gizi Seimbang & Pemeliharaan Berat Ideal",
  tinggi_protein: "Tinggi Protein, Kebugaran & Penguatan Massa Otot",
  tambah_berat: "Surplus Sehat & Pemulihan Berat Badan Padat Gizi",
};

const BUDGET_LABELS: Record<string, string> = {
  rumahan_hemat: "Masakan rumahan ekonomis dengan bahan lokal sehari-hari (tempe, tahu, telur, ayam, ikan kembung/lele, sayur pasar)",
  praktis_seimbang: "Menu praktis 15–25 menit untuk keluarga sibuk dengan persiapan ringkas",
  variasi_lengkap: "Variasi menu Nusantara & modern yang kaya rasa dan beragam sumber protein",
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/ai/estimate-food", async (req, res) => {
    try {
      const body = (req.body || {}) as EstimateFoodBody;
      const description = (body.description || "").trim();
      if (!description) {
        res.status(400).json({ error: "Mohon masukkan deskripsi makanan terlebih dahulu." });
        return;
      }

      const { ai, Type, ThinkingLevel } = await getGeminiClient();
      const categoryLabel = CATEGORY_LABELS[body.userCategory || ""] || "Pengguna Umum";
      const mealType = body.mealType || "Makanan";
      const medicalLine = body.medicalNotes?.trim()
        ? `\nKondisi kesehatan/pantangan pengguna: ${body.medicalNotes.trim()}`
        : "";

      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Perkirakan kandungan gizi dan kalori untuk makanan berikut:
Deskripsi makanan: "${description}"
Waktu makan: ${mealType}
Profil pengguna: ${categoryLabel}${body.isBreastfeeding ? " (Sedang menyusui)" : ""}${medicalLine}`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              "Anda adalah ahli gizi klinis Indonesia yang berpedoman pada TKPI (Tabel Komposisi Pangan Indonesia Kemenkes RI) dan USDA FoodData Central. Perkirakan kalori (kkal) serta makronutrisi (karbohidrat, protein, lemak dalam gram) secara akurat dan realistis untuk makanan Indonesia maupun internasional. Pastikan total kalori konsisten dengan prinsip Atwater (4×karbohidrat + 4×protein + 9×lemak). Sertakan asumsi berat/bahan agar transparan (misalnya minyak goreng, santan, ukuran potong), rentang variasi kalori yang wajar, dan tingkat keyakinan estimasi ('tinggi' jika ukuran/berat spesifik disebut jelas, 'sedang' untuk porsi rumah tangga standar, 'perkiraan_kasar' jika deskripsi sangat umum). Jika pengguna mencantumkan kondisi kesehatan, sesuaikan saran gizi singkat secara aman.",
            responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              foodName: {
                type: Type.STRING,
                description: "Nama makanan yang rapi dan ringkas dalam Bahasa Indonesia.",
              },
              portionNote: {
                type: Type.STRING,
                description: "Asumsi takaran porsi singkat, misalnya '1 porsi sedang (~320g)'.",
              },
              calories: {
                type: Type.INTEGER,
                description: "Perkiraan total energi dalam kilokalori (kkal).",
              },
              carbs: {
                type: Type.NUMBER,
                description: "Perkiraan karbohidrat dalam gram (g).",
              },
              protein: {
                type: Type.NUMBER,
                description: "Perkiraan protein dalam gram (g).",
              },
              fat: {
                type: Type.NUMBER,
                description: "Perkiraan lemak dalam gram (g).",
              },
              assumptions: {
                type: Type.STRING,
                description: "Rincian asumsi bahan & gramasi singkat (misal: nasi merah 150g, dada ayam bakar 100g, sayur katuk 120g).",
              },
              calorieRange: {
                type: Type.STRING,
                description: "Rentang estimasi kalori wajar tergantung cara masak/porsi, misal '410–480 kkal'.",
              },
              confidenceLevel: {
                type: Type.STRING,
                description: "Salah satu dari: 'tinggi', 'sedang', atau 'perkiraan_kasar'.",
              },
              nutritionTip: {
                type: Type.STRING,
                description: "Saran gizi singkat 1 kalimat dalam Bahasa Indonesia sesuai profil & kondisi pengguna.",
              },
            },
            required: [
              "foodName",
              "portionNote",
              "calories",
              "carbs",
              "protein",
              "fat",
              "assumptions",
              "calorieRange",
              "confidenceLevel",
              "nutritionTip",
            ],
          },
        },
      }));

      const parsed = parseJsonSafely<Record<string, unknown>>(response.text || "{}");

      const carbs = Math.max(0, Math.round((Number(parsed.carbs) || 0) * 10) / 10);
      const protein = Math.max(0, Math.round((Number(parsed.protein) || 0) * 10) / 10);
      const fat = Math.max(0, Math.round((Number(parsed.fat) || 0) * 10) / 10);
      const rawCalories = Math.max(0, Math.round(Number(parsed.calories) || 0));

      // Atwater energy consistency reconciliation
      const atwaterKcal = Math.round(carbs * 4 + protein * 4 + fat * 9);
      let finalCalories = rawCalories;
      if (atwaterKcal > 0 && (rawCalories === 0 || Math.abs(rawCalories - atwaterKcal) / atwaterKcal > 0.12)) {
        finalCalories = atwaterKcal;
      }

      const rawConf = String(parsed.confidenceLevel || "sedang");
      const confidenceLevel =
        rawConf === "tinggi" || rawConf === "perkiraan_kasar" ? rawConf : "sedang";

      res.json({
        foodName: String(parsed.foodName || description),
        portionNote: String(parsed.portionNote || "1 porsi"),
        calories: finalCalories,
        carbs,
        protein,
        fat,
        assumptions: String(parsed.assumptions || ""),
        calorieRange: String(parsed.calorieRange || `${Math.round(finalCalories * 0.9)}–${Math.round(finalCalories * 1.1)} kkal`),
        confidenceLevel,
        nutritionTip: String(parsed.nutritionTip || ""),
      });
    } catch (err) {
      const friendly = getFriendlyGeminiError(err);
      res.status(friendly.status).json({ error: friendly.message });
    }
  });

  app.post("/api/ai/coach", async (req, res) => {
    try {
      const body = (req.body || {}) as CoachBody;
      const message = (body.message || "").trim();
      if (!message) {
        res.status(400).json({ error: "Pesan tidak boleh kosong." });
        return;
      }

      const { ai } = await getGeminiClient();
      const profile = body.profile || {};
      const today = body.todaySummary || {};
      const category = profile.category || "adult_female";
      const categoryLabel = CATEGORY_LABELS[category] || "Dewasa";

      let safetyDirectives = "";
      if (category === "postpartum") {
        const stageText =
          profile.lactationStage === "partial_6_plus"
            ? "MENYUSUI LANJUTAN (>6 bulan bersama MPASI)"
            : "MENYUSUI EKSKLUSIF (0–6 bulan)";
        safetyDirectives = profile.isBreastfeeding
          ? `PENTING UNTUK KATEGORI INI: Pengguna adalah Ibu Pasca-Melahirkan yang sedang ${stageText}. Jangan pernah menyarankan diet ketat atau defisit kalori ekstrem. Utamakan pemulihan tubuh, kecukupan cairan, zat besi, kalsium, protein, dan makanan pelancar ASI (daun katuk, bayam, kacang-kacangan, ikan rendah merkuri, oat). Untuk olahraga, sarankan gerakan pemulihan aman seperti jalan santai, senam kegel, dan latihan bertahap diastasis recti setelah izin dokter/bidan.`
          : "PENTING UNTUK KATEGORI INI: Pengguna adalah Ibu Pasca-Melahirkan. Utamakan pemulihan fisik, kecukupan zat besi & protein, dan olahraga bertahap yang aman bagi otot dasar panggul dan perut.";
      } else if (category === "child_teen") {
        safetyDirectives =
          "PENTING UNTUK KATEGORI INI: Pengguna berada pada kategori ANAK / REMAJA dalam masa pertumbuhan (menggunakan standar WHO 2007 BMI-for-age dan rumus pediatrik Schofield). JANGAN pernah menganjurkan defisit kalori ekstrem, obat pelangsing, atau melewatkan makan. Fokuskan saran pada gizi seimbang (Isi Piringku), pengurangan minuman manis/ultra-proses, aktivitas fisik menyenangkan, serta ingatkan agar perubahan pola makan didampingi orang tua dan dokter/ahli gizi.";
      } else if ((profile.age ?? 30) >= 60) {
        safetyDirectives =
          "PENTING UNTUK USIA LANJUT (60+ TAHUN): Prioritaskan pemeliharaan massa otot (kecukupan protein berkualitas), kesehatan tulang (kalsium & vitamin D), serat larut, serta tekstur masakan yang ramah pencernaan tanpa defisit kalori ekstrem.";
      } else {
        safetyDirectives =
          "Sesuaikan rekomendasi dengan fokus nutrisi pengguna (apakah gizi seimbang, penurunan berat sehat, peningkatan massa otot, atau pemulihan berat sehat) sesuai standar BMI WHO Asia-Pasifik dan aktivitas fisik harian.";
      }

      const medicalDirective = profile.medicalNotes?.trim()
        ? `\nCatatan Medis / Pantangan Pengguna (WAJIB DIPERHATIKAN): ${profile.medicalNotes.trim()}. Pastikan seluruh rekomendasi menu dan olahraga aman untuk kondisi tersebut dan ingatkan konsultasi dokter bila diperlukan.`
        : "";

      const familyMembersLines =
        body.familyContext?.members && body.familyContext.members.length > 1
          ? `\nRingkasan Anggota Keluarga Lainnya (${body.familyContext.familyName || "Keluarga"}):\n${body.familyContext.members
              .map(
                (m) =>
                  `- ${m.name} (${m.relationRole}, ${m.age} thn · Fokus: ${FOCUS_LABELS[m.nutritionFocus] || m.nutritionFocus} · Target ${m.dailyCalorieTarget} kkal${m.medicalNotes ? ` · Catatan: ${m.medicalNotes}` : ""})`
              )
              .join("\n")}`
          : "";

      const focusLabel =
        FOCUS_LABELS[profile.nutritionFocus || ""] || "Gizi Seimbang";

      const systemInstruction = `Anda adalah Ahli Gizi & Pelatih Kesehatan Keluarga Nutri Hijau ~ Personal & Family Nutrition Intelligence (Nutrition • Wellness • Healthy Lifestyle) yang berbicara dalam Bahasa Indonesia yang hangat, akurat, terstruktur, dan berbasis bukti ilmiah (merujuk pedoman Kemenkes RI / AKG / WHO).

Profil Anggota Keluarga Aktif:
- Nama: ${profile.name || "Pengguna"} (${profile.relationRole || "Anggota Keluarga"})
- Kategori: ${categoryLabel}
- Fokus Nutrisi Utama: ${focusLabel}
- Usia: ${profile.age ?? "-"} tahun
- Berat Saat Ini: ${profile.currentWeight ?? "-"} kg | Berat Target: ${profile.targetWeight ?? "-"} kg | Tinggi: ${profile.height ?? "-"} cm
- Rumus BMR: ${profile.bmrFormula || "Mifflin-St Jeor"}
- BMI: ${profile.bmi ?? "-"} (${profile.bmiCategory || "-"}, standar ${profile.bmiStandard || "WHO Asia-Pasifik"})
- Target Kalori Harian: ${profile.dailyCalorieTarget ?? "-"} kkal | Target Protein: ${profile.proteinTargetG ?? "-"}g
- Target Air Minum: ${profile.waterTargetMl ?? "-"} ml/hari
${familyMembersLines}

Ringkasan Hari Ini (${profile.name || "Pengguna"}):
- Kalori Masuk: ${today.caloriesIn ?? 0} kkal
- Kalori Keluar (Olahraga): ${today.caloriesOut ?? 0} kkal
- Sisa Kalori: ${today.remainingCalories ?? 0} kkal
- Makro Masuk: Karbo ${today.carbs ?? 0}g, Protein ${today.protein ?? 0}g, Lemak ${today.fat ?? 0}g
- Air Minum: ${today.waterMl ?? 0} ml

${safetyDirectives}${medicalDirective}

Aturan Akurasi & Keamanan:
1. Gunakan Bahasa Indonesia sepenuhnya yang natural dan bahan makanan lokal Indonesia sesuai takaran TKPI/URT (sendok, potong, mangkuk, gram).
2. Selaraskan angka kalori dan target protein yang Anda sebutkan dengan profil di atas—jangan mengarang target kalori baru yang bertentangan.
3. Jika pengguna menanyakan menu bersama untuk sekeluarga, bantu adaptasikan porsi/modifikasi ringan dari masakan yang sama agar praktis dimasak di rumah untuk semua anggota keluarga.
4. Jangan membuat klaim medis absolut atau menggantikan diagnosis dokter. Jika pertanyaan menyangkut keluhan medis serius, sarankan konsultasi langsung ke dokter atau ahli gizi klinis (Sp.GK / RD).
5. Format jawaban ringkas menggunakan poin bernomor atau daftar bullet agar mudah dipindai.`;

      const historyContents = (body.history || []).slice(-10).map((item) => ({
        role: item.role === "model" ? "model" : "user",
        parts: [{ text: item.text }],
      }));

      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: [
            ...historyContents,
            { role: "user", parts: [{ text: message }] },
          ],
          config: {
            systemInstruction,
          },
        })
      );

      const replyText = (response.text || "").trim();
      if (!replyText) {
        throw new Error("Empty response from Gemini");
      }

      res.json({ reply: replyText });
    } catch (err) {
      const friendly = getFriendlyGeminiError(err);
      res.status(friendly.status).json({ error: friendly.message });
    }
  });

  app.post("/api/ai/weekly-meal-plan", async (req, res) => {
    try {
      const body = (req.body || {}) as WeeklyMealPlanBody;
      const profile = body.profile || {};
      const plan = body.nutritionPlan || {};
      const category = profile.category || "adult_female";
      const categoryLabel = CATEGORY_LABELS[category] || "Dewasa";
      const targetCalories = Math.max(1150, Math.round(Number(plan.dailyCalorieTarget) || 1700));
      const carbsTarget = Math.max(100, Math.round(Number(plan.macroTargets?.carbsG) || 180));
      const proteinTarget = Math.max(50, Math.round(Number(plan.macroTargets?.proteinG) || 95));
      const fatTarget = Math.max(30, Math.round(Number(plan.macroTargets?.fatG) || 55));
      const waterTarget = Math.max(1200, Math.round(Number(plan.waterTargetMl) || 2000));

      const rawGoal = body.dietGoal || "pemeliharaan";
      const enforcedGoal =
        category === "child_teen"
          ? "pertumbuhan_sehat"
          : plan.isDeficitBlockedByUnderweight && (rawGoal === "turun_berat" || rawGoal === "tinggi_protein")
            ? "pemeliharaan"
            : rawGoal;
      const goalLabel = GOAL_LABELS[enforcedGoal] || GOAL_LABELS.pemeliharaan;
      const budgetStyle = body.budgetStyle || "rumahan_hemat";
      const budgetLabel = BUDGET_LABELS[budgetStyle] || BUDGET_LABELS.rumahan_hemat;
      const combinedPrefs = [profile.medicalNotes?.trim(), body.preferencesNote?.trim()]
        .filter(Boolean)
        .join(" | ");

      let clinicalGuardrail = "";
      if (category === "child_teen") {
        clinicalGuardrail =
          "ATURAN KESELAMATAN ANAK/REMAJA: Gunakan target kalori pemeliharaan pertumbuhan (Schofield) sesuai angka target. Dilarang membuat menu diet ketat/rendah kalori ekstrem. Utamakan prinsip Isi Piringku Kemenkes, protein pertumbuhan (telur, ikan, ayam, tempe/tahu, susu/yogurt bila cocok), buah utuh, dan bekal sekolah menarik tanpa minuman manis ultra-proses.";
      } else if (category === "postpartum") {
        clinicalGuardrail = profile.isBreastfeeding
          ? `ATURAN KESELAMATAN IBU MENYUSUI: Penuhi ${targetCalories} kkal/hari agar produksi ASI tetap lancar. Sertakan bahan pelancar ASI alami (daun katuk, bayam, kelor, kacang hijau/almond, oat, ikan rendah merkuri seperti kembung/patin/salmon, telur) dan sumber zat besi + kalsium. Ingatkan minum air ${waterTarget} ml/hari.`
          : `ATURAN KESELAMATAN PASCA-MELAHIRKAN: Penuhi ${targetCalories} kkal/hari dengan fokus pemulihan jaringan, zat besi, protein cukup, dan serat tanpa defisit ekstrem.`;
      } else if (plan.isDeficitBlockedByUnderweight || enforcedGoal === "tambah_berat") {
        clinicalGuardrail = `ATURAN PADAT GIZI & PEMULIHAN BERAT: Susun menu padat gizi pada ${targetCalories} kkal/hari untuk pemulihan energi dan penambahan berat sehat (protein berkualitas, lemak sehat seperti alpukat/kacang/minyak zaitun atau santan ringan, serta karbohidrat kompleks).`;
      } else if ((profile.age ?? 30) >= 60) {
        clinicalGuardrail = `ATURAN NUTRISI LANSIA (60+ TAHUN): Penuhi ${targetCalories} kkal/hari dengan tekstur masakan yang nyaman dikunyah/dicerna, tinggi protein (${proteinTarget}g/hari), kalsium, dan serat sambil membatasi garam & gula berlebih.`;
      } else {
        clinicalGuardrail = `ATURAN KLINIS DEWASA: Jaga total kalori tiap hari di kisaran ${Math.round(targetCalories * 0.94)}–${Math.round(targetCalories * 1.05)} kkal/hari dengan protein cukup (${proteinTarget}g/hari), karbohidrat kompleks, sayuran berserat, dan metode masak seimbang.`;
      }

      const { ai, Type, ThinkingLevel } = await getGeminiClient();

      const prompt = `Susunkan daftar menu diet lengkap selama 7 HARI (Senin sampai Minggu) sebagai Ahli Gizi Klinis Indonesia untuk klien berikut:
- Nama: ${profile.name || "Pengguna"}
- Kategori Profil: ${categoryLabel}${profile.isBreastfeeding ? " (Sedang Menyusui)" : ""}
- Usia: ${profile.age ?? 28} tahun | Berat saat ini: ${profile.currentWeight ?? 65} kg | Target berat: ${profile.targetWeight ?? 58} kg | Tinggi: ${profile.height ?? 160} cm
- Status BMI: ${plan.bmi ?? "-"} (${plan.bmiCategory || "-"}, ${plan.bmiStandard || "WHO Asia-Pasifik"})
- Tujuan Diet Utama: ${goalLabel}
- Target Harian: ${targetCalories} kkal | Karbohidrat ~${carbsTarget}g | Protein ~${proteinTarget}g | Lemak ~${fatTarget}g | Air ${waterTarget} ml
- Gaya Menu & Budget: ${budgetLabel}
${combinedPrefs ? `- Catatan Medis / Pantangan / Preferensi WAJIB DIPATUHI: ${combinedPrefs}` : "- Catatan Medis / Pantangan: Tidak ada pantangan khusus"}

${clinicalGuardrail}

Ketentuan Struktur Menu:
1. Buat tepat 7 hari berurutan dengan dayName: "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu".
2. Setiap hari harus memiliki tepat 4 waktu makan dengan mealType persis: "sarapan", "makan_siang", "makan_malam", "camilan".
3. Variasikan lauk dan sayur antar hari agar tidak membosankan namun tetap realistis untuk meal prep seminggu.
4. Cantumkan takaran porsi jelas (gramasi & URT Indonesia, misal: "120g nasi putih/merah + 100g ikan kembung pepes + 1 mangkuk tumis kangkung").
5. Pastikan angka calories tiap menu konsisten dengan Atwater (4×carbs + 4×protein + 9×fat) dan jumlah 4 waktu makan mendekati ${targetCalories} kkal/hari.
6. Sertakan daftar belanja mingguan yang terkelompok rapi untuk seluruh menu 7 hari tersebut.`;

      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            "Anda adalah ahli gizi klinis bersertifikat di Indonesia yang berpedoman pada TKPI Kemenkes RI, Pedoman Gizi Seimbang (Isi Piringku), dan prinsip Atwater. Hasilkan rencana menu 7 hari yang praktis, lezat, realistis dimasak/dibeli di Indonesia, akurat secara matematis, dan sepenuhnya aman bagi profil kesehatan pengguna.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              planTitle: {
                type: Type.STRING,
                description: "Judul ringkas rencana menu 7 hari dalam Bahasa Indonesia.",
              },
              nutritionistSummary: {
                type: Type.STRING,
                description: "Penjelasan ahli gizi 2-3 kalimat mengenai strategi menu ini sesuai tujuan diet pengguna.",
              },
              safetyReminder: {
                type: Type.STRING,
                description: "Pengingat keamanan, hidrasi, atau penyesuaian medis 1-2 kalimat.",
              },
              days: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dayNumber: { type: Type.INTEGER },
                    dayName: { type: Type.STRING },
                    dailyTheme: { type: Type.STRING },
                    dailyTip: { type: Type.STRING },
                    meals: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          mealType: {
                            type: Type.STRING,
                            description: "Persis salah satu dari: sarapan, makan_siang, makan_malam, camilan",
                          },
                          foodName: { type: Type.STRING },
                          portionNote: { type: Type.STRING },
                          calories: { type: Type.INTEGER },
                          carbs: { type: Type.NUMBER },
                          protein: { type: Type.NUMBER },
                          fat: { type: Type.NUMBER },
                          prepNote: { type: Type.STRING },
                        },
                        required: [
                          "mealType",
                          "foodName",
                          "portionNote",
                          "calories",
                          "carbs",
                          "protein",
                          "fat",
                          "prepNote",
                        ],
                      },
                    },
                  },
                  required: ["dayNumber", "dayName", "dailyTheme", "dailyTip", "meals"],
                },
              },
              shoppingList: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    items: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ["category", "items"],
                },
              },
            },
            required: [
              "planTitle",
              "nutritionistSummary",
              "safetyReminder",
              "days",
              "shoppingList",
            ],
          },
        },
      }));

      const parsed = parseJsonSafely<Record<string, unknown>>(response.text || "{}");

      const dayNamesFallback = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
      const mealOrder = ["sarapan", "makan_siang", "makan_malam", "camilan"] as const;
      const validMealTypes = new Set<string>(mealOrder);

      const rawDays = Array.isArray(parsed.days) ? parsed.days : [];
      const normalizedDays = rawDays.slice(0, 7).map((d: Record<string, unknown>, idx: number) => {
        const rawMeals = Array.isArray(d.meals) ? d.meals : [];
        let meals = rawMeals.map((m: Record<string, unknown>, mIdx: number) => {
          const rawMt = String(m.mealType || mealOrder[mIdx % 4]);
          const mealType = validMealTypes.has(rawMt) ? rawMt : mealOrder[mIdx % 4];
          const carbs = Math.max(0, Math.round((Number(m.carbs) || 0) * 10) / 10);
          const protein = Math.max(0, Math.round((Number(m.protein) || 0) * 10) / 10);
          const fat = Math.max(0, Math.round((Number(m.fat) || 0) * 10) / 10);
          const rawCal = Math.max(0, Math.round(Number(m.calories) || 0));
          const atwater = Math.round(carbs * 4 + protein * 4 + fat * 9);
          const calories =
            atwater > 0 && (rawCal === 0 || Math.abs(rawCal - atwater) / atwater > 0.12)
              ? atwater
              : rawCal;

          return {
            mealType,
            foodName: String(m.foodName || "Menu Seimbang"),
            portionNote: String(m.portionNote || "1 porsi"),
            calories,
            carbs,
            protein,
            fat,
            prepNote: String(m.prepNote || ""),
          };
        });

        // Sort consistently by Sarapan -> Makan Siang -> Makan Malam -> Camilan
        meals.sort(
          (a, b) => mealOrder.indexOf(a.mealType as (typeof mealOrder)[number]) - mealOrder.indexOf(b.mealType as (typeof mealOrder)[number])
        );

        let totalCalories = meals.reduce((sum, item) => sum + item.calories, 0);

        // Proportional calorie calibration safeguard if day total drifts >12% from clinical target
        if (totalCalories > 0 && Math.abs(totalCalories - targetCalories) / targetCalories > 0.12) {
          const rawRatio = targetCalories / totalCalories;
          const scale = Math.max(0.7, Math.min(1.4, rawRatio));
          const pctLabel = scale > 1 ? `+${Math.round((scale - 1) * 100)}%` : `-${Math.round((1 - scale) * 100)}%`;
          meals = meals.map((item) => {
            const carbs = Math.round(item.carbs * scale * 10) / 10;
            const protein = Math.round(item.protein * scale * 10) / 10;
            const fat = Math.round(item.fat * scale * 10) / 10;
            const calories = Math.round(carbs * 4 + protein * 4 + fat * 9);
            return {
              ...item,
              carbs,
              protein,
              fat,
              calories,
              portionNote: item.portionNote.includes("disesuaikan")
                ? item.portionNote
                : `${item.portionNote} (porsi disesuaikan ${pctLabel})`,
            };
          });
          totalCalories = meals.reduce((sum, item) => sum + item.calories, 0);
        }

        const totalCarbs = Math.round(meals.reduce((sum, item) => sum + item.carbs, 0));
        const totalProtein = Math.round(meals.reduce((sum, item) => sum + item.protein, 0));
        const totalFat = Math.round(meals.reduce((sum, item) => sum + item.fat, 0));

        return {
          dayNumber: Number(d.dayNumber) || idx + 1,
          dayName: String(d.dayName || dayNamesFallback[idx] || `Hari ${idx + 1}`),
          dailyTheme: String(d.dailyTheme || "Menu Gizi Seimbang"),
          dailyTip: String(d.dailyTip || "Konsumsi air putih cukup di sela waktu makan."),
          meals,
          totalCalories,
          totalCarbs,
          totalProtein,
          totalFat,
        };
      });

      if (normalizedDays.length === 0) {
        throw new Error("Format menu mingguan tidak lengkap.");
      }

      const weeklyAverageCalories = Math.round(
        normalizedDays.reduce((sum, d) => sum + d.totalCalories, 0) / normalizedDays.length
      );

      const rawShopping = Array.isArray(parsed.shoppingList) ? parsed.shoppingList : [];
      const shoppingList = rawShopping
        .map((grp: Record<string, unknown>) => ({
          category: String(grp.category || "Bahan Makanan"),
          items: Array.isArray(grp.items)
            ? grp.items.map((it) => String(it).trim()).filter(Boolean)
            : [],
        }))
        .filter((grp: { items: string[] }) => grp.items.length > 0);

      res.json({
        id: `wp_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        dietGoal: enforcedGoal,
        budgetStyle,
        preferencesNote: body.preferencesNote?.trim() || "",
        profileCategory: category,
        medicalNotesSnapshot: profile.medicalNotes?.trim() || "",
        targetCaloriesPerDay: targetCalories,
        weeklyAverageCalories,
        planTitle: String(parsed.planTitle || `Menu Diet 7 Hari (${targetCalories} kkal/hari)`),
        nutritionistSummary: String(parsed.nutritionistSummary || ""),
        safetyReminder: String(parsed.safetyReminder || ""),
        days: normalizedDays,
        shoppingList,
        checkedShoppingItems: [],
      });
    } catch (err) {
      const friendly = getFriendlyGeminiError(err);
      res.status(friendly.status).json({ error: friendly.message });
    }
  });

  app.post("/api/ai/family-meal-plan", async (req, res) => {
    try {
      const body = (req.body || {}) as FamilyMealPlanBody;
      const members = Array.isArray(body.members) ? body.members : [];
      if (members.length === 0) {
        res.status(400).json({ error: "Tambahkan minimal 1 anggota keluarga terlebih dahulu." });
        return;
      }

      const familyName = (body.familyName || "Keluarga Sehat").trim();
      const budgetStyle = body.budgetStyle || "rumahan_hemat";
      const budgetLabel = BUDGET_LABELS[budgetStyle] || BUDGET_LABELS.rumahan_hemat;
      const preferencesNote = (body.preferencesNote || "").trim();

      const memberRosterText = members
        .map((m) => {
          const focusLabel = FOCUS_LABELS[m.nutritionFocus] || m.nutritionFocus;
          return `- ID "${m.id}" | Nama: ${m.name} (${m.relationRole}, ${m.age} tahun${m.isBreastfeeding ? ", sedang menyusui" : ""}) | Fokus: ${focusLabel} | Target: ${m.dailyCalorieTarget} kkal/hari, Protein ${m.proteinTargetG}g, Air ${m.waterTargetMl} ml${m.medicalNotes ? ` | Pantangan/Medis: ${m.medicalNotes}` : ""}`;
        })
        .join("\n");

      const { ai, Type, ThinkingLevel } = await getGeminiClient();

      const prompt = `Susunkan RENCANA MENU MASAK KELUARGA 7 HARI (Senin–Minggu) untuk "${familyName}" yang terdiri dari ${members.length} anggota keluarga berikut:
${memberRosterText}

Gaya Masakan & Anggaran: ${budgetLabel}
${preferencesNote ? `Preferensi / Pantangan Keluarga: ${preferencesNote}` : "Preferensi Tambahan: Masakan keluarga Indonesia praktis dan ramah untuk semua usia."}

Tujuan Utama:
Satu hidangan induk keluarga per waktu makan agar dapur praktis (tidak memasak 3–4 menu terpisah setiap hari), namun memiliki **panduan penyesuaian porsi & modifikasi ringan untuk masing-masing anggota keluarga** (misalnya: porsi nasi, jumlah lauk protein, tambahan kuah/sayur untuk ibu menyusui, potongan ramah anak/lansia, atau pengurangan sambal/garam).

Ketentuan Wajib:
1. Buat tepat 7 hari berurutan: "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu".
2. Setiap hari harus memiliki tepat 4 waktu makan dengan mealType persis: "sarapan", "makan_siang", "makan_malam", "camilan".
3. Pada setiap waktu makan, isi array memberPortions dengan tepat ${members.length} entri—satu untuk setiap anggota keluarga di atas menggunakan memberId dan memberName yang persis sama.
4. Pastikan perkiraan kalori (estimatedCalories) tiap anggota pada 4 waktu makan dalam sehari masuk akal dan selaras mendekati target kalori harian masing-masing anggota.
5. Sertakan daftar belanja mingguan terkelompok (protein hewani, protein nabati, sayur & buah, bumbu & bahan pokok) dengan takaran gabungan untuk ${members.length} orang selama 7 hari.`;

      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              "Anda adalah ahli gizi keluarga bersertifikat di Indonesia (berpedoman pada TKPI Kemenkes RI & Pedoman Gizi Seimbang Isi Piringku). Anda merancang satu menu keluarga yang harmonis, lezat, mudah dimasak di rumah, sekaligus presisi dalam membagi takaran porsi per anggota keluarga (ibu menyusui, ayah, anak/remaja, hingga lansia).",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                planTitle: { type: Type.STRING },
                nutritionistSummary: { type: Type.STRING },
                safetyReminder: { type: Type.STRING },
                days: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      dayNumber: { type: Type.INTEGER },
                      dayName: { type: Type.STRING },
                      dailyTheme: { type: Type.STRING },
                      dailyTip: { type: Type.STRING },
                      meals: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            mealType: { type: Type.STRING },
                            dishName: { type: Type.STRING },
                            baseIngredientsNote: { type: Type.STRING },
                            prepNote: { type: Type.STRING },
                            memberPortions: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                properties: {
                                  memberId: { type: Type.STRING },
                                  memberName: { type: Type.STRING },
                                  portionInstruction: { type: Type.STRING },
                                  estimatedCalories: { type: Type.INTEGER },
                                },
                                required: [
                                  "memberId",
                                  "memberName",
                                  "portionInstruction",
                                  "estimatedCalories",
                                ],
                              },
                            },
                          },
                          required: [
                            "mealType",
                            "dishName",
                            "baseIngredientsNote",
                            "prepNote",
                            "memberPortions",
                          ],
                        },
                      },
                    },
                    required: ["dayNumber", "dayName", "dailyTheme", "dailyTip", "meals"],
                  },
                },
                shoppingList: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING },
                      items: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                    required: ["category", "items"],
                  },
                },
              },
              required: [
                "planTitle",
                "nutritionistSummary",
                "safetyReminder",
                "days",
                "shoppingList",
              ],
            },
          },
        })
      );

      const parsed = parseJsonSafely<Record<string, unknown>>(response.text || "{}");
      const dayNamesFallback = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
      const mealOrder = ["sarapan", "makan_siang", "makan_malam", "camilan"] as const;
      const validMealTypes = new Set<string>(mealOrder);

      const rawDays = Array.isArray(parsed.days) ? parsed.days : [];
      const normalizedDays = rawDays.slice(0, 7).map((d: Record<string, unknown>, idx: number) => {
        const rawMeals = Array.isArray(d.meals) ? d.meals : [];
        const meals = rawMeals.map((m: Record<string, unknown>, mIdx: number) => {
          const rawMt = String(m.mealType || mealOrder[mIdx % 4]);
          const mealType = validMealTypes.has(rawMt) ? rawMt : mealOrder[mIdx % 4];
          const rawPortions = Array.isArray(m.memberPortions) ? m.memberPortions : [];

          const memberPortions = members.map((member) => {
            const matched = rawPortions.find(
              (p: Record<string, unknown>) =>
                String(p.memberId) === member.id ||
                String(p.memberName || "").toLowerCase() === member.name.toLowerCase()
            );
            return {
              memberId: member.id,
              memberName: member.name,
              portionInstruction: String(
                matched?.portionInstruction ||
                  `Porsi standar sesuai target ${member.dailyCalorieTarget} kkal/hari`
              ),
              estimatedCalories: Math.max(
                80,
                Math.round(Number(matched?.estimatedCalories) || Math.round(member.dailyCalorieTarget * 0.25))
              ),
            };
          });

          return {
            mealType,
            dishName: String(m.dishName || "Menu Keluarga Seimbang"),
            baseIngredientsNote: String(m.baseIngredientsNote || ""),
            prepNote: String(m.prepNote || ""),
            memberPortions,
          };
        });

        meals.sort(
          (a, b) =>
            mealOrder.indexOf(a.mealType as (typeof mealOrder)[number]) -
            mealOrder.indexOf(b.mealType as (typeof mealOrder)[number])
        );

        return {
          dayNumber: Number(d.dayNumber) || idx + 1,
          dayName: String(d.dayName || dayNamesFallback[idx] || `Hari ${idx + 1}`),
          dailyTheme: String(d.dailyTheme || "Masakan Keluarga Seimbang"),
          dailyTip: String(d.dailyTip || "Sesuaikan porsi nasi dan lauk sesuai kebutuhan masing-masing anggota."),
          meals,
        };
      });

      if (normalizedDays.length === 0) {
        throw new Error("Format menu keluarga 7 hari tidak lengkap.");
      }

      const rawShopping = Array.isArray(parsed.shoppingList) ? parsed.shoppingList : [];
      const shoppingList = rawShopping
        .map((grp: Record<string, unknown>) => ({
          category: String(grp.category || "Bahan Masakan"),
          items: Array.isArray(grp.items)
            ? grp.items.map((it) => String(it).trim()).filter(Boolean)
            : [],
        }))
        .filter((grp: { items: string[] }) => grp.items.length > 0);

      res.json({
        id: `fwp_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        familyName,
        budgetStyle,
        preferencesNote,
        memberIdsSnapshot: members.map((m) => m.id),
        planTitle: String(parsed.planTitle || `Menu Keluarga 7 Hari — ${familyName}`),
        nutritionistSummary: String(parsed.nutritionistSummary || ""),
        safetyReminder: String(parsed.safetyReminder || ""),
        days: normalizedDays,
        shoppingList,
        checkedShoppingItems: [],
      });
    } catch (err) {
      const friendly = getFriendlyGeminiError(err);
      res.status(friendly.status).json({ error: friendly.message });
    }
  });

  app.post("/api/ai/menu-consult", async (req, res) => {
    try {
      const body = (req.body || {}) as MenuConsultBody;
      const message = (body.message || "").trim();
      if (!message) {
        res.status(400).json({ error: "Mohon tuliskan menu yang tersedia atau pertanyaan Anda." });
        return;
      }

      const { ai, Type, ThinkingLevel } = await getGeminiClient();
      const profile = body.profile || {};
      const today = body.todaySummary || {};
      const category = profile.category || "adult_female";
      const categoryLabel = CATEGORY_LABELS[category] || "Dewasa";
      const focusLabel = FOCUS_LABELS[profile.nutritionFocus || ""] || "Gizi Seimbang";
      const venue = body.venue || "warteg";

      const venueMap: Record<string, string> = {
        warteg: "Warteg / Warung Nasi / Rumah Makan Sederhana (lauk etalase prasmanan Indonesia)",
        restoran: "Restoran / Rumah Makan Padang / Kafe / Kedai Umum",
        kantin_katering: "Kantin Kantor / Sekolah / Katering Harian",
        umum: "Makan di Luar / Penyesuaian Menu Harian Fleksibel",
      };

      let clinicalRule =
        "Jaga keseimbangan nutrisi sesuai sisa kalori harian dan kebutuhan protein tanpa porsi ekstrem.";
      if (category === "child_teen") {
        clinicalRule =
          "KATEGORI ANAK/REMAJA: Dilarang menyarankan diet ketat/kelaparan atau pemotongan kalori ekstrem. Utamakan kombinasi nasi/karbo cukup + protein lauk + sayur agar tumbuh kembang optimal.";
      } else if (category === "postpartum") {
        clinicalRule = profile.isBreastfeeding
          ? "KATEGORI IBU MENYUSUI: Jangan memotong asupan terlalu rendah agar produksi ASI tetap lancar. Pilih lauk berprotein, berkuah bening/sayur hijau (katuk/bayam/sop), dan ingatkan minum air cukup."
          : "KATEGORI PASCA-MELAHIRKAN: Prioritaskan protein pemulihan, zat besi, dan serat sayur yang ramah pencernaan.";
      } else if ((profile.age ?? 30) >= 60) {
        clinicalRule =
          "KATEGORI LANSIA (60+): Pilih lauk yang lunak/mudah dikunyah, tinggi protein, tidak terlalu asin/berminyak, dan porsi serat seimbang.";
      }

      const dayMealsContext =
        Array.isArray(body.dayMeals) && body.dayMeals.length > 0
          ? `Rekomendasi Menu pada ${body.selectedDayLabel || "Hari Terpilih"}:\n${body.dayMeals
              .map(
                (m) =>
                  `- ${m.mealType}: ${m.foodName} (${m.portionNote}, ~${m.calories} kkal)`
              )
              .join("\n")}`
          : `Konteks Hari: ${body.selectedDayLabel || "Menu Harian Hari Ini"} (belum ada jadwal 7 hari tersimpan, fokus pada sisa anggaran kalori & makro hari ini).`;

      const loggedFoodsContext =
        Array.isArray(today.loggedFoods) && today.loggedFoods.length > 0
          ? `\nMakanan Sudah Masuk Hari Ini:\n${today.loggedFoods
              .map((f) => `- ${f.mealType}: ${f.foodName} (${f.calories} kkal)`)
              .join("\n")}`
          : "\nBelum ada makanan tercatat hari ini.";

      const systemInstruction = `Anda adalah Ahli Gizi Praktis & Konsultan Menu Makan di Luar Nutri Hijau yang membantu pengguna menyesuaikan menu harian ketika makan di warteg, RM Padang, restoran, kafe, atau kantin karena menu rekomendasi tidak tersedia.

Profil Pengguna:
- Nama: ${profile.name || "Pengguna"} (${categoryLabel}${profile.isBreastfeeding ? ", Menyusui" : ""})
- Usia: ${profile.age ?? "-"} tahun | Fokus: ${focusLabel}
- Target Harian: ${profile.dailyCalorieTarget ?? 1800} kkal | Protein ${profile.proteinTargetG ?? 80}g
${profile.medicalNotes?.trim() ? `- Kondisi Medis / Pantangan WAJIB DIPATUHI: ${profile.medicalNotes.trim()}` : ""}

Status Asupan Hari Ini:
- Kalori Masuk: ${today.caloriesIn ?? 0} kkal | Olahraga: ${today.caloriesOut ?? 0} kkal
- Sisa Anggaran Kalori Hari Ini: ${today.remainingCalories ?? profile.dailyCalorieTarget ?? 1800} kkal
- Makro Masuk: Karbo ${today.carbs ?? 0}g, Protein ${today.protein ?? 0}g, Lemak ${today.fat ?? 0}g
${loggedFoodsContext}

${dayMealsContext}
Situasi Tempat Makan: ${venueMap[venue] || venueMap.umum}
${clinicalRule}

Tugas Anda:
1. Berikan saran menu pengganti yang REALISTIS ada di tempat tersebut (atau pilih kombinasi terbaik dari daftar lauk yang disebut pengguna).
2. Sebutkan takaran porsi praktis Indonesia (misal: nasi 1/2 porsi ~100g, tiriskan kuah/minyak, hindari kulit/gulai kental bila perlu) dan perkiraan kalorinya agar selaras dengan sisa kalori & fokus pengguna.
3. Bila pertanyaan pengguna meminta rekomendasi makanan/menu pengganti untuk disantap, isi field suggestedMeal dengan hasSuggestion=true beserta estimasi Atwater-nya agar pengguna bisa langsung mencatatnya ke log harian dengan 1 klik. Jika pertanyaan hanya klarifikasi umum tanpa menu spesifik untuk dicatat, set hasSuggestion=false.
4. Gunakan Bahasa Indonesia yang ramah, ringkas, dan mudah dibaca saat pengguna berada di tempat makan.`;

      const historyContents = (body.history || []).slice(-8).map((item) => ({
        role: item.role === "model" ? "model" : "user",
        parts: [{ text: item.text }],
      }));

      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: [
            ...historyContents,
            { role: "user", parts: [{ text: message }] },
          ],
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.STRING,
                  description:
                    "Jawaban konsultasi praktis dalam Bahasa Indonesia (boleh memakai poin bullet/baris baru agar mudah dibaca di warteg/restoran).",
                },
                hasSuggestion: {
                  type: Type.BOOLEAN,
                  description:
                    "True jika ada satu kombinasi menu pengganti konkret yang bisa langsung dicatat ke log harian.",
                },
                suggestedMeal: {
                  type: Type.OBJECT,
                  properties: {
                    mealType: {
                      type: Type.STRING,
                      description: "Persis salah satu: sarapan, makan_siang, makan_malam, camilan",
                    },
                    foodName: { type: Type.STRING },
                    portionNote: { type: Type.STRING },
                    calories: { type: Type.INTEGER },
                    carbs: { type: Type.NUMBER },
                    protein: { type: Type.NUMBER },
                    fat: { type: Type.NUMBER },
                    orderingTip: { type: Type.STRING },
                  },
                  required: [
                    "mealType",
                    "foodName",
                    "portionNote",
                    "calories",
                    "carbs",
                    "protein",
                    "fat",
                    "orderingTip",
                  ],
                },
              },
              required: ["reply", "hasSuggestion"],
            },
          },
        })
      );

      const parsed = parseJsonSafely<{
        reply?: string;
        hasSuggestion?: boolean;
        suggestedMeal?: {
          mealType?: string;
          foodName?: string;
          portionNote?: string;
          calories?: number;
          carbs?: number;
          protein?: number;
          fat?: number;
          orderingTip?: string;
        };
      }>(response.text || "{}");

      const replyText = String(parsed.reply || "").trim();
      if (!replyText) {
        throw new Error("Empty menu consult reply");
      }

      const validMealTypes = new Set(["sarapan", "makan_siang", "makan_malam", "camilan"]);
      let suggestedMeal:
        | {
            mealType: string;
            foodName: string;
            portionNote: string;
            calories: number;
            carbs: number;
            protein: number;
            fat: number;
            orderingTip?: string;
          }
        | undefined;

      if (parsed.hasSuggestion && parsed.suggestedMeal?.foodName) {
        const rawSm = parsed.suggestedMeal;
        const carbs = Math.max(0, Math.round(Number(rawSm.carbs) || 0));
        const protein = Math.max(0, Math.round(Number(rawSm.protein) || 0));
        const fat = Math.max(0, Math.round(Number(rawSm.fat) || 0));
        const rawCal = Math.round(Number(rawSm.calories) || 0);
        const atwaterCal = Math.round(carbs * 4 + protein * 4 + fat * 9);
        const finalCalories =
          rawCal > 0 && Math.abs(rawCal - atwaterCal) <= 120
            ? rawCal
            : Math.max(40, atwaterCal || rawCal || 350);

        suggestedMeal = {
          mealType: validMealTypes.has(String(rawSm.mealType))
            ? String(rawSm.mealType)
            : "makan_siang",
          foodName: String(rawSm.foodName).trim(),
          portionNote: String(rawSm.portionNote || "1 porsi disesuaikan").trim(),
          calories: finalCalories,
          carbs,
          protein,
          fat,
          orderingTip: rawSm.orderingTip ? String(rawSm.orderingTip).trim() : undefined,
        };
      }

      res.json({
        reply: replyText,
        suggestedMeal,
      });
    } catch (err) {
      const friendly = getFriendlyGeminiError(err);
      res.status(friendly.status).json({ error: friendly.message });
    }
  });

  if (!isProduction) {
    let viteMiddleware: express.RequestHandler | null = null;
    let viteInitError: Error | null = null;
    const disableHmr = process.env.DISABLE_HMR === "true";

    const viteReadyPromise = (async () => {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: disableHmr ? false : undefined,
          ws: disableHmr ? false : undefined,
          watch: disableHmr ? null : undefined,
        },
        appType: "spa",
      });
      viteMiddleware = vite.middlewares;
    })().catch((err) => {
      viteInitError = err instanceof Error ? err : new Error(String(err));
      console.error("Failed to initialize Vite dev middleware:", err);
    });

    app.use(async (req, res, next) => {
      if (!viteMiddleware && !viteInitError) {
        await viteReadyPromise;
      }
      if (viteInitError) {
        res.status(500).send("Gagal memuat Vite dev server.");
        return;
      }
      if (viteMiddleware) {
        viteMiddleware(req, res, next);
        return;
      }
      next();
    });
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Nutri Hijau server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting Nutri Hijau server:", err);
  process.exit(1);
});
