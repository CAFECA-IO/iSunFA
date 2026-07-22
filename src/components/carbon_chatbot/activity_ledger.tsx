// Info: (20260716 - Emily) 活動數據記錄卡(#6518): 顯示狀態帳本中的活動數據與盤查步驟
// Info: (20260716 - Emily) 零捏造溯源: 每筆顯示出處(訊息片段/附件檔名)；數值為原樣字串，不做任何格式化運算
// Info: (20260716 - Emily) 預設收合為藥丸(RWD 教訓: 浮窗不可遮擋報告視線)

import { useState } from "react";
import {
  ClipboardList,
  Minus,
  AlertTriangle,
  ShieldCheck,
  BookCopy,
  Loader2,
} from "lucide-react";
import {
  ICarbonInventoryState,
  IActivityRecord,
} from "@/types/carbon_chatbot.types";
import { activityDedupeKey } from "@/lib/carbon_inventory";
import { ArticulationStatusEnum } from "@/constants/carbon_articulation";
import { useTranslation } from "@/i18n/i18n_context";

export interface IActivityLedgerProps {
  state: ICarbonInventoryState;
  positionClassName?: string;
  // Info: (20260720 - Emily) #53 憑證聯動:帳本會話才提供「從帳本匯入」(callback 未提供 = 個人會話)
  onImportFromBook?: () => void;
  isImportingFromBook?: boolean;
  // Info: (20260720 - Emily) #54 憑證下鑽:點有憑證引用的紀錄開啟 RecordTabModal(callback 由頁面提供)
  onOpenEvidence?: (activity: IActivityRecord) => void;
}

