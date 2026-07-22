"use client";

// Info: (20260720 - Emily) 第三章證據鏈元件(#54):報告內的層層下鑽 — Scope(並聯加總)→ 排放源
// Info: (20260720 - Emily) (並聯加總)→ 單筆 EsgRecord(串聯:數量 × 係數 = 排放)→ 點開單一憑證
// Info: (20260720 - Emily) (RecordTabModal:journal/voucher/esg/原始檔四分頁,重用財報線檢視器)
// Info: (20260720 - Emily) 數據實時問 /chat/carbon/esg-records(帳本閱覽權限由 server 裁決),
// Info: (20260720 - Emily) 加總全程 MoneyUtil 字串累加(ADR 003);accordion 樣式沿用 emission_sources_item

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ChevronDown,
  ChevronRight,
  Link2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { request } from "@/lib/utils/request";
import { MoneyUtil } from "@/lib/utils/money";
import { formatGhgCategoryLabel } from "@/constants/esg";
import { IActivityRecord } from "@/types/carbon_chatbot.types";
import { useTranslation } from "@/i18n/i18n_context";

const RecordTabModal = dynamic(
  () => import("@/components/user/common/record_tab_modal"),
  { ssr: false },
);

export interface IEvidenceChainProps {
  accountBookId: string;
}

// Info: (20260720 - Emily) 匯入端點回傳的活動附帶驗證旗標(顯示用;server 端已裁決)
type IEvidenceActivity = IActivityRecord & { isVerified?: boolean };

interface ISourceGroup {
  sourceName: string;
  subtotal: string;
  records: IEvidenceActivity[];
}

interface IScopeGroup {
  scope: string;
  subtotal: string;
  sources: ISourceGroup[];
  recordCount: number;
}

// Info: (20260720 - Emily) 決定性聚合:Scope → 排放源 → 紀錄(插入序穩定;字串累加零誤差)
const groupActivities = (activities: IEvidenceActivity[]): IScopeGroup[] => {
  const scopeMap = new Map<string, Map<string, IEvidenceActivity[]>>();
  activities.forEach((activity) => {
    const bySource =
      scopeMap.get(activity.scopeCategory) ?? new Map<string, IEvidenceActivity[]>();
    const records = bySource.get(activity.sourceName) ?? [];
    records.push(activity);
    bySource.set(activity.sourceName, records);
    scopeMap.set(activity.scopeCategory, bySource);
  });

  return Array.from(scopeMap.entries()).map(([scope, bySource]) => {
    const sources: ISourceGroup[] = Array.from(bySource.entries()).map(
      ([sourceName, records]) => ({
        sourceName,
        records,
        subtotal: records.reduce(
          (acc, r) => MoneyUtil.add(acc, r.precomputedCo2eKg ?? "0"),
          "0",
        ),
      }),
    );
    return {
      scope,
      sources,
      subtotal: sources.reduce(
        (acc, s) => MoneyUtil.add(acc, s.subtotal),
        "0",
      ),
      recordCount: sources.reduce((acc, s) => acc + s.records.length, 0),
    };
  });
};

