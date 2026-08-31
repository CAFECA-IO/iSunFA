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
 * 員工列表頁與計算機裡的「選員工」彈窗共用這一支 —— 兩邊要看到同一份名單，
 * 而各自寫一次 fetch 的結果是其中一邊忘了在新增之後重抓。
 *
 * 沒有分頁：這份名單是「這本帳要算薪水的人」，數十人的量級，
 * 一次取回再前端過濾比翻頁好用（計劃書 §8.5）。
 */
export function useSalaryEmployees(accountBookId: string) {
  const [employees, setEmployees] = useState<ISalaryCalculatorEmployee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  /**
   * Info: (20260831 - Julian) 回傳最新名單，而不只是寫進 state。
   *
   * 「新增員工之後立刻要用它的 id」的呼叫端（計算機的直接儲存）需要同步拿到結果 ——
   * 等 state 更新再讀是一輪 render 之後的事，那時候儲存已經送出去了。
   */
  const reload = useCallback(async (): Promise<ISalaryCalculatorEmployee[]> => {
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

  const createEmployee = useCallback(
    async (input: ISalaryCalculatorEmployeeWriteInput) => {
      await request(salaryCalculatorApiOf(accountBookId).EMPLOYEE, {
        method: "POST",
        body: JSON.stringify(input),
      });
      await reload();
    },
    [accountBookId, reload],
  );

  const updateEmployee = useCallback(
    async (employeeId: string, input: ISalaryCalculatorEmployeeWriteInput) => {
      await request(salaryEmployeeItemApi(accountBookId, employeeId), {
        method: "PUT",
        body: JSON.stringify(input),
      });
      await reload();
    },
    [accountBookId, reload],
  );

  const removeEmployee = useCallback(
    async (employeeId: string) => {
      await request(salaryEmployeeItemApi(accountBookId, employeeId), {
        method: "DELETE",
      });
      await reload();
    },
    [accountBookId, reload],
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