export function ActivityLedger({
  state,
  positionClassName = "absolute left-10 bottom-28 hidden xl:flex",
  onImportFromBook = undefined,
  isImportingFromBook = false,
  onOpenEvidence = undefined,
}: IActivityLedgerProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const count = state.activities.length;
  // Info: (20260716 - Emily) #6519 計算結果對照表(activityKey → entry);數值為字串化 Decimal,原樣渲染不格式化
  const ledger = state.computedLedger;
  const entryByKey = new Map(
    (ledger?.entries ?? []).map((entry) => [entry.activityKey, entry]),
  );
  const pendingKeys = new Set(
    (ledger?.pending ?? []).map((entry) => entry.activityKey),
  );

  if (!isExpanded) {
    return (
      <button
        type="button"
        title={t("carbon_chatbot.activity_ledger_title")}
        onClick={() => setIsExpanded(true)}
        className={`${positionClassName} z-20 items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-lg ring-1 ring-gray-200 transition-transform hover:scale-105`}
      >
        <ClipboardList size={14} className="text-[#ff5a00]" />
        {t("carbon_chatbot.activity_ledger_pill", { count })}
      </button>
    );
  }

  return (
    <div
      className={`${positionClassName} z-20 w-80 flex-col rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-gray-200`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold text-gray-700">
          <ClipboardList size={14} className="text-[#ff5a00]" />
          {t("carbon_chatbot.activity_ledger_title")}
        </span>
        <button
          type="button"
          aria-label={t("carbon_chatbot.activity_ledger_collapse")}
          onClick={() => setIsExpanded(false)}
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <Minus size={12} />
        </button>
      </div>

      {/* Info: (20260716 - Emily) 步驟真值來自決定性狀態機(computeInventoryStep)，非 LLM 判斷 */}
      <div className="mb-2 rounded-lg bg-orange-50 px-2 py-1 text-[11px] font-bold text-[#e04f00]">
        {t(`carbon_chatbot.inventory_step_${state.step}`)}
      </div>

      {/* Info: (20260720 - Emily) #53 從帳本匯入:憑證管線已認列的碳排事實直接入帳(冪等,重按=重新整理) */}
      {onImportFromBook && (
        <button
          type="button"
          disabled={isImportingFromBook}
          onClick={onImportFromBook}
          className="mb-2 flex items-center justify-center gap-1.5 rounded-lg bg-orange-50 px-2 py-1.5 text-[11px] font-bold text-[#e04f00] ring-1 ring-orange-100 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isImportingFromBook ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <BookCopy size={12} />
          )}
          {t("carbon_chatbot.book_records_import_button")}
        </button>
      )}

      {count === 0 ? (
        <p className="py-3 text-center text-xs text-gray-400">
          {t("carbon_chatbot.activity_ledger_empty")}
        </p>
      ) : (
        <ul className="max-h-56 space-y-1.5 overflow-y-auto">
          {state.activities.map((activity) => (
            <li
              key={`${activity.scopeCategory}-${activity.sourceName}-${activity.quantity}-${activity.unit}`}
              className="rounded-lg border border-gray-100 px-2 py-1.5 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-bold text-gray-800">
                  {activity.sourceName}
                </span>
                <span className="shrink-0 font-mono text-gray-700">
                  {activity.quantity} {activity.unit}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-gray-400">
                {/* Info: (20260720 - Emily) #53/#54 憑證引用紀錄:來源改為可點,開啟憑證檢視(RecordTabModal) */}
                {activity.esgRecordId && onOpenEvidence ? (
                  <button
                    type="button"
                    onClick={() => onOpenEvidence(activity)}
                    className="truncate font-bold text-[#e04f00] underline-offset-2 hover:underline"
                  >
                    {t("carbon_chatbot.activity_open_evidence")}
                  </button>
                ) : (
                  <span className="truncate">
                    {activity.source
                      ? t("carbon_chatbot.activity_source", {
                          source: activity.source,
                        })
                      : t("carbon_chatbot.activity_source_chat")}
                  </span>
                )}
                <span className="shrink-0">{activity.scopeCategory}</span>
              </div>
              {/* Info: (20260716 - Emily) #6519 每筆 CO2e(決定論引擎產出)或待補標記 */}
              {(() => {
                const key = activityDedupeKey(activity);
                const entry = entryByKey.get(key);
                if (entry) {
                  return (
                    <div className="mt-0.5 text-[10px] font-bold text-emerald-700">
                      {t("carbon_chatbot.activity_co2e", {
                        value: entry.co2eKg,
                      })}
                    </div>
                  );
                }
                if (pendingKeys.has(key)) {
                  return (
                    <div className="mt-0.5 text-[10px] font-bold text-amber-600">
                      {t("carbon_chatbot.activity_pending_factor")}
                    </div>
                  );
                }
                return null;
              })()}
            </li>
          ))}
        </ul>
      )}

      {/* Info: (20260716 - Emily) #6519 總計:字串化 Decimal 原樣顯示(無 .toFixed/number 運算) */}
      {ledger && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-bold text-emerald-800">
          <span>{t("carbon_chatbot.activity_total_co2e")}</span>
          <span className="font-mono">{ledger.totalCo2eKg} kgCO2e</span>
        </div>
      )}

      {/* Info: (20260720 - Emily) #6520 質量守恆勾稽:violation 明細透明呈現(等式兩側值,審計可追溯) */}
      {ledger?.articulation?.status === ArticulationStatusEnum.PASSED && (
        <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] font-bold text-emerald-700">
          <ShieldCheck size={12} className="shrink-0" />
          {t("carbon_chatbot.articulation_passed")}
        </div>
      )}
      {(ledger?.articulation?.violations ?? []).map((violation) => (
        <div
          key={`${violation.materialName}-${violation.unit}`}
          className="mt-1.5 rounded-lg bg-red-50 px-2 py-1.5 text-[11px] text-red-700"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle size={12} className="shrink-0" />
            {t("carbon_chatbot.articulation_violation", {
              material: violation.materialName,
            })}
          </div>
          <div className="mt-0.5 font-mono text-[10px]">
            {t("carbon_chatbot.articulation_equation", {
              expected: violation.expectedConsumption,
              actual: violation.actualConsumption,
              gap: violation.gap,
              unit: violation.unit,
            })}
          </div>
        </div>
      ))}
      {(ledger?.articulation?.warnings ?? []).map((warning) => (
        <div
          key={warning.activityKey}
          className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-700"
        >
          <AlertTriangle size={12} className="shrink-0" />
          {t("carbon_chatbot.articulation_plausibility_warning", {
            source: warning.sourceName,
          })}
        </div>
      ))}
    </div>
  );
}
