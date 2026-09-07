"use client";

import { useCallback, useState } from "react";
import { request, IEnvelopeLike } from "@/lib/utils/request";
import { salaryRecordItemApi } from "@/constants/salary_calculator_api";
import { ISalaryRecordDetail } from "@/interfaces/salary_record";

/**
 * Info: (20260904 - Julian) 按需求取一筆薪資紀錄的完整快照。
 *
 * ## 為什麼不讓清單一起帶回來
 *
 * 「已寄出」分頁一次列 50 列，而 `resultSnapshot` 是一整份薪資明細。
 * 讓清單帶著它等於**把整本帳每一位員工的完整薪資結構送進瀏覽器**，
 * 只為了畫一張「期間／收件人／寄出日」的表格 —— 而使用者一次只點開一列。
 *
 * 多一次請求，換掉一整份不該離開伺服器的資料。這也是為什麼
 * `ISalaryPaySlipDeliveryListItem` 沒有 `result` 欄位。
 */
export function useSalaryRecordDetail(accountBookId: string) {
  const [record, setRecord] = useState<ISalaryRecordDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const load = useCallback(
    async (recordId: string): Promise<ISalaryRecordDetail | null> => {
      setIsLoading(true);
      setHasError(false);
      try {
        const response = await request<IEnvelopeLike<ISalaryRecordDetail>>(
          salaryRecordItemApi(accountBookId, recordId),
        );
        const detail = response.payload ?? null;
        setRecord(detail);
        return detail;
      } catch {
        // Info: (20260904 - Julian) 401 已由 request 集中通報，這裡只需要讓畫面知道抓不到
        setHasError(true);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [accountBookId],
  );

  const clear = useCallback(() => {
    setRecord(null);
    setHasError(false);
  }, []);

  return { record, isLoading, hasError, load, clear };
}
