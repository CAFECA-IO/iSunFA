"use client";

import { useState, useEffect } from "react";
import {
  // Globe,
  // User,
  Plus,
  Search,
  // PenLine,
  // Trash2,
  SearchX,
  Loader2,
} from "lucide-react";
// import { useParams } from "next/navigation";
// import { request } from "@/lib/utils/request";
// import { IApiResponse } from "@/lib/utils/response";
// import { timestampToString } from "@/lib/utils/common";
// import ConfirmModal from "@/components/common/confirm_modal";
import Pagination from "@/components/common/pagination";
// import AccountAddEditModal from "@/components/user/esg/account_add_edit_modal";
// import {
//   AccountCategory,
//   IAccount,
//   IAccountInput,
// } from "@/interfaces/account";
import { useTranslation } from "@/i18n/i18n_context";
import { ACCOUNTS, IAccount } from "@/constants/accounts";
// import { IAccountBook } from "@/interfaces/account_book";
import { AccountType } from "@/constants/enums";

interface IAccountCardProps {
  account: IAccount;
}

const AccountCard = ({ account }: IAccountCardProps) => {
  // const { t } = useTranslation();

  return (
    <div
      key={account.code}
      className="group flex w-full items-center gap-3 rounded-xl bg-white px-6 py-4 text-left shadow-sm"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-green-100 px-3 py-1.5 text-base font-bold text-green-600 transition-all">
        {account.code}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center text-xl font-bold text-slate-700">
          {account.name}
        </div>
        <div className="rounded-md bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-600">
          {account.type}
        </div>
      </div>
      <div></div>
    </div>
  );
};

// enum AccountCategory {
//   STANDARD = "standard",
//   CUSTOM = "custom",
// }

type IAccountTab = AccountType | "all";

const PAGE_SIZE = 10;

export default function AccountManagementTab() {
  // const params = useParams();
  // const accountBookId = params?.account_book_id as string;
  const { t } = useTranslation();

  const [accountList, setAccountList] = useState<IAccount[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [keyword, setKeyword] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");
  const [activeTab, setActiveTab] = useState<IAccountTab>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // const [refreshFlag, setRefreshFlag] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  // const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
  //   null,
  // );
  // const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
  //   useState<boolean>(false);

  // const clickAddAccount = () => {
  //   setSelectedAccountId(null);
  //   setIsAddEditModalOpen(true);
  // };

  // Info: (20260703 - Julian) 設定輸入延遲，避免頻繁打 API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Info: (20260703 - Julian) 手動送出搜尋，避免等待防抖延遲並關閉鍵盤
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedKeyword(keyword);
    document.getElementById("account-search-input")?.blur();
  };

  // Info: (20260703 - Julian) 取得係數列表
  useEffect(() => {
    const newList = ACCOUNTS.TW.filter(
      (account) => account.type === activeTab || activeTab === "all",
    )
      .filter((account) => account.name.includes(debouncedKeyword))
      .slice(0, PAGE_SIZE);
    setAccountList(newList);

    // Info: (20260703 - Julian) 計算總頁數
    setTotalPages(Math.ceil(ACCOUNTS.TW.length / PAGE_SIZE));

    setIsLoading(false);
  }, [activeTab, debouncedKeyword, currentPage]);

  // Info: (20260703 - Julian) 搜尋條件改變時重置第一頁
  // useEffect(() => {
  //   setCurrentPage(1);
  // }, [activeTab, debouncedKeyword]);

  const displayedAccountList = accountList.map((account) => {
    return <AccountCard key={account.code} account={account} />;
  });

  const accountSection = isLoading ? (
    <div className="flex items-center justify-center gap-2 p-20 text-xl font-semibold text-orange-400">
      <Loader2 className="animate-spin" size={40} />
    </div>
  ) : accountList.length > 0 ? (
    <div className="grid grid-flow-row grid-cols-1 gap-y-4 md:grid-cols-2 md:gap-x-4">
      {displayedAccountList}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-2 p-4 text-xl font-semibold text-gray-400">
      <SearchX size={40} />
      <p>{t("account.empty")}</p>
    </div>
  );

  return (
    <>
      {/* Info: (20260703 - Julian) Toolbar */}
      <div className="flex flex-col gap-x-8 gap-y-2 rounded-xl bg-white p-3 shadow-sm md:flex-row md:p-6">
        {/* Info: (20260703 - Julian) Search */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-1 items-center gap-2 rounded-lg bg-gray-50 p-2 lg:px-5 lg:py-3"
        >
          <label htmlFor="account-search-input" className="sr-only">
            {t("account.search.label")}
          </label>
          <Search size={20} className="text-gray-300" />
          <input
            id="account-search-input"
            aria-label={t("account.search.label")}
            type="text"
            placeholder={t("account.search.placeholder")}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            enterKeyHint="search"
            className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-gray-400 lg:text-base"
          />
        </form>
        {/* Info: (20260703 - Julian) Add Button */}
        <button
          type="button"
          // onClick={clickAddAccount}
          className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 p-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 focus:outline-none lg:px-5 lg:py-3 lg:text-base"
        >
          <Plus size={20} />
          <p>{t("account.action.add")}</p>
        </button>
      </div>
      {/* Info: (20260703 - Julian) Tab Switch */}
      <div className="relative flex items-center border-b border-gray-200">
        {Object.values(AccountType).map((tab) => {
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`${tab === activeTab ? "border-slate-800 text-slate-800" : "border-transparent text-gray-400"} border-b-2 px-6 py-2 text-base font-semibold transition-all outline-none hover:border-orange-500 hover:text-orange-500`}
            >
              {tab.toLowerCase()}
            </button>
          );
        })}
      </div>
      {/* <div className="relative flex items-center border-b border-gray-200">
        {tabs}
        <div
          className={`absolute bottom-0 left-0 h-0.5 w-1/3 bg-slate-700 transition-all duration-200 lg:h-1 lg:w-40 ${activeTab === "all" ? "left-0" : activeTab === AccountCategory.STANDARD ? "left-1/3 lg:left-40" : "left-2/3 lg:left-80"} `}
        ></div>
      </div> */}
      {/* Info: (20260703 - Julian) Account Section */}
      {accountSection}

      {/* Info: (20260703 - Julian) Pagination */}
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
      {/* Info: (20260703 - Julian) Confirm Modal */}
      {/* <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title={t("account.delete.title")}
        message={t("account.delete.message")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        onConfirm={deleteAccount}
      /> */}
      {/* Info: (20260703 - Julian) Add/Edit Modal */}
      {/* <AccountAddEditModal
        selectedAccountId={selectedAccountId}
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        onConfirm={saveAccount}
      /> */}
    </>
  );
}
