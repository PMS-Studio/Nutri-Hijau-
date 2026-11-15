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
  const { GoogleGenAI, Type } = await loadGenAIModule();
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  return { ai, Type };
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
    category?: string;
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
}

const CATEGORY_LABELS: Record<string, string> = {
  postpartum: "Ibu Setelah Melahirkan (Pasca-Melahirkan / Menyusui)",
  adult_female: "Wanita Dewasa",
  adult_male: "Pria Dewasa",
  child_teen: "Anak / Remaja",
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

      const { ai, Type } = await getGeminiClient();
      const categoryLabel = CATEGORY_LABELS[body.userCategory || ""] || "Pengguna Umum";
      const mealType = body.mealType || "Makanan";
      const medicalLine = body.medicalNotes?.trim()
        ? `\nKondisi kesehatan/pantangan pengguna: ${body.medicalNotes.trim()}`
        : "";

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Perkirakan kandungan gizi dan kalori untuk makanan berikut:
Deskripsi makanan: "${description}"
Waktu makan: ${mealType}
Profil pengguna: ${categoryLabel}${body.isBreastfeeding ? " (Sedang menyusui)" : ""}${medicalLine}`,
        config: {
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
      });

      const rawText = (response.text || "{}").trim();
      const parsed = JSON.parse(rawText);

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
      } else {
        safetyDirectives =
          "Berikan panduan defisit kalori yang aman, berkelanjutan (300–500 kkal di bawah TDEE, atau pemeliharaan bila BMI < 18,5), cukup protein & serat sesuai standar BMI WHO Asia-Pasifik, serta rekomendasi olahraga praktis yang sesuai tingkat aktivitas pengguna.";
      }

      const medicalDirective = profile.medicalNotes?.trim()
        ? `\nCatatan Medis / Pantangan Pengguna (WAJIB DIPERHATIKAN): ${profile.medicalNotes.trim()}. Pastikan seluruh rekomendasi menu dan olahraga aman untuk kondisi tersebut dan ingatkan konsultasi dokter bila diperlukan.`
        : "";

      const systemInstruction = `Anda adalah Pelatih Gizi & Kebugaran Pribadi NutriHijau yang berbicara dalam Bahasa Indonesia yang hangat, akurat, terstruktur, dan berbasis bukti ilmiah (merujuk pedoman Kemenkes RI / AKG / WHO).

Profil Pengguna Saat Ini:
- Nama: ${profile.name || "Pengguna"}
- Kategori: ${categoryLabel}
- Usia: ${profile.age ?? "-"} tahun
- Berat Saat Ini: ${profile.currentWeight ?? "-"} kg | Berat Target: ${profile.targetWeight ?? "-"} kg | Tinggi: ${profile.height ?? "-"} cm
- Rumus BMR: ${profile.bmrFormula || "Mifflin-St Jeor"}
- BMI: ${profile.bmi ?? "-"} (${profile.bmiCategory || "-"}, standar ${profile.bmiStandard || "WHO Asia-Pasifik"})
- Target Kalori Harian: ${profile.dailyCalorieTarget ?? "-"} kkal | Target Protein: ${profile.proteinTargetG ?? "-"}g
- Target Air Minum: ${profile.waterTargetMl ?? "-"} ml/hari

Ringkasan Hari Ini:
- Kalori Masuk: ${today.caloriesIn ?? 0} kkal
- Kalori Keluar (Olahraga): ${today.caloriesOut ?? 0} kkal
- Sisa Kalori: ${today.remainingCalories ?? 0} kkal
- Makro Masuk: Karbo ${today.carbs ?? 0}g, Protein ${today.protein ?? 0}g, Lemak ${today.fat ?? 0}g
- Air Minum: ${today.waterMl ?? 0} ml

${safetyDirectives}${medicalDirective}

Aturan Akurasi & Keamanan:
1. Gunakan Bahasa Indonesia sepenuhnya yang natural dan bahan makanan lokal Indonesia sesuai takaran TKPI/URT (sendok, potong, mangkuk, gram).
2. Selaraskan angka kalori dan target protein yang Anda sebutkan dengan profil pengguna di atas—jangan mengarang target kalori baru yang bertentangan.
3. Jangan membuat klaim medis absolut atau menggantikan diagnosis dokter. Jika pertanyaan menyangkut keluhan medis serius, sarankan konsultasi langsung ke dokter atau ahli gizi klinis (Sp.GK / RD).
4. Format jawaban ringkas menggunakan poin bernomor atau daftar bullet agar mudah dipindai.`;

      const historyContents = (body.history || []).slice(-10).map((item) => ({
        role: item.role === "model" ? "model" : "user",
        parts: [{ text: item.text }],
      }));

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: [
          ...historyContents,
          { role: "user", parts: [{ text: message }] },
        ],
        config: {
          systemInstruction,
        },
      });

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
    console.log(`NutriHijau server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting NutriHijau server:", err);
  process.exit(1);
});
