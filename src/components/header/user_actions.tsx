"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import {
  User,
  LogOut,
  ChevronDown,
  Settings,
  CreditCard,
  Users,
} from "lucide-react";
import { MODULES } from "@/constants/modules";
import { useAuth } from "@/contexts/auth_context";
import { useTranslation } from "@/i18n/i18n_context";
import LoginButton from "@/components/common/login_button";
import { useParams } from "next/navigation";

export default function UserActions() {
  const { user, logout, refreshAuth } = useAuth();
  const { t } = useTranslation();
  const params = useParams();

  // Info: (20260118 - Luphia) Check if a module is active for the current user
  const isModuleActive = (moduleKey: string) => {
    if (!user || !user.modules) return false;
    return user.modules.includes(moduleKey);
  };

  if (!user) {
    return <LoginButton />;
  }

  // Info: (20260309 - Luphia) 根據目前路徑取得 account_book_id
  const accountBookId = params?.account_book_id as string || 'default';
  const accountBookPath = `/user/account_book/${accountBookId}`;

  return (
    <Menu as="div" className="relative">
      <MenuButton
        onClick={refreshAuth}
        className="flex items-center gap-x-2 rounded-full bg-white pl-1 pr-3 py-1 text-sm font-semibold leading-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 hover:ring-orange-300 transition-all focus:outline-none"
      >
        <span className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 ring-1 ring-inset ring-orange-100">
          <User className="h-5 w-5" />
        </span>
        <span className="sm:inline">{user.name}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
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
        <MenuItems className="absolute right-0 z-10 mt-2 w-[90vw] max-w-[600px] md:w-[600px] origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
          {/* Info: (20260118 - Luphia) Top User Info */}
          <div className="bg-gray-50 px-4 py-3 md:px-6 md:py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 ring-2 ring-white">
                  <User className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-gray-900 truncate max-w-[120px] md:max-w-none">
                    {user.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-[120px] md:max-w-none">
                    {user.address}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20 mb-1">
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
          </div>

          <div className="p-3 md:p-4">
            {/* Info: (20260118 - Luphia) Modules Grid */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 md:mb-3 px-1 md:px-2">
                {t("sidebar.modules")}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {MODULES.map((module) => {
                  const active = isModuleActive(module.key);
                  const Icon = module.icon;
                  return (
                    <MenuItem key={module.key} as={Fragment}>
                      {({ focus }) =>
                        active ? (
                          <Link
                            href={`${accountBookPath}/${module.key}`}
                            className={`
                                ${focus ? "bg-orange-50 ring-1 ring-orange-200" : "bg-white hover:bg-gray-50 ring-1 ring-gray-100"}
                                group flex flex-col items-center justify-center p-2 md:p-3 rounded-lg transition-all duration-200 h-full w-full
                              `}
                          >
                            <Icon
                              className={`h-5 w-5 md:h-6 md:w-6 mb-1 md:mb-2 ${focus ? "text-orange-600" : "text-gray-500 group-hover:text-orange-500"}`}
                            />
                            <span
                              className={`text-xs md:text-sm font-medium ${focus ? "text-orange-900" : "text-gray-700"} text-center`}
                            >
                              {t(`chat.tags.${module.key}`)}
                            </span>
                          </Link>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 md:p-3 rounded-lg bg-gray-50/50 ring-1 ring-gray-100 opacity-60 cursor-not-allowed h-full w-full">
                            <Icon className="h-5 w-5 md:h-6 md:w-6 mb-1 md:mb-2 text-gray-300" />
                            <span className="text-xs md:text-sm font-medium text-gray-400 text-center">
                              {t(`chat.tags.${module.key}`)}
                            </span>
                          </div>
                        )
                      }
                    </MenuItem>
                  );
                })}
              </div>
            </div>

            {/* Info: (20260118 - Luphia) Bottom System Actions */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 md:mb-3 px-1 md:px-2">
                {t("sidebar.system")}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <MenuItem as={Fragment}>
                  {({ focus }) => (
                    <Link
                      href="/user/team"
                      className={`
                            ${focus ? "bg-gray-50 text-gray-900" : "text-gray-600"}
                            group flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium transition-colors hover:bg-gray-50 h-full w-full
                          `}
                    >
                      <Users className="h-5 w-5 mb-1 text-gray-400 group-hover:text-gray-600" />
                      {t("sidebar.team")}
                    </Link>
                  )}
                </MenuItem>
                <MenuItem as={Fragment}>
                  {({ focus }) => (
                    <Link
                      href="/user/billing"
                      className={`
                            ${focus ? "bg-gray-50 text-gray-900" : "text-gray-600"}
                            group flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium transition-colors hover:bg-gray-50 h-full w-full
                          `}
                    >
                      <CreditCard className="h-5 w-5 mb-1 text-gray-400 group-hover:text-gray-600" />
                      {t("sidebar.billing")}
                    </Link>
                  )}
                </MenuItem>
                <MenuItem as={Fragment}>
                  {({ focus }) => (
                    <Link
                      href="/user/settings"
                      className={`
                            ${focus ? "bg-gray-50 text-gray-900" : "text-gray-600"}
                            group flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium transition-colors hover:bg-gray-50 h-full w-full
                          `}
                    >
                      <Settings className="h-5 w-5 mb-1 text-gray-400 group-hover:text-gray-600" />
                      {t("sidebar.settings")}
                    </Link>
                  )}
                </MenuItem>
                <MenuItem as={Fragment}>
                  {({ focus }) => (
                    <button
                      onClick={logout}
                      className={`
                            ${focus ? "bg-red-50 text-red-700" : "text-gray-600"}
                            group flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium transition-colors hover:bg-red-50 h-full w-full
                          `}
                    >
                      <LogOut
                        className={`h-5 w-5 mb-1 ${focus ? "text-red-500" : "text-gray-400 group-hover:text-red-500"}`}
                      />
                      {t("header.logout")}
                    </button>
                  )}
                </MenuItem>
              </div>
            </div>
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  );
}
