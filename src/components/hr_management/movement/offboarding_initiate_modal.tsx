"use client";

import { FC, FormEvent, useMemo, useState } from "react";
import { AlertTriangle, DoorOpen, Info, X } from "lucide-react";
import HrField from "@/components/hr_management/movement/hr_field";
import HrSearchableSelect, {
  IHrSelectOption,
} from "@/components/hr_management/movement/hr_searchable_select";
import {
  EMPLOYEE_STATUS_I18N_KEY,
  HR_INPUT_CLASS,
  OFFBOARDING_TASK_TITLE_I18N_KEY,
  OFFBOARDING_TEMPLATE_I18N_KEY,
  OFFBOARDING_TEMPLATE_KEYS,
  OffboardingTaskKey,
  OffboardingTemplateKey,
  RESIGNATION_TYPES,
  RESIGNATION_TYPE_I18N_KEY,
  ResignationType,
} from "@/constants/hr_management";
import {
  IEmployeeListItem,
  IOffboardingInitiateErrors,
  IOffboardingInitiateForm,
  IOffboardingInitiateResult,
} from "@/interfaces/hr_management";
import { differenceInFullMonths, parseIsoDate } from "@/lib/utils/hr_date";
import {
  applyLastWorkingDateChange,
  buildInitialOffboardingForm,
  buildOffboardingInitiateResult,
  hasOffboardingInitiateError,
  resolveNoticeEstimate,
  resolveOffboardingTemplateItems,
  validateOffboardingInitiateForm,
} from "@/lib/utils/hr_offboarding_initiate";
import { useTranslation } from "@/i18n/i18n_context";

interface IOffboardingInitiateModalProps {
  /** Info: (20260812 - Julian) 可被發起離職的人，已由呼叫端篩選 */
  candidates: IEmployeeListItem[];
  /** Info: (20260812 - Julian) 全部名冊，供交接對象選單使用 */
  people: IEmployeeListItem[];
  today: Date;
  onClose: () => void;
  onSubmit: (result: IOffboardingInitiateResult) => void;
}

type TouchedField = keyof IOffboardingInitiateErrors;

// Info: (20260812 - Julian) 一年幾個月。年資顯示與法定門檻都用它換算
const MONTHS_PER_YEAR = 12;

/**
 * Info: (20260812 - Julian) 發起離職申請：單頁三區塊表單。
 *
 * 在既有員工身上掛一個流程，因此不需要輸入個資欄位，選人就可以了。
 *
 * 預告期即時試算，但「不擋提交」，因為預告不足不一定違法，
 * 而是 1. 雙方合意 2. 雇主付預告期間工資。
 *
 * ToDo: (20260812 - Julian) 接 API 後，員工是否已有進行中的流程要由伺服器判斷；
 * 這裡的候選名單篩選只是前端的即時回饋。
 */
