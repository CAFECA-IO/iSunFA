"use client";

import { FC } from "react";
import { Mail, MonitorCog, Package } from "lucide-react";
import OffboardingCheckRow from "@/components/hr_management/movement/offboarding_check_row";
import OffboardingNoteField from "@/components/hr_management/movement/offboarding_note_field";
import {
  HR_INPUT_CLASS,
  HandoverCategory,
  OffboardingModalTab,
} from "@/constants/hr_management";
import {
  IOffboardingAsset,
  IOffboardingForm,
} from "@/interfaces/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IOffboardingAssetTabProps {
  form: IOffboardingForm;
  /** Info: (20260811 - Julian) 勾選當下就寫回任務，看板與交接矩陣同步更新 */
  onChange: (patch: Partial<IOffboardingForm>) => void;
  onToggleTask: (taskId: string, isDone: boolean) => void;
  /** Info: (20260811 - Julian) 勾選時用來填回收日期的基準日 */
  todayIso: string;
}

const LABEL_CLASS = "text-xs font-medium text-gray-500";

/**
 * Info: (20260811 - Julian) 分頁三：IT 與總務資產回收。
 * 分成 IT 與總務兩區，方便 HR 判斷要催的是哪個單位。
 * 由於帳號沒有實體可以收回，它只有一個「生效時間」。
 */
const OffboardingAssetTab: FC<IOffboardingAssetTabProps> = ({
  form,
  onChange,
  onToggleTask,
  todayIso,
}) => {
  const { t } = useTranslation();

  const updateAsset = (taskId: string, patch: Partial<IOffboardingAsset>) =>
    onChange({
      assets: form.assets.map((asset) =>
        asset.taskId === taskId ? { ...asset, ...patch } : asset,
      ),
    });

  const toggleAsset = (asset: IOffboardingAsset, next: boolean) => {
    updateAsset(asset.taskId, {
      isReturned: next,
      /**
       * Info: (20260811 - Julian) 勾起來就把今天填進回收日期，取消就清空。
       * 留著上一次的日期會讓「未回收但有回收日」這種矛盾狀態存在。
       */
      returnedDate: next ? asset.returnedDate || todayIso : "",
    });
    onToggleTask(asset.taskId, next);
  };

  const assetGroups = [
    {
      category: HandoverCategory.IT,
      icon: MonitorCog,
      titleKey: "hr_management.offboarding.group_it",
    },
    {
      category: HandoverCategory.ASSET,
      icon: Package,
      titleKey: "hr_management.offboarding.group_ga",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {assetGroups.map((group) => {
        const scoped = form.assets.filter(
          (asset) => asset.category === group.category,
        );
        if (scoped.length === 0) return null;
        const Icon = group.icon;

        return (
          <section key={group.category}>
            <h3 className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
              <Icon className="size-4 text-orange-500" />
              {t(group.titleKey)}
              <span className="font-normal normal-case">
                {t("hr_management.offboarding.group_owner", {
                  name: scoped[0].assigneeName,
                })}
              </span>
            </h3>

            <ul className="rounded-xl border border-gray-100">
              {scoped.map((asset) => (
                <OffboardingCheckRow
                  key={asset.taskId}
                  isChecked={asset.isReturned}
                  onToggle={(next) => toggleAsset(asset, next)}
                  label={asset.name}
                  tag={asset.assetNo}
                  meta={
                    asset.isReturned
                      ? t("hr_management.offboarding.handled_by", {
                          name: asset.assigneeName,
                          date: asset.returnedDate,
                        })
                      : t("hr_management.offboarding.click_to_complete")
                  }
                >
                  {asset.isReturned && (
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor={`asset-date-${asset.taskId}`}
                        className={LABEL_CLASS}
                      >
                        {t("hr_management.offboarding.asset_returned_date")}
                      </label>
                      <input
                        id={`asset-date-${asset.taskId}`}
                        type="date"
                        value={asset.returnedDate}
                        onChange={(event) =>
                          updateAsset(asset.taskId, {
                            returnedDate: event.target.value,
                          })
                        }
                        className={HR_INPUT_CLASS}
                      />
                      <input
                        type="text"
                        value={asset.note}
                        onChange={(event) =>
                          updateAsset(asset.taskId, {
                            note: event.target.value,
                          })
                        }
                        aria-label={t("hr_management.offboarding.asset_note")}
                        placeholder={t(
                          "hr_management.offboarding.asset_note_placeholder",
                        )}
                        className={`min-w-0 flex-1 ${HR_INPUT_CLASS}`}
                      />
                    </div>
                  )}
                </OffboardingCheckRow>
              ))}
            </ul>
          </section>
        );
      })}

      <section>
        <h3 className="mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
          {t("hr_management.offboarding.section_revoke")}
        </h3>

        <ul className="rounded-xl border border-gray-100">
          {form.revokes.map((item) => (
            <OffboardingCheckRow
              key={item.taskId}
              isChecked={item.isDone}
              onToggle={(next) => {
                onChange({
                  revokes: form.revokes.map((entry) =>
                    entry.taskId === item.taskId
                      ? { ...entry, isDone: next }
                      : entry,
                  ),
                });
                onToggleTask(item.taskId, next);
              }}
              label={item.title}
              meta={
                item.isDone
                  ? t("hr_management.offboarding.revoke_done")
                  : t("hr_management.offboarding.revoke_scheduled", {
                      at: item.scheduledAt.replace("T", " "),
                    })
              }
            />
          ))}
        </ul>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="offboarding-revoke-at" className={LABEL_CLASS}>
              {t("hr_management.offboarding.revoke_at_label")}
            </label>
            <input
              id="offboarding-revoke-at"
              type="datetime-local"
              value={form.revokes[0]?.scheduledAt ?? ""}
              onChange={(event) =>
                // Info: (20260811 - Julian) 一次改完所有停權項目。
                onChange({
                  revokes: form.revokes.map((entry) => ({
                    ...entry,
                    scheduledAt: event.target.value,
                  })),
                })
              }
              className={`mt-1.5 w-full ${HR_INPUT_CLASS}`}
            />
            <p className="mt-1 text-[11px] text-gray-400">
              {t("hr_management.offboarding.revoke_at_hint")}
            </p>
          </div>

          <div>
            <label htmlFor="offboarding-mail-forward" className={LABEL_CLASS}>
              {t("hr_management.offboarding.mail_forward_label")}
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-gray-300" />
              <input
                id="offboarding-mail-forward"
                type="email"
                value={form.mailForwardTo}
                onChange={(event) =>
                  onChange({ mailForwardTo: event.target.value })
                }
                placeholder={t(
                  "hr_management.offboarding.mail_forward_placeholder",
                )}
                className={`min-w-0 flex-1 ${HR_INPUT_CLASS}`}
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              {t("hr_management.offboarding.mail_forward_hint")}
            </p>
          </div>
        </div>
      </section>

      <OffboardingNoteField
        id="offboarding-note-asset"
        value={form.notes[OffboardingModalTab.ASSET]}
        onChange={(value) =>
          onChange({
            notes: { ...form.notes, [OffboardingModalTab.ASSET]: value },
          })
        }
      />
    </div>
  );
};

export default OffboardingAssetTab;
