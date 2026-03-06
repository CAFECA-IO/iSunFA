"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { en } from "@/i18n/en";
import { zhTw } from "@/i18n/zh_tw";
import { zhCn } from "@/i18n/zh_cn";
import { ko } from "@/i18n/ko";
import { ja } from "@/i18n/ja";

export type Language = "en" | "zh-TW" | "zh-CN" | "ko" | "ja";
type Dictionary = Record<string, unknown>;

function getNestedValue<T = string>(
  obj: Record<string, unknown>,
  path: string,
): T {
  const value = path.split(".").reduce((prev: unknown, curr: string) => {
    if (prev && typeof prev === "object" && !Array.isArray(prev)) {
      return (prev as Record<string, unknown>)[curr];
    }
    return undefined;
  }, obj);
  return value !== undefined ? (value as T) : (path as unknown as T);
}

interface II18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: {
    (key: string, options?: Record<string, string | number>): string;
    <T>(key: string, options?: Record<string, string | number>): T;
  };
}

const I18nContext = createContext<II18nContextType | undefined>(undefined);

const dictionaries: Record<Language, Dictionary> = {
  en,
  "zh-TW": zhTw,
  "zh-CN": zhCn,
  ko,
  ja,
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh-TW"); // Default to zh-TW
  const [dictionary, setDictionary] = useState<Dictionary>(zhTw);

  useEffect(() => {
    // Info: (20260120 - Luphia) Load persisted language
    const savedLang = localStorage.getItem("isunfa_lang") as Language;
    if (
      savedLang &&
      Object.keys(dictionaries).includes(savedLang) &&
      savedLang !== language
    ) {
      setLanguage(savedLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setDictionary(dictionaries[lang]);
    localStorage.setItem("isunfa_lang", lang);
  };

  const t = <T = string,>(
    key: string,
    options?: Record<string, string | number>,
  ): T => {
    const text: unknown = getNestedValue<unknown>(dictionary, key);
    if (options && typeof text === "string") {
      let stringText = text;
      Object.entries(options).forEach(([k, v]) => {
        stringText = stringText.replace(new RegExp(`{{${k}}}`, "g"), String(v));
      });
      return stringText as T;
    }
    return text as T;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
