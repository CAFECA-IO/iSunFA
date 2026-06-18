"use client";

import { useState, useEffect, useCallback } from "react";
import { FileStack, Info, Search } from "lucide-react";
import Link from "next/link";
import { IEsgRecordDetail } from "@/interfaces/esg";
import {
  EsgScope,
  EsgIntensity,
  GhgProtocolCategory,
  Iso14064Category,
  GhgCategoryDetails,
  IsoCategoryDetails,
  IsoToGhgMapping,
  GhgToIsoMapping,
} from "@/constants/esg";
import { EsgRow } from "@/components/user/esg/esg_row";
import RecordTabModal from "@/components/user/common/record_tab_modal";
import ConfirmModal from "@/components/common/confirm_modal";
import DateSortButton from "@/components/user/common/date_sort_button";
import SuccessNotification from "@/components/common/success_notification";
import { request } from "@/lib/utils/request";
import { useParams, useSearchParams } from "next/navigation";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { useTranslation } from "@/i18n/i18n_context";
import { VerifyStatus } from "@/constants/verify_status";
import Pagination from "@/components/common/pagination";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { SortOrder } from "@/constants/sort";

interface IEsgTableSectionProps {
  year?: number;
  month?: number | "";
}

const PAGE_SIZE = 12;

export default function EsgTableSection({
  year = undefined,
  month = undefined,
}: IEsgTableSectionProps) {
  const { t, language } = useTranslation();
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  const [records, setRecords] = useState<IEsgRecordDetail[]>([]);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [keyWord, setKeyWord] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);
  const [verifyStatusFilter, setVerifyStatusFilter] = useState<
    VerifyStatus | "all"
  >("all");
  const [filteredIntensity, setFilteredIntensity] = useState<string>("all");
  const [filteredScope, setFilteredScope] = useState<string>("all");
  const [filteredGhgCategory, setFilteredGhgCategory] = useState<string>("all");
  const [filteredIsoCategory, setFilteredIsoCategory] = useState<string>("all");
  const [isScopeHighlighted, setIsScopeHighlighted] = useState<boolean>(false);
  const [isGhgHighlighted, setIsGhgHighlighted] = useState<boolean>(false);
  const [isIsoHighlighted, setIsIsoHighlighted] = useState<boolean>(false);
  const [hideDeleted, setHideDeleted] = useState<boolean>(true);

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [isVerifyAllConfirmOpen, setIsVerifyAllConfirmOpen] =
    useState<boolean>(false);
  const [isVerifySuccessOpen, setIsVerifySuccessOpen] =
    useState<boolean>(false);
  const [verifySuccessMsg, setVerifySuccessMsg] = useState<string>("");
  const [isAllVerified, setIsAllVerified] = useState<boolean>(false);
  const [selectedEsgId, setSelectedEsgId] = useState<string | null>(null);

  const [esgToDelete, setEsgToDelete] = useState<IEsgRecordDetail | null>(null);
  const [esgToRestore, setEsgToRestore] = useState<IEsgRecordDetail | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const handleScopeFilterChange = (val: string) => {
    setFilteredScope(val);
    if (filteredGhgCategory !== "all") {
      setFilteredGhgCategory("all");
      setIsGhgHighlighted(true);
    }
    if (filteredIsoCategory !== "all") {
      setFilteredIsoCategory("all");
      setIsIsoHighlighted(true);
    }
  };

  const handleGhgFilterChange = (val: string) => {
    if (val === "all") {
      setFilteredGhgCategory("all");
      if (filteredIsoCategory !== "all") {
        setFilteredIsoCategory("all");
        setIsIsoHighlighted(true);
      }
      if (filteredScope !== "all") {
        setFilteredScope("all");
        setIsScopeHighlighted(true);
      }
    } else {
      const ghgCat = val as GhgProtocolCategory;
      setFilteredGhgCategory(ghgCat);

      const newScope = GhgCategoryDetails[ghgCat].scope;
      if (filteredScope !== newScope) {
        setFilteredScope(newScope);
        setIsScopeHighlighted(true);
      }

      const newIso = GhgToIsoMapping[ghgCat];
      if (filteredIsoCategory !== newIso) {
        setFilteredIsoCategory(newIso);
        setIsIsoHighlighted(true);
      }
    }
  };

  const handleIsoFilterChange = (val: string) => {
    if (val === "all") {
      setFilteredIsoCategory("all");
      if (filteredGhgCategory !== "all") {
        setFilteredGhgCategory("all");
        setIsGhgHighlighted(true);
      }
      if (filteredScope !== "all") {
        setFilteredScope("all");
        setIsScopeHighlighted(true);
      }
    } else {
      const isoCat = val as Iso14064Category;
      setFilteredIsoCategory(isoCat);

      let newScope = EsgScope.SCOPE_3;
      if (isoCat === Iso14064Category.CATEGORY_1) {
        newScope = EsgScope.SCOPE_1;
      } else if (isoCat === Iso14064Category.CATEGORY_2) {
        newScope = EsgScope.SCOPE_2;
      }
      if (filteredScope !== newScope) {
        setFilteredScope(newScope);
        setIsScopeHighlighted(true);
      }

      const relatedGhg = IsoToGhgMapping[isoCat];
      const newGhg =
        relatedGhg && relatedGhg.length > 0 ? relatedGhg[0] : "all";
      if (filteredGhgCategory !== newGhg) {
        setFilteredGhgCategory(newGhg);
        setIsGhgHighlighted(true);
      }
    }
  };

  const searchParams = useSearchParams();
  const openId = searchParams?.get("openId");

  useEffect(() => {
    if (openId) {
      setSelectedEsgId(openId);
      setIsVerifyModalOpen(true);
    }
  }, [openId]);

  useEffect(() => {
    if (isScopeHighlighted) {
      const timer = setTimeout(() => setIsScopeHighlighted(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isScopeHighlighted]);

  useEffect(() => {
    if (isGhgHighlighted) {
      const timer = setTimeout(() => setIsGhgHighlighted(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isGhgHighlighted]);

  useEffect(() => {
    if (isIsoHighlighted) {
      const timer = setTimeout(() => setIsIsoHighlighted(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isIsoHighlighted]);

  const fetchRecords = useCallback(async () => {
    if (!accountBookId) return;
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (keyWord) queryParams.append("search", keyWord);
      if (verifyStatusFilter && verifyStatusFilter !== "all")
        queryParams.append("verifyStatus", verifyStatusFilter);
      if (filteredIntensity && filteredIntensity !== "all")
        queryParams.append("intensity", filteredIntensity);
      if (filteredScope && filteredScope !== "all")
        queryParams.append("scope", filteredScope);
      if (filteredGhgCategory && filteredGhgCategory !== "all")
        queryParams.append("ghgProtocolCategory", filteredGhgCategory);
      if (filteredIsoCategory && filteredIsoCategory !== "all")
        queryParams.append("isoCategory", filteredIsoCategory);
      if (year) queryParams.append("year", year.toString());
      if (month) queryParams.append("month", month.toString());
      if (hideDeleted) queryParams.append("hideDeleted", "true");
      queryParams.append("sort", sortOrder);
      queryParams.append("page", currentPage.toString());
      queryParams.append("pageSize", PAGE_SIZE.toString());

      const queryString = queryParams.toString()
        ? `?${queryParams.toString()}`
        : "";

      const res = await request<
        IApiResponse<{ esgRecords: IEsgRecordDetail[]; recordCount: number }>
      >(`/api/v1/user/account_book/${accountBookId}/esg${queryString}`);
      if (res.payload) {
        setRecords(res.payload.esgRecords);
        setRecordCount(res.payload.recordCount);
      }
    } catch (error) {
      console.error("Failed to fetch ESG records:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    accountBookId,
    keyWord,
    verifyStatusFilter,
    filteredIntensity,
    filteredScope,
    filteredGhgCategory,
    filteredIsoCategory,
    sortOrder,
    year,
    month,
    currentPage,
    hideDeleted,
  ]);

  // Info: (20260324 - Julian) Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setIsAllVerified(false);
  }, [
    keyWord,
    verifyStatusFilter,
    filteredIntensity,
    filteredScope,
    filteredGhgCategory,
    filteredIsoCategory,
    sortOrder,
    year,
    month,
    hideDeleted,
  ]);

  const totalPages = Math.ceil(recordCount / PAGE_SIZE) || 1;

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Info: (20260312 - Julian) 延遲 300ms 執行，避免過度請求
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchRecords]);

  // Info: (20260325 - Luphia) 抽取需要輪詢的 ID，避免頻繁觸發 Effect
  const pendingIds = records
    .filter(
      (r) =>
        r.analysisStatus === AIAnalysisStatus.PENDING ||
        r.analysisStatus === AIAnalysisStatus.PROCESSING,
    )
    .map((r) => r.id);
  const pendingIdsJoined = pendingIds.join(",");

  // Info: (20260320 - Julian) 只針對未完成的紀錄進行個別狀態更新，減輕 DB 負擔
  useEffect(() => {
    if (!pendingIdsJoined) return;

    let isCancelled = false;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      if (isCancelled) return;
      try {
        const ids = pendingIdsJoined.split(",");
        // Info: (20260325 - Luphia) 平行發送請求，取代 for...of 的阻塞
        const results = await Promise.all(
          ids.map((id) =>
            request<IApiResponse<{ esgRecord: IEsgRecordDetail }>>(
              `/api/v1/user/account_book/${accountBookId}/esg/${id}`,
            ),
          ),
        );

        const updatedRecords = results
          .map((res) => res.payload?.esgRecord)
          .filter(Boolean) as IEsgRecordDetail[];

        if (updatedRecords.length > 0 && !isCancelled) {
          setRecords((prev) => {
            const next = [...prev];
            updatedRecords.forEach((ur) => {
              const idx = next.findIndex((r) => r.id === ur.id);
              if (idx !== -1) next[idx] = ur;
            });
            return next;
          });
        }
      } catch (error) {
        console.error("Failed to update pending ESG records:", error);
      }

      // Info: (20260325 - Luphia) 當次請求全數完成後，才排程下一次的輪詢
      if (!isCancelled) {
        timeoutId = setTimeout(poll, 5000);
      }
    };

    timeoutId = setTimeout(poll, 5000);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [pendingIdsJoined, accountBookId]);

  const handleVerifyOpen = (record: IEsgRecordDetail) => {
    setSelectedEsgId(record.id);
    setIsVerifyModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    const record = records.find((r) => r.id === id);
    if (record) setEsgToDelete(record);
  };

  const handleRestoreClick = (id: string) => {
    const record = records.find((r) => r.id === id);
    if (record) setEsgToRestore(record);
  };

  const executeDelete = async () => {
    if (!esgToDelete) return;

    setIsDeleting(true);
    try {
      const data = await request<IApiResponse<null>>(
        `/api/v1/user/account_book/${accountBookId}/esg/${esgToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (data.code === ApiCode.SUCCESS) {
        setRecords((prev) => prev.filter((r) => r.id !== esgToDelete.id));
        setEsgToDelete(null);

        if (selectedEsgId === esgToDelete.id) {
          setIsVerifyModalOpen(false);
          setSelectedEsgId(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete ESG record:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const executeRestore = async () => {
    if (!esgToRestore) return;

    setIsRestoring(true);
    try {
      const data = await request<IApiResponse<null>>(
        `/api/v1/user/account_book/${accountBookId}/esg/${esgToRestore.id}/restore`,
        {
          method: "POST",
        },
      );

      if (data.code === ApiCode.SUCCESS) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === esgToRestore.id ? { ...r, isDeleted: false } : r,
          ),
        );
        setEsgToRestore(null);
      }
    } catch (error) {
      console.error("Failed to restore ESG record:", error);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleVerifySave = async () => {
    await fetchRecords();
    setIsVerifyModalOpen(false);
  };

  const verifyAllEsgRecords = async () => {
    if (!accountBookId) return;
    try {
      setIsLoading(true);
      const res = await request<IApiResponse<{ count: number }>>(
        `/api/v1/user/account_book/${accountBookId}/esg/verify_all`,
        { method: "PUT" },
      );

      // Info: (20260601 - Julian) 根據 API 回傳的 count，顯示對應的 message
      if (res.payload) {
        if (res.payload.count > 0) {
          setVerifySuccessMsg(
            t("common.verify_all_success_count", {
              count: res.payload.count,
            }) as string,
          );
        } else {
          setVerifySuccessMsg(t("common.verify_all_no_data") as string);
        }
        setIsVerifySuccessOpen(true);
        setIsAllVerified(true);
      }
      // Info: (20260325 - Luphia) 加入 await，且讓 fetchRecords 內部接管後續的 loading 狀態
      await fetchRecords();
    } catch (error) {
      console.error("Failed to verify all ESG records:", error);
      setIsLoading(false); // Info: (20260325 - Luphia) 只有失敗時在這裡關閉 loading
    } finally {
      setIsVerifyAllConfirmOpen(false);
    }
  };

  // Info: (20260325 - Luphia) 判斷是否有套用過濾條件
  const isFiltering =
    keyWord !== "" ||
    verifyStatusFilter !== "all" ||
    filteredIntensity !== "all" ||
    filteredScope !== "all";

  // Info: (20260325 - Luphia) 抽出清除條件的函式，方便後續擴充
  const handleClearFilters = () => {
    setKeyWord("");
    setVerifyStatusFilter("all");
    setFilteredIntensity("all");
    setFilteredScope("all");
  };

  const selectedEsgRecord = records.find((r) => r.id === selectedEsgId);

  return (
    <div className="flex flex-col gap-4">
      {/* Info: (20260312 - Julian) Toolbar */}
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:justify-start lg:gap-x-4">
        {/* Info: (20260618 - Julian) Search bar */}
        <div className="relative order-1 w-full lg:order-1 lg:max-w-none lg:flex-1">
          <Search
            size={20}
            className="absolute top-1/2 left-3.5 shrink-0 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder={t("esg_table.search_placeholder")}
            aria-label={t("esg_table.search_aria")}
            value={keyWord}
            onChange={(e) => setKeyWord(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pr-4 pl-10 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
        </div>
        {/* Info: (20260618 - Julian) 排序切換 */}
        <div className="order-7 w-[calc(50%-4px)] sm:w-auto lg:order-2 [&>button]:w-full [&>button]:justify-center sm:[&>button]:w-auto">
          <DateSortButton
            currentOrder={sortOrder}
            onOrderChange={(order) => setSortOrder(order)}
          />
        </div>

        {/* Info: (20260618 - Julian) 換行（桌機版） */}
        <div className="order-3 hidden h-0 w-full lg:block" />

        {/* Info: (20260618 - Julian) 驗證狀態篩選 */}
        <select
          aria-label="Filter by verify status"
          value={verifyStatusFilter}
          onChange={(e) =>
            setVerifyStatusFilter(e.target.value as VerifyStatus | "all")
          }
          className="order-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 focus:outline-none sm:w-[130px] lg:order-4 lg:px-4 lg:text-sm"
        >
          <option value="all">
            {t("verify.status.all", { type: t("verify.type.esg") })}
          </option>
          <option value={VerifyStatus.VERIFIED}>
            {t("verify.status.verified")}
          </option>
          <option value={VerifyStatus.UNVERIFIED}>
            {t("verify.status.unverified")}
          </option>
        </select>
        {/* Info: (20260618 - Julian) 碳排放強度篩選 */}
        <select
          aria-label={t("esg_table.filter_intensity_aria")}
          value={filteredIntensity}
          onChange={(e) => setFilteredIntensity(e.target.value)}
          className="order-3 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 focus:outline-none sm:w-[120px] lg:order-5 lg:px-4 lg:text-sm"
        >
          <option value="all">{t("esg_table.filter_intensity_all")}</option>
          <option value={EsgIntensity.HIGH}>
            {t("esg_table.intensity.high")}
          </option>
          <option value={EsgIntensity.MEDIUM}>
            {t("esg_table.intensity.medium")}
          </option>
          <option value={EsgIntensity.LOW}>
            {t("esg_table.intensity.low")}
          </option>
        </select>
        {/* Info: (20260428 - Julian) 一鍵核對按鈕 */}
        <button
          type="button"
          aria-label={t("common.verify_all")}
          onClick={() => setIsVerifyAllConfirmOpen(true)}
          disabled={isLoading || isAllVerified || records.length === 0}
          className="order-8 inline-flex w-[calc(50%-4px)] items-center justify-center rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-white shadow-sm enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto lg:order-10 lg:ml-auto"
        >
          {t("common.verify_all")}
        </button>
      </div>

      {/* Info: (20260618 - Julian) 排放分類篩選列 */}
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-start lg:gap-x-4">
        <span className="text-xs font-bold whitespace-nowrap text-slate-500 lg:border-r lg:border-slate-200 lg:py-1 lg:pr-4">
          {t("esg_table.filter_scope_title")}
        </span>
        {/* Info: (20260618 - Julian) 排放範圍篩選 */}
        <select
          aria-label={t("esg_table.filter_scope_title")}
          value={filteredScope}
          onChange={(e) => handleScopeFilterChange(e.target.value)}
          className={`w-full rounded-lg border bg-white px-2 py-2 text-xs font-bold text-slate-600 transition-all duration-300 focus:ring-2 focus:ring-orange-500 focus:outline-none sm:w-[180px] lg:px-4 lg:text-sm ${
            isScopeHighlighted
              ? "scale-[1.02] border-orange-400 ring-2 ring-orange-400"
              : "border-slate-300"
          }`}
        >
          <option value="all">{t("esg_table.filter_scope_all")}</option>
          <option value={EsgScope.SCOPE_1}>
            {t("esg_table.scope.scope_1")}
          </option>
          <option value={EsgScope.SCOPE_2}>
            {t("esg_table.scope.scope_2")}
          </option>
          <option value={EsgScope.SCOPE_3}>
            {t("esg_table.scope.scope_3")}
          </option>
        </select>

        {/* Info: (20260618 - Julian) GHG 類別篩選 */}
        <select
          aria-label="Filter by GHG category"
          value={filteredGhgCategory}
          onChange={(e) => handleGhgFilterChange(e.target.value)}
          className="order-5 w-full truncate rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 focus:outline-none sm:w-[240px] lg:order-8 lg:px-4 lg:text-sm"
        >
          <option value="all">
            {filteredScope === EsgScope.SCOPE_1 ||
            filteredScope === EsgScope.SCOPE_2 ||
            filteredIsoCategory === Iso14064Category.CATEGORY_6
              ? `${t("esg_verify.form.ghg_category")}：${t("esg_verify.form.none") || "無"}`
              : t("esg_table.filter_ghg_all")}
          </option>
          {Object.values(GhgProtocolCategory)
            .filter(
              (cat) =>
                cat !== GhgProtocolCategory.SCOPE_1_DIRECT &&
                cat !== GhgProtocolCategory.SCOPE_2_INDIRECT,
            )
            .map((cat) => {
              const detail = GhgCategoryDetails[cat];
              return (
                <option key={cat} value={cat}>
                  {detail.categoryNumber
                    ? `Category ${detail.categoryNumber}: `
                    : ""}
                  {detail.nameZh} ({detail.nameEn})
                </option>
              );
            })}
        </select>

        {/* Info: (20260618 - Julian) ISO 類別篩選 */}
        <select
          aria-label="Filter by ISO category"
          value={filteredIsoCategory}
          onChange={(e) => handleIsoFilterChange(e.target.value)}
          className="order-6 w-full truncate rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-500 focus:outline-none sm:w-[220px] lg:order-9 lg:px-4 lg:text-sm"
        >
          <option value="all">{t("esg_table.filter_iso_all")}</option>
          {Object.values(Iso14064Category).map((cat) => {
            const detail = IsoCategoryDetails[cat];
            return (
              <option key={cat} value={cat}>
                {language.startsWith("zh") ? detail.nameZh : detail.nameEn}
              </option>
            );
          })}
        </select>
      </div>

      {/* Info: (20260401 - Julian) Table */}
      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:overflow-x-auto">
        {/* Info: (20260324 - Julian) 隱藏已刪除紀錄 toggle */}
        <div className="flex flex-col gap-2 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between lg:px-6">
          <div className="flex cursor-pointer items-center gap-3">
            <button
              type="button"
              id="hideDeletedToggle"
              aria-label="Toggle hide deleted records"
              onClick={(e) => {
                e.preventDefault();
                setHideDeleted(!hideDeleted);
              }}
              className={`relative h-6 w-11 rounded-full transition-colors ${hideDeleted ? "bg-orange-500" : "bg-slate-200"}`}
            >
              <div
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${hideDeleted ? "translate-x-5.5" : "translate-x-0.5"}`}
              />
            </button>
            <label
              htmlFor="hideDeletedToggle"
              className="cursor-pointer text-sm font-bold text-slate-600"
            >
              {t("voucher.main_view.filters.hide_deleted")}
            </label>
          </div>
        </div>

        {/* Info: (20260312 - Julian) Table */}
        <div className="border-t border-slate-200">
          <table className="w-full border-collapse text-left md:min-w-[800px]">
            <thead className="hidden md:table-header-group">
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.voucher")}
                </th>
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.date")}
                </th>
                <th className="p-2 text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.activity_target")}
                </th>
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.raw_data")}
                </th>
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.emissions")}
                </th>
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.intensity_label")}
                </th>
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("esg_table.header.status")} /{" "}
                  {t("esg_table.header.ai_confidence")}
                </th>
                <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-2 text-center text-sm font-bold text-slate-500 lg:px-6 lg:py-4"
                  >
                    {t("esg_table.loading")}
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((record) => (
                  <EsgRow
                    key={record.id}
                    record={record}
                    onVerifyClick={handleVerifyOpen}
                    onDelete={handleDeleteClick}
                    onRestore={handleRestoreClick}
                  />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="bg-white p-8 text-center lg:px-6 lg:py-16"
                  >
                    {/* Info: (20260325 - Luphia) 區分真的沒資料 vs 搜尋不到資料 */}
                    {isFiltering ? (
                      <div className="flex flex-col items-center justify-center">
                        <Search size={40} className="mb-4 text-slate-300" />
                        <h3 className="mb-2 text-lg font-medium text-slate-900">
                          {t("esg_table.no_filter_results")}
                        </h3>
                        <p className="mb-6 max-w-sm text-center text-slate-500">
                          {t("esg_table.no_filter_results_desc")}
                        </p>
                        <button
                          onClick={handleClearFilters}
                          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-200"
                        >
                          {t("common.clear_filters")}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <FileStack size={40} className="mb-4 text-slate-300" />
                        <h3 className="mb-2 text-lg font-medium text-slate-900">
                          {t("esg_table.no_records")}
                        </h3>
                        <p className="mb-6 max-w-sm text-center text-slate-500">
                          {t("esg_table.no_records_desc")}
                        </p>
                        <Link
                          href={`/user/account_book/${accountBookId}/journal`}
                          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600"
                        >
                          {t("esg_table.no_records_cta")}
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info: (20260312 - Julian) Footer */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/50 px-4 py-3 lg:flex-row">
          <span className="text-xs font-bold text-slate-500">
            {t("esg_table.footer.record_count", { count: recordCount })}
          </span>
          <span className="flex items-center text-xs font-bold text-slate-500">
            <Info className="mr-1 size-3.5" />
            {t("esg_table.footer.data_citation")}
          </span>
        </div>
      </div>

      {/* Info: (20260324 - Julian) Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Info: (20260324 - Julian) Modal */}
      <RecordTabModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        defaultTab="esg"
        journalId={selectedEsgRecord?.journalId}
        voucherId={selectedEsgRecord?.voucherId}
        esgId={selectedEsgId}
        file={selectedEsgRecord?.file}
        onEsgUpdate={handleVerifySave}
        onDelete={() => {
          if (selectedEsgRecord) setEsgToDelete(selectedEsgRecord);
        }}
        onRestore={() => {
          if (selectedEsgRecord) setEsgToRestore(selectedEsgRecord);
        }}
        isDeleted={selectedEsgRecord?.isDeleted}
      />
      <ConfirmModal
        isOpen={isVerifyAllConfirmOpen}
        onClose={() => setIsVerifyAllConfirmOpen(false)}
        title={t("common.verify_all_confirm_title")}
        message={t("common.verify_all_confirm_desc")}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={verifyAllEsgRecords}
      />
      <ConfirmModal
        isOpen={!!esgToDelete}
        onClose={() => setEsgToDelete(null)}
        title={t("ocr.confirm_delete_title") as string}
        message={t("ocr.confirm_delete_msg") as string}
        confirmText={
          isDeleting
            ? (t("ocr.please_wait") as string)
            : (t("ocr.delete") as string)
        }
        cancelText={t("common.cancel") as string}
        onConfirm={executeDelete}
      />
      <ConfirmModal
        isOpen={!!esgToRestore}
        onClose={() => setEsgToRestore(null)}
        title={t("common.restore") as string}
        message={t("common.restore_confirm_desc") as string}
        confirmText={
          isRestoring
            ? (t("ocr.please_wait") as string)
            : (t("common.restore") as string)
        }
        cancelText={t("common.cancel") as string}
        onConfirm={executeRestore}
      />
      <SuccessNotification
        show={isVerifySuccessOpen}
        title={t("common.notification") as string}
        message={verifySuccessMsg}
        onClose={() => setIsVerifySuccessOpen(false)}
      />
    </div>
  );
}
