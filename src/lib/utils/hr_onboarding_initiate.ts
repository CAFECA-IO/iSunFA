import {
  EMAIL_PATTERN,
  EMPLOYEE_NO_DIGITS,
  EMPLOYEE_NO_PATTERN,
  EMPLOYEE_NO_PREFIX,
  EmployeeStatus,
  Gender,
  ONBOARDING_ASSIGNEE_BY_CATEGORY,
  ONBOARDING_TASK_TITLE_I18N_KEY,
  ONBOARDING_TEMPLATES,
  OnboardingTaskKey,
  OnboardingTemplateKey,
  OnboardingTrigger,
  ProcessTaskStatus,
  ProcessTaskType,
  TW_MOBILE_PATTERN,
} from "@/constants/hr_management";
import {
  IDepartment,
  IEmployeeListItem,
  IJobTitle,
  IOnboardingInitiateErrors,
  IOnboardingInitiateForm,
  IOnboardingInitiateResult,
  IProcessTask,
} from "@/interfaces/hr_management";
import {
  addDays,
  differenceInDays,
  parseIsoDate,
  toIsoDate,
} from "@/lib/utils/hr_date";
import { maskPiiTail } from "@/lib/utils/hr_pii_mask";

/**
 * Info: (20260812 - Julian) 發起新人報到的計算層。
 *
 * 這裡不碰畫面，做三件事：算出表單的初始值、驗證、把通過驗證的表單
 * 攤成「一位員工 + 一組報到任務」。三件事都是純函式，因此驗證規則
 * 可以被 jest 直接測到，不必透過畫面繞一圈。
 *
 * ToDo: (20260812 - Julian) 接 API 後，唯一性檢查要改由伺服器回覆
 * （`@@unique([accountBookId, employeeNo])` 才是真正的守門員），
 * 這裡保留的只是「在送出前先擋掉明顯重複」的即時回饋。
 */

// Info: (20260812 - Julian) 錯誤訊息一律回 i18n key，讓驗證層不需要拿到 `t`
const ERROR_KEY = {
  REQUIRED: "hr_management.onboarding.error_required",
  EMPLOYEE_NO_FORMAT: "hr_management.onboarding.error_employee_no_format",
  EMPLOYEE_NO_TAKEN: "hr_management.onboarding.error_employee_no_taken",
  EMAIL_FORMAT: "hr_management.onboarding.error_email_format",
  EMAIL_TAKEN: "hr_management.onboarding.error_email_taken",
  PHONE_FORMAT: "hr_management.onboarding.error_phone_format",
  HIRE_DATE_PAST: "hr_management.onboarding.error_hire_date_past",
  PERSONAL_EMAIL_SAME: "hr_management.onboarding.error_personal_email_same",
} as const;

/**
 * Info: (20260812 - Julian) 下一個可用工號 = 現有最大號 + 1。
 *
 * 取最大值而不是「筆數 + 1」：有人離職後工號不會回收，用筆數會撞號。
 *
 * ToDo: (20260812 - Julian) 這個值只是建議。兩位 HR 同時開 Modal 會拿到
 * 同一個號碼（TOCTOU），真正的唯一性由 DB 的複合唯一鍵決定，
 * 前端要能顯示伺服器回傳的衝突並讓使用者改號。
 */
export function suggestNextEmployeeNo(people: IEmployeeListItem[]): string {
  const maxSerial = people.reduce((largest, person) => {
    const digits = person.employeeNo.replace(/\D/g, "");
    const serial = digits.length > 0 ? Number(digits) : 0;
    return serial > largest ? serial : largest;
  }, 0);

  return `${EMPLOYEE_NO_PREFIX}${String(maxSerial + 1).padStart(EMPLOYEE_NO_DIGITS, "0")}`;
}

/**
 * Info: (20260812 - Julian) 部門主管即該部門的預設直屬主管。
 *
 * 找不到（部門還沒指派主管、或主管本人已離職）時回空字串，讓欄位留空由使用者自己選。
 * 避免退回「隨便找一位在職者」的猜測值，產生一筆看起來填好了、實際上簽核會送錯人的資料。
 */
