"use client";

import { ChangeEvent, FC, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, X } from "lucide-react";
import ProbationScoreRow from "@/components/hr_management/movement/probation_score_row";
import {
  HR_INPUT_CLASS,
  PROBATION_EFFECTIVE_DAY_OFFSET,
  PROBATION_RESULTS,
  PROBATION_RESULT_I18N_KEY,
  PROBATION_SCORE_ITEMS,
  PROBATION_SCORE_ITEM_I18N_KEY,
  PROBATION_SCORE_MAX,
  ProbationResult,
  ProbationScoreItem,
} from "@/constants/hr_management";
import {
  IProbationReviewForm,
  IProbationRow,
} from "@/interfaces/hr_management";
import { addDays, parseIsoDate, toIsoDate } from "@/lib/utils/hr_date";
import { useTranslation } from "@/i18n/i18n_context";

interface IProbationReviewModalProps {
  row: IProbationRow | null;
  // Info: (20260811 - Julian) 該員工既有的表單內容（草稿或已提交），沒有則為 null
  form: IProbationReviewForm | null;
  onClose: () => void;
  onSubmit: (employeeId: string, form: IProbationReviewForm) => void;
}

// Info: (20260811 - Julian) 四項預設給中間值，避免主管被迫從最低分往上點
const DEFAULT_SCORE = 3;

function buildInitialForm(row: IProbationRow): IProbationReviewForm {
  const probationEnd = parseIsoDate(row.probationEndDate);
  return {
    scores: Object.fromEntries(
      PROBATION_SCORE_ITEMS.map((item) => [item, DEFAULT_SCORE]),
    ) as Record<ProbationScoreItem, number>,
    strengths: "",
    improvements: "",
    result: null,
    /**
     * Info: (20260811 - Julian) 轉正生效日預設為試用期滿日的隔天 ——
     * 最後一天仍屬試用期。主管可以改，因為它是薪資的生效點。
     */
    effectiveDate: toIsoDate(
      addDays(probationEnd, PROBATION_EFFECTIVE_DAY_OFFSET),
    ),
    extendUntil: "",
    extendReason: "",
    lastDay: "",
    isSalaryAdjusted: false,
    newSalary: "",
    isPositionAdjusted: false,
    newJobTitle: "",
    isDraft: false,
  };
}

/**
 * Info: (20260811 - Julian) 試用期考核評核表：表頭資訊 + 雙欄評核 + 底部決策。
 *
 * 「暫存草稿」與「提交考核」是兩件不同的事：草稿只保留填寫內容，
 * 清單上仍然是「未考核」、逾期紅燈也不會消。只有提交才算完成 ——
 * 否則主管存個草稿就能讓警示消失，那個警示就失去意義了。
 *
 * ToDo: (20260811 - Julian) 目前只改記憶體。接上 API 後要處理重複提交、
 * 權限（只有直屬主管能填）與草稿的伺服器端保存。
 */
