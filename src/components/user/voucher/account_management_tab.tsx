"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  SearchX,
  Loader2,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import Pagination from "@/components/common/pagination";
import { useTranslation } from "@/i18n/i18n_context";
import { AccountType } from "@/constants/enums";
import {
  IAccountingAccount,
  IAccountingAccountInput,
} from "@/interfaces/accounting_account";
import SuccessNotification from "@/components/common/success_notification";

// Info: (20260703 - Julian) 定義不同科目類別的顏色
const ACCOUNT_TYPE_COLORS: Record<
  string,
  { bg: string; text: string; border: string; tab?: string }
> = {
  [AccountType.ASSET]: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    tab: "bg-emerald-500",
  },
  [AccountType.LIABILITY]: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    tab: "bg-rose-500",
  },
  [AccountType.EQUITY]: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    tab: "bg-blue-500",
  },
  [AccountType.REVENUE]: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    tab: "bg-amber-500",
  },
  [AccountType.INCOME]: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    tab: "bg-amber-500",
  },
  [AccountType.EXPENSE]: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    tab: "bg-orange-500",
  },
  [AccountType.COST]: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    tab: "bg-orange-500",
  },
  [AccountType.GAIN_OR_LOSS]: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    tab: "bg-violet-500",
  },
  [AccountType.CASH_FLOW]: {
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
    tab: "bg-cyan-500",
  },
  [AccountType.OTHER_COMPREHENSIVE_INCOME]: {
    bg: "bg-fuchsia-50",
    text: "text-fuchsia-700",
    border: "border-fuchsia-200",
    tab: "bg-fuchsia-500",
  },
  [AccountType.OTHER]: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    tab: "bg-slate-500",
  },
};

interface IAccountItemProps {
  account: IAccountingAccount;
  level: number;
  isExpanded: boolean;
  onToggle: () => void;
  hasChildren: boolean;
  onAddChild: () => void;
  onEdit: () => void;
}

