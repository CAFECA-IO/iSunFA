"use client";

import { useCallback, useEffect, useState } from "react";
import { request, IEnvelopeLike, ApiError } from "@/lib/utils/request";
import {
  salaryCalculatorApiOf,
  salaryRecordDeliverApi,
} from "@/constants/salary_calculator_api";
import {
  ISalaryPaySlipDelivery,
  ISalaryPaySlipDeliveryListItem,
} from "@/interfaces/salary_pay_slip_delivery";
import { SALARY_DELIVERY_STATUS } from "@/constants/salary_delivery";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260904 - Julian) 薪資單寄送。
 *
 * ## 為什麼 body 是空的
 *
 * 收件人、金額、期間全部由伺服器從 `recordId` 推導（計畫書 D3）。
 * 前端連「寄到哪」都送不出去 —— 允許當場改收件信箱的話，薪資單可以被寄到
 * 任意地址，而改掉的那一次不會留在員工檔上，事後查不出當初寄去哪。
 *
 * ## 錯誤為什麼分成三類而不是一句「寄送失敗」
 *
 * 三種失敗的**處置完全不同**：沒有信箱要去改員工資料、SMTP 未設定要找管理員、
 * 缺中文字型只有維運裝得了字型。全部收斂成「寄送失敗，請稍後再試」，
 * 前兩種的使用者會一直重試一件永遠不會成功的事。
 */

export type SalaryDeliveryFailureKind =
  | "no-email"
  | "not-configured"
  | "font-missing"
  | "generic";

/**
 * Info: (20260904 - Julian) 錯誤代碼在 `data.errorCode`，不是 `ApiError.code`。
 *
 * `request.ts` 的 `ApiError` 只有 `status` 與 `data` 兩個欄位，代碼在信封裡 ——
 * 讀 `error.code` 會拿到 `undefined` 而靜靜落到 `generic`，
 * 也就是三種各有不同處置的失敗全部變成同一句「請稍後再試」。
 * 取法與 `salary_result_section.tsx` 判 409 的那一段相同。
 */
const errorCodeOf = (error: unknown): string | undefined =>
  error instanceof ApiError
    ? (error.data as { errorCode?: string } | null)?.errorCode
    : undefined;

/**
 * Info: (20260904 - Julian) 匯出給 `salary_delivery_ui_contract.test.ts`。
 *
 * 這段分類**只有在真的送出請求時才會執行**，而本專案的測試不 render React，
 * 也不打真的 API —— 留在模組內私有的話，它唯一的驗證方式是手動點過三種失敗，
 * 而其中兩種（SMTP 未設定、缺中文字型）在開發機上根本製造不出來。
 */
export const failureKindOf = (error: unknown): SalaryDeliveryFailureKind => {
  switch (errorCodeOf(error)) {
    case API_ERRORS.VA_SALARY_EMPLOYEE_NO_EMAIL.code:
      return "no-email";
    case API_ERRORS.TW_MAIL_NOT_CONFIGURED.code:
      return "not-configured";
    case API_ERRORS.IS_PDF_FONT_UNAVAILABLE.code:
      return "font-missing";
    default:
      return "generic";
  }
};

/**
 * Info: (20260904 - Julian) 錯誤代碼 → i18n key。
 *
 * 寫成一張表而不是在元件裡 `if/else`：`i18n_keys.test.ts` 掃的是字面字串，
 * 而樣板字串要另外登記進 `DYNAMIC_KEY_EXPANSIONS`。四個固定的 key 直接寫出來，
 * 掃描器看得懂，翻譯漏一個也會被抓到。
 */
export const DELIVERY_FAILURE_I18N_KEY: Record<
  SalaryDeliveryFailureKind,
  string
> = {
  "no-email": "calculator.sending_pay_slip_modal.error_no_email",
  "not-configured": "calculator.sending_pay_slip_modal.error_not_configured",
  "font-missing": "calculator.sending_pay_slip_modal.error_font_missing",
  generic: "calculator.sending_pay_slip_modal.error_generic",
};

