"use client";

import { FC } from "react";
import { FileText, Send } from "lucide-react";
import OffboardingCheckRow from "@/components/hr_management/movement/offboarding_check_row";
import OffboardingNoteField from "@/components/hr_management/movement/offboarding_note_field";
import {
  CERTIFICATE_STATE_I18N_KEY,
  CERTIFICATE_STATE_STYLE,
  CertificateState,
  HR_INPUT_CLASS,
  MONTHLY_PAYROLL_DAYS,
  OffboardingModalTab,
} from "@/constants/hr_management";
import { IOffboardingForm } from "@/interfaces/hr_management";
import { estimateLeavePayout } from "@/lib/utils/hr_offboarding";
import { MoneyUtil } from "@/lib/utils/money";
import { useTranslation } from "@/i18n/i18n_context";

interface IOffboardingFinalizationTabProps {
  form: IOffboardingForm;
  employeeEmail: string;
  onChange: (patch: Partial<IOffboardingForm>) => void;
  onToggleTask: (taskId: string, isDone: boolean) => void;
}

const LABEL_CLASS = "text-xs font-medium text-gray-500";

/**
 * Info: (20260811 - Julian) 分頁四：退保申報與薪資結算。
 *
 * 三張退保表各有各的生效日，因此各自一列 —— 併成一項「勞健保退保」的話，
 * 只退了勞保的案件會顯示成 HR 已完成，而健保多留一個月是要收保費的。
 */
const OffboardingFinalizationTab: FC<IOffboardingFinalizationTabProps> = ({
  form,
  employeeEmail,
  onChange,
  onToggleTask,
}) => {
  const { t } = useTranslation();

  const payout = estimateLeavePayout(
    form.remainingLeaveDays,
    form.monthlySalary,
  );
  const isPreviewed = form.certificateState !== CertificateState.NOT_ISSUED;
  const isSent = form.certificateState === CertificateState.SENT;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
          {t("hr_management.offboarding.section_insurance")}
        </h3>

        <ul className="rounded-xl border border-gray-100">
          {form.insurances.map((item) => (
            <OffboardingCheckRow
              key={item.taskId}
              isChecked={item.isDone}
              onToggle={(next) => {
                onChange({
                  insurances: form.insurances.map((entry) =>
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
                  ? t("hr_management.offboarding.insurance_effective", {
                      date: item.effectiveDate,
                    })
                  : t("hr_management.offboarding.click_to_complete")
              }
            >
              {item.isDone && (
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor={`insurance-date-${item.taskId}`}
                    className={LABEL_CLASS}
                  >
                    {t("hr_management.offboarding.insurance_date")}
                  </label>
                  <input
                    id={`insurance-date-${item.taskId}`}
                    type="date"
                    value={item.effectiveDate}
                    onChange={(event) =>
                      onChange({
                        insurances: form.insurances.map((entry) =>
                          entry.taskId === item.taskId
                            ? { ...entry, effectiveDate: event.target.value }
                            : entry,
                        ),
                      })
                    }
                    className={HR_INPUT_CLASS}
                  />
                </div>
              )}
            </OffboardingCheckRow>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
          {t("hr_management.offboarding.section_payroll")}
        </h3>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor="offboarding-remaining-leave"
              className={LABEL_CLASS}
            >
              {t("hr_management.offboarding.remaining_leave")}
            </label>
            <input
              id="offboarding-remaining-leave"
              type="number"
              min={0}
              step={0.5}
              value={form.remainingLeaveDays}
              onChange={(event) =>
                onChange({ remainingLeaveDays: Number(event.target.value) })
              }
              className={`mt-1.5 w-full ${HR_INPUT_CLASS}`}
            />
          </div>
          <div>
            <label htmlFor="offboarding-monthly-salary" className={LABEL_CLASS}>
              {t("hr_management.offboarding.monthly_salary")}
            </label>
            <input
              id="offboarding-monthly-salary"
              type="number"
              min={0}
              step={1000}
              value={form.monthlySalary}
              onChange={(event) =>
                onChange({ monthlySalary: event.target.value })
              }
              className={`mt-1.5 w-full ${HR_INPUT_CLASS}`}
            />
          </div>
          <div>
            <span className={LABEL_CLASS}>
              {t("hr_management.offboarding.payout_estimate")}
            </span>
            {/**
             * Info: (20260812 - Julian) 千分位交給 `MoneyUtil.format`，
             * 不用 `Number.toLocaleString` —— 後者要先把金額降級成原生 number。
             */}
            <p className="mt-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-sm font-bold text-gray-800">
              {MoneyUtil.format(payout)}
            </p>
          </div>
        </div>

        {/**
         * Info: (20260811 - Julian) 把算式寫出來而不是只給一個數字。
         * 折算金額會被員工拿去對，寫出「月薪 ÷ 30 × 天數」才對得起來；
         * 而它只是特休這一項，不是最後實領，畫面上必須講清楚。
         */}
        <p className="mt-2 text-[11px] text-gray-400">
          {t("hr_management.offboarding.payout_formula", {
            days: MONTHLY_PAYROLL_DAYS,
          })}
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <h3 className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
          {t("hr_management.offboarding.section_certificate")}
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] normal-case ${CERTIFICATE_STATE_STYLE[form.certificateState]}`}
          >
            {t(CERTIFICATE_STATE_I18N_KEY[form.certificateState])}
          </span>
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* ToDo: (20260811 - Julian) 產檔 API 完成後改為開啟真正的 PDF 預覽 */}
          <button
            type="button"
            onClick={() =>
              onChange({
                certificateState: isSent
                  ? CertificateState.SENT
                  : CertificateState.PREVIEWED,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <FileText className="size-3.5" />
            {t("hr_management.offboarding.certificate_preview")}
          </button>

          <button
            type="button"
            disabled={!isPreviewed || isSent}
            onClick={() => {
              onChange({ certificateState: CertificateState.SENT });
              if (form.certificateTaskId) {
                onToggleTask(form.certificateTaskId, true);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            <Send className="size-3.5" />
            {t("hr_management.offboarding.certificate_send")}
          </button>

          <p className="text-xs text-gray-500">
            {/**
             * Info: (20260811 - Julian) 沒預覽過不給寄。
             * 離職證明上的年資與職稱是要拿去用的文件，寄出後才發現寫錯
             * 只能再寄一次更正版，而收件匣裡兩份不一樣的證明本身就是問題。
             */}
            {isSent
              ? t("hr_management.offboarding.certificate_sent_to", {
                  email: employeeEmail,
                })
              : t("hr_management.offboarding.certificate_hint")}
          </p>
        </div>
      </section>

      <OffboardingNoteField
        id="offboarding-note-finalization"
        value={form.notes[OffboardingModalTab.FINALIZATION]}
        onChange={(value) =>
          onChange({
            notes: {
              ...form.notes,
              [OffboardingModalTab.FINALIZATION]: value,
            },
          })
        }
      />
    </div>
  );
};

export default OffboardingFinalizationTab;
