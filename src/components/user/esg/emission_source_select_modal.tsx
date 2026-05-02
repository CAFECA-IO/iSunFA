"use client";

import { useState, useEffect, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { X, Loader2, Search, SearchX, Factory } from "lucide-react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { IEsgEmissionSourcesUI } from "@/interfaces/emission_sources";

interface IEmissionSourceSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectEmissionSource: (source: { id: string; name: string }) => void;
}

export default function EmissionSourceSelectModal({
  isOpen,
  onClose,
  selectEmissionSource,
}: IEmissionSourceSelectModalProps) {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const accountBookId = params?.account_book_id as string;

  const [originalData, setOriginalData] = useState<IEsgEmissionSourcesUI[]>([]);
  const [filteredData, setFilteredData] = useState<IEsgEmissionSourcesUI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>("");

  const sourceManagementUrl = `/user/account_book/${accountBookId}/esg?tab=emission_sources`;

  // Info: (20260429 - Julian) 取得排放源清單
  useEffect(() => {
    const fetchEmissionSourceList = async () => {
      try {
        setIsLoading(true);
        const searchQuery = keyword
          ? `?keyword=${encodeURIComponent(keyword)}`
          : "";
        const data = await request<
          IApiResponse<{ data: IEsgEmissionSourcesUI[]; total: number }>
        >(
          `/api/v1/user/account_book/${accountBookId}/esg/emission_sources${searchQuery}`,
        );
        if (data.payload) {
          if (!keyword) {
            setOriginalData(data.payload.data);
          }
          setFilteredData(data.payload.data);
        }
      } catch (err) {
        console.error("Failed to fetch emission source list:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // Info: (20260429 - Julian) 搜尋框延遲 1 秒，避免頻繁請求
    const handler = setTimeout(() => {
      fetchEmissionSourceList();
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [accountBookId, keyword, isOpen]);

  const gotoSourcePage = () => {
    // Info: (20260429 - Julian) 關閉這個 modal
    onClose();
    // Info: (20260429 - Julian) 跳轉到排放源管理頁面
    router.push(sourceManagementUrl);
  };

  const sourceList =
    filteredData.length > 0 ? (
      filteredData.map((source) => {
        const onClick = () => {
          selectEmissionSource({ id: source.id, name: source.name });
          onClose();
        };
        return (
          <button
            key={source.id}
            type="button"
            onClick={onClick}
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 ease-in-out hover:border-orange-300 hover:bg-orange-50"
          >
            <div className="rounded-lg bg-slate-50 p-2 text-slate-700 transition-all duration-200 ease-in-out group-hover:bg-orange-400 group-hover:text-white">
              <Factory size={16} />
            </div>
            <div className="flex flex-col items-start">
              <p className="text-left text-sm font-bold text-slate-700">
                {source.name}
              </p>
              <p className="text-left text-xs font-semibold text-slate-400">
                {source.address || t("emission_sources.item.no_setting")}
              </p>
            </div>
          </button>
        );
      })
    ) : (
      <div className="flex flex-col items-center gap-2 p-10 text-base font-semibold text-slate-400">
        <SearchX size={40} />
        <p>{t("emission_sources.list.no_data")}</p>
      </div>
    );

  const displaySourceList = isLoading ? (
    <div className="flex items-center justify-center p-10">
      <Loader2 size={40} className="animate-spin text-orange-300" />
    </div>
  ) : originalData.length > 0 ? (
    <div className="flex flex-col gap-4">
      {/* Info: (20260429 - Julian) 搜尋框 */}
      <div className="relative w-full lg:max-w-sm">
        <Search
          size={16}
          className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder={t("emission_sources.toolbar.placeholder")}
          aria-label={t("emission_sources.toolbar.search")}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 py-2 pr-4 pl-10 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none"
        />
      </div>
      <div className="flex max-h-[400px] flex-col gap-2 overflow-y-auto">
        {sourceList}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-2 px-10 py-5">
      <p className="text-base font-bold text-slate-700">
        {t("emission_sources.list.no_data")}
      </p>
      <button
        type="button"
        onClick={gotoSourcePage}
        className="rounded-full bg-orange-400 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-in-out hover:bg-orange-600"
      >
        {t("emission_sources.toolbar.add_button")}
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
                {/* Info: (20260429 - Julian) Header */}
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
                    {t("emission_sources.toolbar.search")}
                  </DialogTitle>
                </div>

                {displaySourceList}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
