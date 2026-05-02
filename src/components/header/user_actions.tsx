"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import { User, ChevronDown, Copy, Check, X } from "lucide-react";
import {
  MODULES,
  ADMIN_MODULES,
  SYSTEM_MODULES,
  PUBLIC_MODULES,
  getModuleI18nKey,
} from "@/constants/modules";
import { useAuth } from "@/contexts/auth_context";
import { useTranslation } from "@/i18n/i18n_context";
import LoginButton from "@/components/common/login_button";
import { useParams } from "next/navigation";

export default function UserActions() {
  const { user, logout, refreshAuth } = useAuth();
  const { t } = useTranslation();
  const params = useParams();
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleCopyAddress = () => {
    if (user?.address) {
      navigator.clipboard.writeText(user.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  // Info: (20260118 - Luphia) Check if a module is active for the current user
  const isModuleActive = (moduleKey: string) => {
    if (!user || !user.modules) return false;
    return user.modules.includes(moduleKey);
  };

  if (!user) {
    return <LoginButton />;
  }

  // Info: (20260309 - Luphia) 根據目前路徑取得 account_book_id
  const accountBookId = (params?.account_book_id as string) || "default";
  const accountBookPath = `/user/account_book/${accountBookId}`;
  const isAdmin =
    user.isAdmin || user.role === "SUPER_ADMIN" || user.role === "ADMIN";

  // Info: (20260424 - Julian) 功能模組選單
  const modulesMenuItems = (() => {
    const modulesToDisplay = isAdmin ? ADMIN_MODULES : MODULES.filter((m) => m.basic !== false);

    return modulesToDisplay.map((module) => {
      const active = isAdmin ? true : isModuleActive(module.key);
      const Icon = module.icon;
      const targetPath = isAdmin
        ? `/admin/${module.key}`
        : `${accountBookPath}/${module.key}`;

      return (
        <MenuItem key={module.key} as={Fragment}>
          {({ focus }) =>
            active ? (
              <Link
                href={targetPath}
                className={` ${focus ? "bg-orange-50 ring-1 ring-orange-200" : "bg-white shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 md:shadow-none md:ring-gray-100"} group flex h-full w-full flex-col items-center justify-center rounded-xl p-2 transition-all duration-200 md:rounded-lg md:p-3`}
              >
                <Icon
                  className={`mb-1 h-6 w-6 md:mb-2 md:h-6 md:w-6 ${focus ? "text-orange-600" : "text-gray-500 group-hover:text-orange-500"}`}
                />
                <span
                  className={`text-center text-xs font-normal md:text-sm md:font-medium ${focus ? "text-orange-900" : "text-gray-700"}`}
                >
                  {t(getModuleI18nKey(module.key))}
                </span>
              </Link>
            ) : (
              <div className="flex h-full w-full cursor-not-allowed flex-col items-center justify-center rounded-xl bg-gray-50/80 p-2 opacity-60 ring-1 ring-gray-100 md:rounded-lg md:bg-gray-50/50 md:p-3">
                <Icon size={24} className="mb-1 text-gray-300 md:mb-2" />
                <span className="text-center text-xs font-normal text-gray-400 md:text-sm md:font-medium">
                  {t(getModuleI18nKey(module.key))}
                </span>
              </div>
            )
          }
        </MenuItem>
      );
    });
  })();

  // Info: (20260502 - Luphia) 小工具選單
  const publicModulesMenuItems = (() => {
    return PUBLIC_MODULES.map((module) => {
      const Icon = module.icon;
      const targetPath = `/${module.key}`;

      return (
        <MenuItem key={module.key} as={Fragment}>
          {({ focus }) => (
            <Link
              href={targetPath}
              className={` ${focus ? "bg-orange-50 ring-1 ring-orange-200" : "bg-white shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 md:shadow-none md:ring-gray-100"} group flex h-full w-full flex-col items-center justify-center rounded-xl p-2 transition-all duration-200 md:rounded-lg md:p-3`}
            >
              <Icon
                className={`mb-1 h-6 w-6 md:mb-2 md:h-6 md:w-6 ${focus ? "text-orange-600" : "text-gray-500 group-hover:text-orange-500"}`}
              />
              <span
                className={`text-center text-xs font-normal md:text-sm md:font-medium ${focus ? "text-orange-900" : "text-gray-700"}`}
              >
                {t(getModuleI18nKey(module.key))}
              </span>
            </Link>
          )}
        </MenuItem>
      );
    });
  })();

  // Info: (20260423 - Julian) 系統功能選單
  const systemMenuItems = SYSTEM_MODULES.filter((action) => {
    if (!action.enable) return false;
    // Info: (20260416 - Luphia) 角色為 ADMIN, SUPER ADMIN 時，系统设置只需顯示登出
    if (isAdmin && action.action !== "logout") return false;
    return true;
  }).map((action) => {
    const Icon = action.icon;
    return (
      <MenuItem key={action.id} as={Fragment}>
        {({ focus }) =>
          action.href ? (
            <Link
              href={action.href}
              className={`${focus ? "bg-gray-50 text-gray-900 ring-1 ring-gray-300 md:ring-0" : "text-gray-600 ring-1 ring-gray-200 md:ring-0"} group flex h-full w-full flex-col items-center justify-center rounded-xl bg-white p-2 text-center text-xs font-normal shadow-sm transition-colors hover:bg-gray-50 md:rounded-lg md:bg-transparent md:font-medium md:shadow-none`}
            >
              <Icon
                size={24}
                className="mb-1 text-gray-400 group-hover:text-gray-600 md:h-5 md:w-5"
              />
              {t(action.labelKey)}
            </Link>
          ) : (
            <button
              onClick={action.action === "logout" ? logout : undefined}
              className={`${focus ? (action.isDestructive ? "bg-red-50 text-red-700 ring-1 ring-red-200 md:ring-0" : "bg-gray-50 text-gray-900 ring-1 ring-gray-300 md:ring-0") : "text-gray-600 ring-1 ring-gray-200 md:ring-0"} group flex h-full w-full flex-col items-center justify-center rounded-xl bg-white p-2 text-center text-xs font-normal shadow-sm transition-colors md:rounded-lg md:bg-transparent md:font-medium md:shadow-none ${action.isDestructive ? "hover:bg-red-50" : "hover:bg-gray-50"}`}
            >
              <Icon
                size={24}
                className={`mb-1 text-gray-400 group-hover:text-gray-600 md:h-5 md:w-5 ${focus ? (action.isDestructive ? "text-red-500" : "text-gray-600") : "group-hover: text-gray-400" + (action.isDestructive ? "text-red-500" : "text-gray-600")}`}
              />
              {t(action.labelKey)}
            </button>
          )
        }
      </MenuItem>
    );
  });

  return (
    <Menu as="div" className="relative">
      <MenuButton
        onClick={refreshAuth}
        className="flex items-center gap-x-2 rounded-full bg-white py-1 pr-3 pl-1 text-sm leading-6 font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 transition-all ring-inset hover:ring-orange-300 focus:outline-none"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-600 ring-1 ring-orange-100 ring-inset">
          <User className="h-5 w-5" />
        </span>
        <span className="hidden sm:inline">{user.name}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
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
        <MenuItems className="fixed inset-0 z-100 flex h-dvh flex-col bg-white focus:outline-none md:absolute md:inset-auto md:top-full md:right-0 md:mt-2 md:h-auto md:w-[600px] md:origin-top-right md:overflow-hidden md:rounded-xl md:shadow-2xl md:ring-1 md:ring-black">
          {/* Info: (20260423 - Julian) Top User Info */}
          <div className="z-10 shrink-0 border-b border-gray-100 bg-gray-50 p-4 md:px-6 md:py-4">
            <div className="flex items-start justify-between md:items-center">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-orange-100 text-orange-600 ring-2 ring-white md:h-10 md:w-10">
                  <User className="h-7 w-7 md:h-6 md:w-6" />
                </div>
                <div className="overflow-hidden">
                  <p className="truncate text-base font-bold text-gray-900 md:max-w-none md:text-sm">
                    {user.name || "User"}
                  </p>
                  <div className="mt-1 flex items-center gap-2 md:mt-0">
                    <p className="max-w-[180px] truncate text-sm text-gray-500 md:max-w-[120px] md:text-xs lg:max-w-none">
                      {user.address}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="p-1 text-gray-400 transition-colors hover:text-orange-500 focus:outline-none md:p-0"
                      title="Copy Address"
                    >
                      {copiedAddress ? (
                        <Check className="h-4 w-4 text-emerald-500 md:h-3 md:w-3" />
                      ) : (
                        <Copy className="h-4 w-4 md:h-3 md:w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Info: (20260423 - Julian) Desktop right info */}
              <div className="hidden shrink-0 text-right md:block">
                <div className="mb-1 inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-600/20 ring-inset">
                  {t(`pricing.plans.${user.plan || "personal"}.name`)}
                </div>
                <p className="text-xs text-gray-500">
                  {t("header.credits")}:{" "}
                  <span className="font-semibold text-gray-900">
                    {user.credits?.toLocaleString() || 0}
                  </span>
                </p>
              </div>

              {/* Info: (20260423 - Julian) Mobile close button */}
              <MenuItem>
                <button className="-mr-2 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 md:hidden">
                  <span className="sr-only">Close menu</span>
                  <X size={24} />
                </button>
              </MenuItem>
            </div>

            {/* Info: (20260423 - Julian) Mobile right info */}
            <div className="mt-2 flex items-center justify-between md:hidden">
              <div className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-700 ring-1 ring-orange-600/20 ring-inset">
                {t(`pricing.plans.${user.plan || "personal"}.name`)}
              </div>
              <p className="text-xs text-gray-500">
                {t("header.credits")}:{" "}
                <span className="font-semibold text-gray-900">
                  {user.credits?.toLocaleString() || 0}
                </span>
              </p>
            </div>
          </div>

          {/* Info: (20260423 - Julian) Links */}
          <div className="flex-1 space-y-6 overflow-y-auto p-4 md:space-y-4 md:p-4">
            {/* Info: (20260423 - Julian) Modules Grid */}
            <div>
              <h3 className="mb-2 px-1 text-xs font-semibold tracking-wider text-gray-400 uppercase md:mb-3 md:px-2">
                {t("sidebar.modules")}
              </h3>
              <div className="grid grid-cols-3 gap-3 md:gap-2">
                {modulesMenuItems}
              </div>
            </div>

            {/* Info: (20260502 - Luphia) 小工具選單 */}
            <div>
              <h3 className="mb-2 px-1 text-xs font-semibold tracking-wider text-gray-400 uppercase md:mb-3 md:px-2">
                {t("sidebar.public_modules")}
              </h3>
              <div className="grid grid-cols-3 gap-3 md:gap-2">
                {publicModulesMenuItems}
              </div>
            </div>

            {/* Info: (20260423 - Julian) Bottom System Actions */}
            <div>
              <h3 className="mb-2 px-1 text-xs font-semibold tracking-wider text-gray-400 uppercase md:mb-3 md:px-2">
                {t("sidebar.system")}
              </h3>
              <div className="grid grid-cols-4 gap-3 md:gap-2">
                {systemMenuItems}
              </div>
            </div>
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  );
}
