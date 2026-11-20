export interface CompressedImagePayload {
  base64: string;
  mimeType: string;
  previewDataUrl: string;
}

export async function compressImageFile(
  file: File,
  maxDimension = 1024,
  quality = 0.8
): Promise<CompressedImagePayload> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File yang dipilih harus berupa gambar (JPG, PNG, atau WebP).");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(new Error("Gagal membaca file gambar. Silakan pilih foto lain."));
      el.src = objectUrl;
    });

    const srcWidth = img.naturalWidth || img.width || 1;
    const srcHeight = img.naturalHeight || img.height || 1;
    const scale = Math.min(1, maxDimension / Math.max(srcWidth, srcHeight));
    const targetWidth = Math.max(1, Math.round(srcWidth * scale));
    const targetHeight = Math.max(1, Math.round(srcHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Browser tidak mendukung pemrosesan gambar.");
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const mimeType = "image/jpeg";
    const previewDataUrl = canvas.toDataURL(mimeType, quality);
    const commaIdx = previewDataUrl.indexOf(",");
    const base64 = commaIdx !== -1 ? previewDataUrl.slice(commaIdx + 1) : previewDataUrl;

    if (!base64) {
      throw new Error("Gagal mengonversi gambar. Silakan coba foto lain.");
    }

    return {
      base64,
      mimeType,
      previewDataUrl,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
