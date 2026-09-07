"use client";

import { useCallback, useState } from "react";
import { request, IEnvelopeLike } from "@/lib/utils/request";
import {
  salaryCalculatorApiOf,
  salaryRecordItemApi,
} from "@/constants/salary_calculator_api";
import { SALARY_CALCULATOR_VERSION } from "@/constants/salary_calculator";
import {
  ISalaryCalculatorOptions,
  ISalaryCalculatorUI,
} from "@/interfaces/salary_calculator";
import {
  ISalaryRecordDetail,
  ISalaryRecordPageResult,
  ISalaryRecordSummary,
} from "@/interfaces/salary_record";

interface ISaveArgs {
  employeeId: string;
  year: number;
  month: number;
  input: ISalaryCalculatorOptions;
  result: ISalaryCalculatorUI;
}

/**
 * Info: (20260831 - Julian) 計算機頁的「直接儲存」。
 *
 * 流程刻意做成「先探再存」而不是「存了再說」：
 * `(帳本, 員工, 年, 月)` 是唯一鍵，重存即覆寫（計劃書 D3），
 * 而薪資單是對外憑據 —— 使用者不該在按下去之後才發現上個月的紀錄被蓋掉。
 */
export function useSalaryRecordSave(accountBookId: string) {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedRecord, setSavedRecord] = useState<ISalaryRecordDetail | null>(
    null,
  );
  const [hasError, setHasError] = useState<boolean>(false);

  // Info: (20260831 - Julian) 這個員工這個年月已經有的那一筆；null = 還沒有
  const findExisting = useCallback(
    async ({
      employeeId,
      year,
      month,
    }: Pick<
      ISaveArgs,
      "employeeId" | "year" | "month"
    >): Promise<ISalaryRecordSummary | null> => {
      const response = await request<IEnvelopeLike<ISalaryRecordPageResult>>(
        salaryCalculatorApiOf(accountBookId).RECORD,
        { query: { employeeId, year, month, page: 1, pageSize: 1 } },
      );

      return response.payload?.data[0] ?? null;
    },
    [accountBookId],
  );

  const save = useCallback(
    async ({ employeeId, year, month, input, result }: ISaveArgs) => {
      setIsSaving(true);
      setHasError(false);
      try {
        const response = await request<IEnvelopeLike<ISalaryRecordDetail>>(
          salaryCalculatorApiOf(accountBookId).RECORD,
          {
            method: "POST",
            body: JSON.stringify({
              employeeId,
              year,
              month,
              input,
              result,
              calculatorVersion: SALARY_CALCULATOR_VERSION,
            }),
          },
        );
        setSavedRecord(response.payload);
      } catch {
        setHasError(true);
      } finally {
        setIsSaving(false);
      }
    },
    [accountBookId],
  );

  // Info: (20260831 - Julian) 改了任何數字之後，上一次的「已儲存」提示就過期了
  const clearSaved = useCallback(() => {
    setSavedRecord(null);
    setHasError(false);
  }, []);

  return {
    isSaving,
    savedRecord,
    hasError,
    findExisting,
    save,
    clearSaved,
    recordUrlOf: (recordId: string) =>
      salaryRecordItemApi(accountBookId, recordId),
  };
}
