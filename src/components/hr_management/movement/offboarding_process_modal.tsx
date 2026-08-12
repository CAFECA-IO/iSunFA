"use client";

import { FC, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  DoorOpen,
  FolderOpen,
  Laptop,
  Lock,
  ScrollText,
  X,
} from "lucide-react";
import MovementAlertBadge from "@/components/hr_management/movement/movement_alert_badge";
import OffboardingApplicationTab from "@/components/hr_management/movement/offboarding_application_tab";
import OffboardingAssetTab from "@/components/hr_management/movement/offboarding_asset_tab";
import OffboardingFinalizationTab from "@/components/hr_management/movement/offboarding_finalization_tab";
import OffboardingHandoverTab from "@/components/hr_management/movement/offboarding_handover_tab";
import {
  OFFBOARDING_MODAL_TABS,
  OFFBOARDING_MODAL_TAB_I18N_KEY,
  OffboardingModalTab,
} from "@/constants/hr_management";
import {
  IEmployeeListItem,
  IOffboardingCase,
  IOffboardingForm,
} from "@/interfaces/hr_management";
import {
  buildOffboardingProgress,
  resolveNoticeCheck,
} from "@/lib/utils/hr_offboarding";
import { useTranslation } from "@/i18n/i18n_context";

interface IOffboardingProcessModalProps {
  offboardingCase: IOffboardingCase | null;
  form: IOffboardingForm | null;
  candidates: IEmployeeListItem[];
  todayIso: string;
  isReadOnly: boolean; // Info: (20260811 - Julian) 已結案的案件以唯讀開啟，按「重新開啟案件」才解鎖
  onChange: (patch: Partial<IOffboardingForm>) => void;
  onToggleTask: (taskId: string, isDone: boolean) => void;
  onApprove: () => void;
  onRevokeApproval: () => void;
  onReopen: () => void;
  onClose: () => void;
}

const TAB_ICON: Record<OffboardingModalTab, typeof DoorOpen> = {
  [OffboardingModalTab.APPLICATION]: ClipboardList,
  [OffboardingModalTab.HANDOVER]: FolderOpen,
  [OffboardingModalTab.ASSET]: Laptop,
  [OffboardingModalTab.FINALIZATION]: ScrollText,
};

/**
 * Info: (20260811 - Julian) 離職流程與交接清單。
 *
 * 分成四個分頁之後，每個單位只需要看自己那一頁。
 * 底部的進度總覽讓 HR 不必逐頁點過去也知道還缺哪一段。
 *
 * 所有異動即時寫回：在這裡勾掉一項資產，看板的進度條與右側交接矩陣
 * 會同時更新，因為它們讀的是同一批任務。底部的「儲存異動」只負責收工。
 *
 * ToDo: (20260811 - Julian) 目前只改記憶體，重整會回復。
 * 接上 `/api/v1/hr/offboarding` 後改為送出並以伺服器回傳為準。
 */
