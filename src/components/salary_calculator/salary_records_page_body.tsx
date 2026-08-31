"use client";

import { FC, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, RotateCcw, Trash } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request, IEnvelopeLike } from "@/lib/utils/request";
import { numberWithCommas } from "@/lib/utils/common";
import {
  salaryCalculatorApiOf,
  salaryRecordItemApi,
} from "@/constants/salary_calculator_api";
import { salaryCalculatorUrlOf } from "@/constants/url";
import {
  ISalaryRecordDetail,
  ISalaryRecordPageResult,
  ISalaryRecordSummary,
} from "@/interfaces/salary_record";
import { MONTHS } from "@/constants/month";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import { useSalaryEmployees } from "@/hooks/use_salary_employees";
import SalaryCalculatorShell from "@/components/salary_calculator/salary_calculator_shell";
import ViewPaySlipModal from "@/components/salary_calculator/view_pay_slip_modal";

const cellStyle =
  "table-cell align-middle border-b border-stroke-neutral-quaternary px-[24px] py-[12px]";
const headerStyle = `${cellStyle} text-text-neutral-primary font-semibold`;
const iconBtnStyle =
  "flex h-[32px] w-[32px] items-center justify-center rounded-md transition-colors hover:bg-surface-hover";

const PAGE_SIZE = 20;

interface ISalaryRecordsPageBodyProps {
  accountBookId: string;
}