export function resolveDefaultManagerId(
  departmentId: string,
  departments: IDepartment[],
  people: IEmployeeListItem[],
): string {
  const managerId = departments.find(
    (item) => item.id === departmentId,
  )?.managerId;
  if (!managerId) return "";
  return people.some((person) => person.id === managerId) ? managerId : "";
}

/**
 * Info: (20260812 - Julian) 換部門時只在使用者沒動過主管欄時才連動。
 *
 * 沒有這個判斷，使用者手動指定的主管會在他回頭改部門時被安靜地蓋掉 ——
 * 而他不會再檢查一次那一欄。
 */
export function applyDepartmentChange(
  form: IOnboardingInitiateForm,
  departmentId: string,
  departments: IDepartment[],
  people: IEmployeeListItem[],
  isManagerTouched: boolean,
): IOnboardingInitiateForm {
  if (isManagerTouched) return { ...form, departmentId };
  return {
    ...form,
    departmentId,
    managerId: resolveDefaultManagerId(departmentId, departments, people),
  };
}

/**
 * Info: (20260812 - Julian) 表單初始值。
 *
 * 到職日刻意留空而不是預填「今天 + 兩週」：它決定勞健保加保日與
 * 試用期起算日，是這張表單裡後果最重的一欄。一個剛好通過驗證的預設值
 * 會讓人直接跳過它。
 */
export function buildInitialInitiateForm(
  people: IEmployeeListItem[],
): IOnboardingInitiateForm {
  return {
    employeeNo: suggestNextEmployeeNo(people),
    name: "",
    gender: null,
    email: "",
    phone: "",
    departmentId: "",
    jobTitleId: "",
    managerId: "",
    hireDate: "",
    templateId: OnboardingTemplateKey.GENERAL,
    personalEmail: "",
    triggers: {
      [OnboardingTrigger.IT_SETUP]: true,
      [OnboardingTrigger.FACILITY_SETUP]: true,
      [OnboardingTrigger.PREONBOARDING_FORM]: true,
    },
  };
}

// Info: (20260812 - Julian) 比對唯一性時忽略大小寫與前後空白
const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * Info: (20260812 - Julian) 工號與 Email 各有一種正規形式，前端負責挑定它。
 *
 * `@@unique([accountBookId, employeeNo])` 在 Postgres 是**區分大小寫**的 ——
 * `EMP001` 與 `emp001` 是兩列，唯一鍵不會攔。也就是說，如果放任大小寫自由，
 * 資料庫會很樂意讓同一個工號存在兩次，而畫面上兩者看起來幾乎一樣。
 *
 * 擋不住就別讓它發生：寫進去的一律是同一種形式（工號大寫、Email 小寫），
 * 於是唯一鍵比對的就是我們真正想比的東西。
 */
export const normalizeEmployeeNo = (value: string): string =>
  value.trim().toUpperCase();

export const normalizeEmail = (value: string): string =>
  value.trim().toLowerCase();

/**
 * Info: (20260812 - Julian) 範本篩選只寫一次：預覽看到幾項，建立就是那幾項。
 *
 * 分成兩份的話，「畫面說會建 7 項、實際建了 5 項」是不會有人發現的差異 ——
 * 兩邊都各自合理，只是不同意。
 */
function resolveTemplateItems(form: IOnboardingInitiateForm) {
  return ONBOARDING_TEMPLATES[form.templateId].filter(
    (item) => item.trigger === null || form.triggers[item.trigger],
  );
}

