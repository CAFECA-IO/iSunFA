"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Search,
  SearchX,
  Loader2,
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
import { ACCOUNT_TYPE_COLORS } from "@/constants/accounting_account";
import SuccessNotification from "@/components/common/success_notification";
import ConfirmModal from "@/components/common/confirm_modal";
import {
  CategorySubjectItem,
  SubAccountItem,
} from "@/components/user/voucher/account_item";

// TODO: (20260703 - Julian) ============= 此元件還在施工中 =============

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

  // Info: (20260706 - Julian) Modal States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 500);

    // Info: (20260706 - Julian) 關鍵字變更後，Tab 切回到 All
    if (keyword && !debouncedKeyword) {
      setActiveTab("all");
    }
    return () => clearTimeout(timer);
  }, [keyword, debouncedKeyword]);

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

  const handleAddChild = useCallback((parentAccount: IAccountingAccount) => {
    setIsEditing(false);
    setEditId(null);
    setParentInfo(`[${parentAccount.code}] ${parentAccount.name}`);
    setFormData({ parentCode: parentAccount.code, name: "", code: "" });
    setErrorMessage(null);
  }, []);

  const handleEdit = useCallback(
    (account: IAccountingAccount) => {
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
    },
    [allAccounts],
  );

  const handleDelete = useCallback((id: string) => {
    setDeleteId(id);
    setIsConfirmModalOpen(true);
  }, []);

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await request<IApiResponse<{ success: boolean }>>(
        `/api/v1/user/account_book/${accountBookId}/accounting_account/${deleteId}`,
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
    } finally {
      setIsConfirmModalOpen(false);
      setDeleteId(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parentCode || !formData.name || !formData.code) return;

    setIsFormLoading(true);
    setErrorMessage(null);
    try {
      const res = isEditing
        ? await request<IApiResponse<IAccountingAccount>>(
            `/api/v1/user/account_book/${accountBookId}/accounting_account/${editId}`,
            {
              method: "PATCH",
              body: JSON.stringify({ input: formData }),
            },
          )
        : await request<IApiResponse<{ id: string }>>(
            `/api/v1/user/account_book/${accountBookId}/accounting_account`,
            {
              method: "POST",
              body: JSON.stringify({ input: formData }),
            },
          );

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
      // Info: (20260706 - Julian) 只有當該大類符合 Tab 或 搜尋關鍵字時才顯示
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

  const { totalSubPages, paginatedSubAccounts } = useMemo(() => {
    const total = Math.ceil(rightList.length / SUB_PAGE_SIZE);
    const paginated = rightList.slice(
      (subPage - 1) * SUB_PAGE_SIZE,
      subPage * SUB_PAGE_SIZE,
    );
    return {
      totalSubPages: Math.max(1, total),
      paginatedSubAccounts: paginated,
    };
  }, [rightList, subPage]);

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
            type="button"
            onClick={() => setActiveTab("all")}
            className={`${activeTab === "all" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:bg-gray-100"} rounded-lg px-4 py-2 text-xs font-bold transition-all md:text-sm`}
          >
            {t("voucher.account_book_selector.all")}
          </button>
          {Object.entries(ACCOUNT_TYPE_COLORS).map(([key, value]) => (
            <button
              type="button"
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

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="刪除科目"
        message="確定要刪除此自訂科目嗎？此動作無法復原。"
        confirmText="確認刪除"
        cancelText="取消"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
