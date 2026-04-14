"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { useTranslation } from "@/i18n/i18n_context";
import { X, Search, SearchX, Loader2 } from "lucide-react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ACCOUNTS } from "@/constants/accounts";

// Info: (20260317 - Julian) IAccount interface type
export interface IAccount {
  code: string;
  name: string;
  description: string;
  type: string;
  level: number;
  parentCode: string;
  isDebit: boolean;
}

interface IAccountBook {
  id: string;
  name: string;
  country: string;
  currency: string;
  rule: string;
}

interface IAccountBookSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  accountBookId: string;
  onSelect: (account: IAccount) => void;
}

export default function AccountBookSelector({
  isOpen,
  onClose,
  accountBookId,
  onSelect,
}: IAccountBookSelectorProps) {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [accountBook, setAccountBook] = useState<IAccountBook | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);


  useEffect(() => {
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
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccountBook();
  }, [accountBookId]);

  useEffect(() => {
    // Info: (20260414 - Julian) 清除前一次的搜尋
    if (isOpen) {
      setKeyword("");
      setSelectedType(null);
    }
  }, [isOpen]);

  // Info: (20260317 - Julian) Determine options by matching country code
  const accountOptions = useMemo(() => {
    if (!accountBook?.country) return ACCOUNTS.TW;
    const countryKey = accountBook.country as keyof typeof ACCOUNTS;
    return ACCOUNTS[countryKey] || ACCOUNTS.TW;
  }, [accountBook?.country]);

  // Info: (20260317 - Julian) Uniq account types
  const accountTypes = useMemo(() => {
    return Array.from(new Set(accountOptions.map((acc) => acc.type)));
  }, [accountOptions]);

  // Info: (20260317 - Julian) Computed list based on keyword search and selected type
  const filteredAccounts = useMemo(() => {
    let list = accountOptions;
    if (selectedType) {
      list = list.filter((acc) => acc.type === selectedType);
    }
    if (keyword.trim()) {
      const lowerKeyword = keyword.toLowerCase();
      list = list.filter(
        (acc) =>
          acc.code.toLowerCase().includes(lowerKeyword) ||
          acc.name.toLowerCase().includes(lowerKeyword),
      );
    }
    return list;
  }, [keyword, accountOptions, selectedType]);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog className="relative z-201" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 z-101 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel className="relative flex h-[90vh] transform flex-col overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl lg:h-[70vh]">
                {/* Info: (20260317 - Julian) Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-2 lg:py-4">
                  <DialogTitle
                    as="h3"
                    className="text-lg font-bold text-slate-800"
                  >
                    {t("voucher.account_book_selector.title")}
                  </DialogTitle>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
                  >
                    <X size={18} className="stroke-[2.5]" />
                  </button>
                </div>

                {/* Info: (20260317 - Julian) Body Content */}
                {isLoading ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
                    {/* Info: (20260317 - Julian) Left Side: Types */}
                    <div className="flex w-full shrink-0 gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/50 p-2 lg:w-1/3 lg:flex-col lg:gap-0 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:p-4">
                      <button
                        onClick={() => setSelectedType(null)}
                        className={`mb-0 w-auto shrink-0 rounded-xl px-3 py-2 text-center text-[10px] font-bold whitespace-nowrap transition-colors lg:mb-1 lg:w-full lg:p-3 lg:text-left lg:text-sm ${
                          selectedType === null
                            ? "bg-orange-100 text-orange-600"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {t("voucher.account_book_selector.all")}
                      </button>
                      {accountTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedType(type)}
                          className={`mb-0 w-auto shrink-0 rounded-xl px-3 py-2 text-center text-[10px] font-bold whitespace-nowrap transition-colors lg:mb-1 lg:w-full lg:p-3 lg:text-left lg:text-sm ${
                            selectedType === type
                              ? "bg-orange-100 text-orange-600"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {t(`voucher.account_book_selector.types.${type}`)}
                        </button>
                      ))}
                    </div>

                    {/* Info: (20260317 - Julian) Right Side: Search & List */}
                    <div className="flex flex-1 flex-col overflow-hidden lg:w-2/3">
                      <div className="shrink-0 border-b border-slate-100 p-3 lg:p-4">
                        <div className="relative">
                          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            aria-label="Search"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder={t(
                              "voucher.account_book_selector.search_placeholder",
                            )}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-[10px] font-semibold text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:outline-none lg:py-2.5 lg:text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-2 lg:p-4">
                        {filteredAccounts.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {filteredAccounts.map((acc) => (
                              <button
                                key={acc.code}
                                onClick={() => {
                                  onSelect(acc);
                                  onClose();
                                }}
                                className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 disabled:opacity-50 lg:p-3"
                              >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500 transition-colors group-hover:bg-orange-100 group-hover:text-orange-600 lg:text-xs">
                                  {acc.code}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700 lg:text-sm">
                                    {acc.name}
                                  </span>
                                  <span className="mt-0.5 text-[10px] font-medium text-slate-400 lg:text-xs">
                                    {acc.type}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-400">
                            <SearchX className="h-8 w-8 text-slate-300" />
                            <p className="text-sm font-semibold">
                              {t("voucher.account_book_selector.no_results")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
