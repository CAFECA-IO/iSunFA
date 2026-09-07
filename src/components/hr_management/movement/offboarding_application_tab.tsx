"use client";

import { FC } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import OffboardingNoteField from "@/components/hr_management/movement/offboarding_note_field";
import {
  HR_INPUT_CLASS,
  OffboardingModalTab,
  RESIGNATION_REASONS,
  RESIGNATION_REASON_I18N_KEY,
  ResignationReason,
} from "@/constants/hr_management";
import {
  INoticePeriodCheck,
  IOffboardingCase,
  IOffboardingForm,
} from "@/interfaces/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IOffboardingApplicationTabProps {
  offboardingCase: IOffboardingCase;
  form: IOffboardingForm;
  notice: INoticePeriodCheck;
  onChange: (patch: Partial<IOffboardingForm>) => void;
}

const LABEL_CLASS = "text-xs font-medium text-gray-500";

/**
 * Info: (20260811 - Julian) 分頁一：離職申請資訊。
 *
 * 預告期檢核放在日期欄位的「正下方」，因為它是那三個日期的結果 ——
 * 改完預定離職日就會看到天數跟著變，這種因果關係隔一段距離就不成立了。
 */
const OffboardingApplicationTab: FC<IOffboardingApplicationTabProps> = ({
  offboardingCase,
  form,
  notice,
  onChange,
}) => {
  const { t } = useTranslation();

  const dateFields = [
    {
      id: "offboarding-expected-date",
      label: t("hr_management.offboarding.date_expected"),
      value: form.expectedLeaveDate,
      onChange: (value: string) => onChange({ expectedLeaveDate: value }),
      hint: t("hr_management.offboarding.date_expected_hint"),
    },
    {
      id: "offboarding-last-working-date",
      label: t("hr_management.offboarding.date_last_working"),
      value: form.lastWorkingDate,
      onChange: (value: string) => onChange({ lastWorkingDate: value }),
      hint: t("hr_management.offboarding.date_last_working_hint"),
    },
    {
      id: "offboarding-insurance-date",
      label: t("hr_management.offboarding.date_insurance_off"),
      value: form.insuranceOffDate,
      onChange: (value: string) => onChange({ insuranceOffDate: value }),
      hint: t("hr_management.offboarding.date_insurance_off_hint"),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
          {t("hr_management.offboarding.section_reason")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <div>
            <label htmlFor="offboarding-reason" className={LABEL_CLASS}>
              {t("hr_management.offboarding.reason_label")}
            </label>
            <select
              id="offboarding-reason"
              value={form.reason}
              onChange={(event) =>
                onChange({ reason: event.target.value as ResignationReason })
              }
              className={`mt-1.5 w-full bg-white ${HR_INPUT_CLASS}`}
            >
              {RESIGNATION_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {t(RESIGNATION_REASON_I18N_KEY[reason])}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="offboarding-reason-note" className={LABEL_CLASS}>
              {t("hr_management.offboarding.reason_note")}
            </label>
            <input
              id="offboarding-reason-note"
              type="text"
              value={form.reasonNote}
              onChange={(event) => onChange({ reasonNote: event.target.value })}
              placeholder={t(
                "hr_management.offboarding.reason_note_placeholder",
              )}
              className={`mt-1.5 w-full ${HR_INPUT_CLASS}`}
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
          {t("hr_management.offboarding.section_dates")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {dateFields.map((field) => (
            <div key={field.id}>
              <label htmlFor={field.id} className={LABEL_CLASS}>
                {field.label}
              </label>
              <input
                id={field.id}
                type="date"
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                className={`mt-1.5 w-full ${HR_INPUT_CLASS}`}
              />
              <p className="mt-1 text-[11px] text-gray-400">{field.hint}</p>
            </div>
          ))}
        </div>

        {/* Info: (20260811 - Julian) 「年資 → 法定天數 → 實際天數」 */}
        <div
          className={`mt-4 rounded-xl border px-4 py-3 ${
            notice.isSatisfied
              ? "border-emerald-200 bg-emerald-50/50"
              : "border-amber-200 bg-amber-50/60"
          }`}
        >
          <p
            className={`flex items-center gap-1.5 text-sm font-semibold ${
              notice.isSatisfied ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {notice.isSatisfied ? (
              <ShieldCheck className="size-4 shrink-0" />
            ) : (
              <ShieldAlert className="size-4 shrink-0" />
            )}
            {notice.isSatisfied
              ? t("hr_management.offboarding.notice_ok")
              : t("hr_management.offboarding.notice_short", {
                  days: notice.shortageDays,
                })}
          </p>
          <p className="mt-1.5 text-xs text-gray-600">
            {t("hr_management.offboarding.notice_formula", {
              months: offboardingCase.tenureMonths,
              required: notice.requiredDays,
            })}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            {t("hr_management.offboarding.notice_actual", {
              from: offboardingCase.noticeDate,
              to: form.expectedLeaveDate,
              days: notice.actualDays,
            })}
          </p>
          {!notice.isSatisfied && (
            <p className="mt-2 text-xs text-amber-700">
              {t("hr_management.offboarding.notice_law")}
            </p>
          )}
        </div>
      </section>

      <OffboardingNoteField
        id="offboarding-note-application"
        value={form.notes[OffboardingModalTab.APPLICATION]}
        onChange={(value) =>
          onChange({
            notes: {
              ...form.notes,
              [OffboardingModalTab.APPLICATION]: value,
            },
          })
        }
      />
    </div>
  );
};

export default OffboardingApplicationTab;