export function useSalaryPaySlipDelivery(accountBookId: string | null) {
  const [isSending, setIsSending] = useState<boolean>(false);
  const [failure, setFailure] = useState<SalaryDeliveryFailureKind | null>(
    null,
  );
  const [sent, setSent] = useState<ISalaryPaySlipDelivery | null>(null);

  const reset = useCallback(() => {
    setFailure(null);
    setSent(null);
  }, []);

  /**
   * Info: (20260904 - Julian) 回傳成敗而不只是寫進 state。
   *
   * 呼叫端（彈窗）要在同一個 tick 決定「關掉自己」還是「留著顯示錯誤」，
   * 而 state 要等下一輪 render 才讀得到（同 `useSalaryEmployees.reload` 的理由）。
   */
  const deliver = useCallback(
    async (recordId: string): Promise<ISalaryPaySlipDelivery | null> => {
      if (accountBookId === null) return null;

      setIsSending(true);
      setFailure(null);
      try {
        const response = await request<IEnvelopeLike<ISalaryPaySlipDelivery>>(
          salaryRecordDeliverApi(accountBookId, recordId),
          { method: "POST" },
        );
        const delivery = response.payload ?? null;
        setSent(delivery);
        return delivery;
      } catch (error) {
        setFailure(failureKindOf(error));
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [accountBookId],
  );

  return { isSending, failure, sent, deliver, reset };
}

/**
 * Info: (20260904 - Julian) 某一筆薪資紀錄的寄送歷史。
 *
 * ## 為什麼要問伺服器，不由呼叫端自己記
 *
 * 預覽彈窗要在打開的當下決定按鈕寫「寄出」還是「重新寄送」。
 * 「這一筆寄過沒有」是一個只有伺服器答得出來的問題 —— 同事可能十分鐘前
 * 才剛寄過，而這個瀏覽器上的清單是更早以前抓的。
 *
 * `recordId` 為 `null` 時不發請求（同 `accountBookId` 的處置）：
 * 彈窗在沒有紀錄可指的情況下也會被掛起來（「我收到的薪資單」分頁）。
 */
export function useSalaryRecordDeliveries(
  accountBookId: string | null,
  recordId: string | null,
) {
  const [deliveries, setDeliveries] = useState<ISalaryPaySlipDelivery[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(
    accountBookId !== null && recordId !== null,
  );

  const reload = useCallback(async (): Promise<void> => {
    if (accountBookId === null || recordId === null) return;

    setIsLoading(true);
    try {
      const response = await request<IEnvelopeLike<ISalaryPaySlipDelivery[]>>(
        salaryRecordDeliverApi(accountBookId, recordId),
      );
      setDeliveries(response.payload ?? []);
    } catch {
      /**
       * Info: (20260904 - Julian) 抓不到就當作「沒寄過」。
       *
       * 這一段的用途是決定按鈕的字，不是決定能不能寄 —— 猜錯的代價是
       * 使用者看到「寄出」而其實寄過了，而重寄本來就是合法的（計畫書 §2.3）。
       * 為此在彈窗上多一塊錯誤區塊，代價比收益大。
       */
      setDeliveries([]);
    } finally {
      setIsLoading(false);
    }
  }, [accountBookId, recordId]);

  useEffect(() => {
    reload();
  }, [reload]);

  /**
   * Info: (20260904 - Julian) 最近一次**成功**的寄送。
   *
   * 清單是新的在前，所以第一筆 SENT 就是最近一次。
   * 失敗的列不算「寄過」—— 對方沒有收到任何東西，按鈕該寫「寄出」。
   */
  const lastSent =
    deliveries.find(
      (delivery) => delivery.status === SALARY_DELIVERY_STATUS.SENT,
    ) ?? null;

  return { deliveries, lastSent, isLoading, reload };
}

/**
 * Info: (20260904 - Julian) 「已寄出」分頁的資料。
 *
 * 只回中繼資料 —— 點開某一列時由彈窗自己去取那一筆的薪資單快照。
 * 詳見 `ISalaryPaySlipDeliveryListItem` 的說明。
 */
export function useSalaryPaySlipDeliveries(accountBookId: string | null) {
  const [deliveries, setDeliveries] = useState<
    ISalaryPaySlipDeliveryListItem[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(accountBookId !== null);
  const [hasError, setHasError] = useState<boolean>(false);

  const reload = useCallback(async (): Promise<void> => {
    // Info: (20260904 - Julian) 沒有帳本就不送請求（同 `useSalaryEmployees` 的理由）
    if (accountBookId === null) return;

    setIsLoading(true);
    setHasError(false);
    try {
      const response = await request<
        IEnvelopeLike<ISalaryPaySlipDeliveryListItem[]>
      >(salaryCalculatorApiOf(accountBookId).DELIVERY);
      setDeliveries(response.payload ?? []);
    } catch {
      // Info: (20260904 - Julian) 401 已由 request 集中通報，這裡只需要讓畫面知道抓不到
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [accountBookId]);

  useEffect(() => {
    reload();
  }, [reload]);

  /**
   * Info: (20260904 - Julian) 只顯示寄成功的。
   *
   * 失敗的列存在是為了稽核與診斷（計畫書 §2.1），不是為了給使用者看 ——
   * 「我寄出的薪資單」這張表若混進沒寄成功的，使用者會以為對方收到了。
   * 要看失敗紀錄是另一個畫面的題目。
   */
  const sentDeliveries = deliveries.filter(
    (delivery) => delivery.status === SALARY_DELIVERY_STATUS.SENT,
  );

  return { deliveries, sentDeliveries, isLoading, hasError, reload };
}
