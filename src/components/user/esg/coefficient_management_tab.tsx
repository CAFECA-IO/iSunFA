"use client";

import { useState, useEffect } from "react";
import {
  Globe,
  User,
  Plus,
  Search,
  PenLine,
  Trash2,
  SearchX,
  Loader2,
} from "lucide-react";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { timestampToString } from "@/lib/utils/common";
import ConfirmModal from "@/components/common/confirm_modal";
import Pagination from "@/components/common/pagination";
import CoefficientAddEditModal from "@/components/user/esg/coefficient_add_edit_modal";
import {
  CoefficientCategory,
  ICoefficient,
  ICoefficientInput,
} from "@/interfaces/coefficient";
import { useTranslation } from "@/i18n/i18n_context";

interface ICoefficientCardProps {
  coefficient: ICoefficient;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const CoefficientCard = ({
  coefficient,
  onEdit,
  onDelete,
}: ICoefficientCardProps) => {
  const { t } = useTranslation();

  // Info: (20260413 - Julian) 只有自訂係數可以編輯與刪除
  const actions = coefficient.category === CoefficientCategory.CUSTOM && (
    <div className="flex items-center gap-1 transition-all duration-200 lg:gap-2">
      <button
        type="button"
        onClick={() => onEdit(coefficient.id)}
        className="rounded-lg p-2 text-gray-400 transition-all hover:bg-orange-100 hover:text-orange-600"
      >
        <PenLine size={16} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(coefficient.id)}
        className="rounded-lg p-2 text-gray-400 transition-all hover:bg-red-100 hover:text-red-600"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const icon =
    coefficient.category === CoefficientCategory.STANDARD ? (
      <div className="rounded-lg bg-green-100 p-2.5 text-green-600">
        <Globe className="size-4 lg:size-6" />
      </div>
    ) : (
      <div className="rounded-lg bg-orange-100 p-2.5 text-orange-600">
        <User className="size-4 lg:size-6" />
      </div>
    );
  const tag =
    coefficient.category === CoefficientCategory.STANDARD ? (
      <div className="rounded-md bg-green-100 px-2 py-0.5 whitespace-nowrap text-[10px] text-green-600 lg:text-xs">
        {t("coefficient.tag.standard")}
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-white p-3 shadow-sm lg:gap-4 lg:p-6">
      {/* Info: (20260413 - Julian) Header */}
      <div className="flex items-center justify-between">
        {/* Info: (20260413 - Julian) Title */}
        <div className="flex items-center gap-2 lg:gap-4">
          {icon}
          <div className="flex flex-col gap-0 font-bold lg:gap-1">
            <div className="flex items-center gap-3">
              <h2 className="text-sm text-slate-800 lg:text-base">
                {coefficient.name}
              </h2>
              {tag}
            </div>
            <p className="text-[10px] text-gray-400 lg:text-xs">
              <span
                className={`${
                  coefficient.category === CoefficientCategory.STANDARD
                    ? "text-green-600"
                    : ""
                }`}
              >
                {coefficient.source}
              </span>{" "}
              • {t("coefficient.card.last_updated")}{" "}
              {timestampToString(coefficient.updatedAt).dateWithDash}
            </p>
          </div>
        </div>
        {/* Info: (20260413 - Julian) Action */}
        {actions}
      </div>
      {/* Info: (20260413 - Julian) Description */}
      <div className="flex flex-col gap-2">
        <p className="line-clamp-2 text-xs text-gray-500 lg:text-sm">
          {coefficient.description}
        </p>
      </div>
      {/* Info: (20260413 - Julian) Coefficient */}
      <div className="flex flex-col gap-1.5 rounded-lg bg-gray-50 p-2.5 font-semibold lg:gap-4 lg:p-4">
        <p className="text-xs text-gray-400 lg:text-sm">
          {t("coefficient.card.logic")}
        </p>
        <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
          <p className="text-sm text-slate-800 lg:text-base">
            {coefficient.unit} * {coefficient.emissionFactor}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] lg:text-xs">
            <p className="text-gray-400">{t("coefficient.card.ef")}</p>
            <p className="text-slate-800">{coefficient.emissionFactor}</p>
          </div>
          <p className="text-[10px] tracking-widest text-gray-400 uppercase lg:text-xs">
            kgCO2e/{coefficient.unit}
          </p>
        </div>
      </div>
    </div>
  );
};

type ICoefficientTab = CoefficientCategory | "all";

const PAGE_SIZE = 10;