export function validateInitiateForm(
  form: IOnboardingInitiateForm,
  people: IEmployeeListItem[],
  today: Date,
): IOnboardingInitiateErrors {
  const employeeNo = normalizeEmployeeNo(form.employeeNo);
  const email = normalizeEmail(form.email);
  const personalEmail = normalizeEmail(form.personalEmail);

  const resolveEmployeeNo = (): string | null => {
    if (employeeNo.length === 0) return ERROR_KEY.REQUIRED;
    if (!EMPLOYEE_NO_PATTERN.test(employeeNo)) {
      return ERROR_KEY.EMPLOYEE_NO_FORMAT;
    }
    const isTaken = people.some(
      (person) => normalize(person.employeeNo) === normalize(employeeNo),
    );
    return isTaken ? ERROR_KEY.EMPLOYEE_NO_TAKEN : null;
  };

  const resolveEmail = (): string | null => {
    if (email.length === 0) return ERROR_KEY.REQUIRED;
    if (!EMAIL_PATTERN.test(email)) return ERROR_KEY.EMAIL_FORMAT;
    const isTaken = people.some(
      (person) => normalize(person.email) === normalize(email),
    );
    return isTaken ? ERROR_KEY.EMAIL_TAKEN : null;
  };

  const resolveHireDate = (): string | null => {
    if (form.hireDate.length === 0) return ERROR_KEY.REQUIRED;
    /**
     * Info: (20260812 - Julian) `differenceInDays(from, to)` 回傳 to − from，
     * 因此「到職日已過」是今天減到職日為負。基準日由呼叫端傳入而不是
     * 在這裡取 `new Date()`：mock 的今天是固定的 2026-08-10，
     * 兩邊用不同的今天會讓畫面上剛好合法的日期被驗證擋下來。
     */
    return differenceInDays(today, parseIsoDate(form.hireDate)) < 0
      ? ERROR_KEY.HIRE_DATE_PAST
      : null;
  };

  const resolvePersonalEmail = (): string | null => {
    const isRequired = form.triggers[OnboardingTrigger.PREONBOARDING_FORM];
    if (personalEmail.length === 0) {
      return isRequired ? ERROR_KEY.REQUIRED : null;
    }
    if (!EMAIL_PATTERN.test(personalEmail)) return ERROR_KEY.EMAIL_FORMAT;
    /**
     * Info: (20260812 - Julian) 個人信箱不得等於公務信箱。
     *
     * 預填表單的信是要在「還沒有公司帳號」的空窗期寄出去的 ——
     * 填成公務信箱等於寄到一個當下還不存在的信箱，信不會退，
     * 只是永遠沒有人收到，而畫面上會顯示已發送。
     */
    return normalize(personalEmail) === normalize(email) && email.length > 0
      ? ERROR_KEY.PERSONAL_EMAIL_SAME
      : null;
  };

  const requiredText = (value: string): string | null =>
    value.trim().length === 0 ? ERROR_KEY.REQUIRED : null;

  return {
    employeeNo: resolveEmployeeNo(),
    name: requiredText(form.name),
    gender: form.gender === null ? ERROR_KEY.REQUIRED : null,
    email: resolveEmail(),
    phone:
      form.phone.trim().length === 0
        ? ERROR_KEY.REQUIRED
        : TW_MOBILE_PATTERN.test(form.phone.trim())
          ? null
          : ERROR_KEY.PHONE_FORMAT,
    departmentId: requiredText(form.departmentId),
    jobTitleId: requiredText(form.jobTitleId),
    managerId: requiredText(form.managerId),
    hireDate: resolveHireDate(),
    personalEmail: resolvePersonalEmail(),
  };
}

export function hasInitiateError(errors: IOnboardingInitiateErrors): boolean {
  return Object.values(errors).some((value) => value !== null);
}

/**
 * Info: (20260812 - Julian) 由通過驗證的表單組出員工主檔。
 *
 * 電話在這裡就被遮掉，明文不會離開表單 —— 回傳的 `IEmployeeListItem`
 * 之後要進清單、進看板、進儀表板，那些地方都不該有還原完整電話的路徑。
 *
 * `birthMonthDay` 與 `age` 留 null：發起報到時不收生日，那是新人自己
 * 在預填表單上填的（ADR 018 §7 —— 需要壽星清單就存衍生值，不是明文生日）。
 */