const SalaryRecordsPageBody: FC<ISalaryRecordsPageBodyProps> = ({
  accountBookId,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { loadFromSnapshot, linkEmployee } = useCalculatorCtx();
  const { employees } = useSalaryEmployees(accountBookId);

  const [page, setPage] = useState<number>(1);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [result, setResult] = useState<ISalaryRecordPageResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [viewing, setViewing] = useState<ISalaryRecordDetail | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const response = await request<IEnvelopeLike<ISalaryRecordPageResult>>(
        salaryCalculatorApiOf(accountBookId).RECORD,
        {
          query: {
            page,
            pageSize: PAGE_SIZE,
            // Info: (20260831 - Julian) 空字串代表「全部」，不送這個條件
            employeeId: employeeId === "" ? undefined : employeeId,
            year: year === "" ? undefined : year,
          },
        },
      );
      setResult(response.payload);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [accountBookId, page, employeeId, year]);

  useEffect(() => {
    reload();
  }, [reload]);

  const fetchDetail = async (
    recordId: string,
  ): Promise<ISalaryRecordDetail | null> => {
    const response = await request<IEnvelopeLike<ISalaryRecordDetail>>(
      salaryRecordItemApi(accountBookId, recordId),
    );
    return response.payload;
  };

  const viewHandler = async (record: ISalaryRecordSummary) => {
    const detail = await fetchDetail(record.id);
    if (detail) setViewing(detail);
  };

  /**
   * Info: (20260831 - Julian) 載回計算機。
   *
   * 除了灌輸入快照，也把員工重新連結起來 —— 否則載回來之後按儲存會被當成
   * 「未連結」而多問一次，而這筆紀錄本來就知道自己屬於誰。
   */
  const loadBackHandler = async (record: ISalaryRecordSummary) => {
    const detail = await fetchDetail(record.id);
    if (!detail) return;

    loadFromSnapshot(detail.input);

    const employee = employees.find((item) => item.id === detail.employee.id);
    if (employee) linkEmployee(employee);

    router.push(salaryCalculatorUrlOf(accountBookId).CALCULATOR);
  };

  const deleteHandler = async (record: ISalaryRecordSummary) => {
    await request(salaryRecordItemApi(accountBookId, record.id), {
      method: "DELETE",
    });
    await reload();
  };

  const changeFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    // Info: (20260831 - Julian) 換條件就回第一頁，否則會停在一個不存在的頁碼上
    setPage(1);
  };

  const years = Array.from(
    new Set((result?.data ?? []).map((record) => record.year)),
  ).sort((a, b) => b - a);

  const rows = (result?.data ?? []).map((record) => (
    <div key={record.id} className="table-row">
      <div className={`${cellStyle} text-text-neutral-primary font-semibold`}>
        {t("calculator.records.pay_period_value", {
          year: record.year,
          month: record.month,
        })}
      </div>
      <div className={cellStyle}>
        {record.employee.name}
        {record.employee.number !== "" && (
          <span className="text-text-neutral-tertiary">
            {` · ${record.employee.number}`}
          </span>
        )}
      </div>
      <div
        className={`${cellStyle} text-text-neutral-primary text-right font-semibold`}
      >
        {numberWithCommas(record.totalPayment)}
      </div>
      <div className={`${cellStyle} text-right`}>
        {numberWithCommas(record.totalSalaryTaxable)}
      </div>
      <div className={cellStyle}>
        <div className="flex items-center justify-end gap-[8px]">
          <button
            type="button"
            aria-label={t("calculator.records.view")}
            onClick={() => viewHandler(record)}
            className={`text-text-neutral-secondary ${iconBtnStyle}`}
          >
            <Eye size={16} />
          </button>
          <button
            type="button"
            aria-label={t("calculator.records.load_back")}
            onClick={() => loadBackHandler(record)}
            className={`text-text-neutral-secondary ${iconBtnStyle}`}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            aria-label={t("calculator.records.delete")}
            onClick={() => deleteHandler(record)}
            className={`text-text-state-error ${iconBtnStyle}`}
          >
            <Trash size={16} />
          </button>
        </div>
      </div>
    </div>
  ));

  const body = (() => {
    if (isLoading) {
      return (
        <p className="text-text-neutral-tertiary py-[48px] text-center text-sm">
          {t("common.loading")}
        </p>
      );
    }
    if (hasError) {
      return (
        <p className="text-text-state-error py-[48px] text-center text-sm">
          {t("calculator.records.load_failed")}
        </p>
      );
    }
    if ((result?.totalCount ?? 0) === 0) {
      return (
        <div className="bg-surface-neutral-surface-lv2 border-stroke-neutral-quaternary flex flex-col items-center gap-[12px] rounded-lg border px-[32px] py-[56px] text-center">
          <p className="text-text-neutral-primary text-lg font-bold">
            {t("calculator.records.empty_title")}
          </p>
          <p className="text-text-neutral-secondary text-sm leading-relaxed">
            {t("calculator.records.empty_desc")}
          </p>
        </div>
      );
    }

    return (
      <div className="bg-surface-neutral-surface-lv2 text-text-neutral-secondary table w-full text-sm font-medium">
        <div className="table-header-group">
          <div className="table-row">
            <div className={headerStyle}>
              {t("calculator.records.pay_period")}
            </div>
            <div className={headerStyle}>
              {t("calculator.records.employee")}
            </div>
            <div className={`${headerStyle} text-right`}>
              {t("calculator.records.net_pay")}
            </div>
            <div className={`${headerStyle} text-right`}>
              {t("calculator.records.taxable")}
            </div>
            <div className={`${headerStyle} text-right`}>
              {t("calculator.records.action")}
            </div>
          </div>
        </div>
        <div className="table-row-group">{rows}</div>
      </div>
    );
  })();

  const totalPages = result?.totalPages ?? 1;

  return (
    <SalaryCalculatorShell accountBookId={accountBookId}>
      <div className="mx-auto flex max-w-[1120px] flex-col gap-[24px] px-[32px] py-[32px]">
        <h1 className="text-text-brand-primary-lv1 text-2xl font-bold">
          {t("calculator.records.main_title")}
        </h1>

        {/* Info: (20260831 - Julian) 篩選：員工與年度。月份靠年度加排序就夠，不再多一個下拉 */}
        <div className="grid grid-cols-1 gap-[16px] md:grid-cols-2">
          <select
            aria-label={t("calculator.records.employee")}
            value={employeeId}
            onChange={(e) => changeFilter(setEmployeeId)(e.target.value)}
            className="border-input-stroke-input h-[44px] rounded-lg border bg-transparent px-[12px] outline-none"
          >
            <option value="">{t("calculator.records.all_employees")}</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>

          <select
            aria-label={t("calculator.records.year")}
            value={year}
            onChange={(e) => changeFilter(setYear)(e.target.value)}
            className="border-input-stroke-input h-[44px] rounded-lg border bg-transparent px-[12px] outline-none"
          >
            <option value="">{t("calculator.records.all_years")}</option>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {body}

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-text-neutral-tertiary text-sm">
              {t("calculator.records.total_count", {
                count: result?.totalCount ?? 0,
              })}
            </p>
            <div className="flex items-center gap-[6px]">
              <button
                type="button"
                aria-label={t("calculator.records.previous_page")}
                disabled={page <= 1}
                onClick={() => setPage((prev) => prev - 1)}
                className="border-stroke-neutral-quaternary text-text-neutral-secondary flex h-[34px] w-[34px] items-center justify-center rounded-md border disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <p className="text-text-neutral-secondary px-[8px] text-sm font-semibold">
                {`${page} / ${totalPages}`}
              </p>
              <button
                type="button"
                aria-label={t("calculator.records.next_page")}
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                className="border-stroke-neutral-quaternary text-text-neutral-secondary flex h-[34px] w-[34px] items-center justify-center rounded-md border disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {viewing && (
        <ViewPaySlipModal
          monthStr={MONTHS[viewing.month - 1].name}
          yearStr={viewing.year.toString()}
          paySlipData={viewing.result}
          employeeName={viewing.employee.name}
          employeeNumber={viewing.employee.number}
          modalCloseHandler={() => setViewing(null)}
        />
      )}
    </SalaryCalculatorShell>
  );
};

export default SalaryRecordsPageBody;
