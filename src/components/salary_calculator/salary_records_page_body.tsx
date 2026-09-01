"use client";

import { FC, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileStack, RotateCcw, Search, Trash, X } from "lucide-react";
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
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import SalaryCalculatorShell from "@/components/salary_calculator/salary_calculator_shell";
import ViewPaySlipModal from "@/components/salary_calculator/view_pay_slip_modal";
import DeleteRecordModal from "@/components/salary_calculator/delete_record_modal";

const inputStyle =
  "w-full rounded-xl border border-gray-200 bg-white py-2 pr-3 pl-9 text-sm text-gray-700 transition-all placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none";
const selectStyle =
  "shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none lg:w-44";
const iconBtnStyle =
  "flex size-8 items-center justify-center rounded-md transition-colors shrink-0";

const PAGE_SIZE = 20;

// Info: (20260901 - Julian) 打字停下來才送出，否則每按一個鍵就是一次查詢
const KEYWORD_DEBOUNCE_MS = 300;

/**
 * Info: (20260901 - Julian) 期間篩選的值格式：`YYYY-M`，空字串代表全部。
 *
 * 年與月合成一個選單而不是兩個 —— 實務上沒有「所有年度的 8 月」這種需求，
 * 拆成兩個下拉只是讓使用者多點一次，還能選出必定沒有資料的組合。
 */
const periodValueOf = (year: number, month: number) => `${year}-${month}`;

const parsePeriod = (value: string): { year?: number; month?: number } => {
  if (value === "") return {};
  const [year, month] = value.split("-");
  return { year: Number(year), month: Number(month) };
};

interface ISalaryRecordsPageBodyProps {
  accountBookId: string;
}