const ProbationReviewModal: FC<IProbationReviewModalProps> = ({
  row,
  form,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<IProbationReviewForm | null>(null);

  // Info: (20260811 - Julian) 換人時重置整份表單的內容
  useEffect(() => {
    if (!row) {
      setDraft(null);
      return;
    }
    setDraft(form ?? buildInitialForm(row));
  }, [row, form]);

  const average = useMemo(() => {
    if (!draft) return 0;
    const values = PROBATION_SCORE_ITEMS.map((item) => draft.scores[item]);
    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.round((total / values.length) * 10) / 10;
  }, [draft]);

  if (!row || !draft) return null;

  const update = (patch: Partial<IProbationReviewForm>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  /**
   * Info: (20260811 - Julian) 可否提交。
   *
   * 除了必填的考核結果，延長與不予錄用「一定要有日期」 ——
   * 沒有日期的「延長試用期」在流程上什麼都推不動，存下去只會讓清單
   * 看起來已處理，但沒有人知道要延到哪一天。原因欄位不強制，
   * 因為它是說明而非流程輸入。
   */
  const isSubmittable =
    draft.result !== null &&
    (draft.result !== ProbationResult.EXTEND || draft.extendUntil !== "") &&
    (draft.result !== ProbationResult.FAIL || draft.lastDay !== "");

  const infoFields = [
    {
      key: "name",
      label: t("hr_management.movement.info_name"),
      value: row.employeeName,
    },
    {
      key: "employeeNo",
      label: t("hr_management.movement.info_employee_no"),
      value: row.employeeNo,
    },
    {
      key: "department",
      label: t("hr_management.movement.info_department"),
      value: row.departmentName ?? t("hr_management.value.none"),
    },
    {
      key: "jobTitle",
      label: t("hr_management.movement.info_job_title"),
      value: row.jobTitle ?? t("hr_management.value.none"),
    },
    {
      key: "hireDate",
      label: t("hr_management.movement.info_hire_date"),
      value: row.hireDate,
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
        aria-label={t("hr_management.movement.review_title")}
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-800">
            <ClipboardList className="h-5 w-5 text-orange-500" />
            {t("hr_management.movement.review_title")}
          </h2>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="size-4 shrink-0" />
          </button>
        </header>

        {/* Info: (20260811 - Julian) 員工資訊列 */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-gray-100 bg-gray-50 px-5 py-3">
          {infoFields.map((field) => (
            <div key={field.key} className="min-w-0">
              <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                {field.label}
              </span>
              <p className="truncate text-sm font-medium text-gray-700">
                {field.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Info: (20260811 - Julian) 區塊 1：主管評分項 */}
            <section>
              <h3 className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
                {t("hr_management.movement.review_section_score")}
              </h3>
              <div className="flex flex-col gap-3">
                {PROBATION_SCORE_ITEMS.map((item) => (
                  <ProbationScoreRow
                    key={item}
                    label={t(PROBATION_SCORE_ITEM_I18N_KEY[item])}
                    value={draft.scores[item]}
                    onChange={(score) =>
                      update({ scores: { ...draft.scores, [item]: score } })
                    }
                  />
                ))}
              </div>

              <div className="mt-4 flex items-baseline gap-2 rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                  {t("hr_management.movement.score_average")}
                </span>
                <span className="text-lg font-bold text-gray-800">
                  {average.toFixed(1)}
                </span>
                <span className="text-sm text-gray-400">
                  / {PROBATION_SCORE_MAX.toFixed(1)}
                </span>
              </div>
            </section>

            {/* Info: (20260811 - Julian) 區塊 2：綜合評語 */}
            <section>
              <h3 className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
                {t("hr_management.movement.review_section_comment")}
              </h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="probation-strengths"
                    className="text-sm text-gray-600"
                  >
                    {t("hr_management.movement.comment_strengths")}
                  </label>
                  <textarea
                    id="probation-strengths"
                    rows={4}
                    value={draft.strengths}
                    onChange={(event) =>
                      update({ strengths: event.target.value })
                    }
                    placeholder={t(
                      "hr_management.movement.comment_strengths_placeholder",
                    )}
                    className={`mt-1.5 w-full resize-none ${HR_INPUT_CLASS}`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="probation-improvements"
                    className="text-sm text-gray-600"
                  >
                    {t("hr_management.movement.comment_improvements")}
                  </label>
                  <textarea
                    id="probation-improvements"
                    rows={4}
                    value={draft.improvements}
                    onChange={(event) =>
                      update({ improvements: event.target.value })
                    }
                    placeholder={t(
                      "hr_management.movement.comment_improvements_placeholder",
                    )}
                    className={`mt-1.5 w-full resize-none ${HR_INPUT_CLASS}`}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Info: (20260811 - Julian) 區塊 3：考核結果與決策 */}
          <section className="mt-6 border-t border-gray-100 pt-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
              {t("hr_management.movement.review_section_result")}
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] text-red-600 normal-case">
                {t("hr_management.movement.review_required")}
              </span>
            </h3>

            <div className="flex flex-col gap-2">
              {PROBATION_RESULTS.map((option) => {
                const isSelected = draft.result === option;
                return (
                  <div
                    key={option}
                    className={`rounded-xl border px-4 py-3 transition-colors ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/50"
                        : "border-gray-200"
                    }`}
                  >
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="radio"
                        name="probation-result"
                        checked={isSelected}
                        onChange={() => update({ result: option })}
                        className="size-4 shrink-0 accent-orange-600"
                      />
                      <span className="text-sm font-semibold text-gray-700">
                        {t(PROBATION_RESULT_I18N_KEY[option])}
                      </span>
                    </label>

                    {/* Info: (20260811 - Julian) 附帶欄位只在選中該項時出現 */}
                    {isSelected && option === ProbationResult.PASS && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
                        <label
                          htmlFor="probation-effective"
                          className="text-xs text-gray-500"
                        >
                          {t("hr_management.movement.result_effective_date")}
                        </label>
                        <input
                          id="probation-effective"
                          type="date"
                          value={draft.effectiveDate}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            update({ effectiveDate: event.target.value })
                          }
                          className={HR_INPUT_CLASS}
                        />
                      </div>
                    )}

                    {/*
                      Info: (20260812 - Julian) 送出後名冊真的會變，先講清楚變成什麼。

                      通過轉正改的是員工狀態、且以生效日為準，不是按下送出就生效；
                      生效之後該員離開試用期清單。這兩件事都看不見 ——
                      不寫在這裡，使用者只會看到一列突然消失。
                    */}
                    {isSelected && option === ProbationResult.PASS && (
                      <p
                        role="status"
                        className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500"
                      >
                        {t("hr_management.movement.probation_pass_notice")}
                      </p>
                    )}

                    {isSelected && option === ProbationResult.EXTEND && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
                        <label
                          htmlFor="probation-extend"
                          className="text-xs text-gray-500"
                        >
                          {t("hr_management.movement.result_extend_until")}
                        </label>
                        <input
                          id="probation-extend"
                          type="date"
                          value={draft.extendUntil}
                          onChange={(event) =>
                            update({ extendUntil: event.target.value })
                          }
                          className={HR_INPUT_CLASS}
                        />
                        <label
                          htmlFor="probation-extend-reason"
                          className="text-xs text-gray-500"
                        >
                          {t("hr_management.movement.result_extend_reason")}
                        </label>
                        <input
                          id="probation-extend-reason"
                          type="text"
                          value={draft.extendReason}
                          onChange={(event) =>
                            update({ extendReason: event.target.value })
                          }
                          className={`min-w-0 flex-1 ${HR_INPUT_CLASS}`}
                        />
                      </div>
                    )}

                    {/* Info: (20260812 - Julian) 延長改的是到期日，逾期紅燈依新日期重算 */}
                    {isSelected && option === ProbationResult.EXTEND && (
                      <p
                        role="status"
                        className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500"
                      >
                        {t("hr_management.movement.probation_extend_notice")}
                      </p>
                    )}

                    {isSelected && option === ProbationResult.FAIL && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
                        <label
                          htmlFor="probation-last-day"
                          className="text-xs text-gray-500"
                        >
                          {t("hr_management.movement.result_last_day")}
                        </label>
                        <input
                          id="probation-last-day"
                          type="date"
                          value={draft.lastDay}
                          onChange={(event) =>
                            update({ lastDay: event.target.value })
                          }
                          className={HR_INPUT_CLASS}
                        />
                      </div>
                    )}

                    {/*
                      Info: (20260812 - Julian) 不予錄用不是「考核填完就結束」。
                      試用期不合格終止契約在實務上仍走資遣程序，因此還有預告期、
                      資遣費與資遣通報三件事要辦，而這張表單一件都不會幫他做。
                      這裡只提示、不自動建立離職案件 —— 那是 HR 的權責，
                      不該由主管按下送出的當下代為決定。
                    */}
                    {isSelected && option === ProbationResult.FAIL && (
                      <p
                        role="status"
                        className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700"
                      >
                        <AlertTriangle className="mt-px size-3.5 shrink-0" />
                        {t("hr_management.movement.probation_fail_notice")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Info: (20260811 - Julian) 調整項目（選填） */}
            <div className="mt-5">
              <h4 className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                {t("hr_management.movement.adjustment_title")}
                <span className="ml-1 normal-case">
                  （{t("common.optional_in_parentheses")}）
                </span>
              </h4>

              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
                  <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={draft.isSalaryAdjusted}
                      onChange={(event) =>
                        update({ isSalaryAdjusted: event.target.checked })
                      }
                      className="size-4 shrink-0 accent-orange-600"
                    />
                    {t("hr_management.movement.adjustment_salary")}
                  </label>
                  {draft.isSalaryAdjusted && (
                    <input
                      type="text"
                      inputMode="numeric"
                      value={draft.newSalary}
                      onChange={(event) =>
                        update({ newSalary: event.target.value })
                      }
                      placeholder={t(
                        "hr_management.movement.adjustment_new_salary",
                      )}
                      aria-label={t(
                        "hr_management.movement.adjustment_new_salary",
                      )}
                      className={`min-w-0 flex-1 ${HR_INPUT_CLASS}`}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
                  <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={draft.isPositionAdjusted}
                      onChange={(event) =>
                        update({ isPositionAdjusted: event.target.checked })
                      }
                      className="size-4 shrink-0 accent-orange-600"
                    />
                    {t("hr_management.movement.adjustment_position")}
                  </label>
                  {draft.isPositionAdjusted && (
                    <input
                      type="text"
                      value={draft.newJobTitle}
                      onChange={(event) =>
                        update({ newJobTitle: event.target.value })
                      }
                      placeholder={t(
                        "hr_management.movement.adjustment_new_title",
                      )}
                      aria-label={t(
                        "hr_management.movement.adjustment_new_title",
                      )}
                      className={`min-w-0 flex-1 ${HR_INPUT_CLASS}`}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={() =>
              onSubmit(row.employeeId, { ...draft, isDraft: true })
            }
            className="mr-auto rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            {t("hr_management.movement.review_save_draft")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            {t("hr_management.movement.review_cancel")}
          </button>
          <button
            type="button"
            disabled={!isSubmittable}
            onClick={() =>
              onSubmit(row.employeeId, { ...draft, isDraft: false })
            }
            className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            {t("hr_management.movement.review_submit")}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ProbationReviewModal;
