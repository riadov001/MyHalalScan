# Guide — Intégration IA avec Pollinations.ai

> API de chat IA gratuite, sans compte, sans clé API, compatible OpenAI.
> Fonctionne dans tous les environnements : React Native, React/Vue/Svelte, Node.js, Python, Swift, etc.

---

## Pourquoi Pollinations.ai

| Avantage | Détail |
|----------|--------|
| **Gratuit** | Aucun abonnement, aucune carte bancaire |
| **Sans clé API** | Aucune variable d'environnement requise |
| **Compatible OpenAI** | Même format que l'API officielle OpenAI |
| **Appelable côté client** | Depuis le navigateur, l'app mobile, ou un serveur |
| **Rate-limit par IP** | Chaque utilisateur consomme son propre quota |

**Endpoint :** `https://text.pollinations.ai/openai`

---

## Modèles disponibles

| `model` | Équivalent | Usage recommandé |
|---------|------------|-----------------|
| `openai-large` | GPT-4o | Réponses complexes, nuancées — **recommandé** |
| `openai` | GPT-4o mini | Réponses rapides et simples |
| `mistral` | Mistral Large | Alternative open-source |
| `llama` | LLaMA 3 | Alternative open-source légère |

---

## L'appel API — format universel

Le corps de la requête est identique quel que soit le langage ou le framework.

```json
POST https://text.pollinations.ai/openai
Content-Type: application/json

{
  "model": "openai-large",
  "messages": [
    { "role": "system",    "content": "Tu es un assistant utile." },
    { "role": "user",      "content": "Bonjour, comment ça va ?" },
    { "role": "assistant", "content": "Très bien, merci !" },
    { "role": "user",      "content": "Quelle est la capitale de la France ?" }
  ],
  "stream": false,
  "seed": 42
}
```

**Réponse :**
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "La capitale de la France est Paris."
      }
    }
  ]
}
```

Extraire la réponse : `data.choices[0].message.content`

---

## Paramètres importants

| Paramètre | Valeur conseillée | Pourquoi |
|-----------|-------------------|----------|
| `model` | `"openai-large"` | Meilleure qualité disponible gratuitement |
| `stream` | `false` | Plus simple — réponse complète en une fois |
| `seed` | `Math.random() * 999999` | Empêche le cache serveur de renvoyer une ancienne réponse |

---

## Exemples par technologie

### JavaScript / TypeScript (navigateur ou Node.js)

```typescript
const POLLINATIONS_URL = "https://text.pollinations.ai/openai";

async function askAI(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(POLLINATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai-large",
      messages,
      stream: false,
      seed: Math.floor(Math.random() * 999999),
    }),
  });

  if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
```

---

### Python

```python
import requests
import random

POLLINATIONS_URL = "https://text.pollinations.ai/openai"

def ask_ai(messages: list[dict]) -> str:
    response = requests.post(
        POLLINATIONS_URL,
        json={
            "model": "openai-large",
            "messages": messages,
            "stream": False,
            "seed": random.randint(0, 999999),
        },
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]
```

---

### Swift (iOS natif)

```swift
func askAI(messages: [[String: String]]) async throws -> String {
    let url = URL(string: "https://text.pollinations.ai/openai")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body: [String: Any] = [
        "model": "openai-large",
        "messages": messages,
        "stream": false,
        "seed": Int.random(in: 0..<999999)
    ]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, _) = try await URLSession.shared.data(for: request)
    let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
    let choices = json["choices"] as! [[String: Any]]
    let message = choices[0]["message"] as! [String: String]
    return message["content"] ?? ""
}
```

---

### Kotlin (Android natif)

```kotlin
suspend fun askAI(messages: List<Map<String, String>>): String {
    val client = OkHttpClient()
    val body = JSONObject().apply {
        put("model", "openai-large")
        put("messages", JSONArray(messages.map { JSONObject(it as Map<*, *>) }))
        put("stream", false)
        put("seed", (0..999999).random())
    }
    val request = Request.Builder()
        .url("https://text.pollinations.ai/openai")
        .post(body.toString().toRequestBody("application/json".toMediaType()))
        .build()

    val response = client.newCall(request).execute()
    val json = JSONObject(response.body!!.string())
    return json.getJSONArray("choices")
        .getJSONObject(0)
        .getJSONObject("message")
        .getString("content")
}
```

---

## Pattern conversation multi-tours

L'API est **stateless** : il faut renvoyer tout l'historique à chaque message.

```
[system]     → définit le rôle de l'assistant (envoyé à chaque requête)
[user]       → premier message de l'utilisateur
[assistant]  → réponse de l'IA
[user]       → deuxième message
[assistant]  → réponse de l'IA
...
```

**Structure de state recommandée :**

```typescript
// Historique visible (affiché dans l'UI)
const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);

