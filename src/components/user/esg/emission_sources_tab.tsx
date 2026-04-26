"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "@/i18n/i18n_context";
import { Plus, Search, SearchX, Loader2 } from "lucide-react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
// import EmissionSourcesSummary from "@/components/user/esg/emission_sources_summary";
import EmissionSourcesItem from "@/components/user/esg/emission_sources_item";
import { IEsgEmissionSourcesUI } from "@/interfaces/emission_source";
import AddEmissionSourceModal from "@/components/user/esg/add_emission_source_modal";
import Pagination from "@/components/common/pagination";

const PAGE_SIZE = 10;

const EmissionSourcesList = ({ keyword, refreshFlag }: { keyword: string; refreshFlag: boolean }) => {
  const { t } = useTranslation();
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  const [data, setData] = useState<IEsgEmissionSourcesUI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
      const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await request<IApiResponse<{ data: IEsgEmissionSourcesUI[],total: number, totalPages: number }>>(
        `/api/v1/user/account_book/${accountBookId}/esg/emission_sources?keyword=${encodeURIComponent(keyword)}&page=${currentPage}&pageSize=${PAGE_SIZE}`
      );
      if (res.success && res.payload) {
        setData(res.payload.data);
        setTotalCount(res.payload.total);
        setTotalPages(res.payload.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch emission sources", error);
    } finally {
      setIsLoading(false);
    }
  }

  fetchData()
  }, [keyword, currentPage, refreshFlag, accountBookId]);

  if (isLoading && data.length === 0) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-gray-400" size={40} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-12 text-lg font-bold text-slate-400">
        <SearchX size={40} />
        <p>{t("emission_sources.list.no_data")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="ml-auto text-sm text-slate-400">
        {t("emission_sources.list.total_count").split("{{count}}")[0]}
        <span className="font-bold text-slate-700">{totalCount}</span>
        {t("emission_sources.list.total_count").split("{{count}}")[1]}
      </div>
      {data.map((item) => (
        <EmissionSourcesItem key={item.id} data={item} />
      ))}
      
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default function EmissionSourcesTab() {
  const { t } = useTranslation();

  const [keyword, setKeyword] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [refreshFlag, setRefreshFlag] = useState<boolean>(false);

  return (
    <>
      <div className="flex flex-col gap-8">
        {/* Info: (20260420 - Julian) Summary */}
        {/* <EmissionSourcesSummary /> */}

        {/* Info: (20260420 - Julian) Toolbar */}
        <div className="flex flex-col gap-x-8 gap-y-2 rounded-xl bg-white p-3 shadow-sm md:flex-row md:p-6">
          {/* Info: (20260413 - Julian) Search */}
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-gray-50 p-2 lg:px-5 lg:py-3">
            <label htmlFor="emission-sources-search-input" className="sr-only">
              {t("emission_sources.toolbar.search")}
            </label>
            <Search size={20} className="text-gray-300" />
            <input
              id="emission-sources-search-input"
              aria-label={t("emission_sources.toolbar.search")}
              type="text"
              placeholder={t("emission_sources.toolbar.placeholder")}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-gray-400 lg:text-base"
            />
          </div>
          {/* Info: (20260420 - Julian) Add Button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 p-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 focus:outline-none lg:px-5 lg:py-3 lg:text-base"
          >
            <Plus size={20} />
            <p>{t("emission_sources.toolbar.add_button")}</p>
          </button>
        </div>

        {/* Info: (20260420 - Julian) Emission Sources List */}
        <EmissionSourcesList keyword={keyword} refreshFlag={refreshFlag} />
      </div>

      <AddEmissionSourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => setRefreshFlag((prev) => !prev)}
      />
    </>
  );
}
