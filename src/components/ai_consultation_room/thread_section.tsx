"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Search, ArrowDownWideNarrow, ArrowUpNarrowWide, X } from "lucide-react";
import { IThreadDetail } from "@/interfaces/ai_consulting";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { ThreadCard } from "@/components/ai_consultation_room/thread_card";
import Pagination from "@/components/common/pagination";
import { useTranslation } from "@/i18n/i18n_context";
import { useAiContext } from "@/contexts/ai_context";
import { SortOptionQuery } from "@/constants/sort";

const PAGE_SIZE = 20;

export default function ThreadSection() {
  const { t } = useTranslation();
  const { setIsChatOpen } = useAiContext();
  const openChat = () => setIsChatOpen(true);

  const [threads, setThreads] = useState<IThreadDetail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortOption, setSortOption] = useState<SortOptionQuery>(
    SortOptionQuery.NEWEST,
  );
  const [totalItems, setTotalItems] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Info: (20260428 - Julian) 設定關鍵字輸入延遲
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 500);
    return () => clearTimeout(handler);
  }, [keyword]);

  // Info: (20260428 - Julian) 當篩選條件改變時，重設頁碼
  useEffect(() => {
    setPageNumber(1);
  }, [debouncedKeyword, tags, startDate, endDate, sortOption]);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          keyword: debouncedKeyword,
          pageNumber: pageNumber.toString(),
          pageSize: PAGE_SIZE.toString(),
          sort: sortOption,
        });
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (tags.length > 0) params.append("tags", tags.join(","));

        const res = await request<
          IApiResponse<{
            items: IThreadDetail[];
            total: number;
            totalPages: number;
          }>
        >(
          `/api/v1/ai_consulting/threads?${params.toString()}`,
        );
        if (res.code === ApiCode.SUCCESS && res.payload) {
          setThreads(res.payload.items);
          setTotalItems(res.payload.total);
          setTotalPages(res.payload.totalPages);
        }
      } catch (error) {
        console.error("Failed to fetch threads:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreads();
  }, [pageNumber, sortOption, debouncedKeyword, startDate, endDate, tags]);

  const sortButton = (
    <button 
      type="button"
      className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-400 enabled:cursor-pointer enabled:hover:border-orange-500 enabled:hover:text-orange-500"
      onClick={() => setSortOption(sortOption === SortOptionQuery.NEWEST ? SortOptionQuery.OLDEST : SortOptionQuery.NEWEST)}
    >
      {sortOption === SortOptionQuery.NEWEST ? (
        <>
          <ArrowUpNarrowWide size={24} />
          <p>由舊至新</p>
        </>
      ) : (
        <>
          <ArrowDownWideNarrow size={24} />
          <p>由新至舊</p>
        </>
      )}
    </button>
  );

  const displayedThreads = (
    <div className="flex flex-col gap-8 px-24 py-6">
      {/* Info: (20260428 - Julian) Filter Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {/* Info: (20260428 - Julian) Keyword Search */}
            <div className="flex items-center py-2 px-4 rounded-lg border border-slate-300 gap-2 flex-1 text-slate-400">
              <Search size={24} />
              <input
                type="text"
                placeholder="搜尋討論串"
                aria-label="搜尋討論串"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full bg-transparent text-base placeholder:text-slate-400 outline-none"
              />
            </div>
            
            {/* Info: (20260428 - Julian) Date Search */}
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-slate-400">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm outline-none"
              />
              <span>-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm outline-none"
              />
            </div>

            {/* Info: (20260428 - Julian) Sort Options */}
            {sortButton}
          </div>

          {/* Info: (20260428 - Julian) Tag Search */}
          <div className="flex items-center gap-2">
            <div className="flex items-center py-2 px-4 rounded-lg border border-slate-300 flex-1 text-slate-400">
              <input
                type="text"
                placeholder="輸入標籤後按 Enter 加入篩選"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault();
                    if (!tags.includes(tagInput.trim())) {
                      setTags([...tags, tagInput.trim()]);
                    }
                    setTagInput("");
                  }
                }}
                className="w-full bg-transparent text-sm placeholder:text-slate-400 outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2 flex-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-600">
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-orange-800">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
          {/* Info: (20260428 - Julian) Total Threads Count */}
        <div className="flex flex-col gap-2">
          <p className="ml-auto text-xs text-gray-500">
            共 {totalItems} 則討論
          </p>
        </div>
      </div>

      {/* Info: (20260428 - Julian) Threads List */}
      <div className="flex flex-wrap gap-x-4 gap-y-8">
        {threads.map((item) => (
          <ThreadCard key={item.id} {...item} />
        ))}
      </div>

      {/* Info: (20260428 - Julian) Pagination */}
      <Pagination
        currentPage={pageNumber}
        totalPages={totalPages}
        onPageChange={setPageNumber}
      />
    </div>
  );

  const mainContent = isLoading ? (
    // Info: (20260428 - Julian) Loading
    <div className="flex h-[500px] items-center justify-center">
      <Loader2 size={32} className="animate-spin text-orange-500" />
    </div>
  ) : threads.length === 0 ? (
    // Info: (20260428 - Julian) No Threads
    <div className="flex h-[500px] flex-col items-center justify-center gap-2 overflow-y-auto p-10">
      <p className="text-2xl font-bold text-gray-700">
        {t("ai_consultation_room.no_threads")}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="text-orange-500 underline-offset-2 hover:underline"
        >
          {t("ai_consultation_room.back_home")}
        </Link>
        <p>{t("ai_consultation_room.or")}</p>
        <button
          type="button"
          onClick={openChat}
          className="text-orange-500 underline-offset-2 hover:cursor-pointer hover:underline"
        >
          {t("ai_consultation_room.ask_now")}
        </button>
      </div>
    </div>
  ) : (
    displayedThreads
  );

  return mainContent;
}
