export interface ApiRequestOptions {
  timeoutMs?: number;
  fallbackError?: string;
}

interface ParsedJsonResult {
  data: Record<string, unknown> | null;
  isJson: boolean;
}

export function tryParseJsonText(rawText: string): ParsedJsonResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { data: null, isJson: false };
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { data: parsed as Record<string, unknown>, isJson: true };
    }
    return { data: null, isJson: true };
  } catch {
    return { data: null, isJson: false };
  }
}

export function mapNonJsonOrHttpError(
  status: number,
  rawText: string,
  fallbackError: string
): string {
  const lower = rawText.toLowerCase();

  if (
    status === 504 ||
    lower.includes("upstream request timeout") ||
    lower.includes("gateway timeout") ||
    lower.includes("timed out") ||
    lower.includes("timeout")
  ) {
    return "Permintaan ke server AI melewati batas waktu (timeout). Silakan coba lagi atau ringkas permintaan Anda.";
  }

  if (
    status === 502 ||
    status === 503 ||
    lower.includes("upstream") ||
    lower.includes("bad gateway") ||
    lower.includes("service unavailable") ||
    lower.includes("<!doctype") ||
    lower.includes("<html")
  ) {
    return "Koneksi ke server AI sedang sibuk atau terputus sementara. Silakan coba kirim ulang beberapa saat lagi.";
  }

  if (status === 429) {
    return "Permintaan ke layanan AI sedang padat. Mohon tunggu sebentar lalu coba lagi.";
  }

  if (status >= 500) {
    return fallbackError || "Terjadi kendala pada server saat memproses permintaan. Silakan coba lagi.";
  }

  return fallbackError;
}

export async function postJsonApi<TResponse>(
  url: string,
  body: unknown,
  options: ApiRequestOptions = {}
): Promise<TResponse> {
  const timeoutMs = options.timeoutMs ?? 45000;
  const fallbackError =
    options.fallbackError ?? "Gagal memproses permintaan ke server. Silakan coba lagi.";

  const controller = new AbortController();
  const timerId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const rawText = await res.text();
    const { data, isJson } = tryParseJsonText(rawText);

    if (!res.ok) {
      const apiError =
        data && typeof data.error === "string" && data.error.trim()
          ? data.error.trim()
          : mapNonJsonOrHttpError(res.status, rawText, fallbackError);
      throw new Error(apiError);
    }

    if (!isJson || !data) {
      throw new Error(mapNonJsonOrHttpError(res.status, rawText, fallbackError));
    }

    return data as unknown as TResponse;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        "Waktu tunggu respons server AI habis. Silakan periksa koneksi Anda lalu coba lagi."
      );
    }
    if (err instanceof TypeError) {
      throw new Error(
        "Tidak dapat terhubung ke server Nutri Hijau. Periksa koneksi internet Anda lalu coba lagi."
      );
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(fallbackError);
  } finally {
    window.clearTimeout(timerId);
  }
}
