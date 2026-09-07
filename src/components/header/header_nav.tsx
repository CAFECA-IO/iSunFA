"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/i18n_context";
import { TextAlignJustify, CreditCard, X, Gift } from "lucide-react";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import { PUBLIC_MODULES, getModuleI18nKey } from "@/constants/modules";
import LanguageSelector from "@/components/header/language_selector";
import ThemeToggle from "@/components/header/theme_toggle";

export default function HeaderNav() {
  const { t } = useTranslation();

  const NAV_ITEMS = [
    ...PUBLIC_MODULES.filter((module) => module.nav).map((module) => ({
      label: t(getModuleI18nKey(module.key)),
      href: `/${module.key}`,
      icon: module.icon,
    })),
    {
      label: t("header.pricing"),
      href: "/pricing",
      icon: CreditCard,
    },
    {
      label: t("header.solutions"),
      href: "/solutions",
      icon: Gift,
    },
  ];

  return (
    <>
      {/* Info: (20260304 - Julian) Desktop Navigation */}
      <div className="hidden items-center gap-x-3 xl:flex">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group text-text-primary hover:text-brand flex items-center gap-1 px-2 py-1 text-sm leading-6 font-semibold whitespace-nowrap transition-colors"
          >
            <item.icon className="size-5 shrink-0" />
            <p className="max-w-0 overflow-hidden transition-all duration-300 group-hover:max-w-40">
              {item.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Info: (20260304 - Julian) Mobile Navigation */}
      <Menu
        as="div"
        className="relative z-100 flex flex-col items-center xl:hidden"
      >
        {({ close }) => (
          <>
            <MenuButton className="text-text-primary hover:text-brand flex items-center gap-x-1 px-2 py-1 text-sm leading-6 font-semibold transition-colors focus:outline-none">
              <TextAlignJustify
                className="text-text-muted size-5 shrink-0"
                aria-hidden="true"
              />
            </MenuButton>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200 md:duration-100"
              enterFrom="transform opacity-0 translate-y-full md:translate-y-0 md:scale-95"
              enterTo="transform opacity-100 translate-y-0 md:scale-100"
              leave="transition ease-in duration-150 md:duration-75"
              leaveFrom="transform opacity-100 translate-y-0 md:scale-100"
              leaveTo="transform opacity-0 translate-y-full md:translate-y-0 md:scale-95"
            >
              <MenuItems className="bg-surface-overlay fixed top-0 left-0 h-screen w-full">
                <button
                  type="button"
                  onClick={close}
                  className="border-border-default flex w-full shrink-0 justify-end border-b px-6 py-4 shadow"
                >
                  <X size={24} />
                </button>
                <div className="h-full overflow-y-auto pb-10">
                  {NAV_ITEMS.map((item) => (
                    <MenuItem key={item.label}>
                      {() => (
                        <Link
                          href={item.href}
                          onClick={close}
                          className="border-border-default text-text-secondary hover:text-brand flex items-center justify-center gap-4 border-b px-6 py-4 text-sm leading-6 whitespace-normal transition-colors last:border-none"
                        >
                          <item.icon size={14} className="shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      )}
                    </MenuItem>
                  ))}

                  {/* Info: (20260825 - Julian) 深淺模式與語言在 xl 以下收進這裡 */}
                  <div className="border-border-default flex items-center justify-between gap-4 border-b px-6 py-4">
                    <span className="text-text-secondary text-sm leading-6">
                      {t("header.appearance")}
                    </span>
                    <ThemeToggle />
                  </div>
                  <div className="flex flex-col gap-3 px-6 py-4">
                    <span className="text-text-secondary text-sm leading-6">
                      {t("header.language")}
                    </span>
                    <LanguageSelector variant="inline" />
                  </div>
                </div>
              </MenuItems>
            </Transition>
          </>
        )}
      </Menu>
    </>
  );
}
