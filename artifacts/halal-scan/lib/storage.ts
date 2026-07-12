const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export async function uploadPhotoToStorage(
  base64: string,
  mimeType = "image/jpeg",
): Promise<string | null> {
  if (!base64 || !API_BASE) return null;
  try {
    const ext = mimeType.split("/")[1] ?? "jpg";
    const name = `scan_${Date.now()}.${ext}`;
    const sizeBytes = Math.ceil(base64.length * 0.75);

    // Use AbortController for Hermes compatibility (no AbortSignal.timeout)
    const ctrl1 = new AbortController();
    const t1 = setTimeout(() => ctrl1.abort(), 10_000);
    let urlRes: Response;
    try {
      urlRes = await fetch(`${API_BASE}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, size: sizeBytes, contentType: mimeType }),
        signal: ctrl1.signal,
      });
    } finally {
      clearTimeout(t1);
    }
    if (!urlRes.ok) return null;

    const { uploadURL, objectPath } = (await urlRes.json()) as {
      uploadURL: string;
      objectPath: string;
    };

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const ctrl2 = new AbortController();
    const t2 = setTimeout(() => ctrl2.abort(), 30_000);
    let uploadRes: Response;
    try {
      uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: bytes,
        signal: ctrl2.signal,
      });
    } finally {
      clearTimeout(t2);
    }
    if (!uploadRes.ok) return null;

    return objectPath;
  } catch {
    return null;
  }
}
