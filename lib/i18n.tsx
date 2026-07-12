import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  translate as sunbirdTranslate,
  SUPPORTED_LANGUAGES,
} from "@/lib/sunbird";
import { APP_STRINGS } from "@/lib/strings";
import { BUNDLED_TRANSLATIONS } from "@/lib/translations";

const CACHE_PREFIX = "i18n_v3_";
const BATCH_SIZE = 8;

interface LanguageContextValue {
  language: string;
  languageName: string;
  setLanguage: (code: string) => Promise<void>;
  translate: (text: string) => Promise<string>;
  t: (key: string) => string;
  translating: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "eng",
  languageName: "English",
  setLanguage: async () => {},
  translate: async (text: string) => text,
  t: (key: string) => APP_STRINGS[key] ?? key,
  translating: false,
});

async function batchTranslate(
  lang: string,
  keys: string[],
  onBatch?: (partial: Record<string, string>) => void
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map(async (key) => {
        const translated = await sunbirdTranslate(
          APP_STRINGS[key]!,
          "eng",
          lang
        );
        return { key, translated };
      })
    );
    const partial: Record<string, string> = {};
    for (const entry of settled) {
      if (entry.status === "fulfilled") {
        result[entry.value.key] = entry.value.translated;
        partial[entry.value.key] = entry.value.translated;
      }
    }
    if (Object.keys(partial).length > 0) {
      onBatch?.(partial);
    }
  }

  return result;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [language, setLanguageState] = useState("eng");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState(false);
  const activeTranslation = useRef<string | null>(null);

  const languageName =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name ?? "English";

  useEffect(() => {
    if (!session?.user.id) return;
    supabase
      .from("profiles")
      .select("preferred_language")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.preferred_language) {
          setLanguageState(data.preferred_language);
        }
      });
  }, [session?.user.id]);

  useEffect(() => {
    if (language === "eng") {
      setTranslations({});
      setTranslating(false);
      return;
    }
    loadTranslations(language);
  }, [language]);

  const loadTranslations = async (lang: string) => {
    activeTranslation.current = lang;

    const bundled = BUNDLED_TRANSLATIONS[lang] ?? {};
    setTranslations(bundled);

    const cacheKey = `${CACHE_PREFIX}${lang}`;
    const allKeys = Object.keys(APP_STRINGS);
    const cached = await AsyncStorage.getItem(cacheKey);
    const parsed = cached ? (JSON.parse(cached) as Record<string, string>) : {};

    if (activeTranslation.current !== lang) return;

    const base = { ...bundled, ...parsed };
    setTranslations(base);

    const missingKeys = allKeys.filter((k) => !(k in base));
    if (missingKeys.length === 0) {
      setTranslating(false);
      return;
    }

    setTranslating(true);
    const fresh = await batchTranslate(lang, missingKeys, (partial) => {
      if (activeTranslation.current === lang) {
        setTranslations((prev) => ({ ...prev, ...partial }));
      }
    });

    if (activeTranslation.current !== lang) return;

    setTranslations({ ...base, ...fresh });
    setTranslating(false);
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ ...parsed, ...fresh }));
  };

  const setLanguage = useCallback(
    async (code: string) => {
      setLanguageState(code);
      if (session?.user.id) {
        await supabase
          .from("profiles")
          .update({ preferred_language: code })
          .eq("id", session.user.id);
      }
    },
    [session?.user.id]
  );

  const translate = useCallback(
    (text: string) => sunbirdTranslate(text, "eng", language),
    [language]
  );

  const t = useCallback(
    (key: string): string => {
      if (language === "eng") return APP_STRINGS[key] ?? key;
      return translations[key] ?? APP_STRINGS[key] ?? key;
    },
    [language, translations]
  );

  return (
    <LanguageContext.Provider
      value={{ language, languageName, setLanguage, translate, t, translating }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
