"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/i18n_context";
import { TextAlignJustify } from "lucide-react";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";

export default function HeaderNav() {
  const { t } = useTranslation();

  const NAV_ITEMS = [
    {
      label: t("header.salary_calculator"),
      href: "/salary_calculator",
    },
    {
      label: t("header.ai_consultation_room"),
      href: "/ai_consultation_room",
    },
    {
      label: t("header.pricing"),
      href: "/pricing",
    },
  ];

  return (
    <>
      {/* Info: (20260304 - Julian) Desktop Navigation */}
      <div className="hidden items-center gap-x-3 sm:flex sm:gap-x-4 lg:gap-x-8">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="text-sm leading-6 font-semibold whitespace-nowrap text-gray-900 transition-colors hover:text-orange-600"
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Info: (20260304 - Julian) Mobile Navigation */}
      <Menu
        as="div"
        className="relative z-100 flex flex-col items-center sm:hidden"
      >
        <MenuButton className="flex items-center gap-x-1 px-2 py-1 text-sm leading-6 font-semibold text-gray-900 transition-colors hover:text-orange-600 focus:outline-none">
          <TextAlignJustify
            className="h-5 w-5 text-gray-500"
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
          <MenuItems className="ring-opacity-5 absolute top-6 z-10 mt-2 flex w-32 origin-top-right flex-col rounded-md bg-white shadow-lg ring-1 ring-black focus:outline-none">
            {NAV_ITEMS.map((item) => (
              <MenuItem key={item.label}>
                {() => (
                  <Link
                    href={item.href}
                    className="px-4 py-2 text-sm leading-6 whitespace-normal text-gray-700 transition-colors hover:text-orange-600"
                  >
                    <span>{item.label}</span>
                  </Link>
                )}
              </MenuItem>
            ))}
          </MenuItems>
        </Transition>
      </Menu>
    </>
  );
}
