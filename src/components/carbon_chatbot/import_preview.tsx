// Info: (20260716 - Tzuhan) #56 報告匯入預覽卡:逐段勾選確認後才寫入(與 #55 修訂卡同風格、同人工 gate 原則)
// Info: (20260716 - Tzuhan) unmapped 桶原樣呈現不丟棄;已有內容的段落顯示覆蓋警告;匯入段落查核一律重置

import {
  FileUp,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Loader2,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import type { ICarbonSourceTable } from "@/lib/carbon_source_table.builder";
// Info: (20260902 - Emily) 表號取自產帳本的那支純函式,不在這裡再寫一份字串
import { LEDGER_SOURCE_TABLE_NO } from "@/lib/carbon_table38.pipeline";

export interface IPendingImportItem {
  paragraphId: string;
  title: string;
  content: string;
  // Info: (20260716 - Tzuhan) 目標段落已有內容(匯入將覆蓋,需醒目警告)
  hasExisting: boolean;
  checked: boolean;
  // Info: (20260727 - Tzuhan) #57 AI 草稿補齊段落(非逐字原文):預覽需明確標記,與原樣匯入區隔
  isDraft?: boolean;
  /**
   * Info: (20260801 - Tzuhan) 自原文照錄的表格(已逐張裁決)。預覽顯示張數,
   * 使用者勾選該段時一併落地 —— 表格與敘述同屬一段的照錄結果,不該能分開勾。
   */
  sourceTables?: ICarbonSourceTable[];
}

export interface IPendingImport {
  fileName: string;
  /**
   * Info: (20260803 - Tzuhan) 發起這次匯入的會話 id(issue_drafts/inventory_table_import/03)。
   *
   * 匯入的 fetch 不理會 React,切換聊天室不會讓它停下來;而套用時寫入的是
   * **當下的** activeSessionId。沒有這個欄位的話,在 A 房發起、切到 B 房再套用,
   * A 房的報告會寫進 B 房並覆蓋原內容,且沒有任何警告。
   * 這不是體驗問題,是資料歸屬問題。
   */
  originSessionId: string;
  /** Info: (20260803 - Tzuhan) 發起當下的會話標題,拒絕時要能指名道姓說出來源 */
  originSessionTitle: string;
  items: IPendingImportItem[];
  unmapped: string[];
  // Info: (20260716 - Tzuhan) 匯入的活動數據筆數(顯示用;實際合併於確認時執行)
  activityCount: number;
  /**
   * Info: (20260902 - Emily) 這份報告的盤查年度(issue_drafts/open/69)。
   *
   * 語意是「**這份報告**是哪一年」,與 `ICarbonInventoryState.year`
   *(「**這個房間**在談哪一年」,write-once)是兩件事。在這張票之前帳本的年度
   * 取自後者,於是同一間房匯入兩份不同年度的報告會拿到同一個值,
   * 跨年度換鍋與年間比較全部空轉。
   *
   * 初值是萃取的預填(抽不到就 undefined),最終值由使用者在本卡確認。
   */
  inventoryYear?: number;
  // Info: (20260717 - Tzuhan) 逐章解析失敗的章節(id 供重試呼叫、title 供顯示;空陣列 = 全部成功)
  failedChapters: { id: string; title: string }[];
  /**
   * Info: (20260825 - Luphia) 因為點數用完而**還沒做**的章（issue #6713）。
   *
   * 與 `failedChapters` 是兩件不同的事，畫面也要分開說：
   * 失敗的章是「試過、壞了」，這些章是「一步都沒試」——伺服端在呼叫 LLM 之前
   * 就因為點數不足擋下，一點都沒扣。把它們混進 failedChapters 會讓使用者
   * 以為檔案有問題（那正是修正前的行為）。
   */
  pausedChapters?: { id: string; title: string }[];
  /**
   * Info: (20260825 - Luphia) 接續要跑的**工作單元**（份粒度，review #6717 阻擋-1）：
   * `buildImportUnits` 會把節數多的章切成兩份，而點數用完時很可能是
   * 「一份做完、另一份撞牆」。以章接續會把做完的那一份再跑一次，
   * 而訊息裡明寫「已完成的部分不會重跑」。
   */
  pausedUnits?: {
    chapterId: string;
    sectionIds: string[];
    partIndex: number;
    partTotal: number;
  }[];
  // Info: (20260825 - Luphia) 暫停原因（JOB_PAUSE_REASON）；null／undefined＝沒有暫停
  pauseReason?: string | null;
}

export interface IImportPreviewProps {
  pendingImport: IPendingImport;
  onToggleItem: (paragraphId: string) => void;
  /**
   * Info: (20260902 - Emily) 盤查年度的確認(issue_drafts/open/69)。
   *
   * 與 `onToggleItem` 同樣把值寫回 pending 而不是留在本元件的 state:
   * 這張卡有「稍後再說」這條路,值留在元件裡等於關卡就丟。
   */
  onChangeInventoryYear: (year: number | undefined) => void;
  onApply: () => void;
  onDiscard: () => void;
  /**
   * Info: (20260806 - Tzuhan) 「稍後再說」:收起卡片,內容留著(已入庫)。
   *
   * 原本只有套用與捨棄兩條路,而「我想先看看報告再決定」在那兩條路裡沒有位置 ——
   * 關掉卡片等於丟掉幾分鐘的解析,於是使用者只能硬著頭皮當場決定。
   */
  onDefer?: () => void;
  // Info: (20260717 - Tzuhan) 只重跑失敗章節並合併進本預覽(檔案由 hook 暫存,無需重選)
  onRetryFailed?: () => void;
  /**
   * Info: (20260825 - Luphia) 「接著匯入」：只跑點數用完時還沒做的那幾份
   *（issue #6713）。與重試失敗分成兩顆按鈕——兩者跑的東西不同，
   * 而且失敗那顆按下去會真的重送，這顆在點數還沒補上時會再撞一次牆。
   */
  onResumePaused?: () => void;
  /**
   * Info: (20260806 - Tzuhan) 重試進行中。
   *
   * 原本這張卡對「正在重試」一無所知:按下去毫無變化,按鈕還能再按,
   * 而進度只出現在被本 modal(z-[90])蓋住的輸入列上。
   * 使用者理所當然會再按一次,而那會並行跑兩份、各燒一份 LLM 額度。
   *
   * 重試一次要好幾分鐘(逐章解析),所以「等待中」不能只靠使用者猜。
   */
  isRetrying?: boolean;
  /** Info: (20260806 - Tzuhan) 重試期間的進度文字(與輸入列同一份 draftNotice) */
  retryNotice?: string | null;
}

export function ImportPreview({
  pendingImport,
  onToggleItem,
  onChangeInventoryYear,
  onApply,
  onDiscard,
  onDefer = undefined,
  onRetryFailed = undefined,
  onResumePaused = undefined,
  isRetrying = false,
  retryNotice = null,
}: IImportPreviewProps) {
  const { t } = useTranslation();
  const checkedCount = pendingImport.items.filter((i) => i.checked).length;
  /**
   * Info: (20260902 - Emily) 年度的編輯緩衝(issue_drafts/open/69)。
   *
   * 直接把 `pendingImport.inventoryYear`(number)當受控值不行:打第一個字
   * 「2」不是合法年度,值會變 undefined,輸入框當場被清成空的,使用者根本打不完。
   * 所以文字留在這裡、**只有裁決成功的數字往上送**。
   */
  const [yearText, setYearText] = useState<string>(
    () => pendingImport.inventoryYear?.toString() ?? "",
  );
  /**
   * Info: (20260902 - Emily) 萃取的預填晚到時才補（重試合併後才拿到年度）——
   * 但**框裡已經有字就不動它**。這是 #6730 review 第二輪那條「歸還與指令要分開」
   * 的同一個形狀:晚到的預填是建議,不是指令,不該蓋掉使用者手上打的字。
   */
  useEffect(() => {
    const prefill = pendingImport.inventoryYear;
    if (prefill === undefined) return;
    setYearText((current) =>
      current.trim().length > 0 ? current : String(prefill),
    );
  }, [pendingImport.inventoryYear]);
  /**
   * Info: (20260902 - Emily) 年度只在「這次匯入真的會產生帳本分錄」時是必填。
   *
   * 判準用表號而不是「有沒有表格」:帳本只由 `LEDGER_SOURCE_TABLE_NO` 產生
   *(見 buildImportedLedger),別的表格入不了帳,年度對它們沒有作用。
   * 一律必填會讓純文字章節的匯入被一個與它無關的欄位擋住 —— 那是新的缺陷,
   * 不是更嚴格的把關。
   */
  const ledgerBearingChecked = pendingImport.items.some(
    (item) =>
      item.checked &&
      (item.sourceTables ?? []).some(
        (table) => table.tableNo === LEDGER_SOURCE_TABLE_NO,
      ),
  );
  const yearMissing =
    ledgerBearingChecked && pendingImport.inventoryYear === undefined;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <FileUp size={16} className="shrink-0 text-[#ff5a00]" />
          <span className="truncate text-sm font-bold text-gray-800">
            {t("carbon_chatbot.import_title", {
              name: pendingImport.fileName,
            })}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-5">
          {pendingImport.items.map((item) => (
            <label
              key={item.paragraphId}
              aria-label={item.title}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                item.checked
                  ? "border-orange-200 bg-orange-50/60"
                  : "border-gray-100 hover:bg-gray-50"
              }`}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => onToggleItem(item.paragraphId)}
                className="mt-1 accent-[#ff5a00]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-bold text-gray-800">
                    {item.title}
                  </span>
                  {item.hasExisting && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                      <AlertTriangle size={10} />
                      {t("carbon_chatbot.import_overwrite_warning")}
                    </span>
                  )}
                  {item.isDraft && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                      <Sparkles size={10} />
                      {t("carbon_chatbot.import_draft_badge")}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-3 text-xs whitespace-pre-wrap text-gray-500">
                  {item.content}
                </p>
              </div>
            </label>
          ))}

          {pendingImport.failedChapters.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 p-3 text-[11px] font-bold text-amber-700">
              <AlertTriangle size={12} className="shrink-0" />
              <span className="min-w-0 flex-1">
                {t("carbon_chatbot.import_failed_chapters", {
                  chapters: pendingImport.failedChapters
                    .map((chapter) => chapter.title)
                    .join("、"),
                })}
              </span>
              {onRetryFailed && (
                <button
                  type="button"
                  onClick={onRetryFailed}
                  disabled={isRetrying}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 font-bold text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white"
                >
                  {isRetrying ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <RotateCcw size={11} />
                  )}
                  {t(
                    isRetrying
                      ? "carbon_chatbot.import_retrying"
                      : "carbon_chatbot.import_retry_failed",
                  )}
                </button>
              )}
            </div>
          )}

          {/**
           * Info: (20260825 - Luphia) 點數用完而**還沒解析**的章（issue #6713）。
           *
           * 與上面那塊「解析失敗」分開，因為兩者是不同的事實、也是不同的處置：
           * 失敗的章試過而壞了（重試可能成功），這些章一步都沒試——
           * 重試一百次也一樣，要先補點數。混成同一塊會讓使用者回去改檔案。
           *
           * 這一塊在此之前**不存在**：訊息（五語言）告訴使用者「可以從這裡接著
           * 匯入」，而畫面上沒有那個動作，唯一走得到的路是整份重新匯入
           *（已解析的章再解析一次、再收一次點數，正好是那句承諾的反面）。
           */}
          {(pendingImport.pausedChapters ?? []).length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl bg-blue-50 p-3 text-[11px] font-bold text-blue-700">
              <AlertTriangle size={12} className="shrink-0" />
              <span className="min-w-0 flex-1">
                {t("carbon_chatbot.import_paused_chapters", {
                  chapters: (pendingImport.pausedChapters ?? [])
                    .map((chapter) => chapter.title)
                    .join("、"),
                })}
              </span>
              {onResumePaused && (
                <button
                  type="button"
                  onClick={onResumePaused}
                  disabled={isRetrying}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 font-bold text-blue-700 ring-1 ring-blue-200 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white"
                >
                  {isRetrying ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <RotateCcw size={11} />
                  )}
                  {t(
                    isRetrying
                      ? "carbon_chatbot.import_retrying"
                      : "carbon_chatbot.import_resume_paused",
                  )}
                </button>
              )}
            </div>
          )}

          {/* Info: (20260806 - Tzuhan) 重試中的進度:與輸入列同一份提示,但顯示在 modal **內**。
              輸入列在本 modal(z-[90])後面,重試時使用者看得到的只有這裡。 */}
          {isRetrying && (
            <div className="flex items-center gap-2 rounded-xl bg-orange-50 p-3 text-[11px] font-bold text-orange-700">
              <Loader2 size={12} className="shrink-0 animate-spin" />
              <span className="min-w-0 flex-1">
                {retryNotice ?? t("carbon_chatbot.import_retrying_hint")}
              </span>
            </div>
          )}

          {pendingImport.unmapped.length > 0 && (
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="mb-1 text-xs font-bold text-gray-500">
                {t("carbon_chatbot.import_unmapped", {
                  count: pendingImport.unmapped.length,
                })}
              </div>
              {pendingImport.unmapped.map((text) => (
                <p
                  key={text.slice(0, 80)}
                  className="mt-1 line-clamp-2 text-[11px] text-gray-400"
                >
                  {text}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Info: (20260902 - Emily) 盤查年度:抽到當預填、抽不到要求填(issue_drafts/open/69) */}
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-5 py-3">
          <label
            htmlFor="carbon-import-inventory-year"
            className="text-xs font-bold text-gray-500"
          >
            {t("carbon_chatbot.import_inventory_year")}
          </label>
          <input
            id="carbon-import-inventory-year"
            type="text"
            inputMode="numeric"
            value={yearText}
            onChange={(e) => {
              const next = e.target.value.trim();
              setYearText(e.target.value);
              /**
               * Info: (20260902 - Emily) 只有四位數字才往上送,其餘一律 undefined ——
               * 「打到一半」與「沒填」在這裡必須是同一個結果,否則帳本會拿到 `20`。
               */
              onChangeInventoryYear(
                /^\d{4}$/.test(next) ? Number(next) : undefined,
              );
            }}
            placeholder={t("carbon_chatbot.import_inventory_year_placeholder")}
            className={`w-24 rounded-lg border px-2 py-1 text-sm ${
              yearMissing
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-gray-200 text-gray-700"
            }`}
          />
          <span
            className={`text-[11px] ${yearMissing ? "text-red-500" : "text-gray-400"}`}
          >
            {yearMissing
              ? t("carbon_chatbot.import_inventory_year_required")
              : t("carbon_chatbot.import_inventory_year_hint")}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-5 py-3">
          {/* Info: (20260716 - Tzuhan) 匯入即重置查核 + 數字重勾稽:對使用者明示,非隱性行為 */}
          <span className="text-[11px] text-gray-400">
            {t("carbon_chatbot.import_reset_note", {
              activities: pendingImport.activityCount,
            })}
          </span>
          <div className="flex shrink-0 gap-2">
            {/* Info: (20260806 - Tzuhan) 稍後再說擺在捨棄左邊:比「丟掉」低風險的選項要更容易按到 */}
            {onDefer && (
              <button
                type="button"
                onClick={onDefer}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100"
              >
                <Clock size={14} />
                {t("carbon_chatbot.import_defer")}
              </button>
            )}
            <button
              type="button"
              onClick={onDiscard}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100"
            >
              <X size={14} />
              {t("carbon_chatbot.revision_discard")}
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={checkedCount === 0 || yearMissing}
              className="flex items-center gap-1.5 rounded-full bg-[#ff5a00] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#e04f00] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Check size={14} />
              {t("carbon_chatbot.import_apply", { count: checkedCount })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
