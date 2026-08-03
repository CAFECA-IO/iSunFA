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

export default function LanguageSelector() {
  const { language, setLanguage } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const languages: { code: Language; label: string }[] = [
    { code: "zh-TW", label: "繁體中文" },
    { code: "zh-CN", label: "简体中文" },
    { code: "en", label: "English" },
    { code: "ko", label: "한국어" },
    { code: "ja", label: "日本語" },
  ];

  const currentLangLabel =
    languages.find((l) => l.code === language)?.label || "Language";

  if (!mounted) return null;

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