async function sendMessage(userInput: string, systemPrompt: string) {
  const userMsg = { role: "user", content: userInput };
  const history = [...messages, userMsg];

  // Construire le payload : system prompt + historique complet
  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...history,
  ];

  const reply = await askAI(apiMessages);
  const assistantMsg = { role: "assistant", content: reply };

  setMessages([...history, assistantMsg]);
}
```

---

## System prompt — recette universelle

Le system prompt définit **qui est l'assistant** et **comment il répond**.

```
Tu es [NOM], un assistant [DOMAINE].
Tu aides les utilisateurs avec [SUJET PRINCIPAL].
Ton ton est [adjectif : bienveillant / professionnel / pédagogue / amusant].
Tu réponds toujours en [LANGUE] sauf si l'utilisateur écrit dans une autre langue.
Tu ne discutes jamais de [SUJETS HORS PÉRIMÈTRE].
```

**Exemple — assistant médical :**
```
Tu es MedBot, un assistant de santé bienveillant.
Tu aides les utilisateurs à comprendre leurs symptômes et à trouver des informations médicales fiables.
Ton ton est calme, rassurant et précis.
Tu rappelles toujours de consulter un médecin pour tout diagnostic.
Tu ne prescris jamais de médicaments.
Tu réponds toujours en français.
```

**Multi-langue — dictionnaire de prompts :**
```typescript
const PROMPTS: Record<string, string> = {
  fr: "Tu es [NOM]...",
  en: "You are [NOM]...",
  ar: "أنت [NOM]...",
  es: "Eres [NOM]...",
};

// Usage
const systemPrompt = PROMPTS[userLanguage] ?? PROMPTS.fr;
```

---

## Gestion d'erreurs

Toujours afficher un **message humain**, jamais l'erreur technique brute.

```typescript
try {
  const reply = await askAI(apiMessages);
  // afficher reply dans l'UI
} catch (err) {
  const message = "Une erreur s'est produite. Vérifiez votre connexion et réessayez.";
  // afficher message dans l'UI
}
```

**Causes d'erreur les plus courantes :**

| Erreur | Cause probable | Solution |
|--------|---------------|----------|
| `HTTP 429` | Rate limit atteint | Attendre quelques secondes, réessayer |
| `HTTP 500` | Serveur Pollinations indisponible | Afficher message offline, réessayer plus tard |
| `Network Error` | Pas de connexion internet | Détecter offline avant l'appel |
| Réponse vide | Prompt trop long ou filtré | Réduire l'historique, revoir le prompt |

---

## Gérer un historique trop long

Chaque token envoyé est compté. Si la conversation devient très longue :

```typescript
// Option 1 — Garder seulement les N derniers messages
const trimmedHistory = messages.slice(-20);

// Option 2 — Garder le premier message (contexte initial) + les N derniers
const trimmedHistory = [
  messages[0],
  ...messages.slice(-10),
];
```

---

## Checklist nouveau projet

- [ ] Aucune clé API à configurer
- [ ] Aucune variable d'environnement requise
- [ ] Copier la fonction `askAI` adaptée à la technologie du projet
- [ ] Définir le `systemPrompt` adapté au domaine
- [ ] Gérer l'historique en state (ou base de données si persistance requise)
- [ ] Afficher un indicateur de chargement pendant l'appel
- [ ] Afficher un message d'erreur humain en cas d'échec
- [ ] Toujours inclure `seed: Math.random()` pour éviter le cache
- [ ] Tronquer l'historique si la conversation devient très longue

---

## Limites connues

| Limite | Valeur approximative |
|--------|---------------------|
| Rate limit | ~10–20 requêtes/minute par IP |
| Fenêtre de contexte | ~16 000 tokens (≈ 12 000 mots) |
| Latence | 2–8 secondes selon la charge |
| Disponibilité | Pas de SLA garanti (service gratuit) |

> Pour un usage en production critique, prévoir un fallback ou passer à l'API OpenAI officielle avec clé payante.