const AccountItem = ({
  account,
  level,
  isExpanded,
  onToggle,
  hasChildren,
  onAddChild,
  onEdit,
}: IAccountItemProps) => {
  const colors = ACCOUNT_TYPE_COLORS[account.type] || ACCOUNT_TYPE_COLORS.other;

  return (
    <div
      onClick={onToggle}
      className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-3 text-left shadow-sm transition-all hover:bg-gray-50 md:px-6 ${
        level > 1 ? "border-l-2 border-gray-100" : ""
      }`}
      style={{ marginLeft: `${(level - 1) * 24}px` }}
    >
      <div className="flex items-center gap-2">
        {hasChildren ? (
          <div className="flex size-6 items-center justify-center rounded">
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </div>
        ) : (
          <div className="size-6" />
        )}
        {account.isCustom && (
          <div className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-600">
            Custom
          </div>
        )}
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg border px-2 py-1.5 text-sm font-bold md:text-base ${colors.bg} ${colors.text} ${colors.border}`}
        >
          {account.code}
        </div>
      </div>
      <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <div className="truncate text-base font-bold text-slate-700 md:text-lg">
            {account.name}
          </div>
          <div
            className={`hidden rounded-md border px-2 py-0.5 text-[10px] font-medium md:block ${colors.bg} ${colors.text} ${colors.border}`}
          >
            {account.type}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild();
            }}
            className="flex size-8 items-center justify-center rounded-full bg-green-50 text-green-600 transition-colors hover:bg-green-100"
            title="新增子科目"
          >
            <Plus size={16} />
          </button>
          {account.isCustom && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
              title="編輯科目代碼/名稱"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

type IAccountTab = AccountType | "all";

const PAGE_SIZE = 15;

export default function AccountManagementTab() {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;
  const { t } = useTranslation();

  // Data States
  const [allAccounts, setAllAccounts] = useState<IAccountingAccount[]>([]);
  const [keyword, setKeyword] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");
  const [activeTab, setActiveTab] = useState<IAccountTab>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());

  // Form States (Integrated from modal)
  const [isFormLoading, setIsFormLoading] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [parentInfo, setParentInfo] = useState<string>(""); // 用於顯示父層名稱
  const [formData, setFormData] = useState<IAccountingAccountInput>({
    parentCode: "",
    name: "",
    code: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await request<IApiResponse<{ items: IAccountingAccount[] }>>(
        `/api/v1/user/account_book/${accountBookId}/accounting_account`,
      );
      if (res.success && res?.payload?.items) {
        setAllAccounts(res.payload.items);
      }
    } catch (error) {
      console.error("Failed to fetch accounts", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accountBookId) {
      fetchAccounts();
    }
  }, [accountBookId]);

  const toggleExpand = (code: string) => {
    const newExpanded = new Set(expandedCodes);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedCodes(newExpanded);
  };

  const handleAddChild = (parentAccount: IAccountingAccount) => {
    setIsEditing(false);
    setEditId(null);
    setParentInfo(`[${parentAccount.code}] ${parentAccount.name}`);
    setFormData({ parentCode: parentAccount.code, name: "", code: "" });
    setErrorMessage(null);
  };

  const handleEdit = (account: IAccountingAccount) => {
    setIsEditing(true);
    setEditId(account.id || null);

    // 找出父層資訊
    const parent = allAccounts.find((a) => a.code === account.parentCode);
    if (parent) {
      setParentInfo(`[${parent.code}] ${parent.name}`);
    } else {
      setParentInfo(account.parentCode);
    }

    setFormData({
      parentCode: account.parentCode,
      name: account.name,
      code: account.code,
    });
    setErrorMessage(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parentCode || !formData.name || !formData.code) return;

    setIsFormLoading(true);
    setErrorMessage(null);
    try {
      const url = `/api/v1/user/account_book/${accountBookId}/accounting_account`;
      const res = isEditing
        ? await request<IApiResponse<IAccountingAccount>>(url, {
            method: "PATCH",
            body: JSON.stringify({ id: editId, input: formData }),
          })
        : await request<IApiResponse<{ id: string }>>(url, {
            method: "POST",
            body: JSON.stringify({ input: formData }),
          });

      if (res.success) {
        setShowSuccess(true);
        fetchAccounts();
        setFormData({ parentCode: "", name: "", code: "" });
        setParentInfo("");
        setIsEditing(false);
        setEditId(null);
      } else {
        setErrorMessage(res.message || t("account.messages.create_failed"));
      }
    } catch (error) {
      console.error("Error submitting form", error);
      setErrorMessage(t("account.messages.create_failed"));
    } finally {
      setIsFormLoading(false);
    }
  };

  const filteredAccounts = useMemo(() => {
    let list = allAccounts;
    if (activeTab !== "all") {
      list = list.filter((acc) => acc.type === activeTab);
    }
    if (debouncedKeyword) {
      list = list.filter(
        (acc) =>
          acc.name.includes(debouncedKeyword) ||
          acc.code.includes(debouncedKeyword),
      );
    }
    return list;
  }, [allAccounts, activeTab, debouncedKeyword]);

  const visibleAccounts = useMemo(() => {
    if (debouncedKeyword) return filteredAccounts;

    const result: IAccountingAccount[] = [];
    const addChildren = (parentCode: string) => {
      const children = filteredAccounts.filter(
        (acc) => acc.parentCode === parentCode,
      );
      children.forEach((child) => {
        result.push(child);
        if (expandedCodes.has(child.code)) {
          addChildren(child.code);
        }
      });
    };

    const roots = filteredAccounts.filter(
      (acc) =>
        acc.level === 1 ||
        !filteredAccounts.find((p) => p.code === acc.parentCode),
    );

    roots.forEach((root) => {
      if (!result.find((r) => r.code === root.code)) {
        result.push(root);
        if (expandedCodes.has(root.code)) {
          addChildren(root.code);
        }
      }
    });

    return result;
  }, [filteredAccounts, expandedCodes, debouncedKeyword]);

  const totalPages = Math.ceil(visibleAccounts.length / PAGE_SIZE);
  const paginatedAccounts = visibleAccounts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Top Section: Search and Filters */}
      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={18}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder={t("voucher.account.search.placeholder")}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-3 pr-4 pl-10 text-sm font-medium transition-all placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveTab("all")}
            className={`${activeTab === "all" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:bg-gray-100"} rounded-lg px-4 py-2 text-xs font-bold transition-all md:text-sm`}
          >
            {t("voucher.account_book_selector.all")}
          </button>
          {Object.entries(ACCOUNT_TYPE_COLORS).map(([key, value]) => {
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key as AccountType)}
                className={`${key === activeTab ? `${value.tab} text-white shadow-md` : `text-slate-500 hover:bg-slate-100`} rounded-lg px-4 py-2 text-xs font-bold transition-all md:text-sm`}
              >
                {t(`voucher.account_book_selector.types.${key}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content: List and Panel side by side */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left Side: Account List */}
        <div className="flex flex-1 flex-col gap-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-orange-500" size={40} />
            </div>
          ) : paginatedAccounts.length > 0 ? (
            paginatedAccounts.map((account) => (
              <AccountItem
                key={account.code}
                account={account}
                level={account.level}
                isExpanded={expandedCodes.has(account.code)}
                onToggle={() => toggleExpand(account.code)}
                hasChildren={allAccounts.some(
                  (acc) => acc.parentCode === account.code,
                )}
                onAddChild={() => handleAddChild(account)}
                onEdit={() => handleEdit(account)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-200 bg-white py-20 text-slate-400 shadow-sm">
              <SearchX size={48} strokeWidth={1.5} />
              <p className="font-medium">{t("voucher.account.empty")}</p>
            </div>
          )}
        </div>

        {/* Right Side: Add/Edit Panel (Embedded) */}
        <div className="sticky top-24 w-[400px] shrink-0">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
            <div
              className={`${isEditing ? "bg-blue-50" : "bg-green-50"} px-6 py-4`}
            >
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                {isEditing ? (
                  <>
                    <Pencil size={18} className="text-blue-500" />
                    編輯會計科目
                  </>
                ) : (
                  <>
                    <Plus size={20} className="text-green-500" />
                    {t("voucher.account.add_modal.title")}
                  </>
                )}
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-5 p-6">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600">
                  <AlertCircle size={18} className="shrink-0" />
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  {t("voucher.account.add_modal.parent")}
                </label>
                <input
                  type="text"
                  value={parentInfo}
                  readOnly
                  placeholder={t(
                    "voucher.account.add_modal.parent_placeholder",
                  )}
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  {t("voucher.account.add_modal.code")}
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder={t("voucher.account.add_modal.code_placeholder")}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 transition-all focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  {t("voucher.account.add_modal.name")}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("voucher.account.add_modal.name_placeholder")}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 transition-all focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ parentCode: "", name: "", code: "" });
                    setParentInfo("");
                    setIsEditing(false);
                    setErrorMessage(null);
                  }}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
                >
                  {t("voucher.detail_modal.actions.clear_all")}
                </button>
                <button
                  type="submit"
                  disabled={isFormLoading || !formData.parentCode}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition-all hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isFormLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    t("voucher.detail_modal.actions.confirm")
                  )}
                </button>
              </div>
              {!formData.parentCode && (
                <p className="text-center text-xs text-slate-400">
                  * 請先點擊左側列表中的操作按鈕
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <SuccessNotification
        show={showSuccess}
        title={
          isEditing ? "科目更新成功" : t("account.messages.create_success")
        }
        message={
          isEditing
            ? "會計科目已成功更新"
            : t("account.messages.create_success")
        }
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}