export default function CoefficientManagementTab() {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;
  const { t } = useTranslation();

  const [coefficientList, setCoefficientList] = useState<ICoefficient[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [keyword, setKeyword] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ICoefficientTab>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshFlag, setRefreshFlag] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [selectedCoefficientId, setSelectedCoefficientId] = useState<
    string | null
  >(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
    useState<boolean>(false);

  const clickAddCoefficient = () => {
    setSelectedCoefficientId(null);
    setIsAddEditModalOpen(true);
  };

  // Info: (20260414 - Julian) 刪除係數 API
  const deleteCoefficient = async () => {
    try {
      await request<IApiResponse<null>>(
        `/api/v1/user/account_book/${accountBookId}/esg/coefficient/${selectedCoefficientId}`,
        { method: "DELETE" },
      );
      setRefreshFlag((prev) => !prev);
    } catch (error) {
      console.error("Error deleting coefficient:", error);
    }
  };

  // Info: (20260414 - Julian) 儲存係數資料
  const saveCoefficient = async (input: ICoefficientInput) => {
    // Info: (20260414 - Julian) 判斷是新增或編輯
    const isEdit = selectedCoefficientId !== null;

    // Info: (20260414 - Julian) 新增和編輯須使用不同的 API URL 和 method
    const apiUrl = isEdit
      ? `/api/v1/user/account_book/${accountBookId}/esg/coefficient/${selectedCoefficientId}`
      : `/api/v1/user/account_book/${accountBookId}/esg/coefficient`;
    const method = isEdit ? "PUT" : "POST";

    try {
      await request<IApiResponse<{ coefficientId?: string }>>(apiUrl, {
        method,
        body: JSON.stringify({ input }),
      });
      // Info: (20260414 - Julian) 觸發 useEffect 以重新取得係數列表
      setRefreshFlag((prev) => !prev);
    } catch (err) {
      console.error("Failed to save coefficient:", err);
    } finally {
      setIsLoading(false);
    }
    setIsAddEditModalOpen(false);
  };

  // Info: (20260414 - Julian) 取得係數列表
  useEffect(() => {
    const fetchCoefficientList = async () => {
      try {
        setIsLoading(true);
        const data = await request<
          IApiResponse<{ items: ICoefficient[]; total: number }>
        >(
          `/api/v1/user/account_book/${accountBookId}/esg/coefficient?tab=${activeTab}&search=${keyword}&page=${currentPage}&pageSize=${PAGE_SIZE}`,
        );
        if (data.payload) {
          setCoefficientList(data.payload.items);
          setTotalCount(data.payload.total);
        }
      } catch (err) {
        console.error("Failed to fetch coefficient list:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCoefficientList();
  }, [activeTab, keyword, accountBookId, refreshFlag, currentPage]);

  // Info: (20260414 - Julian) 切回合與搜尋條件改變時重置第一頁
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, keyword]);

  const tabs = ["all", ...Object.values(CoefficientCategory)].map((tab) => (
    <button
      key={tab}
      type="button"
      onClick={() => setActiveTab(tab as ICoefficientTab)}
      className={`${tab === activeTab ? "text-slate-800" : "text-gray-400"} w-1/3 py-2 text-xs font-semibold transition-all outline-none hover:text-slate-700 lg:w-40 lg:py-4 lg:text-base`}
    >
      {t(`coefficient.tab.${tab.toLowerCase()}`)}
    </button>
  ));

  // Info: (20260414 - Julian) 計算總頁數
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const displayedCoefficientList = coefficientList.map((coefficient) => {
    const handleEdit = (id: string) => {
      setSelectedCoefficientId(id);
      setIsAddEditModalOpen(true);
    };
    const handleDelete = (id: string) => {
      setSelectedCoefficientId(id);
      setIsDeleteConfirmOpen(true);
    };

    return (
      <CoefficientCard
        key={coefficient.id}
        coefficient={coefficient}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
  });

  const coefficientSection = isLoading ? (
    <div className="flex items-center justify-center gap-2 p-20 text-xl font-semibold text-orange-400">
      <Loader2 className="animate-spin" size={40} />
    </div>
  ) : coefficientList.length > 0 ? (
    <div className="grid grid-flow-row grid-cols-1 gap-y-4 md:grid-cols-2 md:gap-x-4">
      {displayedCoefficientList}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-2 p-4 text-xl font-semibold text-gray-400">
      <SearchX size={40} />
      <p>{t("coefficient.empty")}</p>
    </div>
  );

  return (
    <>
      {/* Info: (20260413 - Julian) Toolbar */}
      <div className="flex flex-col gap-x-8 gap-y-2 rounded-xl bg-white p-3 shadow-sm md:flex-row md:p-6">
        {/* Info: (20260413 - Julian) Search */}
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-gray-50 p-2 lg:px-5 lg:py-3">
          <label htmlFor="coefficient-search-input" className="sr-only">
            {t("coefficient.search.label")}
          </label>
          <Search size={20} className="text-gray-300" />
          <input
            id="coefficient-search-input"
            aria-label={t("coefficient.search.label")}
            type="text"
            placeholder={t("coefficient.search.placeholder")}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-gray-400 lg:text-base"
          />
        </div>
        {/* Info: (20260413 - Julian) Add Button */}
        <button
          type="button"
          onClick={clickAddCoefficient}
          className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 p-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 focus:outline-none lg:px-5 lg:py-3 lg:text-base"
        >
          <Plus size={20} />
          <p>{t("coefficient.action.add")}</p>
        </button>
      </div>

      {/* Info: (20260413 - Julian) Tab Switch */}
      <div className="relative flex items-center border-b border-gray-200">
        {tabs}
        <div
          className={`absolute bottom-0 left-0 h-0.5 w-1/3 bg-slate-700 transition-all duration-200 lg:h-1 lg:w-40 ${activeTab === "all" ? "left-0" : activeTab === CoefficientCategory.STANDARD ? "left-1/3 lg:left-40" : "left-2/3 lg:left-80"} `}
        ></div>
      </div>

      {/* Info: (20260413 - Julian) Coefficient Section */}
      {coefficientSection}

      {/* Info: (20260414 - Julian) Pagination */}
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Info: (20260413 - Julian) Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title={t("coefficient.delete.title")}
        message={t("coefficient.delete.message")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        onConfirm={deleteCoefficient}
      />

      {/* Info: (20260413 - Julian) Add/Edit Modal */}
      <CoefficientAddEditModal
        selectedCoefficientId={selectedCoefficientId}
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        onConfirm={saveCoefficient}
      />
    </>
  );
}
