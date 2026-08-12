"use client";

import { FC, FormEvent, useMemo, useState } from "react";
import { ShieldCheck, UserPlus, X } from "lucide-react";
import HrField from "@/components/hr_management/movement/hr_field";
import {
  GENDERS,
  GENDER_I18N_KEY,
  Gender,
  HR_INPUT_CLASS,
  ONBOARDING_TASK_TITLE_I18N_KEY,
  ONBOARDING_TEMPLATE_I18N_KEY,
  ONBOARDING_TEMPLATE_KEYS,
  ONBOARDING_TRIGGERS,
  ONBOARDING_TRIGGER_I18N_KEY,
  ONBOARDING_UPCOMING_DAYS,
  OnboardingTemplateKey,
  OnboardingTrigger,
} from "@/constants/hr_management";
import {
  IDepartmentTreeNode,
  IEmployeeListItem,
  IJobTitle,
  IOnboardingInitiateErrors,
  IOnboardingInitiateForm,
  IOnboardingInitiateResult,
} from "@/interfaces/hr_management";
import { differenceInDays, parseIsoDate, toIsoDate } from "@/lib/utils/hr_date";
import {
  applyDepartmentChange,
  buildInitialInitiateForm,
  normalizeEmployeeNo,
  buildOnboardingInitiateResult,
  hasInitiateError,
  previewTaskKeys,
  validateInitiateForm,
} from "@/lib/utils/hr_onboarding_initiate";
import { useTranslation } from "@/i18n/i18n_context";

interface IOnboardingInitiateModalProps {
  people: IEmployeeListItem[];
  departments: IDepartmentTreeNode[];
  jobTitles: IJobTitle[];
  today: Date;
  onClose: () => void;
  onSubmit: (result: IOnboardingInitiateResult) => void;
}

// Info: (20260812 - Julian) 三個開關各自的補充說明，與開關本身的文案分開放
const TRIGGER_HINT_I18N_KEY: Record<OnboardingTrigger, string> = {
  [OnboardingTrigger.IT_SETUP]: "hr_management.onboarding.trigger_it_hint",
  [OnboardingTrigger.FACILITY_SETUP]:
    "hr_management.onboarding.trigger_facility_hint",
  [OnboardingTrigger.PREONBOARDING_FORM]:
    "hr_management.onboarding.trigger_form_hint",
};

type TouchedField = keyof IOnboardingInitiateErrors;

/**
 * Info: (20260812 - Julian) 發起新人報到：單頁三區塊表單。
 *
 * 工號重複、Email 重複都要送出表單後才知道。
 * 錯誤提示只在「該欄失焦後」或「按過一次送出後」才顯示。
 *
 * ToDo: (20260812 - Julian) 接 API 後，工號與 Email 的唯一性要以伺服器回應為準
 * （`@@unique([accountBookId, employeeNo])` 才是真正的守門員），
 * 這裡的檢查只是送出前的即時回饋；409 回來時要把錯誤掛回對應欄位。
 */
