// Gemini client (Vertex AI via gcloud ADC, or AI Studio API key). Server-only.
import { GoogleAuth } from "google-auth-library";

const USE_VERTEX = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "global";
const MODEL = process.env.AI_MODEL || "gemini-2.5-flash";

let _auth: GoogleAuth | null = null;
function auth() {
  if (!_auth) {
    // On Vercel/hosted there is no gcloud ADC, so accept a service-account key
    // JSON via env; fall back to ADC (local gcloud login) when it's absent.
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    _auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      ...(raw ? { credentials: JSON.parse(raw) } : {}),
    });
  }
  return _auth;
}

export function hasAI() {
  return USE_VERTEX ? !!PROJECT : !!process.env.GEMINI_API_KEY;
}

function extractText(data: any) {
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
}

export async function generate({
  system,
  user,
  maxTokens = 800,
  json = false,
}: {
  system?: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
}): Promise<string> {
  const body: any = {
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.4,
      thinkingConfig: { thinkingBudget: 0 },
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (system) body.system_instruction = { parts: [{ text: system }] };

  if (USE_VERTEX) {
    if (!PROJECT) throw new Error("GOOGLE_CLOUD_PROJECT not set");
    const host =
      LOCATION === "global"
        ? "https://aiplatform.googleapis.com"
        : `https://${LOCATION}-aiplatform.googleapis.com`;
    const url = `${host}/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
    const client = await auth().getClient();
    const res: any = await client.request({ url, method: "POST", data: body });
    return extractText(res.data);
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("no AI credentials");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return extractText(await res.json());
}