const SalaryRecordsPageBody: FC<ISalaryRecordsPageBodyProps> = ({
  accountBookId,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { loadFromSnapshot, linkEmployee, unlinkEmployee } = useCalculatorCtx();
  const { employees, isLoading: isEmployeesLoading } =
    useSalaryEmployees(accountBookId);

  const [page, setPage] = useState<number>(1);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [period, setPeriod] = useState<string>("");
  // Info: (20260901 - Julian) 輸入框的值與真正送出的值分開，中間隔一個 debounce
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [result, setResult] = useState<ISalaryRecordPageResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [viewing, setViewing] = useState<ISalaryRecordDetail | null>(null);
  const [deleting, setDeleting] = useState<ISalaryRecordSummary | null>(null);
  /**
   * Info: (20260901 - Julian) 列上那三顆圖示鈕的失敗訊息。
   *
   * 這三顆都是 async 且都可能失敗（403、被別人先刪掉、瞬斷）。
   * 沒有這一條的話，失敗看起來就是「按了沒反應」—— 而讀取失敗有 `hasError`、
   * 儲存失敗有錯誤列，只有這三顆是靜默的。
   */
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(keywordInput.trim());
      // Info: (20260901 - Julian) 換條件就回第一頁，否則會停在一個不存在的頁碼上
      setPage(1);
    }, KEYWORD_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [keywordInput]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const { year, month } = parsePeriod(period);
      const response = await request<IEnvelopeLike<ISalaryRecordPageResult>>(
        salaryCalculatorApiOf(accountBookId).RECORD,
        {
          query: {
            page,
            pageSize: PAGE_SIZE,
            // Info: (20260831 - Julian) 空字串代表「全部」，不送這個條件
            employeeId: employeeId === "" ? undefined : employeeId,
            year,
            month,
            keyword: keyword === "" ? undefined : keyword,
          },
        },
      );
      setResult(response.payload);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [accountBookId, page, employeeId, period, keyword]);

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
    setActionError(null);
    try {
      const detail = await fetchDetail(record.id);
      if (detail) setViewing(detail);
      else setActionError(t("calculator.records.view_failed"));
    } catch {
      setActionError(t("calculator.records.view_failed"));
    }
  };

  /**
   * Info: (20260831 - Julian) 載回計算機。
   *
   * 除了灌輸入快照，也把員工重新連結起來 —— 否則載回來之後按儲存會被當成
   * 「未連結」而多問一次，而這筆紀錄本來就知道自己屬於誰。
   *
   * **順序不能倒過來。** `linkEmployee` 除了姓名／編號／Email 之外，
   * 還會把本薪與伙食費設成該員工**現在**的值；`loadFromSnapshot` 灌的則是
   * 這筆紀錄**當時**的值。先連結、後灌快照，快照才會贏 ——
   * 反過來的話，載回三個月前的紀錄會靜靜地換成今天的本薪，
   * 畫面上沒有任何提示，重新計算的結果卻和原始薪資單對不起來。
   *
   * ## 名單裡找不到這個人時，一定要 `unlinkEmployee()`
   *
   * `CalculatorProvider` 掛在 layout，跨頁不重置，所以 `selectedEmployeeId`
   * 保留的是**上一次**連結的那個人。少了 `else` 這一支的話：
   * 使用者載回李四的紀錄 → 找不到李四 → 連結還停在張三 →
   * 按「儲存薪資紀錄」時 `selectedEmployeeId !== null`，直接存進
   * `(帳本, 張三, 年, 月)`，而那是 upsert —— **覆寫張三該月原有的紀錄**。
   * 畫面上的姓名是李四，全程沒有任何提示。
   *
   * 而「找不到」不是例外，是常態，三條路都會走到：
   * 名單那支 GET 還在飛（與薪資紀錄是兩支並行請求）、
   * 該員工已被軟刪（名單一律 `deletedAt: null`，但他的薪資紀錄還在）、
   * 名單那支 GET 失敗（hook 把錯誤吞成 `[]`）。
   * 第一條由下面的 `disabled={isEmployeesLoading}` 擋掉，後兩條靠這個 `else`。
   */
  const loadBackHandler = async (record: ISalaryRecordSummary) => {
    setActionError(null);
    try {
      const detail = await fetchDetail(record.id);
      if (!detail) {
        setActionError(t("calculator.records.load_back_failed"));
        return;
      }

      const employee = employees.find((item) => item.id === detail.employee.id);
      if (employee) {
        linkEmployee(employee);
      } else {
        unlinkEmployee();
      }

      loadFromSnapshot(detail.input);

      router.push(salaryCalculatorUrlOf(accountBookId).CALCULATOR);
    } catch {
      setActionError(t("calculator.records.load_back_failed"));
    }
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

  const hasActiveFilter =
    keywordInput !== "" || employeeId !== "" || period !== "";

  const clearFilters = () => {
    setKeywordInput("");
    setEmployeeId("");
    setPeriod("");
    setPage(1);
  };

  const totalPages = result?.totalPages ?? 1;
  const totalCount = result?.totalCount ?? 0;

  /**
   * Info: (20260901 - Julian) 不包 `useMemo`。
   *
   * 這些 render 關住了 `deleteHandler`，而它會呼叫綁著當下篩選條件的 `reload`。
   * 一旦 memo 沒跟著更新，刪除之後就會用舊條件重抓 —— 畫面回到上一組篩選結果，
   * 而且完全靜默。五個物件每次重建的成本，遠低於維護這串依賴。
   */
  const columns: IDataTableColumn<ISalaryRecordSummary>[] = [
    {
      key: "period",
      label: t("calculator.records.pay_period"),
      render: (record) => (
        <span className="font-semibold text-gray-900">
          {t("calculator.records.pay_period_value", {
            year: record.year,
            month: record.month,
          })}
        </span>
      ),
    },
    {
      key: "employee",
      label: t("calculator.records.employee"),
      render: (record) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-700">
            {record.employee.name}
          </span>
          {record.employee.number !== "" && (
            <span className="font-mono text-xs text-gray-400">
              {record.employee.number}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "netPay",
      label: t("calculator.records.net_pay"),
      align: "right",
      render: (record) => (
        <span className="font-semibold text-gray-900">
          {numberWithCommas(record.totalPayment)}
        </span>
      ),
    },
    {
      key: "taxable",
      label: t("calculator.records.taxable"),
      align: "right",
      render: (record) => (
        <span className="text-gray-500">
          {numberWithCommas(record.totalSalaryTaxable)}
        </span>
      ),
    },
    {
      key: "action",
      label: t("calculator.records.action"),
      align: "right",
      render: (record) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={t("calculator.records.view")}
            title={t("calculator.records.view")}
            onClick={() => viewHandler(record)}
            className={`${iconBtnStyle} text-gray-400 hover:bg-gray-100 hover:text-gray-600`}
          >
            <Eye className="size-4" />
          </button>
          {/**
           * Info: (20260901 - Julian) 員工名單還在飛的時候不能按 ——
           * 那時 `employees` 是 `[]`，載回來的人一定找不到（理由見 `loadBackHandler`）
           */}
          <button
            type="button"
            aria-label={t("calculator.records.load_back")}
            title={t("calculator.records.load_back")}
            onClick={() => loadBackHandler(record)}
            disabled={isEmployeesLoading}
            className={`${iconBtnStyle} text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
          >
            <RotateCcw className="size-4" />
          </button>
          {/* Info: (20260901 - Julian) 硬刪且不可復原，所以先開確認彈窗 */}
          <button
            type="button"
            aria-label={t("calculator.records.delete")}
            title={t("calculator.records.delete")}
            onClick={() => setDeleting(record)}
            className={`${iconBtnStyle} text-gray-400 hover:bg-red-50 hover:text-red-600`}
          >
            <Trash className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  /**
   * Info: (20260901 - Julian) 「還沒有紀錄」與「這組條件找不到」是兩件事。
   * 兩者共用一句「還沒有薪資紀錄」會讓正在搜尋的人以為資料掉了。
   */
  const emptyState = hasActiveFilter ? (
    <div className="flex flex-col items-center justify-center">
      <Search className="mb-4 h-12 w-12 text-gray-300" />
      <h3 className="mb-2 text-lg font-medium text-gray-900">
        {t("calculator.records.no_result_title")}
      </h3>
      <p className="mb-6 max-w-sm text-center text-gray-500">
        {t("calculator.records.no_result_desc")}
      </p>
      <button
        type="button"
        onClick={clearFilters}
        className="inline-flex items-center justify-center rounded-lg border border-transparent bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-200"
      >
        {t("common.clear_filters")}
      </button>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center">
      <FileStack className="mb-4 h-12 w-12 text-gray-300" />
      <h3 className="mb-2 text-lg font-medium text-gray-900">
        {t("calculator.records.empty_title")}
      </h3>
      <p className="mb-6 max-w-sm text-center text-gray-500">
        {t("calculator.records.empty_desc")}
      </p>
    </div>
  );

  return (
    <SalaryCalculatorShell accountBookId={accountBookId}>
      {/* Info: (20260901 - Julian) 外距由 user/layout.tsx 的 <main> 提供，這裡不再補 px/py */}
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("calculator.records.main_title")}
        </h1>

        {/* Info: (20260901 - Julian) 篩選列：桌機一排，手機垂直堆疊 */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
          {/* Info: (20260901 - Julian) 關鍵字：比對員工姓名與編號，由後端過濾（列表是分頁的） */}
          <div className="relative lg:max-w-xs lg:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 shrink-0 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              aria-label={t("calculator.records.search_placeholder")}
              placeholder={t("calculator.records.search_placeholder")}
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              className={inputStyle}
            />
            {keywordInput !== "" && (
              <button
                type="button"
                aria-label={t("calculator.records.clear_search")}
                onClick={() => setKeywordInput("")}
                className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <select
            aria-label={t("calculator.records.employee")}
            value={employeeId}
            onChange={(e) => changeFilter(setEmployeeId)(e.target.value)}
            className={selectStyle}
          >
            <option value="">{t("calculator.records.all_employees")}</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>

          {/* Info: (20260901 - Julian) 期間：選項來自實際有紀錄的年月，不是硬湊的區間 */}
          <select
            aria-label={t("calculator.records.period")}
            value={period}
            onChange={(e) => changeFilter(setPeriod)(e.target.value)}
            className={selectStyle}
          >
            <option value="">{t("calculator.records.all_periods")}</option>
            {(result?.periods ?? []).map((item) => (
              <option
                key={periodValueOf(item.year, item.month)}
                value={periodValueOf(item.year, item.month)}
              >
                {t("calculator.records.pay_period_value", {
                  year: item.year,
                  month: item.month,
                })}
              </option>
            ))}
          </select>

          <div className="flex shrink-0 items-center justify-between gap-3 lg:ml-auto lg:justify-end">
            <span className="text-xs text-gray-400">
              {t("calculator.records.total_count", { count: totalCount })}
            </span>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="size-3" />
                {t("common.clear_filters")}
              </button>
            )}
          </div>
        </div>

        {actionError !== null && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-600">{actionError}</p>
            <button
              type="button"
              aria-label={t("common.close")}
              onClick={() => setActionError(null)}
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red-100 hover:text-red-600"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {hasError ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-8 py-16 text-center shadow-sm">
            <p className="text-sm font-medium text-red-600">
              {t("calculator.records.load_failed")}
            </p>
          </div>
        ) : (
          <DataTable<ISalaryRecordSummary>
            columns={columns}
            data={result?.data ?? []}
            loading={isLoading}
            rowKey={(record) => record.id}
            pagination={{
              page,
              limit: PAGE_SIZE,
              totalPages,
              totalElements: totalCount,
            }}
            onPageChange={setPage}
            emptyStateText={emptyState}
          />
        )}
      </div>

      {deleting && (
        <DeleteRecordModal
          record={deleting}
          closeHandler={() => setDeleting(null)}
          deleteHandler={() => deleteHandler(deleting)}
        />
      )}

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
