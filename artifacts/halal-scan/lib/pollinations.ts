/**
 * Pollinations.ai — free OpenAI-compatible text API, no key required.
 * Docs: POLLINATIONS_AI_GUIDE.md
 * Endpoint: https://text.pollinations.ai/openai
 */

const POLLINATIONS_URL = "https://text.pollinations.ai/openai";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type AIHalalVerdict = "halal" | "haram" | "warning" | "unknown";
export type AIConfidence = "high" | "medium" | "low";

export interface AIHalalResult {
  result: AIHalalVerdict;
  reason: string;
  confidence: AIConfidence;
}

const SYSTEM_PROMPT = `Tu es HalalBot, un expert reconnu en alimentation halal islamique (fiqh alimentaire).
Tu aides à déterminer si un produit alimentaire est halal, haram ou douteux selon le consensus des écoles juridiques sunnites.

Règles clés :
- Porc et tous dérivés (lard, gélatine porcine, saindoux, etc.) → HARAM
- Alcool et toute boisson alcoolisée → HARAM
- Sang et dérivés → HARAM
- Gélatine d'origine inconnue, E471/E472 d'origine animale non-halal → HARAM
- Carmin (E120), shellac (E904) → WARNING (insecte)
- Présure animale non certifiée, arômes naturels d'origine inconnue → WARNING
- Produits végétaux purs, épices, céréales, fruits, légumes → HALAL
- Vinaigre, levure, agar-agar, gomme arabique → HALAL

Réponds UNIQUEMENT avec ce JSON strict (aucun texte avant/après) :
{"result":"halal","reason":"explication courte max 80 mots","confidence":"high"}

result = "halal" | "haram" | "warning"
confidence = "high" | "medium" | "low"`;

async function askAI(messages: AIMessage[]): Promise<string> {
  const res = await fetch(POLLINATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai-large",
      messages,
      stream: false,
      seed: Math.floor(Math.random() * 999999),
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);
  const data = (await res.json()) as {
    choices?: Array<{ message: { content: string } }>;
  };
  return data?.choices?.[0]?.message?.content ?? "";
}

/**
 * Ask Pollinations AI for a halal verdict on a product.
 * Called client-side from ResultOverlay — each user hits their own IP quota.
 */
export async function getHalalVerdictFromAI(
  productName: string,
  ingredientsText?: string | null,
  currentVerdict?: string,
): Promise<AIHalalResult | null> {
  let prompt = `Produit : "${productName}"`;

  if (ingredientsText) {
    // Limit context to avoid token overrun
    const trimmed = ingredientsText.slice(0, 600);
    prompt += `\nIngrédients : ${trimmed}`;
  }

  if (currentVerdict && currentVerdict !== "unknown") {
    prompt += `\nAnalyse automatique actuelle : ${currentVerdict}. Confirme ou corrige.`;
  } else {
    prompt += `\nDonne ton verdict halal.`;
  }

  try {
    const reply = await askAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ]);

    // Extract JSON — handle markdown code fences
    const jsonMatch = reply.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<AIHalalResult>;
    if (!["halal", "haram", "warning"].includes(parsed.result ?? "")) return null;

    return {
      result: parsed.result as AIHalalVerdict,
      reason: (parsed.reason ?? "Analyse IA disponible.").slice(0, 300),
      confidence: (["high", "medium", "low"].includes(parsed.confidence ?? "")
        ? parsed.confidence
        : "medium") as AIConfidence,
    };
  } catch {
    return null;
  }
}
