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
      <MenuButton className="flex items-center gap-x-1 text-sm leading-6 font-semibold text-gray-900 transition-colors hover:text-orange-600 focus:outline-none">
        <Globe className="size-5 shrink-0 text-gray-500" aria-hidden="true" />
        <span className="hidden sm:inline">{currentLangLabel}</span>
        <ChevronDown
          className="size-4 shrink-0 text-gray-400"
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
        <MenuItems className="ring-opacity-5 absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black focus:outline-none">
          {languages.map((lang) => (
            <MenuItem key={lang.code}>
              {({ focus }) => (
                <button
                  onClick={() => setLanguage(lang.code)}
                  className={` ${focus ? "bg-orange-50" : ""} ${language === lang.code ? "font-bold text-orange-600" : "text-gray-700"} group flex w-full items-center justify-between px-4 py-2 text-sm`}
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
