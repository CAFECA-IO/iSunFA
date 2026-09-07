"use client";

import { FC } from "react";
import { BadgeCheck, Link2, Plus, Trash2 } from "lucide-react";
import OffboardingNoteField from "@/components/hr_management/movement/offboarding_note_field";
import {
  HANDOVER_ITEM_STATE_I18N_KEY,
  HANDOVER_ITEM_STATE_STYLE,
  HR_INPUT_CLASS,
  HandoverItemState,
  OffboardingModalTab,
} from "@/constants/hr_management";
import {
  IEmployeeListItem,
  IHandoverItem,
  IOffboardingForm,
} from "@/interfaces/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IOffboardingHandoverTabProps {
  form: IOffboardingForm;
  /** Info: (20260811 - Julian) 可指定為交接對象的同部門在職同仁 */
  candidates: IEmployeeListItem[];
  onChange: (patch: Partial<IOffboardingForm>) => void;
  /** Info: (20260811 - Julian) 對應到既有任務的列，勾選要同步回看板 */
  onToggleTask: (taskId: string, isDone: boolean) => void;
  onApprove: () => void;
  onRevokeApproval: () => void;
}

const LABEL_CLASS = "text-xs font-medium text-gray-500";

// Info: (20260813 - Julian) 使用者自行新增的交接列的 id 前綴，範本列用的是 taskId
const EXTRA_ITEM_ID_PREFIX = "handover-extra-";

/**
 * Info: (20260813 - Julian) 新增列的編號取「既有最大號 + 1」，不是「筆數 + 1」。
 *
 * 用筆數的話，刪掉中間一列之後下一次新增會算出一個還在使用中的 id ——
 * 而 `updateItem` 與 `removeItem` 都是比對 id：打字會同時改到兩列，
 * 按一次垃圾桶會一次刪掉兩列，`mergeOffboardingForm` 也會把兩列併成一列。
 *
 * 仍然不用亂數或時間戳：這個元件在 SSR 與客戶端各跑一次，兩邊必須算出同一個值。
 */
function nextExtraItemId(items: IHandoverItem[]): string {
  const largest = items.reduce((max, item) => {
    if (!item.id.startsWith(EXTRA_ITEM_ID_PREFIX)) return max;
    const serial = Number(item.id.slice(EXTRA_ITEM_ID_PREFIX.length));
    return Number.isInteger(serial) && serial > max ? serial : max;
  }, 0);
  return `${EXTRA_ITEM_ID_PREFIX}${largest + 1}`;
}

/**
 * Info: (20260811 - Julian) 分頁二：工作交接。
 *
 * 「交接狀態」與「接替人已確認」是兩個獨立的勾：
 * 交接人說交出去了，不等於接手的人知道自己接了什麼。
 * 為避免離職爭議，須做雙重確認。
 */
