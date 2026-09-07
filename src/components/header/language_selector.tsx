"use client";

import { Fragment, useState, useEffect } from "react";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useTranslation, Language } from "@/i18n/i18n_context";

/**
 * Info: (20260825 - Julian) 語言清單提到模組層級。
 *
 * 手機版把語言收進漢堡選單之後，這份清單有兩個消費者（下拉與平舖）。
 * 抄第二份的話，新增語言時只改到其中一個，而漏掉的那個不會有人發現 ——
 * 它只是少一個選項，不會壞掉。
 */
export const SUPPORTED_LANGUAGES: { code: Language; label: string }[] = [
  { code: "zh-TW", label: "繁體中文" },
  { code: "zh-CN", label: "简体中文" },
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
];

interface ILanguageSelectorProps {
  /**
   * Info: (20260825 - Julian) `inline` 給漢堡選單用：平舖的膠囊按鈕，不是下拉。
   *
   * 不共用下拉的原因是它會變成「選單裡的選單」—— Headless UI 的 `MenuItems`
   * 已經接管了焦點，再嵌一層 `Menu` 進去，鍵盤操作與關閉行為都會打架。
   * 全螢幕選單本來就有空間直接把五個選項攤開。
   */
  variant?: "dropdown" | "inline";
}

export default function LanguageSelector({
  variant = "dropdown",
}: ILanguageSelectorProps) {
  const { language, setLanguage } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const languages = SUPPORTED_LANGUAGES;

  const currentLangLabel =
    languages.find((l) => l.code === language)?.label || "Language";

  if (!mounted) return null;

  if (variant === "inline") {
    return (
      <div className="flex flex-wrap gap-2">
        {languages.map((lang) => {
          const isCurrent = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              // Info: (20260825 - Julian) 選中狀態不只靠顏色：aria-pressed 給讀屏，粗體給視覺
              aria-pressed={isCurrent}
              onClick={() => setLanguage(lang.code)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                isCurrent
                  ? "border-brand bg-brand-soft text-brand font-semibold"
                  : "border-border-default text-text-secondary hover:text-brand"
              }`}
            >
              {lang.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Menu as="div" className="relative">
      <MenuButton className="text-text-primary hover:text-brand flex items-center gap-x-1 text-sm leading-6 font-semibold transition-colors focus:outline-none">
        <Globe className="size-5 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">{currentLangLabel}</span>
        <ChevronDown
          className="text-text-muted size-4 shrink-0"
          aria-hidden="true"
        />
      </MenuButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="bg-surface-overlay ring-border-default absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md py-1 shadow-lg ring-1 focus:outline-none">
          {languages.map((lang) => (
            <MenuItem key={lang.code}>
              {({ focus }) => (
                <button
                  onClick={() => setLanguage(lang.code)}
                  className={` ${focus ? "bg-brand-soft" : ""} ${language === lang.code ? "text-brand font-bold" : "text-text-secondary"} group flex w-full items-center justify-between px-4 py-2 text-sm`}
                >
                  <span>{lang.label}</span>
                  {language === lang.code && (
                    <Check className="size-4 shrink-0" />
                  )}
                </button>
              )}
            </MenuItem>
          ))}
        </MenuItems>
      </Transition>
    </Menu>
  );
}
