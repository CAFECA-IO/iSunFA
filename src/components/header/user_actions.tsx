"use client";

import { Fragment, useState, useEffect } from "react";
import Link from "next/link";
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react";
import { User, ChevronDown, X, Book, QrCode } from "lucide-react";
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
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { IAccountBook } from "@/interfaces/account_book";
import QrCodeModal from "@/components/common/qr_code_modal";

export default function UserActions() {
  const { user, logout, refreshAuth } = useAuth();
  const { t } = useTranslation();
  const params = useParams();

  const [accountBook, setAccountBook] = useState<IAccountBook | null>(null);
  const [showQrCodeModal, setShowQrCodeModal] = useState<boolean>(false);
  // Info: (20260702 - Julian) 強制展開選單，用於行動裝置點擊選單按鈕時
  const [forceOpen, setForceOpen] = useState<boolean>(false);

  const toggleQrCodeModal = () => {
    if (!showQrCodeModal) {
      setForceOpen(true);
    }
    setShowQrCodeModal((prev) => !prev);
  };

  // Info: (20260601 - Julian) 7 字以上的帳本名稱顯示省略號
  const formatAccountBookName = (name: string) => {
    if (name.length > 7) {
      return `${name.substring(0, 2)}...${name.substring(name.length - 2)}`;
    }
    return name;
  };

  // Info: (20260118 - Luphia) Check if a module is active for the current user
  const isModuleActive = (moduleKey: string) => {
    if (!user || !user.modules) return false;
    return user.modules.includes(moduleKey);
  };

  // Info: (20260309 - Luphia) 根據目前路徑取得 account_book_id
  const accountBookId = (params?.account_book_id as string) || "default";

  useEffect(() => {
    if (accountBookId && accountBookId !== "default") {
      const fetchAccountBook = async () => {
        try {
          const data = await request<IApiResponse<IAccountBook>>(
            `/api/v1/user/account_book/${accountBookId}`,
          );
          if (data.payload) {
            setAccountBook(data.payload);
          }
        } catch (err) {
          console.error("Failed to fetch account book:", err);
        }
      };
      fetchAccountBook();
    } else {
      setAccountBook(null);
    }
  }, [accountBookId]);

  if (!user) {
    return <LoginButton />;
  }

  const accountBookPath = `/user/account_book/${accountBookId}`;
  const isAdmin =
    user.isAdmin || user.role === "SUPER_ADMIN" || user.role === "ADMIN";

  // Info: (20260424 - Julian) 功能模組選單
  const renderModulesMenuItems = (close: () => void) => {
    const publicModuleKeys = new Set(PUBLIC_MODULES.map((m) => m.key));
    const modulesToDisplay = isAdmin
      ? ADMIN_MODULES
      : MODULES.filter(
          (m) => m.basic !== false && !publicModuleKeys.has(m.key),
        );

    return modulesToDisplay.map((module) => {
      const active = isAdmin ? true : isModuleActive(module.key);
      const Icon = module.icon;
      const targetPath = isAdmin
        ? `/admin/${module.key}`
        : `${accountBookPath}/${module.key}`;

      return (
        <Fragment key={module.key}>
          {active ? (
            <Link
              href={targetPath}
              onClick={() => {
                setForceOpen(false);
                close();
              }}
              className={`group flex h-full w-full flex-col items-center justify-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-gray-200 transition-all duration-200 hover:bg-orange-50 hover:ring-1 hover:ring-orange-200 md:rounded-lg md:p-3 md:shadow-none md:ring-gray-100`}
            >
              <Icon
                className={`mb-1 size-6 text-gray-500 group-hover:text-orange-500 md:mb-2`}
              />
              <span
                className={`text-center text-xs font-normal text-gray-700 group-hover:text-orange-900 md:text-sm md:font-medium`}
              >
                {t(getModuleI18nKey(module.key, isAdmin))}
              </span>
            </Link>
          ) : (
            <div className="flex h-full w-full cursor-not-allowed flex-col items-center justify-center rounded-xl bg-gray-50/80 p-2 opacity-60 ring-1 ring-gray-100 md:rounded-lg md:bg-gray-50/50 md:p-3">
              <Icon size={24} className="mb-1 text-gray-300 md:mb-2" />
              <span className="text-center text-xs font-normal text-gray-400 md:text-sm md:font-medium">
                {t(getModuleI18nKey(module.key, isAdmin))}
              </span>
            </div>
          )}
        </Fragment>
      );
    });
  };

  // Info: (20260502 - Luphia) 小工具選單
  const renderPublicModulesMenuItems = (close: () => void) => {
    return PUBLIC_MODULES.map((module) => {
      const Icon = module.icon;
      const targetPath = `/${module.key}`;

      return (
        <Link
          key={module.key}
          href={targetPath}
          onClick={() => {
            setForceOpen(false);
            close();
          }}
          className={`group flex h-full w-full flex-col items-center justify-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-gray-200 transition-all duration-200 hover:bg-orange-50 hover:ring-1 hover:ring-orange-200 md:rounded-lg md:p-3 md:shadow-none md:ring-gray-100`}
        >
          <Icon
            className={`mb-1 size-6 text-gray-500 group-hover:text-orange-500 md:mb-2`}
          />
          <span
            className={`text-center text-xs font-normal text-gray-700 group-hover:text-orange-900 md:text-sm md:font-medium`}
          >
            {t(getModuleI18nKey(module.key, isAdmin))}
          </span>
        </Link>
      );
    });
  };

  // Info: (20260423 - Julian) 系統功能選單
  const renderSystemMenuItems = (close: () => void) => {
    return SYSTEM_MODULES.filter((action) => {
      if (!action.enable) return false;
      // Info: (20260416 - Luphia) 角色為 ADMIN, SUPER ADMIN 時，系统设置只需顯示登出
      if (isAdmin && action.action !== "logout") return false;
      return true;
    }).map((action) => {
      const Icon = action.icon;
      return (
        <Fragment key={action.id}>
          {action.href ? (
            <Link
              href={action.href}
              onClick={() => {
                setForceOpen(false);
                close();
              }}
              className={`group flex h-full w-full flex-col items-center justify-center rounded-xl bg-white p-2 text-center text-xs font-normal text-gray-600 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50 md:rounded-lg md:bg-transparent md:font-medium md:shadow-none md:ring-0`}
            >
              <Icon
                size={24}
                className="mb-1 text-gray-400 group-hover:text-gray-600 md:size-5"
              />
              {t(action.labelKey)}
            </Link>
          ) : (
            <button
              onClick={() => {
                if (action.action === "logout") logout();
                setForceOpen(false);
                close();
              }}
              className={`group flex h-full w-full flex-col items-center justify-center rounded-xl bg-white p-2 text-center text-xs font-normal text-gray-600 shadow-sm ring-1 ring-gray-200 transition-colors md:rounded-lg md:bg-transparent md:font-medium md:shadow-none md:ring-0 ${action.isDestructive ? "hover:bg-red-50" : "hover:bg-gray-50"}`}
            >
              <Icon
                size={24}
                className={`mb-1 text-gray-400 group-hover:text-gray-600 md:size-5 ${action.isDestructive ? "text-red-500" : "text-gray-600"}`}
              />
              {t(action.labelKey)}
            </button>
          )}
        </Fragment>
      );
    });
  };

  return (
    <div className="flex items-center gap-x-4">
      {accountBook && (
        <div className="hidden flex-col md:flex">
          <p className="text-[10px] text-slate-500">
            {t("sidebar.current_account_book")}
          </p>
          <Link
            href="/user/account_book"
            className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2.5 py-1 text-orange-700 ring-1 ring-orange-600/20 transition-all ring-inset hover:bg-orange-200 hover:text-orange-800"
            title={accountBook.name}
          >
            <Book size={12} className="shrink-0" />
            <p className="text-xs font-medium">
              {formatAccountBookName(accountBook.name)}
            </p>
          </Link>
        </div>
      )}
      <Popover as="div" className="relative">
        {({ open, close }) => (
          <>
            <PopoverButton
              onClick={() => {
                refreshAuth();
                setForceOpen(false);
              }}
              className="flex items-center gap-x-2 rounded-full bg-white py-1 pr-3 pl-1 text-sm leading-6 font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 transition-all ring-inset hover:ring-orange-300 focus:outline-none"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-orange-50 text-orange-600 ring-1 ring-orange-100 ring-inset">
                <User className="size-5" />
              </span>
              <span className="hidden sm:inline">{user.name}</span>
              <ChevronDown
                className="size-4 text-gray-400"
                aria-hidden="true"
              />
            </PopoverButton>
            <Transition
              as={Fragment}
              show={open || showQrCodeModal || forceOpen}
              enter="transition ease-out duration-200 md:duration-100"
              enterFrom="transform opacity-0 translate-y-full md:translate-y-0 md:scale-95"
              enterTo="transform opacity-100 translate-y-0 md:scale-100"
              leave="transition ease-in duration-150 md:duration-75"
              leaveFrom="transform opacity-100 translate-y-0 md:scale-100"
              leaveTo="transform opacity-0 translate-y-full md:translate-y-0 md:scale-95"
            >
              <PopoverPanel
                static
                className="fixed inset-0 z-100 flex h-dvh flex-col bg-white focus:outline-none md:absolute md:inset-auto md:top-full md:right-0 md:mt-2 md:h-auto md:w-[600px] md:origin-top-right md:overflow-hidden md:rounded-xl md:shadow-2xl md:ring-1 md:ring-black"
              >
                {/* Info: (20260702 - Julian) Backdrop for forceOpen mode */}
                {forceOpen && !showQrCodeModal && (
                  <button
                    type="button"
                    className="fixed inset-0 -z-10 cursor-default bg-transparent focus:outline-none"
                    onClick={() => setForceOpen(false)}
                    aria-label="Close backdrop"
                  />
                )}
                {/* Info: (20260423 - Julian) Top User Info */}
                <div className="z-10 shrink-0 border-b border-gray-100 bg-gray-50 p-4 md:px-6 md:py-4">
                  <div className="flex items-start justify-between md:items-center">
                    <div className="flex items-center md:gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-full bg-orange-100 text-orange-600 ring-2 ring-white md:size-10">
                          <User className="size-7 md:size-6" />
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
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleQrCodeModal();
                              }}
                              className="p-1 text-gray-400 transition-colors hover:text-orange-500 focus:outline-none md:p-0"
                              title="Generate Address QR Code"
                            >
                              <QrCode className="size-4 md:size-3" />
                            </button>
                          </div>
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
                    <button
                      onClick={() => {
                        close();
                        setForceOpen(false);
                      }}
                      className="-mr-2 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 md:hidden"
                    >
                      <span className="sr-only">Close menu</span>
                      <X size={24} />
                    </button>
                  </div>

                  {/* Info: (20260423 - Julian) Mobile right info */}
                  <div className="mt-2 flex items-center justify-between md:hidden">
                    <div className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-700 ring-1 ring-orange-600/20 ring-inset">
                      {t(`pricing.plans.${user.plan || "personal"}.name`)}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {accountBook && (
                        <div className="flex gap-0.5 text-right md:hidden">
                          <p className="text-xs text-gray-500">
                            {t("sidebar.current_account_book")}:
                          </p>
                          <div
                            className="inline-flex max-w-[140px] items-center gap-1 text-orange-700 transition-colors hover:text-orange-800"
                            title={accountBook.name}
                          >
                            <Book size={10} className="shrink-0" />
                            <p className="truncate text-[10px] font-bold">
                              {accountBook.name}
                            </p>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        {t("header.credits")}:{" "}
                        <span className="font-semibold text-gray-900">
                          {user.credits?.toLocaleString() || 0}
                        </span>
                      </p>
                    </div>
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
                      {renderModulesMenuItems(close)}
                    </div>
                  </div>

                  {/* Info: (20260502 - Luphia) 小工具選單 */}
                  {!isAdmin && (
                    <div>
                      <h3 className="mb-2 px-1 text-xs font-semibold tracking-wider text-gray-400 uppercase md:mb-3 md:px-2">
                        {t("sidebar.public_modules")}
                      </h3>
                      <div className="grid grid-cols-3 gap-3 md:gap-2">
                        {renderPublicModulesMenuItems(close)}
                      </div>
                    </div>
                  )}

                  {/* Info: (20260423 - Julian) Bottom System Actions */}
                  <div>
                    <h3 className="mb-2 px-1 text-xs font-semibold tracking-wider text-gray-400 uppercase md:mb-3 md:px-2">
                      {t("sidebar.system")}
                    </h3>
                    <div className="grid grid-cols-4 gap-3 md:gap-2">
                      {renderSystemMenuItems(close)}
                    </div>
                  </div>
                </div>
              </PopoverPanel>
            </Transition>
          </>
        )}
      </Popover>
      <QrCodeModal
        isOpen={showQrCodeModal}
        onClose={() => setShowQrCodeModal(false)}
        value={user.address}
        title={t("team_management.web3_address")}
      />
    </div>
  );
}
