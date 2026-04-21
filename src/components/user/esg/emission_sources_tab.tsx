"use client";

import { useState } from "react";
// import { useParams } from "next/navigation";
import { useTranslation } from "@/i18n/i18n_context";
import {
  Plus,
  Search,
  SearchX,
} from "lucide-react";
// import { request } from "@/lib/utils/request";
// import { IApiResponse } from "@/lib/utils/response";
// import { EsgScope } from "@/interfaces/esg";
// import { IActivityData } from "@/interfaces/emission_source";
// import EmissionSourcesSummary from "@/components/user/esg/emission_sources_summary";
import EmissionSourcesItem from "@/components/user/esg/emission_sources_item";
import { mockEmissionSources } from "@/interfaces/emission_source";

const AddEmissionSourceModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("請輸入排放源名稱");
      return;
    }
    console.log("Submit:", { name, address });
    onClose();
    setName("");
    setAddress("");
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-slate-800">新增排放源</h2>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="es-name" className="text-sm font-semibold text-slate-600">
              排放源名稱 (廠區) <span className="text-red-500">*</span>
            </label>
            <input
              id="es-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="例如：台中二廠"
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="es-address" className="text-sm font-semibold text-slate-600">
              地址 (選填)
            </label>
            <input
              id="es-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="例如：台中市西屯區工業區一路1號"
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600"
            >
              確認新增
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EmissionSourcesList = ({ keyword }: { keyword: string }) => {
  const filteredData = mockEmissionSources.filter((source) =>
    source.name.toLowerCase().includes(keyword.toLowerCase()) || 
    source.id.toLowerCase().includes(keyword.toLowerCase())
  );

  if (filteredData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-12 text-lg font-bold text-slate-400">
        <SearchX size={40} />
        <p>目前沒有資料</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {filteredData.map((data) => (
        <EmissionSourcesItem key={data.id} data={data} />
      ))}
    </div>
  );
};


export default function EmissionSourcesTab() {
  // const params = useParams();
  // const accountBookId = params?.account_book_id as string;

  const { t } = useTranslation();

  const [keyword, setKeyword] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  // const [isLoading, setIsLoading] = useState<boolean>(true);

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
        <EmissionSourcesList keyword={keyword} />
      </div>

      <AddEmissionSourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
