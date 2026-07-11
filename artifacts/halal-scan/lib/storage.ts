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

    const urlRes = await fetch(`${API_BASE}/api/storage/uploads/request-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, size: sizeBytes, contentType: mimeType }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!urlRes.ok) return null;
    const { uploadURL, objectPath } = (await urlRes.json()) as {
      uploadURL: string;
      objectPath: string;
    };

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const uploadRes = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: bytes,
      signal: AbortSignal.timeout(30_000),
    });
    if (!uploadRes.ok) return null;

    return objectPath;
  } catch {
    return null;
  }
}