const OffboardingProcessModal: FC<IOffboardingProcessModalProps> = ({
  offboardingCase,
  form,
  candidates,
  todayIso,
  isReadOnly,
  onChange,
  onToggleTask,
  onApprove,
  onRevokeApproval,
  onReopen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<OffboardingModalTab>(
    OffboardingModalTab.APPLICATION,
  );

  /**
   * Info: (20260813 - Julian) 換案件就回到第一個分頁。
   *
   * 這個 Modal 是常駐掛載、靠 `offboardingCase` 為 null 收起來的，因此
   * `activeTab` 會跨案件留著。少了這一段，上一個案件停在「HR 結案」，
   * 下一個案件打開就直接落在結案頁 —— 而分頁順序就是流程順序，
   * 跳過第一頁正是 `OFFBOARDING_MODAL_TABS` 說要避免的
   * 「證明書都發了才發現預告期不足」。
   */
  const caseId = offboardingCase?.id ?? null;
  useEffect(() => {
    setActiveTab(OffboardingModalTab.APPLICATION);
  }, [caseId]);

  const progress = useMemo(
    () => (form ? buildOffboardingProgress(form) : null),
    [form],
  );

  const notice = useMemo(
    () =>
      offboardingCase && form
        ? resolveNoticeCheck(
            offboardingCase.hireDate,
            offboardingCase.noticeDate,
            form.expectedLeaveDate,
          )
        : null,
    [offboardingCase, form],
  );

  if (!offboardingCase || !form || !progress || !notice) return null;

  const progressItems = [
    {
      key: OffboardingModalTab.HANDOVER,
      labelKey: "hr_management.offboarding.progress_handover",
      percent: progress.handoverPercent,
    },
    {
      key: OffboardingModalTab.ASSET,
      labelKey: "hr_management.offboarding.progress_asset",
      percent: progress.assetPercent,
    },
    {
      key: OffboardingModalTab.FINALIZATION,
      labelKey: "hr_management.offboarding.progress_finalization",
      percent: progress.finalizationPercent,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-gray-900/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("hr_management.offboarding.title")}
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h2 className="flex flex-wrap items-center gap-2 text-base font-bold text-gray-800">
            <DoorOpen className="size-5 text-orange-500" />
            {t("hr_management.offboarding.title")}
            <span className="text-gray-300">—</span>
            {offboardingCase.employeeName}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-normal text-gray-500">
              {offboardingCase.employeeNo}
            </span>
            <MovementAlertBadge alert={offboardingCase.alert} compact />
          </h2>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex flex-wrap gap-1 border-b border-gray-100 px-4 pt-3">
          {OFFBOARDING_MODAL_TABS.map((tab) => {
            const Icon = TAB_ICON[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-b-2 border-orange-600 text-gray-900"
                    : "border-b-2 border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon className="size-4" />
                {t(OFFBOARDING_MODAL_TAB_I18N_KEY[tab])}
              </button>
            );
          })}
        </div>

        {/**
         * Info: (20260811 - Julian) 已結案的唯讀提示。
         *
         * 用 `<fieldset disabled>` 一次關掉底下所有輸入與按鈕，而不是逐個欄位
         * 傳 `disabled` —— 漏掉一個欄位就等於漏掉一個可以改動已結案資料的破口，
         * 而那種破口不會有人發現。分頁列與底部按鈕在 fieldset 外，仍然可以切換與關閉。
         */}
        {isReadOnly && (
          <div className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50/60 px-5 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <Lock className="size-3.5 shrink-0" />
              {t("hr_management.offboarding.readonly_notice")}
            </p>
            <button
              type="button"
              onClick={onReopen}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
            >
              {t("hr_management.offboarding.action_reopen")}
            </button>
          </div>
        )}

        <fieldset
          disabled={isReadOnly}
          className="min-w-0 flex-1 overflow-y-auto border-0 px-5 py-5 disabled:opacity-75"
        >
          {activeTab === OffboardingModalTab.APPLICATION && (
            <OffboardingApplicationTab
              offboardingCase={offboardingCase}
              form={form}
              notice={notice}
              onChange={onChange}
            />
          )}

          {activeTab === OffboardingModalTab.HANDOVER && (
            <OffboardingHandoverTab
              form={form}
              candidates={candidates}
              onChange={onChange}
              onToggleTask={onToggleTask}
              onApprove={onApprove}
              onRevokeApproval={onRevokeApproval}
            />
          )}

          {activeTab === OffboardingModalTab.ASSET && (
            <OffboardingAssetTab
              form={form}
              onChange={onChange}
              onToggleTask={onToggleTask}
              todayIso={todayIso}
            />
          )}

          {activeTab === OffboardingModalTab.FINALIZATION && (
            <OffboardingFinalizationTab
              form={form}
              employeeEmail={offboardingCase.email}
              onChange={onChange}
              onToggleTask={onToggleTask}
            />
          )}
        </fieldset>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
          {/**
           * Info: (20260811 - Julian) 三段進度做成可點的捷徑。
           * 使用者看到「資產回收 50%」的下一個動作一定是去看那一頁，
           * 讓他再回頭找分頁列是多餘的一步。
           */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold tracking-wider text-gray-400 uppercase">
              {t("hr_management.offboarding.progress_title")}
            </span>
            {progressItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`rounded-full px-2.5 py-1 font-semibold transition ${
                  item.percent === 100
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t(item.labelKey)} {item.percent}%
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isReadOnly && (
              <span className="text-[11px] text-gray-400">
                {t("hr_management.offboarding.autosave_hint")}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              {t("hr_management.offboarding.action_close")}
            </button>
            {/* Info: (20260811 - Julian) 唯讀時沒有異動可存，留一個「儲存」只會讓人以為改得動 */}
            {!isReadOnly && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
              >
                {t("hr_management.offboarding.action_save")}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default OffboardingProcessModal;
