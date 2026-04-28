"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Loader2,
  Search,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  X,
} from "lucide-react";
import { IThreadDetail } from "@/interfaces/ai_consulting";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import ThreadCard from "@/components/ai_consultation_room/thread_card";
import Pagination from "@/components/common/pagination";
import { useTranslation } from "@/i18n/i18n_context";
import { useAiContext } from "@/contexts/ai_context";
import { SortOptionQuery } from "@/constants/sort";

const PAGE_SIZE = 20;

export default function ThreadSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { setIsChatOpen } = useAiContext();
  const openChat = () => setIsChatOpen(true);

  const [threads, setThreads] = useState<IThreadDetail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortOption, setSortOption] = useState<SortOptionQuery>(
    SortOptionQuery.NEWEST,
  );
  const [totalItems, setTotalItems] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Info: (20260428 - Julian) 取得 URL 的標籤參數
  const [tags, setTags] = useState<string[]>(() => {
    const queryTags = searchParams.get("tags");
    return queryTags ? queryTags.split(",") : [];
  });

  const tagOnClick = (tag: string) => {
    if (tags.includes(tag)) return;
    const updatedTags = [...tags, tag];
    
    // Info: (20260428 - Julian) 沒有該標籤時才增加
    setTags(updatedTags);
    
    // Info: (20260428 - Julian) 將 tag 加到 URL 上
    const queryParams = new URLSearchParams(searchParams);
    queryParams.set("tags", updatedTags.join(","));
    router.push(`?${queryParams.toString()}`);
  }

  const tagRemoveOnClick = (tag: string) => {
    const updatedTags = tags.filter((t) => t !== tag);
    setTags(updatedTags);
    const queryParams = new URLSearchParams(searchParams);
    if (updatedTags.length > 0) {
      queryParams.set("tags", updatedTags.join(","));
    } else {
      queryParams.delete("tags");
    }
    router.push(`?${queryParams.toString()}`);
  }

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
        >(`/api/v1/ai_consulting/thread?${params.toString()}`);
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
      onClick={() =>
        setSortOption(
          sortOption === SortOptionQuery.NEWEST
            ? SortOptionQuery.OLDEST
            : SortOptionQuery.NEWEST,
        )
      }
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

  const tagList = tags.map((tag) => (
    <button
      key={tag}
      type="button"
      onClick={() => tagRemoveOnClick(tag)}
      className="group/tag flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-600 cursor-pointer"
    >
      <p>{tag}</p>
      <X size={14} className="shrink-0 group-hover/tag:text-orange-800" />
    </button>
  ));

  const displayedThreads = (
    <>
      {/* Info: (20260428 - Julian) Threads List */}
      <div className="flex flex-wrap gap-x-4 gap-y-8">
        {threads.map((item) => (
          <ThreadCard
            key={item.id}
            thread={item}
            tagOnClick={tagOnClick}
          />
        ))}
      </div>

      {/* Info: (20260428 - Julian) Pagination */}
      <Pagination
        currentPage={pageNumber}
        totalPages={totalPages}
        onPageChange={setPageNumber}
      />
    </>
  );

  const mainContent = isLoading ? (
    // Info: (20260428 - Julian) Loading
    <div className="flex h-[500px] items-center justify-center">
      <Loader2 size={40} className="animate-spin text-orange-500" />
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

  return <div className="flex flex-col gap-8 px-24 py-6">
      {/* Info: (20260428 - Julian) Filter Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {/* Info: (20260428 - Julian) Keyword Search */}
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-slate-400">
              <Search size={24} />
              <input
                type="text"
                placeholder="搜尋討論串"
                aria-label="搜尋討論串"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full bg-transparent text-base outline-none text-slate-700 placeholder:text-slate-400"
              />
            </div>

            {/* Info: (20260428 - Julian) Date Search */}
            <div className="flex items-center gap-2 text-slate-400">
              <div className="flex items-center rounded-lg border border-slate-300 px-4 py-3">
                <input
                  type="date"
                  aria-label="startDate"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                />
              </div>
              <span>-</span>
              <div className="flex items-center rounded-lg border border-slate-300 px-4 py-3">
                <input
                  type="date"
                  aria-label="endDate"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            {/* Info: (20260428 - Julian) Sort Options */}
            {sortButton}
          </div>

          <div className="flex items-center gap-2">
            {/* Info: (20260428 - Julian) Tag Filter */}
            <div className="flex flex-2 flex-wrap gap-2">{tagList}</div>
            {/* Info: (20260428 - Julian) Total Threads Count */}
            <div className="flex flex-col gap-2">
              <p className="ml-auto text-xs text-gray-500">
                共 {totalItems} 則討論
              </p>
            </div>
          </div>
        </div>
      </div>

      {mainContent}
  </div>
}