const OnboardingInitiateModal: FC<IOnboardingInitiateModalProps> = ({
  people,
  departments,
  jobTitles,
  today,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();

  const [draft, setDraft] = useState<IOnboardingInitiateForm>(() =>
    buildInitialInitiateForm(people),
  );
  /**
   * Info: (20260812 - Julian) 使用者是否手動改過直屬主管。
   *
   * 這是畫面狀態，不是表單資料，所以不放進 DTO —— 它不該被送到 API。
   * 有了它，換部門時才知道要不要覆寫主管欄：改過就不再自動帶入，
   * 否則使用者指定的主管會在他回頭改部門時被安靜地蓋掉。
   */
  const [isManagerTouched, setIsManagerTouched] = useState<boolean>(false);
  const [touched, setTouched] = useState<TouchedField[]>([]);
  const [isSubmitAttempted, setIsSubmitAttempted] = useState<boolean>(false);

  const errors = useMemo<IOnboardingInitiateErrors>(
    () => validateInitiateForm(draft, people, today),
    [draft, people, today],
  );

  const previewKeys = useMemo(() => previewTaskKeys(draft), [draft]);

  // Info: (20260812 - Julian) 離職者不可能是新人的直屬主管，從候選名單排除
  const managerOptions = useMemo(
    () => people.filter((person) => person.leaveDate === null),
    [people],
  );

  const sortedJobTitles = useMemo(
    () => [...jobTitles].sort((a, b) => b.level - a.level),
    [jobTitles],
  );

  const update = (patch: Partial<IOnboardingInitiateForm>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const markTouched = (field: TouchedField) =>
    setTouched((prev) => (prev.includes(field) ? prev : [...prev, field]));

  // Info: (20260812 - Julian) 失焦過或按過送出才顯示，避免邊打字邊變紅
  const errorOf = (field: TouchedField): string | null => {
    const key = errors[field];
    if (key === null) return null;
    if (!isSubmitAttempted && !touched.includes(field)) return null;
    return t(key);
  };

  /**
   * Info: (20260812 - Julian) 一次給齊 id、樣式、失焦與無障礙屬性。
   *
   * `aria-describedby` 指向的 id 必須與 `HrField` 產生的錯誤節點一致 ——
   * 兩邊各自拼字串時，指到不存在的節點是看不出來的：畫面上錯誤訊息
   * 明明在，只有讀螢幕的人不會被告知。所以兩者都從同一個 `inputId` 推導。
   */
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

  /**
   * Info: (20260812 - Julian) 到職日太遠時的提醒 —— 是提醒不是錯誤。
   *
   * 由於看板與報到列表只收錄「未來 14 天內報到」的案件，半年後才報到的人建完後這一頁會找不到。
   * 為了避免使用者以為沒建成功而再建一次，所以顯示提醒。
   */
  const daysUntilHire =
    draft.hireDate === "" || errors.hireDate !== null
      ? null
      : differenceInDays(today, parseIsoDate(draft.hireDate));
  const isBeyondBoardWindow =
    daysUntilHire !== null && daysUntilHire > ONBOARDING_UPCOMING_DAYS;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitAttempted(true);
    if (hasInitiateError(errors)) return;

    /**
     * Info: (20260812 - Julian) 任務標題在這裡解析成字串再送出去。
     *
     * `OnboardingTask.title` 存的是快照，不是 i18n key —— 建立當下用
     * 建立者的語言決定一次，之後不隨介面語言變動。那是 DB 資料。
     */
    onSubmit(
      buildOnboardingInitiateResult(draft, departments, jobTitles, people, t),
    );
  };

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
        aria-label={t("hr_management.onboarding.title")}
        onSubmit={handleSubmit}
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-800">
              <UserPlus className="size-5 shrink-0 text-orange-500" />
              {t("hr_management.onboarding.title")}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {t("hr_management.onboarding.subtitle")}
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
          {/* Info: (20260812 - Julian) 區塊 1：擬錄用人員基本資料 */}
          <section aria-label={t("hr_management.onboarding.section_basic")}>
            <h3 className="mb-3 text-sm font-bold text-gray-800">
              {t("hr_management.onboarding.section_basic")}
            </h3>

            <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <HrField
                htmlFor="onboarding-employee-no"
                label={t("hr_management.onboarding.label_employee_no")}
                isRequired
                error={errorOf("employeeNo")}
                hint={t("hr_management.onboarding.hint_employee_no")}
              >
                <input
                  type="text"
                  value={draft.employeeNo}
                  /*
                    Info: (20260812 - Julian) 打字當下就轉大寫，讓畫面上看到的
                    就是會被寫進 DB 的那一個字串 —— 大小寫在 Postgres 的
                    唯一鍵上是有差別的（見 `normalizeEmployeeNo`）。
                  */
                  onChange={(event) =>
                    update({
                      employeeNo: normalizeEmployeeNo(event.target.value),
                    })
                  }
                  {...fieldProps("employeeNo", "onboarding-employee-no")}
                />
              </HrField>

              <HrField
                htmlFor="onboarding-name"
                label={t("hr_management.onboarding.label_name")}
                isRequired
                error={errorOf("name")}
              >
                <input
                  type="text"
                  value={draft.name}
                  placeholder={t("hr_management.onboarding.placeholder_name")}
                  onChange={(event) => update({ name: event.target.value })}
                  {...fieldProps("name", "onboarding-name")}
                />
              </HrField>

              {/*
                Info: (20260812 - Julian) 性別給三個選項（schema 的 `Gender` 有 `OTHER`）
              */}
              <HrField
                htmlFor="onboarding-gender-FEMALE"
                label={t("hr_management.onboarding.label_gender")}
                isRequired
                error={errorOf("gender")}
              >
                <div
                  role="radiogroup"
                  aria-label={t("hr_management.onboarding.label_gender")}
                  className="flex h-[34px] items-center gap-4"
                >
                  {GENDERS.map((gender: Gender) => (
                    <label
                      key={gender}
                      htmlFor={`onboarding-gender-${gender}`}
                      className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700"
                    >
                      <input
                        id={`onboarding-gender-${gender}`}
                        type="radio"
                        name="onboarding-gender"
                        value={gender}
                        checked={draft.gender === gender}
                        onChange={() => {
                          update({ gender });
                          markTouched("gender");
                        }}
                        className="size-4 accent-orange-600"
                      />
                      {t(GENDER_I18N_KEY[gender])}
                    </label>
                  ))}
                </div>
              </HrField>

              <HrField
                htmlFor="onboarding-email"
                label={t("hr_management.onboarding.label_email")}
                isRequired
                error={errorOf("email")}
                className="sm:col-span-1 lg:col-span-2"
              >
                <input
                  type="email"
                  value={draft.email}
                  placeholder={t("hr_management.onboarding.placeholder_email")}
                  onChange={(event) => update({ email: event.target.value })}
                  {...fieldProps("email", "onboarding-email")}
                />
              </HrField>

              <HrField
                htmlFor="onboarding-phone"
                label={t("hr_management.onboarding.label_phone")}
                isRequired
                error={errorOf("phone")}
              >
                <input
                  type="tel"
                  value={draft.phone}
                  placeholder={t("hr_management.onboarding.placeholder_phone")}
                  onChange={(event) => update({ phone: event.target.value })}
                  {...fieldProps("phone", "onboarding-phone")}
                />
              </HrField>
            </div>

            {/*
              Info: (20260812 - Julian) 個資提示放在收集個資的區塊裡，不放在最上方。
              使用者在打電話號碼的那一刻才需要知道這件事。
            */}
            <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
              <ShieldCheck className="mt-px size-3.5 shrink-0 text-emerald-600" />
              {t("hr_management.onboarding.hint_pii")}
            </p>
          </section>

          {/* Info: (20260812 - Julian) 區塊 2：組織與職務設定 */}
          <section
            aria-label={t("hr_management.onboarding.section_org")}
            className="mt-6 border-t border-gray-100 pt-5"
          >
            <h3 className="mb-3 text-sm font-bold text-gray-800">
              {t("hr_management.onboarding.section_org")}
            </h3>

            <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <HrField
                htmlFor="onboarding-department"
                label={t("hr_management.onboarding.label_department")}
                isRequired
                error={errorOf("departmentId")}
              >
                <select
                  value={draft.departmentId}
                  onChange={(event) => {
                    setDraft((prev) =>
                      applyDepartmentChange(
                        prev,
                        event.target.value,
                        departments,
                        people,
                        isManagerTouched,
                      ),
                    );
                    markTouched("departmentId");
                  }}
                  {...fieldProps("departmentId", "onboarding-department")}
                >
                  <option value="">
                    {t("hr_management.onboarding.placeholder_select")}
                  </option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {`${"　".repeat(department.depth)}${department.name}`}
                    </option>
                  ))}
                </select>
              </HrField>

              <HrField
                htmlFor="onboarding-job-title"
                label={t("hr_management.onboarding.label_job_title")}
                isRequired
                error={errorOf("jobTitleId")}
              >
                <select
                  value={draft.jobTitleId}
                  onChange={(event) =>
                    update({ jobTitleId: event.target.value })
                  }
                  {...fieldProps("jobTitleId", "onboarding-job-title")}
                >
                  <option value="">
                    {t("hr_management.onboarding.placeholder_select")}
                  </option>
                  {sortedJobTitles.map((jobTitle) => (
                    <option key={jobTitle.id} value={jobTitle.id}>
                      {t("hr_management.onboarding.job_title_with_level", {
                        title: jobTitle.title,
                        level: jobTitle.level,
                      })}
                    </option>
                  ))}
                </select>
              </HrField>

              <HrField
                htmlFor="onboarding-manager"
                label={t("hr_management.onboarding.label_manager")}
                isRequired
                error={errorOf("managerId")}
                hint={
                  isManagerTouched
                    ? undefined
                    : t("hr_management.onboarding.hint_manager_auto")
                }
              >
                <select
                  value={draft.managerId}
                  onChange={(event) => {
                    setIsManagerTouched(true);
                    update({ managerId: event.target.value });
                  }}
                  {...fieldProps("managerId", "onboarding-manager")}
                >
                  <option value="">
                    {t("hr_management.onboarding.placeholder_select")}
                  </option>
                  {managerOptions.map((person) => (
                    <option key={person.id} value={person.id}>
                      {`${person.name}（${person.employeeNo}）`}
                    </option>
                  ))}
                </select>
              </HrField>

              <HrField
                htmlFor="onboarding-hire-date"
                label={t("hr_management.onboarding.label_hire_date")}
                isRequired
                error={errorOf("hireDate")}
                hint={
                  isBeyondBoardWindow && daysUntilHire !== null
                    ? t("hr_management.onboarding.hint_beyond_window", {
                        days: daysUntilHire,
                        window: ONBOARDING_UPCOMING_DAYS,
                      })
                    : t("hr_management.onboarding.hint_hire_date")
                }
              >
                <input
                  type="date"
                  value={draft.hireDate}
                  /**
                   * Info: (20260812 - Julian) 下限用傳進來的基準日，不是 `new Date()`。
                   * mock 的今天固定在 2026-08-10，兩邊用不同的今天會讓
                   * 畫面上剛好合法的日期被驗證擋下來。
                   */
                  min={toIsoDate(today)}
                  onChange={(event) => update({ hireDate: event.target.value })}
                  {...fieldProps("hireDate", "onboarding-hire-date")}
                />
              </HrField>
            </div>
          </section>

          {/* Info: (20260812 - Julian) 區塊 3：自動化報到關卡預設 */}
          <section
            aria-label={t("hr_management.onboarding.section_checklist")}
            className="mt-6 border-t border-gray-100 pt-5"
          >
            <h3 className="mb-3 text-sm font-bold text-gray-800">
              {t("hr_management.onboarding.section_checklist")}
            </h3>

            <HrField
              htmlFor="onboarding-template"
              label={t("hr_management.onboarding.label_template")}
              isRequired
              className="max-w-sm"
            >
              <select
                id="onboarding-template"
                value={draft.templateId}
                onChange={(event) =>
                  update({
                    templateId: event.target.value as OnboardingTemplateKey,
                  })
                }
                className={`${HR_INPUT_CLASS} w-full`}
              >
                {ONBOARDING_TEMPLATE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(ONBOARDING_TEMPLATE_I18N_KEY[key])}
                  </option>
                ))}
              </select>
            </HrField>

            <div className="mt-4 flex flex-col gap-3">
              {ONBOARDING_TRIGGERS.map((trigger) => (
                <div key={trigger}>
                  <label
                    htmlFor={`onboarding-trigger-${trigger}`}
                    className="flex cursor-pointer items-start gap-2"
                  >
                    <input
                      id={`onboarding-trigger-${trigger}`}
                      type="checkbox"
                      checked={draft.triggers[trigger]}
                      onChange={(event) =>
                        update({
                          triggers: {
                            ...draft.triggers,
                            [trigger]: event.target.checked,
                          },
                        })
                      }
                      className="mt-0.5 size-4 shrink-0 accent-orange-600"
                    />
                    <span className="min-w-0 text-sm text-gray-700">
                      {t(ONBOARDING_TRIGGER_I18N_KEY[trigger])}
                      <span className="ml-1.5 text-xs text-gray-400">
                        {`（${t(TRIGGER_HINT_I18N_KEY[trigger])}）`}
                      </span>
                    </span>
                  </label>

                  {/*
                    Info: (20260812 - Julian) 個人 Email 縮排在勾選項之下，
                    讓「為什麼要填這一欄」與「勾了什麼」在視覺上是同一件事。
                    取消勾選後欄位仍在，已填的值不清空 —— 使用者可能只是暫時取消。
                  */}
                  {trigger === OnboardingTrigger.PREONBOARDING_FORM ? (
                    <div className="mt-2 ml-6 max-w-sm">
                      <HrField
                        htmlFor="onboarding-personal-email"
                        label={t(
                          "hr_management.onboarding.label_personal_email",
                        )}
                        isRequired={
                          draft.triggers[OnboardingTrigger.PREONBOARDING_FORM]
                        }
                        error={errorOf("personalEmail")}
                      >
                        <input
                          type="email"
                          value={draft.personalEmail}
                          placeholder={t(
                            "hr_management.onboarding.placeholder_personal_email",
                          )}
                          onChange={(event) =>
                            update({ personalEmail: event.target.value })
                          }
                          {...fieldProps(
                            "personalEmail",
                            "onboarding-personal-email",
                          )}
                        />
                      </HrField>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {/*
              Info: (20260812 - Julian) 把「會建立哪幾項」直接列出來。
              三個開關與範本共同決定結果，但兩者分開看都推不出總數 ——
              取消 IT 那一項會少掉兩到三筆，取決於選了哪份範本。
            */}
            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold text-gray-600">
                {t("hr_management.onboarding.preview_title", {
                  count: previewKeys.length,
                })}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {previewKeys.map((key) => (
                  <li key={key} className="text-xs text-gray-500">
                    {`· ${t(ONBOARDING_TASK_TITLE_I18N_KEY[key])}`}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
          {/*
            Info: (20260812 - Julian) 送出鍵不停用，改成按下去指出還缺什麼。
            停用的按鈕不會告訴使用者為什麼不能按，他只能自己逐欄找。
          */}
          <p className="min-w-0 text-xs font-medium text-red-600">
            {isSubmitAttempted && errorCount > 0
              ? t("hr_management.onboarding.error_summary", {
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
              {t("hr_management.onboarding.action_cancel")}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
            >
              {t("hr_management.onboarding.action_submit")}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
};

export default OnboardingInitiateModal;
