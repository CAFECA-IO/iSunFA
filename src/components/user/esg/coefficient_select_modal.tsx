"use client";

import { useState, useEffect, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { X, Calculator, Loader2, Search, SearchX } from "lucide-react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { useTranslation } from "@/i18n/i18n_context";
import { ICoefficient, CoefficientCategory } from "@/interfaces/coefficient";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";

interface ICoefficientSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit?: string;
  selectCoefficient: (coefficient: ICoefficient) => void;
}

export default function CoefficientSelectModal({
  isOpen,
  onClose,
  unit = "",
  selectCoefficient,
}: ICoefficientSelectModalProps) {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const accountBookId = params?.account_book_id as string;

  const [activeTab, setActiveTab] = useState<CoefficientCategory>(
    CoefficientCategory.STANDARD,
  );
  const [originalData, setOriginalData] = useState<ICoefficient[]>([]);
  const [filteredData, setFilteredData] = useState<ICoefficient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>("");

  const coefficientManagementUrl = `/user/account_book/${accountBookId}/esg?tab=coefficient`;

  // Info: (20260424 - Julian) 取得係數列表
  useEffect(() => {
    const fetchCoefficientList = async () => {
      try {
        setIsLoading(true);
        const unitQuery = unit ? `&unit=${unit}` : "";
        const searchQuery = keyword
          ? `&search=${encodeURIComponent(keyword)}`
          : "";
        const tabQuery = activeTab ? `&tab=${activeTab}` : "";
        const data = await request<
          IApiResponse<{ items: ICoefficient[]; total: number }>
        >(
          `/api/v1/user/account_book/${accountBookId}/esg/coefficient?${unitQuery}${searchQuery}${tabQuery}`,
        );
        if (data.payload) {
          if (!keyword) {
            setOriginalData(data.payload.items);
          }
          setFilteredData(data.payload.items);
        }
      } catch (err) {
        console.error("Failed to fetch coefficient list:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // Info: (20260424 - Julian) 搜尋框延遲 1 秒，避免頻繁請求
    const handler = setTimeout(() => {
      fetchCoefficientList();
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [accountBookId, unit, keyword, activeTab]);

  const gotoCoefficientPage = () => {
    // Info: (20260416 - Julian) 關閉這個 modal
    onClose();
    // Info: (20260416 - Julian) 跳轉到係數管理頁面
    router.push(coefficientManagementUrl);
  };

  const tabs = Object.values(CoefficientCategory).map((tab) => (
    <button
      key={tab}
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`${tab === activeTab ? "bg-white text-orange-600 shadow-sm" : "text-gray-600 hover:bg-gray-200"} rounded-md p-2 text-sm font-semibold text-slate-800 transition-all outline-none hover:text-slate-700`}
    >
      {t(`coefficient.tab.${tab.toLowerCase()}`)}
    </button>
  ));

  const coefficientList =
    filteredData.length > 0 ? (
      filteredData.map((coefficient) => {
        const onClick = () => {
          selectCoefficient(coefficient);
          onClose();
        };
        return (
          <button
            key={coefficient.id}
            type="button"
            onClick={onClick}
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 ease-in-out hover:border-orange-300 hover:bg-orange-50"
          >
            <div className="rounded-lg bg-slate-50 p-2 text-slate-700 transition-all duration-200 ease-in-out group-hover:bg-orange-400 group-hover:text-white">
              <Calculator size={16} />
            </div>
            <div className="flex flex-col items-start">
              <p className="text-left text-sm font-bold text-slate-700">
                {coefficient.name}
              </p>
              <p className="text-left text-xs font-semibold text-slate-400">
                {coefficient.unit} * {coefficient.emissionFactor}
              </p>
            </div>
          </button>
        );
      })
    ) : (
      <div className="flex flex-col items-center gap-2 p-10 text-base font-semibold text-slate-400">
        <SearchX size={40} />
        <p>{t("coefficient.select_modal.no_match")}</p>
      </div>
    );

  const displayCoefficientList = isLoading ? (
    <div className="flex items-center justify-center p-10">
      <Loader2 size={40} className="animate-spin text-orange-300" />
    </div>
  ) : originalData.length > 0 ? (
    <div className="flex flex-col gap-4">
      {/* Info: (20260424 - Julian) 搜尋框 */}
      <div className="relative w-full lg:max-w-sm">
        <Search
          size={16}
          className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder={t("coefficient.search.placeholder")}
          aria-label={t("coefficient.search.label")}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 py-2 pr-4 pl-10 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none"
        />
      </div>

      <div className="flex max-h-[400px] flex-col gap-2 overflow-y-auto">
        {coefficientList}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-2 px-10 py-5">
      <p className="text-base font-bold text-slate-700">
        {t("coefficient.select_modal.no_unit_match_prefix")}
        <span className="underline underline-offset-2">{unit}</span>
        {t("coefficient.select_modal.no_unit_match_suffix")}
      </p>
      <button
        type="button"
        onClick={gotoCoefficientPage}
        className="rounded-full bg-orange-400 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-in-out hover:bg-orange-600"
      >
        {t("coefficient.select_modal.goto_manage")}
      </button>
    </div>
  );

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-200" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-201 w-screen overflow-y-auto">
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
              <DialogPanel className="relative flex w-[450px] transform flex-col gap-6 overflow-hidden rounded-3xl bg-white p-8">
                {/* Info: (20260415 - Julian) Header */}
                <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                  <button
                    type="button"
                    className="rounded-full bg-white p-2 text-gray-400 outline-none hover:bg-gray-100 hover:text-gray-700"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <X size={24} aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <DialogTitle
                    as="h3"
                    className="text-2xl font-bold text-slate-700"
                  >
                    {t("coefficient.select_modal.title")}
                  </DialogTitle>
                </div>

                {/* Info: (20260518 - Julian) Tab */}
                <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1">
                  {tabs}
                </div>

                {/* Info: (20260415 - Julian) Coefficient List */}
                {displayCoefficientList}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