export function buildInitiatedEmployee(
  form: IOnboardingInitiateForm,
  departments: IDepartment[],
  jobTitles: IJobTitle[],
  people: IEmployeeListItem[],
): IEmployeeListItem {
  const employeeNo = normalizeEmployeeNo(form.employeeNo);
  const department = departments.find((item) => item.id === form.departmentId);
  const jobTitle = jobTitles.find((item) => item.id === form.jobTitleId);
  const manager = people.find((person) => person.id === form.managerId);

  return {
    // Info: (20260812 - Julian) 由工號推導而不是隨機值：同一次送出重跑會得到同一個 id
    id: `emp-new-${employeeNo.toLowerCase()}`,
    employeeNo,
    name: form.name.trim(),
    englishName: null,
    // Info: (20260812 - Julian) 驗證已擋下 null，這裡的退回值不會被用到
    gender: form.gender ?? Gender.OTHER,
    email: normalizeEmail(form.email),
    maskedPhone: maskPiiTail(form.phone.trim()),
    birthMonthDay: null,
    age: null,
    /**
     * Info: (20260812 - Julian) 一律 PROBATION。
     *
     * `EmployeeStatus` 沒有「待報到」這一態，因此這筆資料在報到日之前
     * 是「試用中但還沒上班」—— 它必須放進準員工名冊而不是全公司名冊，
     * 否則在職人數、部門編制、年資分布會立刻多算一個還沒上班的人。
     *
     * ToDo: (20260812 - Julian) 這是 schema 的缺口。補一個 `PENDING_HIRE`
     * 狀態之後，這裡與 `MOCK_HR_INCOMING_EMPLOYEES` 的分家都可以拿掉。
     */
    status: EmployeeStatus.PROBATION,
    hireDate: form.hireDate,
    leaveDate: null,
    departmentId: department?.id ?? null,
    departmentName: department?.name ?? null,
    jobTitleId: jobTitle?.id ?? null,
    jobTitle: jobTitle?.title ?? null,
    managerName: manager?.name ?? null,
  };
}

/**
 * Info: (20260812 - Julian) 依範本與三個自動化開關產生報到任務。
 *
 * 開關關掉的項目是「不建立」，不是建立後標 `SKIPPED` ——
 * SKIPPED 在 `isTaskDone` 裡視同完成，那會讓沒準備電腦的新人
 * 在報到列表上顯示 IT 已完成。
 *
 * `translate` 由呼叫端注入（畫面層的 `t`）：任務標題是寫進
 * `OnboardingTask.title` 的快照字串，建立當下用建立者的語言解析一次，
 * 之後不再隨介面語言變動 —— 那是 DB 資料，不是介面文案。
 */
export function buildInitiatedTasks(
  employee: IEmployeeListItem,
  form: IOnboardingInitiateForm,
  translate: (i18nKey: string) => string,
): IProcessTask[] {
  const hireDate = parseIsoDate(employee.hireDate);

  return resolveTemplateItems(form).map((item) => ({
    id: `task-on-${employee.id}-${item.key}`,
    employeeId: employee.id,
    taskType: ProcessTaskType.ONBOARDING,
    title: translate(ONBOARDING_TASK_TITLE_I18N_KEY[item.key]),
    // Info: (20260812 - Julian) 全部從待處理開始；剛建立的案件不可能有任何一項已完成
    status: ProcessTaskStatus.PENDING,
    dueDate: toIsoDate(addDays(hireDate, item.dueOffset)),
    category: item.category,
    templateKey: item.key,
    assigneeName: ONBOARDING_ASSIGNEE_BY_CATEGORY[item.category],
    note: null,
  }));
}

export function buildOnboardingInitiateResult(
  form: IOnboardingInitiateForm,
  departments: IDepartment[],
  jobTitles: IJobTitle[],
  people: IEmployeeListItem[],
  translate: (i18nKey: string) => string,
): IOnboardingInitiateResult {
  const employee = buildInitiatedEmployee(form, departments, jobTitles, people);
  return { employee, tasks: buildInitiatedTasks(employee, form, translate) };
}

// Info: (20260812 - Julian) 供畫面預覽「這個範本會建立哪幾項」，與實際建立走同一組篩選
export function previewTaskKeys(
  form: IOnboardingInitiateForm,
): OnboardingTaskKey[] {
  return resolveTemplateItems(form).map((item) => item.key);
}
