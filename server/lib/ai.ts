// Gemini client for the news digester and rebalancing agent.
//
// Two auth modes, auto-selected from env:
//   1. Vertex AI via Application Default Credentials (gcloud ADC) when
//      GOOGLE_GENAI_USE_VERTEXAI=true — no API key, uses the same login as the
//      Gemini CLI (GOOGLE_CLOUD_PROJECT / GOOGLE_CLOUD_LOCATION).
//   2. Google AI Studio API key when GEMINI_API_KEY is set.

import { GoogleAuth } from "google-auth-library";

const USE_VERTEX = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "global";
export const MODEL = process.env.AI_MODEL || "gemini-2.5-flash";

let _auth: GoogleAuth | null = null;
function auth(): GoogleAuth {
  if (!_auth) {
    // On hosted envs there is no gcloud ADC, so accept a service-account key
    // JSON via env; fall back to ADC (local gcloud login) when it's absent.
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    _auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      ...(raw ? { credentials: JSON.parse(raw) } : {}),
    });
  }
  return _auth;
}

export function hasAI(): boolean {
  return USE_VERTEX ? !!PROJECT : !!process.env.GEMINI_API_KEY;
}

interface GenerateOpts {
  system?: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
}

interface GeminiBody {
  contents: { role: string; parts: { text: string }[] }[];
  generationConfig: {
    maxOutputTokens: number;
    temperature: number;
    thinkingConfig: { thinkingBudget: number };
    responseMimeType?: string;
  };
  system_instruction?: { parts: { text: string }[] };
}

function buildBody({ system, user, maxTokens, json }: Required<Pick<GenerateOpts, "user">> & GenerateOpts): GeminiBody {
  const body: GeminiBody = {
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      maxOutputTokens: maxTokens ?? 2000,
      temperature: 0.4,
      // Disable gemini-2.5 "thinking" so a tight output budget is never spent
      // on hidden reasoning (which can yield empty answers), and responses are
      // faster and cheaper for these structured tasks.
      thinkingConfig: { thinkingBudget: 0 },
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (system) body.system_instruction = { parts: [{ text: system }] };
  return body;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

function extractText(data: GeminiResponse | undefined): string {
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

export async function generate({ system, user, maxTokens = 2000, json = false }: GenerateOpts): Promise<string> {
  const body = buildBody({ system, user, maxTokens, json });

  if (USE_VERTEX) {
    if (!PROJECT) throw new Error("GOOGLE_CLOUD_PROJECT not set");
    const host =
      LOCATION === "global"
        ? "https://aiplatform.googleapis.com"
        : `https://${LOCATION}-aiplatform.googleapis.com`;
    const url = `${host}/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
    const client = await auth().getClient();
    const res = await client.request<GeminiResponse>({ url, method: "POST", data: body, timeout: 30_000 });
    return extractText(res.data);
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("no AI credentials (set GOOGLE_GENAI_USE_VERTEXAI or GEMINI_API_KEY)");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return extractText((await res.json()) as GeminiResponse);
}