export function EvidenceChain({ accountBookId }: IEvidenceChainProps) {
  const { t, language } = useTranslation();
  const [activities, setActivities] = useState<IEvidenceActivity[] | null>(
    null,
  );
  const [hasError, setHasError] = useState<boolean>(false);
  const [openScopes, setOpenScopes] = useState<Record<string, boolean>>({});
  const [openSources, setOpenSources] = useState<Record<string, boolean>>({});
  const [evidenceTarget, setEvidenceTarget] =
    useState<IEvidenceActivity | null>(null);

  // Info: (20260720 - Emily) 實時載入(開啟報告即最新認列結果;權限不符由 server 回 403)
  useEffect(() => {
    let cancelled = false;
    request<{ payload: { activities: IEvidenceActivity[] } | null }>(
      "/api/v1/chat/carbon/esg-records",
      { query: { accountBookId } },
    )
      .then((res) => {
        if (!cancelled) setActivities(res.payload?.activities ?? []);
      })
      .catch((error) => {
        console.error("[evidence-chain] load failed:", error);
        if (!cancelled) setHasError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [accountBookId]);

  const scopeGroups = useMemo(
    () => groupActivities(activities ?? []),
    [activities],
  );
  const total = useMemo(
    () =>
      scopeGroups.reduce((acc, g) => MoneyUtil.add(acc, g.subtotal), "0"),
    [scopeGroups],
  );

  if (hasError) {
    return (
      <p className="my-3 rounded-lg bg-red-50 p-3 text-xs text-red-600">
        {t("carbon_chatbot.evidence_chain_error")}
      </p>
    );
  }
  if (activities === null) {
    return (
      <div className="my-3 flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
        <Loader2 size={13} className="animate-spin" />
        {t("carbon_chatbot.evidence_chain_loading")}
      </div>
    );
  }
  if (activities.length === 0) {
    return (
      <p className="my-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
        {t("carbon_chatbot.evidence_chain_empty")}
      </p>
    );
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-orange-100 bg-white text-sm">
      {/* Info: (20260720 - Emily) 第 0 層:總排放(全部憑證的並聯總和) */}
      <div className="flex items-center justify-between gap-2 border-b border-orange-100 bg-orange-50/60 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-xs font-bold text-[#9a3412]">
          <Link2 size={13} />
          {t("carbon_chatbot.evidence_chain_title")}
        </span>
        <span className="shrink-0 font-mono text-xs font-bold text-[#9a3412]">
          {t("carbon_chatbot.evidence_chain_total")}:{" "}
          {MoneyUtil.formatDynamic(total, 3)} kgCO2e
        </span>
      </div>

      {scopeGroups.map((group) => {
        const isScopeOpen = Boolean(openScopes[group.scope]);
        return (
          <div key={group.scope} className="border-b border-gray-50 last:border-0">
            {/* Info: (20260720 - Emily) 第 1 層:Scope(並聯:小計 = Σ 排放源) */}
            <button
              type="button"
              onClick={() =>
                setOpenScopes((prev) => ({
                  ...prev,
                  [group.scope]: !prev[group.scope],
                }))
              }
              className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-gray-50"
            >
              {isScopeOpen ? (
                <ChevronDown size={13} className="shrink-0 text-gray-400" />
              ) : (
                <ChevronRight size={13} className="shrink-0 text-gray-400" />
              )}
              {/* Info: (20260722 - Emily) UAT:範疇顯示名(enum 值不可讀,沿用系統 GhgCategoryDetails) */}
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-gray-800">
                {formatGhgCategoryLabel(group.scope, language)}
              </span>
              <span className="shrink-0 text-[10px] text-gray-400">
                {t("carbon_chatbot.evidence_chain_records", {
                  count: group.recordCount,
                })}
              </span>
              <span className="shrink-0 font-mono text-xs font-bold text-gray-700">
                {MoneyUtil.formatDynamic(group.subtotal, 3)}
              </span>
            </button>

            {isScopeOpen &&
              group.sources.map((source) => {
                const sourceKey = `${group.scope}|${source.sourceName}`;
                const isSourceOpen = Boolean(openSources[sourceKey]);
                return (
                  <div key={sourceKey} className="ml-6 border-l border-gray-100">
                    {/* Info: (20260720 - Emily) 第 2 層:排放源(並聯:小計 = Σ 憑證紀錄) */}
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSources((prev) => ({
                          ...prev,
                          [sourceKey]: !prev[sourceKey],
                        }))
                      }
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-gray-50"
                    >
                      {isSourceOpen ? (
                        <ChevronDown size={12} className="shrink-0 text-gray-300" />
                      ) : (
                        <ChevronRight size={12} className="shrink-0 text-gray-300" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-xs text-gray-700">
                        {source.sourceName}
                      </span>
                      <span className="shrink-0 text-[10px] text-gray-400">
                        {t("carbon_chatbot.evidence_chain_records", {
                          count: source.records.length,
                        })}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-gray-600">
                        {MoneyUtil.formatDynamic(source.subtotal, 3)}
                      </span>
                    </button>

                    {/* Info: (20260720 - Emily) 第 3 層:單筆憑證(串聯:數量 × 係數 = 排放);點列開憑證 */}
                    {isSourceOpen &&
                      source.records.map((record) => (
                        <button
                          key={record.esgRecordId ?? record.source}
                          type="button"
                          onClick={() => setEvidenceTarget(record)}
                          className="ml-5 flex w-[calc(100%-1.25rem)] items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors hover:bg-orange-50"
                        >
                          {record.isVerified ? (
                            <span title={t("carbon_chatbot.evidence_chain_verified")}>
                              <ShieldCheck size={11} className="shrink-0 text-[#e04f00]" />
                            </span>
                          ) : (
                            <span title={t("carbon_chatbot.evidence_chain_unverified")}>
                              <ShieldAlert size={11} className="shrink-0 text-amber-500" />
                            </span>
                          )}
                          {/* Info: (20260722 - Emily) UAT:公式不得截斷(串聯推導是審計重點)→ 允許換行 */}
                          <span className="min-w-0 flex-1 font-mono text-[11px] break-all whitespace-normal text-gray-600">
                            {t("carbon_chatbot.evidence_chain_formula", {
                              quantity: MoneyUtil.formatDynamic(record.quantity, 3),
                              unit: record.unit,
                              factor: record.emissionFactor ?? "-",
                              co2e: MoneyUtil.formatDynamic(
                                record.precomputedCo2eKg ?? "0",
                                3,
                              ),
                            })}
                          </span>
                          {/* Info: (20260722 - Emily) UAT:憑證 id 顯示尾碼(全碼擠壓公式;title 保留全碼) */}
                          <span
                            title={record.source}
                            className="shrink-0 text-[10px] font-bold text-[#e04f00]"
                          >
                            {record.voucherId
                              ? `#${record.voucherId.slice(-8)}`
                              : `#${(record.esgRecordId ?? "").slice(-8)}`}
                          </span>
                        </button>
                      ))}
                  </div>
                );
              })}
          </div>
        );
      })}

      {/* Info: (20260720 - Emily) 最細顆粒:單一憑證四分頁檢視(voucher 優先;無傳票落 esg) */}
      {evidenceTarget && (
        <RecordTabModal
          isOpen
          onClose={() => setEvidenceTarget(null)}
          defaultTab={evidenceTarget.voucherId ? "voucher" : "esg"}
          voucherId={evidenceTarget.voucherId ?? null}
          journalId={evidenceTarget.journalId ?? null}
          esgId={evidenceTarget.esgRecordId ?? null}
          file={
            evidenceTarget.fileId
              ? {
                  id: evidenceTarget.fileId,
                  hash: evidenceTarget.fileHash,
                  fileName: evidenceTarget.fileName,
                }
              : undefined
          }
          // Info: (20260721 - Emily) UAT:報告可在非 account_book 路徑開啟,帳本 id 由 prop 注入
          accountBookId={accountBookId}
        />
      )}
    </div>
  );
}
