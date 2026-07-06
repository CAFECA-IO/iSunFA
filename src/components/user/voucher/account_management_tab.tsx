"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Search,
  SearchX,
  Loader2,
  AlertCircle,
  Pencil,
  ChevronRight,
  Trash2,
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

// TODO: (20260703 - Julian) ============= 此元件還在施工中 =============

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
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    tab: "bg-teal-500",
  },
  [AccountType.EXPENSE]: {
    bg: "bg-lime-50",
    text: "text-lime-700",
    border: "border-lime-200",
    tab: "bg-lime-500",
  },
  [AccountType.COST]: {
    bg: "bg-pink-50",
    text: "text-pink-700",
    border: "border-pink-200",
    tab: "bg-pink-500",
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
  onAddChild: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  onClick?: () => void;
  hasChildren?: boolean;
}

/**
 * Info: (20260706 - Julian) 大類 (Level 1) 與 主科目 (Level 2) 元件
 */
const CategorySubjectItem = ({
  account,
  onAddChild,
  onEdit,
  isSelected = false,
  onClick = () => {},
  hasChildren = false,
}: IAccountItemProps) => {
  const { t } = useTranslation();
  const colors = ACCOUNT_TYPE_COLORS[account.type] || ACCOUNT_TYPE_COLORS.other;
  const isLevel1 = account.level === 1;
  const canClick = isLevel1 || hasChildren;

  return (
    <div
      onClick={canClick ? onClick : undefined}
      className={`group relative flex items-start gap-3 transition-all ${
        isLevel1
          ? "mt-6 mb-2 first:mt-0"
          : `rounded-xl border px-4 py-4 shadow-sm ${
              isSelected
                ? "border-orange-200 bg-orange-50 ring-2 ring-orange-500 ring-offset-2"
                : `border-slate-100 bg-white ${canClick ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}`
            } ${account.isCustom ? "border-dashed border-orange-300 bg-orange-100" : ""}`
      }`}
    >
      {isLevel1 ? (
        <div
          className={`flex w-full items-center justify-between gap-2 rounded-lg border-b-2 border-slate-700 px-4 py-2.5 text-sm font-black tracking-widest text-white uppercase shadow-md ${colors.tab}`}
        >
          <p>{account.name}</p>
          <p>({account.code})</p>
        </div>
      ) : (
        <>
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg border px-2 py-1 text-xs font-black ${colors.bg} ${colors.text} ${colors.border} mt-0.5`}
          >
            {account.code}
          </div>
          <div className="flex flex-1 items-start justify-between gap-1 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="text-sm leading-relaxed font-bold wrap-break-word text-slate-700">
                {account.name}
              </div>
              {account.isCustom && (
                <span className="text-[10px] font-bold tracking-tighter text-orange-500 uppercase">
                  {t("voucher.account.custom")}
                </span>
              )}
            </div>
            {hasChildren && (
              <ChevronRight
                size={16}
                className={`mt-1 shrink-0 text-slate-300 transition-all ${
                  isSelected ? "translate-x-1 text-orange-500" : ""
                }`}
              />
            )}
          </div>
          {/* Hover Actions for Level 2 */}
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChild();
              }}
              className="flex size-7 items-center justify-center rounded-full bg-green-100 text-green-600 shadow-sm transition-colors hover:bg-green-200"
              title={t("voucher.account.action.add_child")}
            >
              <Plus size={14} />
            </button>
            {account.isCustom && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex size-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-sm transition-colors hover:bg-blue-100"
                title={t("voucher.account.action.edit")}
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Info: (20260706 - Julian) 子科目 (Level 3+) 元件
 */
const SubAccountItem = ({
  account,
  onAddChild,
  onEdit,
  onDelete = () => {},
}: IAccountItemProps) => {
  const { t } = useTranslation();
  const colors = ACCOUNT_TYPE_COLORS[account.type] || ACCOUNT_TYPE_COLORS.other;
  const level = account.level;

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-xl border px-4 py-3 text-left shadow-sm transition-all md:px-6 ${
        account.isCustom
          ? "border-dashed border-orange-300 bg-orange-100"
          : "border-slate-100 bg-white"
      }`}
      style={{ marginLeft: `${(level - 3) * 24}px` }}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-bold md:text-base ${colors.bg} ${colors.text} ${colors.border}`}
      >
        {account.code}
      </div>

      <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
        <div className="flex flex-1 flex-col items-start gap-0.5 overflow-hidden">
          <div className="text-base font-bold whitespace-normal text-slate-700">
            {account.name}
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text} ${colors.border}`}
            >
              {account.type}
            </div>
            {account.isCustom && (
              <span className="text-[10px] font-bold text-orange-500 uppercase">
                {t("voucher.account.custom")}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild();
            }}
            className="flex size-8 items-center justify-center rounded-full bg-green-100 text-green-600 transition-colors hover:bg-green-200"
            title={t("voucher.account.action.add_child")}
          >
            <Plus size={16} />
          </button>
          {account.isCustom && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
                title={t("voucher.account.action.edit")}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
                className="flex size-8 items-center justify-center rounded-full bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                title="刪除科目"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const SUB_PAGE_SIZE = 10;

export default function AccountManagementTab() {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;
  const { t } = useTranslation();

  const emptyFormData = {
    parentCode: "",
    name: "",
    code: "",
  };

  // Info: (20260703 - Julian) Data States
  const [allAccounts, setAllAccounts] = useState<IAccountingAccount[]>([]);
  const [keyword, setKeyword] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");
  const [activeTab, setActiveTab] = useState<AccountType | "all">("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedMainSubject, setSelectedMainSubject] =
    useState<IAccountingAccount | null>(null);
  const [subPage, setSubPage] = useState<number>(1);

  // Info: (20260703 - Julian) Form States
  const [isFormLoading, setIsFormLoading] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [parentInfo, setParentInfo] = useState<string>("");
  const [formData, setFormData] =
    useState<IAccountingAccountInput>(emptyFormData);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 500);

    // Info: (20260706 - Julian) 用關鍵字搜尋時，把主科目切換回全部，避免搜尋結果被限制
    setActiveTab("all");
    return () => clearTimeout(timer);
  }, [keyword]);

  const fetchAccounts = useCallback(async () => {
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
  }, [accountBookId]);

  useEffect(() => {
    if (accountBookId) {
      fetchAccounts();
    }
  }, [accountBookId, fetchAccounts]);

  // Info: (20260706 - Julian) 預設選中第一個主科目
  useEffect(() => {
    if (allAccounts.length > 0 && !selectedMainSubject) {
      const firstSubject = allAccounts.find((acc) => acc.level === 2);
      if (firstSubject) setSelectedMainSubject(firstSubject);
    }
  }, [allAccounts, selectedMainSubject]);

  // Info: (20260706 - Julian) 切換主科目時，重設右欄分頁為第一頁
  useEffect(() => {
    setSubPage(1);
  }, [selectedMainSubject]);

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
    const parent = allAccounts.find((a) => a.code === account.parentCode);
    setParentInfo(
      parent ? `[${parent.code}] ${parent.name}` : account.parentCode,
    );
    setFormData({
      parentCode: account.parentCode,
      name: account.name,
      code: account.code,
    });
    setErrorMessage(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("確定要刪除此自訂科目嗎？")) return;

    try {
      const res = await request<IApiResponse<{ success: boolean }>>(
        `/api/v1/user/account_book/${accountBookId}/accounting_account?id=${id}`,
        { method: "DELETE" },
      );
      if (res.success) {
        setShowSuccess(true);
        fetchAccounts();
      } else {
        alert(res.message || "刪除失敗");
      }
    } catch (error) {
      console.error("Error deleting account", error);
      alert("刪除時發生錯誤");
    }
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
        setFormData(emptyFormData);
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

  // Info: (20260706 - Julian) 左欄列表：大類 (L1) 與 主科目 (L2)
  const leftList = useMemo(() => {
    const list: (IAccountingAccount & { hasChildren: boolean })[] = [];
    const roots = allAccounts
      .filter((acc) => acc.level === 1)
      .sort((a, b) => a.code.localeCompare(b.code));

    roots.forEach((root) => {
      // 只有當該大類符合 Tab 或 搜尋關鍵字時才顯示
      const subjects = allAccounts
        .filter((acc) => acc.parentCode === root.code)
        .filter((acc) => activeTab === "all" || acc.type === activeTab)
        .filter(
          (acc) =>
            !debouncedKeyword ||
            acc.name.toLowerCase().includes(debouncedKeyword.toLowerCase()) ||
            acc.code.toLowerCase().includes(debouncedKeyword.toLowerCase()),
        )
        .sort((a, b) => a.code.localeCompare(b.code));

      if (subjects.length > 0) {
        list.push({ ...root, hasChildren: true });
        subjects.forEach((s) => {
          const hasChildren = allAccounts.some((a) => a.parentCode === s.code);
          list.push({ ...s, hasChildren });
        });
      }
    });
    return list;
  }, [allAccounts, activeTab, debouncedKeyword]);

  // Info: (20260706 - Julian) 右欄列表：選中主科目的子科目 (L3+)
  const rightList = useMemo(() => {
    if (!selectedMainSubject) return [];
    const result: IAccountingAccount[] = [];
    const addChildren = (parentCode: string) => {
      const children = allAccounts
        .filter((acc) => acc.parentCode === parentCode)
        .sort((a, b) => a.code.localeCompare(b.code));
      children.forEach((child) => {
        result.push(child);
        addChildren(child.code);
      });
    };
    addChildren(selectedMainSubject.code);
    return result;
  }, [selectedMainSubject, allAccounts]);

  const totalSubPages = Math.ceil(rightList.length / SUB_PAGE_SIZE);
  const paginatedSubAccounts = rightList.slice(
    (subPage - 1) * SUB_PAGE_SIZE,
    subPage * SUB_PAGE_SIZE,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Info: (20260703 - Julian) Top Section: Search and Filters */}
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
          {Object.entries(ACCOUNT_TYPE_COLORS).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as AccountType)}
              className={`${key === activeTab ? `${value.tab} text-white shadow-md` : `text-slate-500 hover:bg-slate-100`} rounded-lg px-4 py-2 text-xs font-bold transition-all md:text-sm`}
            >
              {t(`voucher.account_book_selector.types.${key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Info: (20260706 - Julian) Left Column: Category & Main Subjects */}
        <div className="flex w-full flex-col lg:w-[280px] lg:shrink-0">
          <div className="mb-2 px-2 text-xs font-bold text-slate-400">
            主科目
          </div>
          <div className="flex max-h-[calc(100vh-320px)] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent flex-col gap-2 overflow-y-auto rounded-xl bg-slate-200 p-2 hover:scrollbar-thumb-slate-300">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2
                  className="shrink-0 animate-spin text-orange-500"
                  size={24}
                />
              </div>
            ) : leftList.length > 0 ? (
              leftList.map((acc) => (
                <CategorySubjectItem
                  key={acc.code}
                  account={acc}
                  isSelected={selectedMainSubject?.code === acc.code}
                  onClick={() => acc.level === 2 && setSelectedMainSubject(acc)}
                  onAddChild={() => handleAddChild(acc)}
                  onEdit={() => handleEdit(acc)}
                  hasChildren={acc.hasChildren}
                />
              ))
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">
                無匹配科目
              </div>
            )}
          </div>
        </div>

        {/* Info: (20260706 - Julian) Middle Column: Sub Accounts (Level 3+) */}
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs font-bold text-slate-400">
              子科目 (
              {selectedMainSubject
                ? `[${selectedMainSubject.code}] ${selectedMainSubject.name}`
                : "未選中"}
              )
            </div>
            <span className="text-[10px] font-medium text-slate-400">
              共 {rightList.length} 筆
            </span>
          </div>

          <div className="flex min-h-[400px] flex-col gap-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-orange-500" size={40} />
              </div>
            ) : paginatedSubAccounts.length > 0 ? (
              paginatedSubAccounts.map((subAcc) => (
                <SubAccountItem
                  key={subAcc.code}
                  account={subAcc}
                  onAddChild={() => handleAddChild(subAcc)}
                  onEdit={() => handleEdit(subAcc)}
                  onDelete={() => handleDelete(subAcc.id!)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-200 bg-white py-20 text-slate-400 shadow-sm">
                <SearchX size={40} strokeWidth={1.5} />
                <p className="text-xs font-medium">尚無子科目</p>
              </div>
            )}
          </div>
        </div>

        {/* Info: (20260703 - Julian) Right Column: Form Panel */}
        <div className="sticky top-24 w-full shrink-0 lg:w-[360px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
            <div
              className={`${isEditing ? "bg-blue-50" : "bg-green-50"} px-6 py-4`}
            >
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                {isEditing ? (
                  <>
                    <Pencil size={18} className="text-blue-500" />
                    {t("voucher.account.edit_modal.title")}
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
                    setFormData(emptyFormData);
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
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition-all focus:ring-2 enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                  {t("voucher.account.add_modal.click_hint")}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {totalSubPages > 1 && (
        <Pagination
          currentPage={subPage}
          totalPages={totalSubPages}
          onPageChange={setSubPage}
        />
      )}

      <SuccessNotification
        show={showSuccess}
        title={
          isEditing
            ? t("voucher.account.messages.update_success")
            : t("voucher.account.messages.create_success")
        }
        message={
          isEditing
            ? t("voucher.account.messages.update_success_msg")
            : t("voucher.account.messages.create_success")
        }
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}
