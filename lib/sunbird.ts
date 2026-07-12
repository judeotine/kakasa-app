const BASE_URL = "https://api.sunbird.ai";

const API_KEY = process.env.EXPO_PUBLIC_SUNBIRD_API_KEY;

export const SUPPORTED_LANGUAGES = [
  { code: "eng", name: "English", nativeName: "English" },
  { code: "lug", name: "Luganda", nativeName: "Oluganda" },
  { code: "nyn", name: "Runyankole", nativeName: "Runyankole" },
  { code: "ach", name: "Acholi", nativeName: "Lëb Acoli" },
  { code: "teo", name: "Ateso", nativeName: "Ateso" },
  { code: "lgg", name: "Lugbara", nativeName: "Lugbara" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
] as const;

const translationCache = new Map<string, string>();

export async function translate(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (sourceLang === targetLang) return text;

  const cacheKey = `${sourceLang}:${targetLang}:${text}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${BASE_URL}/tasks/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        source_language: sourceLang,
        target_language: targetLang,
        text,
      }),
    });

    const data = await response.json();
    const translatedText: string = data.output.translated_text;
    translationCache.set(cacheKey, translatedText);
    return translatedText;
  } catch {
    return text;
  }
}

export async function detectLanguage(text: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/tasks/language_id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ text }),
  });

  const data = await response.json();
  return data.output.language;
}
