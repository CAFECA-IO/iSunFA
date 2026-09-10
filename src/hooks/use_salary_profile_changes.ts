"use client";

import { useCallback, useEffect, useState } from "react";
import { request, IEnvelopeLike } from "@/lib/utils/request";
import { salaryEmployeeHistoryApi } from "@/constants/salary_calculator_api";
import {
  ISalaryProfileChange,
  ISalaryProfileChangePageResult,
} from "@/interfaces/salary_record";

const PAGE_SIZE = 50;

/**
 * Info: (20260908 - Julian) 某位員工的調薪歷程。
 *
 * 計劃書：`documents/architecture/salary_profile_change_history_plan.md` §6
 *
 * ## 為什麼是「載入更多」而不是翻頁
 *
 * 這份清單的讀法是**從新往舊掃過去**（「上次調薪是什麼時候」「這三年動過幾次」），
 * 而翻頁會把那個動作切斷：第 2 頁看不到第 1 頁，比對得靠記憶。
 * 累加載入讓整條時間軸留在畫面上，而且它天然對應資料的形狀 ——
 * 新的在前、越往下越舊。
 *
 * ## 為什麼保留分頁而不是一次全撈
 *
 * 一位員工幾年下來是數十列，一次撈完不會痛。但「不會痛」是今天的話 ——
 * 一個從 2026 用到 2036 的帳本、一位月月調整投保級距的員工，
 * 那是幾百列，而每一列帶兩份完整快照。上限留著，需要的人自己按。
 */
export function useSalaryProfileChanges(
  accountBookId: string | null,
  employeeId: string | null,
  fields: string[],
) {
  const [changes, setChanges] = useState<ISalaryProfileChange[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [recordedSince, setRecordedSince] = useState<number | null>(null);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  /**
   * Info: (20260908 - Julian) `fields` 進 query 前先排序並接成字串。
   *
   * 它是 `useEffect` 的依賴，而陣列每次 render 都是新的參考 ——
   * 直接放進依賴陣列會讓這支 hook 每一輪都重抓。
   * 排序是為了讓「勾選順序不同、內容相同」不算變化。
   */
  const fieldsKey = [...fields].sort().join(",");

  const load = useCallback(
    async (targetPage: number) => {
      if (accountBookId === null || employeeId === null) return;

      setIsLoading(true);
      setHasError(false);
      try {
        const response = await request<
          IEnvelopeLike<ISalaryProfileChangePageResult>
        >(salaryEmployeeHistoryApi(accountBookId, employeeId), {
          query: {
            page: targetPage,
            pageSize: PAGE_SIZE,
            ...(fieldsKey === "" ? {} : { fields: fieldsKey }),
          },
        });

        const payload = response.payload;
        if (!payload) {
          setHasError(true);
          return;
        }

        /**
         * Info: (20260908 - Julian) 第一頁**取代**，之後的頁**累加**。
         *
         * 分開處理而不是一律累加：換篩選條件時會回到第 1 頁，
         * 而那時候舊的列必須消失 —— 一律累加的話，篩選會變成
         * 「把符合的列加進來」，畫面上同時存在兩組條件的結果。
         */
        setChanges((previous) =>
          targetPage === 1 ? payload.data : [...previous, ...payload.data],
        );
        setTotalCount(payload.totalCount);
        setRecordedSince(payload.recordedSince);
        setPage(targetPage);
      } catch {
        // Info: (20260908 - Julian) 401 已由 request 集中通報，這裡只讓畫面知道抓不到
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [accountBookId, employeeId, fieldsKey],
  );

  // Info: (20260908 - Julian) 員工或篩選條件一變就回到第 1 頁重抓
  useEffect(() => {
    load(1);
  }, [load]);

  const loadMore = useCallback(() => load(page + 1), [load, page]);

  return {
    changes,
    totalCount,
    recordedSince,
    isLoading,
    hasError,
    hasMore: changes.length < totalCount,
    loadMore,
  };
}