const OffboardingHandoverTab: FC<IOffboardingHandoverTabProps> = ({
  form,
  candidates,
  onChange,
  onToggleTask,
  onApprove,
  onRevokeApproval,
}) => {
  const { t } = useTranslation();

  const updateItem = (id: string, patch: Partial<IHandoverItem>) =>
    onChange({
      handoverItems: form.handoverItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });

  const toggleState = (item: IHandoverItem) => {
    const next =
      item.state === HandoverItemState.DONE
        ? HandoverItemState.PENDING
        : HandoverItemState.DONE;
    updateItem(item.id, { state: next });
    if (item.taskId) onToggleTask(item.taskId, next === HandoverItemState.DONE);
  };

  const addItem = () =>
    onChange({
      handoverItems: [
        ...form.handoverItems,
        {
          id: nextExtraItemId(form.handoverItems),
          taskId: null,
          title: "",
          link: "",
          state: HandoverItemState.PENDING,
          isConfirmed: false,
        },
      ],
    });

  const removeItem = (id: string) =>
    onChange({
      handoverItems: form.handoverItems.filter((item) => item.id !== id),
    });

  const pendingCount = form.handoverItems.filter(
    (item) => item.state !== HandoverItemState.DONE,
  ).length;
  const isApproved = form.isApproved;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
          {t("hr_management.offboarding.section_assignee")}
        </h3>
        <label htmlFor="offboarding-handover-assignee" className={LABEL_CLASS}>
          {t("hr_management.offboarding.assignee_label")}
        </label>
        <select
          id="offboarding-handover-assignee"
          value={form.handoverAssigneeId}
          onChange={(event) =>
            onChange({ handoverAssigneeId: event.target.value })
          }
          className={`mt-1.5 w-full bg-white sm:max-w-xs ${HR_INPUT_CLASS}`}
        >
          <option value="">
            {t("hr_management.offboarding.assignee_unset")}
          </option>
          {candidates.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
              {person.jobTitle ? `（${person.jobTitle}）` : ""}
            </option>
          ))}
        </select>
        {form.handoverAssigneeId === "" && (
          <p className="mt-1.5 text-[11px] text-amber-600">
            {t("hr_management.offboarding.assignee_hint")}
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">
            {t("hr_management.offboarding.section_items")}
          </h3>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <Plus className="size-3.5 shrink-0" />
            {t("hr_management.offboarding.item_add")}
          </button>
        </div>

        {form.handoverItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
            {t("hr_management.offboarding.item_empty")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {form.handoverItems.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-gray-200 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(event) =>
                      updateItem(item.id, { title: event.target.value })
                    }
                    /**
                     * Info: (20260811 - Julian) 來自範本的列不給改標題：
                     * 因為它同時掛在看板與交接矩陣上，在這裡改名會讓另外兩個畫面
                     * 出現一個沒人認得的項目。
                     */
                    readOnly={item.taskId !== null}
                    aria-label={t("hr_management.offboarding.item_title")}
                    placeholder={t(
                      "hr_management.offboarding.item_title_placeholder",
                    )}
                    className={`min-w-0 flex-1 ${HR_INPUT_CLASS} ${item.taskId ? "border-transparent bg-gray-50 font-medium" : ""}`}
                  />

                  <button
                    type="button"
                    onClick={() => toggleState(item)}
                    aria-pressed={item.state === HandoverItemState.DONE}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition ${HANDOVER_ITEM_STATE_STYLE[item.state]}`}
                  >
                    {t(HANDOVER_ITEM_STATE_I18N_KEY[item.state])}
                  </button>

                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={item.isConfirmed}
                      onChange={(event) =>
                        updateItem(item.id, {
                          isConfirmed: event.target.checked,
                        })
                      }
                      className="size-3.5 accent-orange-600"
                    />
                    {t("hr_management.offboarding.item_confirmed")}
                  </label>

                  {item.taskId === null && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={t("hr_management.offboarding.item_remove")}
                      className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <Link2 className="size-3.5 shrink-0 text-gray-300" />
                  <input
                    type="text"
                    value={item.link}
                    onChange={(event) =>
                      updateItem(item.id, { link: event.target.value })
                    }
                    aria-label={t("hr_management.offboarding.item_link")}
                    placeholder={t(
                      "hr_management.offboarding.item_link_placeholder",
                    )}
                    className={`min-w-0 flex-1 ${HR_INPUT_CLASS}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">
          {t("hr_management.offboarding.section_approval")}
        </h3>

        {isApproved ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              <BadgeCheck className="size-4" />
              {t("hr_management.offboarding.approval_done", {
                name: form.approvedBy ?? t("hr_management.value.none"),
                at: form.approvedAt ?? t("hr_management.value.none"),
              })}
            </p>
            <button
              type="button"
              onClick={onRevokeApproval}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              {t("hr_management.offboarding.approval_revoke")}
            </button>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onApprove}
              disabled={pendingCount > 0 || form.approvalTaskId === null}
              className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              {t("hr_management.offboarding.approval_action")}
            </button>
            {/* Info: (20260811 - Julian) 還有項目沒交接完就不給簽 */}
            <p className="text-xs text-gray-500">
              {pendingCount > 0
                ? t("hr_management.offboarding.approval_blocked", {
                    count: pendingCount,
                  })
                : t("hr_management.offboarding.approval_ready")}
            </p>
          </div>
        )}
      </section>

      <OffboardingNoteField
        id="offboarding-note-handover"
        value={form.notes[OffboardingModalTab.HANDOVER]}
        onChange={(value) =>
          onChange({
            notes: { ...form.notes, [OffboardingModalTab.HANDOVER]: value },
          })
        }
      />
    </div>
  );
};

export default OffboardingHandoverTab;
