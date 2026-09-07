"use client";

import { useCallback, useEffect, useState } from "react";
import { request, IEnvelopeLike } from "@/lib/utils/request";
import {
  salaryCalculatorApiOf,
  salaryEmployeeItemApi,
} from "@/constants/salary_calculator_api";
import {
  ISalaryCalculatorEmployee,
  ISalaryCalculatorEmployeeWriteInput,
} from "@/interfaces/salary_record";

/**
 * Info: (20260831 - Julian) 帳本底下的薪資計算機員工名單。
 *
 * 三個呼叫端（計算機結果區、選員工彈窗、薪資紀錄頁）各自持有一個實例，
 * 共用的是這段程式碼而不是同一份 state —— 抽出來的理由是
 * 「新增之後要重抓」這類規則只寫一次，不是讓三邊看到同一瞬間的名單。
 *
 * 沒有分頁：這份名單是「這本帳要算薪水的人」，數十人的量級，
 * 一次取回再前端過濾比翻頁好用（計劃書 §8.5）。
 *
 * ## `accountBookId` 為什麼收 `null`
 *
 * 公開版計算機（`/salary_calculator`）沒有帳本，而下面那支 mount effect 是無條件的。
 * 若傳空字串進來，匿名訪客一打開頁面就會送出
 * `GET /api/v1/user/account_book//salary_calculator/employee`（帶 `Bearer null`）。
 * 今天它回 404 而不是 401 所以無害 —— 但那是巧合：只要日後多一層
 * `/api/v1/user/**` middleware，或反向代理先把 `//` 併掉，它就會回 401，
 * 而 `request.ts` 接到 401 會 `notifyUnauthorized()` —— 已登入的人一打開公開頁就被登出。
 * 收 `null` 並在 `null` 時不發請求，把這件事從「目前剛好沒事」變成「不會發生」。
 */
export function useSalaryEmployees(accountBookId: string | null) {
  const [employees, setEmployees] = useState<ISalaryCalculatorEmployee[]>([]);
  // Info: (20260901 - Julian) 沒有帳本就不會發請求，一開始就不算「載入中」
  const [isLoading, setIsLoading] = useState<boolean>(accountBookId !== null);
  const [hasError, setHasError] = useState<boolean>(false);

  /**
   * Info: (20260831 - Julian) 回傳最新名單，而不只是寫進 state。
   *
   * 「新增員工之後立刻要用它的 id」的呼叫端（計算機的直接儲存）需要同步拿到結果 ——
   * 等 state 更新再讀是一輪 render 之後的事，那時候儲存已經送出去了。
   */
  const reload = useCallback(async (): Promise<ISalaryCalculatorEmployee[]> => {
    // Info: (20260901 - Julian) 公開版沒有帳本 —— 不送請求，也不動 state
    if (accountBookId === null) return [];

    setIsLoading(true);
    setHasError(false);
    try {
      const response = await request<
        IEnvelopeLike<ISalaryCalculatorEmployee[]>
      >(salaryCalculatorApiOf(accountBookId).EMPLOYEE);
      const list = response.payload ?? [];
      setEmployees(list);
      return list;
    } catch {
      // Info: (20260831 - Julian) 401 已由 request 集中通報，這裡只需要讓畫面知道抓不到
      setHasError(true);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [accountBookId]);

  useEffect(() => {
    reload();
  }, [reload]);

  /**
   * Info: (20260901 - Julian) 寫入路徑上的帳本 id 必須存在。
   *
   * 公開版沒有任何員工寫入入口，所以走到這裡代表呼叫端傳錯了 ——
   * 靜靜地什麼都不做會變成「按了新增卻沒反應」，比丟例外更難查。
   */
  const requireBook = useCallback((): string => {
    if (accountBookId === null) {
      throw new Error("useSalaryEmployees: 沒有帳本時不能寫入員工資料");
    }
    return accountBookId;
  }, [accountBookId]);

  const createEmployee = useCallback(
    async (input: ISalaryCalculatorEmployeeWriteInput) => {
      await request(salaryCalculatorApiOf(requireBook()).EMPLOYEE, {
        method: "POST",
        body: JSON.stringify(input),
      });
      await reload();
    },
    [requireBook, reload],
  );

  const updateEmployee = useCallback(
    async (employeeId: string, input: ISalaryCalculatorEmployeeWriteInput) => {
      await request(salaryEmployeeItemApi(requireBook(), employeeId), {
        method: "PUT",
        body: JSON.stringify(input),
      });
      await reload();
    },
    [requireBook, reload],
  );

  const removeEmployee = useCallback(
    async (employeeId: string) => {
      await request(salaryEmployeeItemApi(requireBook(), employeeId), {
        method: "DELETE",
      });
      await reload();
    },
    [requireBook, reload],
  );

  return {
    employees,
    isLoading,
    hasError,
    reload,
    createEmployee,
    updateEmployee,
    removeEmployee,
  };
}