const OffboardingInitiateModal: FC<IOffboardingInitiateModalProps> = ({
  candidates,
  people,
  today,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();

  const [draft, setDraft] = useState<IOffboardingInitiateForm>(() =>
    buildInitialOffboardingForm(today),
  );
  /**
   * Info: (20260812 - Julian) 使用者是否手動改過退保日。
   * 改過就不再隨最後工作日連動 —— 理由同報到端的「部門 → 主管」。
   */
  const [isInsuranceDateTouched, setIsInsuranceDateTouched] =
    useState<boolean>(false);
  const [touched, setTouched] = useState<TouchedField[]>([]);
  const [isSubmitAttempted, setIsSubmitAttempted] = useState<boolean>(false);

  const errors = useMemo<IOffboardingInitiateErrors>(
    () => validateOffboardingInitiateForm(draft, today),
    [draft, today],
  );

  const employee = useMemo(
    () => candidates.find((person) => person.id === draft.employeeId) ?? null,
    [candidates, draft.employeeId],
  );

  /**
   * Info: (20260812 - Julian) 候選人選項。工號放在 `hint`，
   * 因此搜尋框打姓名或工號都找得到（`HrSearchableSelect` 兩者都比對）。
   */
  const candidateOptions = useMemo<IHrSelectOption[]>(
    () =>
      candidates.map((person) => ({
        value: person.id,
        label: `${person.name}・${person.departmentName ?? "—"}`,
        hint: person.employeeNo,
      })),
    [candidates],
  );

  /**
   * Info: (20260812 - Julian) 交接對象分成「同部門」與「其他部門」兩組。
   *
   * 只列同部門會在一人部門變成死路 —— 那一欄必填卻沒有任何可選項；
   * 全部攤平又會讓使用者從一百多人裡找。分組兩者都避開。
   * 同部門排在前面：陣列順序即畫面順序，分組標題由相鄰關係決定。
   */
  const assigneeOptions = useMemo<IHrSelectOption[]>(() => {
    const department = employee?.departmentName ?? null;
    const available = people.filter(
      (person) => person.leaveDate === null && person.id !== draft.employeeId,
    );
    const isSameDepartment = (person: IEmployeeListItem) =>
      department !== null && person.departmentName === department;

    const toOption = (person: IEmployeeListItem): IHrSelectOption => ({
      value: person.id,
      label: isSameDepartment(person)
        ? person.name
        : `${person.name}・${person.departmentName ?? "—"}`,
      hint: person.jobTitle ?? undefined,
      group: isSameDepartment(person)
        ? t("hr_management.value.group_same_department")
        : t("hr_management.value.group_other_department"),
    });

    return [
      ...available.filter(isSameDepartment).map(toOption),
      ...available.filter((person) => !isSameDepartment(person)).map(toOption),
    ];
  }, [people, draft.employeeId, employee, t]);

  const notice = useMemo(
    () =>
      employee && draft.lastWorkingDate !== "" && draft.noticeDate !== ""
        ? resolveNoticeEstimate(employee.hireDate, draft)
        : null,
    [employee, draft],
  );

  // Info: (20260812 - Julian) 區塊 1 的年資看的是「現在」，區塊 2 的門檻看的是最後工作日
  const tenureToDate = useMemo(
    () =>
      employee
        ? differenceInFullMonths(parseIsoDate(employee.hireDate), today)
        : 0,
    [employee, today],
  );

  // Info: (20260812 - Julian) 與實際建立走同一支，資遣時會多一筆通報
  const previewKeys = useMemo(
    () => resolveOffboardingTemplateItems(draft).map((item) => item.key),
    [draft],
  );

  const update = (patch: Partial<IOffboardingInitiateForm>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const markTouched = (field: TouchedField) =>
    setTouched((prev) => (prev.includes(field) ? prev : [...prev, field]));

  const errorOf = (field: TouchedField): string | null => {
    const key = errors[field];
    if (key === null) return null;
    if (!isSubmitAttempted && !touched.includes(field)) return null;
    return t(key);
  };

  // Info: (20260812 - Julian) id、樣式與無障礙屬性一次給齊，理由同報到端
  const fieldProps = (field: TouchedField, inputId: string) => ({
    id: inputId,
    onBlur: () => markTouched(field),
    "aria-invalid": errorOf(field) !== null,
    "aria-describedby": errorOf(field) ? `${inputId}-error` : undefined,
    className: `${HR_INPUT_CLASS} w-full ${errorOf(field) ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`,
  });

  const errorCount = Object.values(errors).filter(
    (value) => value !== null,
  ).length;

  const formatTenure = (months: number): string =>
    t("hr_management.offboarding.tenure_value", {
      years: Math.floor(months / MONTHS_PER_YEAR),
      months: months % MONTHS_PER_YEAR,
    });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitAttempted(true);
    if (hasOffboardingInitiateError(errors) || employee === null) return;
    onSubmit(buildOffboardingInitiateResult(employee, draft, t));
  };

  const infoFields = employee
    ? [
        {
          key: "hireDate",
          label: t("hr_management.offboarding.info_hire_date"),
          value: employee.hireDate,
        },
        {
          key: "tenure",
          label: t("hr_management.offboarding.info_tenure"),
          value: formatTenure(tenureToDate),
        },
        {
          key: "status",
          label: t("hr_management.offboarding.info_status"),
          value: `${t(EMPLOYEE_STATUS_I18N_KEY[employee.status])}（${employee.departmentName ?? "—"}・${employee.jobTitle ?? "—"}）`,
        },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-gray-900/40"
      />

      <form
        role="dialog"
        aria-modal="true"
        aria-label={t("hr_management.offboarding.initiate_title")}
        onSubmit={handleSubmit}
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-800">
              <DoorOpen className="size-5 shrink-0 text-orange-500" />
              {t("hr_management.offboarding.initiate_title")}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {t("hr_management.offboarding.initiate_subtitle")}
            </p>
          </div>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="size-4 shrink-0" />
          </button>
        </header>

        <div className="min-w-0 flex-1 overflow-y-auto px-5 py-5">
          {/* Info: (20260812 - Julian) 區塊 1：選擇離職員工 */}
          <section
            aria-label={t(
              "hr_management.offboarding.initiate_section_employee",
            )}
          >
            <h3 className="mb-3 text-sm font-bold text-gray-800">
              {t("hr_management.offboarding.initiate_section_employee")}
            </h3>

            {/* Info: (20260812 - Julian) 搜尋欄 + 下拉選單 */}
            <HrField
              htmlFor="offboarding-initiate-employee"
              label={t("hr_management.offboarding.label_employee")}
              isRequired
              error={errorOf("employeeId")}
              className="max-w-md"
            >
              <HrSearchableSelect
                id="offboarding-initiate-employee"
                value={draft.employeeId}
                options={candidateOptions}
                placeholder={t(
                  "hr_management.offboarding.placeholder_employee",
                )}
                searchPlaceholder={t(
                  "hr_management.offboarding.search_employee_placeholder",
                )}
                emptyText={t("hr_management.offboarding.no_matched_employee")}
                hasError={errorOf("employeeId") !== null}
                describedBy={
                  errorOf("employeeId")
                    ? "offboarding-initiate-employee-error"
                    : undefined
                }
                onChange={(employeeId) =>
                  update({
                    employeeId,
                    // Info: (20260812 - Julian) 換人就清掉交接對象
                    handoverAssigneeId: "",
                  })
                }
                onBlur={() => markTouched("employeeId")}
              />
            </HrField>

            {/* Info: (20260812 - Julian) 系統帶入資訊，選人後才出現 */}
            {employee ? (
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-gray-50 px-4 py-3">
                {infoFields.map((field) => (
                  <div key={field.key} className="min-w-0">
                    <p className="text-xs text-gray-400">{field.label}</p>
                    <p className="text-sm font-medium text-gray-700">
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : candidates.length === 0 ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {t("hr_management.offboarding.no_candidate")}
              </p>
            ) : null}
          </section>

          {/* Info: (20260812 - Julian) 區塊 2：離職日期與預告期試算 */}
          <section
            aria-label={t("hr_management.offboarding.initiate_section_dates")}
            className="mt-6 border-t border-gray-100 pt-5"
          >
            <h3 className="mb-3 text-sm font-bold text-gray-800">
              {t("hr_management.offboarding.initiate_section_dates")}
            </h3>

            <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-3">
              <HrField
                htmlFor="offboarding-initiate-notice-date"
                label={t("hr_management.offboarding.label_notice_date")}
                isRequired
                error={errorOf("noticeDate")}
              >
                <input
                  type="date"
                  value={draft.noticeDate}
                  onChange={(event) =>
                    update({ noticeDate: event.target.value })
                  }
                  {...fieldProps(
                    "noticeDate",
                    "offboarding-initiate-notice-date",
                  )}
                />
              </HrField>

              <HrField
                htmlFor="offboarding-initiate-last-working-date"
                label={t("hr_management.offboarding.label_last_working_date")}
                isRequired
                error={errorOf("lastWorkingDate")}
              >
                <input
                  type="date"
                  value={draft.lastWorkingDate}
                  onChange={(event) =>
                    setDraft((prev) =>
                      applyLastWorkingDateChange(
                        prev,
                        event.target.value,
                        isInsuranceDateTouched,
                      ),
                    )
                  }
                  {...fieldProps(
                    "lastWorkingDate",
                    "offboarding-initiate-last-working-date",
                  )}
                />
              </HrField>

              <HrField
                htmlFor="offboarding-initiate-insurance-date"
                label={t("hr_management.offboarding.label_insurance_off_date")}
                isRequired
                error={errorOf("insuranceOffDate")}
                hint={
                  isInsuranceDateTouched
                    ? null
                    : t("hr_management.offboarding.hint_insurance_off")
                }
              >
                <input
                  type="date"
                  value={draft.insuranceOffDate}
                  onChange={(event) => {
                    setIsInsuranceDateTouched(true);
                    update({ insuranceOffDate: event.target.value });
                  }}
                  {...fieldProps(
                    "insuranceOffDate",
                    "offboarding-initiate-insurance-date",
                  )}
                />
              </HrField>
            </div>

            {/*
              Info: (20260812 - Julian) 預告期試算。不足時是黃色警示而不是紅色錯誤，
              也不擋提交 —— 預告不足不等於違法，它代表「要嘛合意、要嘛付預告工資」。
            */}
            {notice ? (
              <div
                data-testid="notice-estimate"
                className="mt-4 flex flex-col gap-2"
              >
                <p className="flex items-start gap-1.5 text-xs text-gray-500">
                  <Info className="mt-px size-3.5 shrink-0 text-sky-700" />
                  {!notice.isApplicable
                    ? t("hr_management.offboarding.notice_not_applicable")
                    : notice.tenureMonths >= MONTHS_PER_YEAR
                      ? t("hr_management.offboarding.notice_legal", {
                          years: Math.floor(
                            notice.tenureMonths / MONTHS_PER_YEAR,
                          ),
                          days: notice.requiredDays,
                        })
                      : t("hr_management.offboarding.notice_legal_short", {
                          months: notice.tenureMonths,
                          days: notice.requiredDays,
                        })}
                </p>

                {notice.isApplicable ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ${
                        notice.isSatisfied
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200"
                      }`}
                    >
                      {notice.isSatisfied ? (
                        t("hr_management.offboarding.notice_current_ok", {
                          days: notice.actualDays,
                        })
                      ) : (
                        <>
                          <AlertTriangle className="size-3.5 shrink-0" />
                          {t("hr_management.offboarding.notice_current_short", {
                            days: notice.actualDays,
                          })}
                        </>
                      )}
                    </span>

                    {!notice.isSatisfied ? (
                      <span
                        role="status"
                        className="text-xs font-medium text-amber-700"
                      >
                        {notice.type === ResignationType.LAYOFF
                          ? t("hr_management.offboarding.notice_warn_layoff", {
                              days: notice.shortageDays,
                            })
                          : t(
                              "hr_management.offboarding.notice_warn_voluntary",
                              {
                                days: notice.shortageDays,
                              },
                            )}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* Info: (20260812 - Julian) 區塊 3：離職原因與交接設定 */}
          <section
            aria-label={t("hr_management.offboarding.initiate_section_reason")}
            className="mt-6 border-t border-gray-100 pt-5"
          >
            <h3 className="mb-3 text-sm font-bold text-gray-800">
              {t("hr_management.offboarding.initiate_section_reason")}
            </h3>

            <fieldset className="min-w-0">
              <legend className="mb-1.5 flex items-center gap-1 text-sm font-medium text-gray-600">
                <span aria-hidden="true" className="text-red-600">
                  *
                </span>
                {t("hr_management.offboarding.label_type")}
              </legend>
              <div className="flex flex-wrap gap-4">
                {RESIGNATION_TYPES.map((type) => (
                  <label
                    key={type}
                    htmlFor={`offboarding-initiate-type-${type}`}
                    className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700"
                  >
                    <input
                      id={`offboarding-initiate-type-${type}`}
                      type="radio"
                      name="offboarding-type"
                      value={type}
                      checked={draft.resignationType === type}
                      onChange={() => update({ resignationType: type })}
                      className="size-4 accent-orange-600"
                    />
                    {t(RESIGNATION_TYPE_I18N_KEY[type])}
                  </label>
                ))}
              </div>
            </fieldset>

            {/*
              Info: (20260812 - Julian) 通報已經是下面清單裡的一筆任務（有負責人、
              有到期日、沒做完不能結案），這裡只說明系統做了什麼；
              資遣費仍然沒有對應的關卡，所以留在文字裡。
            */}
            {draft.resignationType === ResignationType.LAYOFF ? (
              <p
                role="status"
                className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700"
              >
                <AlertTriangle className="mt-px size-3.5 shrink-0" />
                {t("hr_management.offboarding.layoff_notice")}
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4">
              <HrField
                htmlFor="offboarding-initiate-reason-note"
                label={t("hr_management.offboarding.label_reason_note")}
              >
                <input
                  id="offboarding-initiate-reason-note"
                  type="text"
                  value={draft.reasonNote}
                  placeholder={t(
                    "hr_management.offboarding.placeholder_reason_note",
                  )}
                  onChange={(event) =>
                    update({ reasonNote: event.target.value })
                  }
                  className={`${HR_INPUT_CLASS} w-full`}
                />
              </HrField>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <HrField
                htmlFor="offboarding-initiate-assignee"
                label={t("hr_management.offboarding.label_handover_assignee")}
                isRequired
                error={errorOf("handoverAssigneeId")}
              >
                <HrSearchableSelect
                  id="offboarding-initiate-assignee"
                  value={draft.handoverAssigneeId}
                  options={assigneeOptions}
                  placeholder={t(
                    "hr_management.offboarding.initiate_placeholder_select",
                  )}
                  searchPlaceholder={t(
                    "hr_management.offboarding.search_employee_placeholder",
                  )}
                  emptyText={t("hr_management.offboarding.no_matched_employee")}
                  hasError={errorOf("handoverAssigneeId") !== null}
                  describedBy={
                    errorOf("handoverAssigneeId")
                      ? "offboarding-initiate-assignee-error"
                      : undefined
                  }
                  onChange={(handoverAssigneeId) =>
                    update({ handoverAssigneeId })
                  }
                  onBlur={() => markTouched("handoverAssigneeId")}
                />
              </HrField>

              <HrField
                htmlFor="offboarding-initiate-template"
                label={t("hr_management.offboarding.label_template")}
                isRequired
              >
                <select
                  id="offboarding-initiate-template"
                  value={draft.templateId}
                  onChange={(event) =>
                    update({
                      templateId: event.target.value as OffboardingTemplateKey,
                    })
                  }
                  className={`${HR_INPUT_CLASS} w-full`}
                >
                  {OFFBOARDING_TEMPLATE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {t(OFFBOARDING_TEMPLATE_I18N_KEY[key])}
                    </option>
                  ))}
                </select>
              </HrField>
            </div>

            {/* Info: (20260812 - Julian) 與報到端同樣列出將建立的項目，範本的差別才看得見 */}
            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold text-gray-600">
                {t("hr_management.offboarding.initiate_preview_title", {
                  count: previewKeys.length,
                })}
              </p>
              <ul className="mt-1.5 grid grid-cols-1 gap-x-3 gap-y-1 md:grid-cols-2 lg:grid-cols-4">
                {previewKeys.map((key) => (
                  <li key={key} className="text-xs text-gray-500">
                    {`· ${t(OFFBOARDING_TASK_TITLE_I18N_KEY[key as OffboardingTaskKey])}`}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
          <p className="min-w-0 text-xs font-medium text-red-600">
            {isSubmitAttempted && errorCount > 0
              ? t("hr_management.offboarding.error_summary", {
                  count: errorCount,
                })
              : ""}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              {t("hr_management.offboarding.initiate_action_cancel")}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
            >
              {t("hr_management.offboarding.initiate_action_submit")}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
};

export default OffboardingInitiateModal;
