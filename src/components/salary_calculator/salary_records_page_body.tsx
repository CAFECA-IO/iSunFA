"use client";

import { FC, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  FileStack,
  MailCheck,
  RotateCcw,
  Search,
  Send,
  Trash,
  X,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request, IEnvelopeLike } from "@/lib/utils/request";
import { numberWithCommas, timestampToString } from "@/lib/utils/common";
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
import { resolveLoadBackIdentity } from "@/lib/utils/salary_load_back";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import SendingPaySlipModal from "@/components/salary_calculator/sending_pay_slip_modal";
import ResendingPaySlipModal from "@/components/salary_calculator/resending_pay_slip_modal";
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
  const { loadFromSnapshot, linkEmployee, applyRecordEmployee } =
    useCalculatorCtx();
  /**
   * Info: (20260901 - Julian) `hasError` 一定要解構出來。
   *
   * 名單那支 GET 失敗時 hook 把錯誤吞成 `[]` 並把 `isLoading` 設回 false ——
   * 只看 `isLoading` 的話，「名單載入中」與「名單掛了」在畫面上完全一樣，
   * 而 `employees.find(...)` 回 `undefined` 的兩種語意
   * （「這個人被軟刪了」vs「名單根本沒載到」）會被折成同一個無聲分支。
   */
  const {
    employees,
    isLoading: isEmployeesLoading,
    hasError: hasEmployeesError,
    reload: reloadEmployees,
  } = useSalaryEmployees(accountBookId);

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

  /**
   * Info: (20260904 - Julian) 某一筆的薪資單寄不寄得出去，以及寄不出去的原因。
   *
   * 收件信箱不在薪資紀錄裡（`ISalaryRecordSummary.employee` 只有 id / name / number），
   * 要從這一頁已經載入的員工名單查。而查不到有兩種意思，**下一步完全不同**：
   *
   * - 查得到但 email 是空的 → 去員工列表補一個信箱
   * - 查不到這個人 → 他已經從名單移除了（軟刪）。薪資紀錄仍在（那是刻意的：
   *   薪資單是對外憑據，員工被刪不能讓歷史一起消失），但伺服器的 `getEmployeeById`
   *   會過濾掉 `deletedAt`，寄送必然回 404 —— 叫使用者去補信箱只會白跑一趟。
   *
   * 名單還在載入、或名單根本沒載到時**不下結論**，但也不放行：那時每個人都
   * 「查不到」，而「他被刪了」與「名單掛了」是完全不同的事 ——
   * 這一頁上面那段註解記的正是這個歧義，不該在這裡又折一次。
   * 這種情況給的是「還在確認」，不是猜一個成因說給使用者聽。
   *
   * 收成一支吃 `employeeId` 的函式（原本只服務預覽彈窗那一筆）——
   * 列表每一列的寄出按鈕問的是同一個問題，答案不該有兩套推導。
   */
  const sendTargetOf = (
    employeeIdOfRecord: string,
  ): { email?: string; blockedReason?: string } => {
    if (isEmployeesLoading || hasEmployeesError) {
      return { blockedReason: "calculator.button.send_disabled_loading" };
    }

    const employee = employees.find(
      (candidate) => candidate.id === employeeIdOfRecord,
    );
    if (!employee) {
      return { blockedReason: "calculator.button.send_disabled_employee_gone" };
    }
    if (employee.email.trim() === "") {
      return { blockedReason: "calculator.button.send_disabled_no_email" };
    }
    return { email: employee.email };
  };

  const viewingSendTarget = viewing ? sendTargetOf(viewing.employee.id) : {};

  /**
   * Info: (20260904 - Julian) 列表上正在寄送的那一筆。
   *
   * 連 `summary` 一起記而不是只記 id：彈窗要顯示期間與姓名，
   * 而按下按鈕之後那一頁可能已經因為別的操作重抓過（`records` 換了一份陣列），
   * 用 id 回頭找有機會找不到 —— 那時彈窗會無聲消失。
   */
  const [sending, setSending] = useState<ISalaryRecordSummary | null>(null);
  const sendingTarget = sending ? sendTargetOf(sending.employee.id) : {};
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
   * ## 名單裡找不到這個人時，兩件事都要做
   *
   * `CalculatorProvider` 掛在 layout，跨頁不重置，所以**上一個人的東西全部還在**：
   * `selectedEmployeeId` 是他、姓名／編號／Email 也是他。
   * 兩者要分開處理，少做任何一半都會留下一種錯：
   *
   * 1. **連結不能留著。** 少了這個分支的話，按「儲存薪資紀錄」時
   *    `selectedEmployeeId !== null` → 直接存進 `(帳本, 張三, 年, 月)`，
   *    而那是 upsert —— **覆寫張三該月原有的紀錄**，全程沒有任何提示。
   * 2. **身分欄位不能留著。** 只解除連結、不補寫姓名的話，覆寫是擋住了，
   *    但薪資單預覽與 PNG 檔名 `${employeeName}_${date}.png` 印的是**張三**
   *    配上李四這一筆真實的薪資數字；沒連結過任何人時甚至是預設的「王小明」。
   *    而且儲存流程的「直接新增員工」用的就是 `employeeName`，
   *    會把李四的資料建成一個叫張三的新員工。
   *
   * `applyRecordEmployee(detail.employee)` 同時做完這兩件事：依紀錄補寫身分、
   * 連結留空。薪資單是對外憑據，「這筆屬於誰」必須永遠有答案。
   *
   * 而「找不到」不是例外，是常態，三條路都會走到：
   * 名單那支 GET 還在飛（與薪資紀錄是兩支並行請求）、
   * 名單那支 GET 失敗（hook 把錯誤吞成 `[]`）、
   * 該員工已被軟刪（名單一律 `deletedAt: null`，但他的薪資紀錄還在）。
   *
   * 前兩條是**假的找不到** —— 那個人其實好好地在名單上，只是這一刻看不到 ——
   * 所以由按鈕的 `disabled={isEmployeesLoading || hasEmployeesError}` 擋在門外，
   * 而不是讓它們走進這個分支。真正屬於這個分支的只有第三條。
   */
  const loadBackHandler = async (record: ISalaryRecordSummary) => {
    setActionError(null);
    try {
      const detail = await fetchDetail(record.id);
      if (!detail) {
        setActionError(t("calculator.records.load_back_failed"));
        return;
      }

      const identity = resolveLoadBackIdentity(employees, detail.employee);

      if (identity.kind === "linked") {
        linkEmployee(identity.employee);
      } else {
        /**
         * Info: (20260901 - Julian) 名單裡沒有這個人（已被軟刪）。
         *
         * 不能只解除連結 —— 那樣連結是斷了，姓名／編號卻還留著上一個人的，
         * 薪資單預覽與 PNG 檔名會印錯的人配這一筆的金額。
         * 依紀錄本身補寫身分，連結留空，儲存時再依編號問一次。
         */
        applyRecordEmployee(identity.employee);
        setActionError(t("calculator.records.load_back_unlinked"));
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
      key: "delivery",
      label: t("calculator.records.delivery_status"),
      /**
       * Info: (20260904 - Julian) 「已寄出」帶著日期與收件信箱。
       *
       * 只寫「已寄出」的話，使用者接著要問的一定是「寄給誰、什麼時候」——
       * 而那兩個答案就在同一筆資料裡，沒有理由讓他再點一次。
       * 信箱是**當初寄出時的快照**，不是員工檔的現值（見 `lastSentTo`）。
       */
      render: (record) =>
        record.lastSentAt === null ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
            {t("calculator.records.not_sent")}
          </span>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <MailCheck className="size-3" />
              {timestampToString(record.lastSentAt).dateWithDash}
            </span>
            {record.lastSentTo !== null && (
              <span className="font-mono text-xs break-all text-gray-400">
                {record.lastSentTo}
              </span>
            )}
          </div>
        ),
    },
    {
      key: "action",
      label: t("calculator.records.action"),
      align: "right",
      render: (record) => (
        <div className="flex items-center justify-end gap-1">
          {/**
           * Info: (20260904 - Julian) 直接從列上寄，不必先點開預覽。
           *
           * `title` 在寄不出去的時候換成原因 —— 圖示按鈕沒有文字，
           * 停用之後畫面上完全沒有地方說得出為什麼（列表沒有空間放一行說明）。
           * 這是本模組唯一一處用 `title` 承載原因的地方，因為它是唯一一處
           * 停用的控制項旁邊放不下文字的。
           */}
          <button
            type="button"
            aria-label={
              record.lastSentAt === null
                ? t("calculator.button.send")
                : t("calculator.button.re_send")
            }
            title={
              sendTargetOf(record.employee.id).blockedReason !== undefined
                ? t(sendTargetOf(record.employee.id).blockedReason as string)
                : record.lastSentAt === null
                  ? t("calculator.button.send")
                  : t("calculator.button.re_send")
            }
            onClick={() => setSending(record)}
            disabled={
              record.lastSentAt === null &&
              sendTargetOf(record.employee.id).blockedReason !== undefined
            }
            className={`${iconBtnStyle} text-gray-400 enabled:hover:bg-gray-100 enabled:hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
          >
            <Send className="size-4" />
          </button>
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
           * Info: (20260901 - Julian) 名單還在飛、或名單掛了，都不能按。
           *
           * 兩種情況下 `employees` 都是 `[]`，載回來的人一定「找不到」——
           * 但那是假的找不到（他其實好好地在名單上），於是會走進
           * 「補寫身分、不建立連結」那條路，白白讓使用者少掉一次正確的連結。
           * 掛掉不是死路：上面的橫幅有重試鈕，那是這顆按鈕唯一的解鎖方式。
           */}
          <button
            type="button"
            aria-label={t("calculator.records.load_back")}
            title={t("calculator.records.load_back")}
            onClick={() => loadBackHandler(record)}
            disabled={isEmployeesLoading || hasEmployeesError}
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

        {/**
         * Info: (20260901 - Julian) 名單掛了要說出來。
         *
         * 沒有這一條的話，畫面上的症狀是「員工篩選下拉是空的、載回鈕是灰的」，
         * 而兩者都沒有解釋，也沒有任何重試的入口。
         */}
        {hasEmployeesError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-700">
              {t("calculator.records.employee_list_failed")}
            </p>
            <button
              type="button"
              onClick={() => reloadEmployees()}
              className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100"
            >
              {t("common.retry")}
            </button>
          </div>
        )}

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

      {/**
       * Info: (20260904 - Julian) 寄過的走重寄確認，沒寄過的走寄出確認 ——
       * 與預覽彈窗裡那一顆同一套判斷，只是這裡的「寄過沒有」來自列表資料
       * （`lastSentAt` 由伺服器算），不必再問一次歷史。
       */}
      {sending && sending.lastSentAt === null && (
        <SendingPaySlipModal
          accountBookId={accountBookId}
          recordId={sending.id}
          employeeName={sending.employee.name}
          employeeEmail={sendingTarget.email ?? ""}
          monthLabel={t("calculator.records.pay_period_value", {
            year: sending.year,
            month: sending.month,
          })}
          modalVisibleHandler={() => setSending(null)}
          onSent={() => {
            setSending(null);
            // Info: (20260904 - Julian) 重抓才會看到那一列從「未寄出」變成日期
            reload();
          }}
        />
      )}

      {sending && sending.lastSentAt !== null && (
        <ResendingPaySlipModal
          accountBookId={accountBookId}
          recordId={sending.id}
          monthName={t("calculator.records.pay_period_value", {
            year: sending.year,
            month: sending.month,
          })}
          sentToName={sending.lastSentTo ?? "-"}
          modalVisibleHandler={() => setSending(null)}
          onResent={() => {
            setSending(null);
            reload();
          }}
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
          accountBookId={accountBookId}
          recordId={viewing.id}
          employeeEmail={viewingSendTarget.email}
          sendBlockedReason={viewingSendTarget.blockedReason}
          onResent={() => setViewing(null)}
        />
      )}
    </SalaryCalculatorShell>
  );
};

export default SalaryRecordsPageBody;
