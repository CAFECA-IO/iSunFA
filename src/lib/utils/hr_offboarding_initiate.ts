import {
  ACCOUNT_REVOKE_DEFAULT_TIME,
  EmployeeStatus,
  HandoverCategory,
  OFFBOARDING_ASSIGNEE_BY_CATEGORY,
  OFFBOARDING_LAYOFF_REPORT_TASK,
  OFFBOARDING_TASK_TITLE_I18N_KEY,
  OFFBOARDING_TEMPLATES,
  OffboardingTaskKey,
  OffboardingTemplateKey,
  ProcessTaskStatus,
  ProcessTaskType,
  RESIGNATION_TYPE_DEFAULT_REASON,
  ResignationType,
} from "@/constants/hr_management";
import {
  IEmployeeListItem,
  INoticePeriodEstimate,
  IOffboardingInitiateErrors,
  IOffboardingInitiateForm,
  IOffboardingInitiateResult,
  IOffboardingTask,
} from "@/interfaces/hr_management";
import {
  addDays,
  differenceInDays,
  differenceInFullMonths,
  parseIsoDate,
  toIsoDate,
} from "@/lib/utils/hr_date";
import { resolveRequiredNoticeDays } from "@/lib/utils/hr_movement";

/**
 * Info: (20260812 - Julian) 發起離職申請的計算層。
 *
 * 與報到端對稱：初始值、驗證、把表單攤成「一位改了離職日的員工 +
 * 一組交接任務 + 一份發起紀錄」。差別在這裡不建人 ——
 * 離職是在既有員工身上掛流程，因此完全不碰個資欄位。
 */

const ERROR_KEY = {
  REQUIRED: "hr_management.offboarding.error_required",
  NOTICE_IN_FUTURE: "hr_management.offboarding.error_notice_in_future",
  LAST_DAY_BEFORE_NOTICE:
    "hr_management.offboarding.error_last_day_before_notice",
  INSURANCE_BEFORE_LAST_DAY:
    "hr_management.offboarding.error_insurance_before_last_day",
  ASSIGNEE_IS_SELF: "hr_management.offboarding.error_assignee_is_self",
} as const;

/**
 * Info: (20260812 - Julian) 退保生效日預設為最後工作日的隔天。
 *
 * ToDo: (20260812 - Julian) 這一天怎麼定要跟 HR 對齊：勞保實務上「退保日」
 * 常直接填離職當日（保險效力止於當日 24 時），而離職流程 Modal 目前也是
 * 以最後一天為預設。兩個畫面對同一個欄位有兩種預設值就是兩種真相，
 * 確認後應該只留一種。
 */
const INSURANCE_OFF_DAY_OFFSET = 1;

/** Info: (20260812 - Julian) 選擇員工後預設的最後工作日：今天起算一個月 */
const DEFAULT_NOTICE_DAYS = 30;

/**
 * Info: (20260812 - Julian) 這次離職適用的法定預告天數。
 *
 * 定期契約期滿不續約回 0：契約本來就到那天為止，沒有「提前告知」可言。
 * 用同一張表算會讓每一個約聘期滿的人都被標成預告期不足 ——
 * 一個永遠亮著、因此沒有人會再看的警示。
 *
 * 自請離職與資遣的天數相同（第 15 條準用第 16 條），但義務方相反，
 * 因此天數共用、警語不共用（見 `resolveNoticeEstimate` 的回傳型別）。
 *
 * ToDo: (20260812 - Julian) 資遣費的基數也是依年資推算，但它切分新舊制
 * （2005/7/1）且新制有 6 個月上限，與預告期的級距表無關，不要共用這一支。
 * 設計見 ADR 020。
 */
export function resolveRequiredNoticeDaysByType(
  type: ResignationType,
  tenureMonths: number,
): number {
  if (type === ResignationType.CONTRACT_END) return 0;
  return resolveRequiredNoticeDays(tenureMonths);
}

/**
 * Info: (20260812 - Julian) 即時試算預告期。
 *
 * 年資算到「最後工作日」而不是今天：使用者一改離職日，年資可能跨過
 * 12 或 36 個月的門檻，應預告天數跟著跳。用今天算的話，
 * 畫面上的日期改了、下面的數字卻不動，那個試算就是裝飾。
 */
export function resolveNoticeEstimate(
  hireDateIso: string,
  form: IOffboardingInitiateForm,
): INoticePeriodEstimate {
  const lastWorkingDate = parseIsoDate(form.lastWorkingDate);
  const tenureMonths = differenceInFullMonths(
    parseIsoDate(hireDateIso),
    lastWorkingDate,
  );
  const requiredDays = resolveRequiredNoticeDaysByType(
    form.resignationType,
    tenureMonths,
  );
  const actualDays = Math.max(
    0,
    differenceInDays(parseIsoDate(form.noticeDate), lastWorkingDate),
  );

  return {
    isApplicable: form.resignationType !== ResignationType.CONTRACT_END,
    type: form.resignationType,
    tenureMonths,
    requiredDays,
    actualDays,
    shortageDays: Math.max(0, requiredDays - actualDays),
    isSatisfied: actualDays >= requiredDays,
  };
}

/**
 * Info: (20260812 - Julian) 可被發起離職的人。
 *
 * 三個排除條件，每一個都對應一種會壞掉的狀態：
 * 1. 已離職／已有離職日 —— 同一個人不該有兩份離職流程。
 * 2. 「身上已經有任何流程任務」 —— `buildMovementCases` 依「第一筆任務的類型」
 *    判斷案件屬性，一個人同時有報到與離職任務時，另一種會整批消失。
 *    這正是 `buildOffboardingCases` 裡那個 filter 註解說的資料錯誤，
 *    與其在讀取端補救，不如讓它建不出來。
 * 3. 還沒到職 —— 到職日在未來的人要走的是「取消報到」，不是離職交接。
 */
export function resolveOffboardingCandidates(
  people: IEmployeeListItem[],
  employeeIdsWithProcess: ReadonlySet<string>,
  today: Date,
): IEmployeeListItem[] {
  return people.filter((person) => {
    if (person.leaveDate !== null) return false;
    if (person.status === EmployeeStatus.RESIGNED) return false;
    if (employeeIdsWithProcess.has(person.id)) return false;
    return differenceInDays(today, parseIsoDate(person.hireDate)) <= 0;
  });
}

export function buildInitialOffboardingForm(
  today: Date,
): IOffboardingInitiateForm {
  const lastWorkingDate = addDays(today, DEFAULT_NOTICE_DAYS);

  return {
    employeeId: "",
    /**
     * Info: (20260812 - Julian) 提出日預設今天、最後工作日預設一個月後。
     *
     * 這兩個與報到日不同，可以有預設值：它們的「對的答案」就是最常見的那個
     * （今天收到申請、依最長的法定預告期排），而且錯了會在正下方的
     * 預告期試算裡立刻看得到 —— 一個馬上被檢查的預設值不會被 click 過去。
     */
    noticeDate: toIsoDate(today),
    lastWorkingDate: toIsoDate(lastWorkingDate),
    insuranceOffDate: toIsoDate(
      addDays(lastWorkingDate, INSURANCE_OFF_DAY_OFFSET),
    ),
    resignationType: ResignationType.VOLUNTARY,
    reasonNote: "",
    handoverAssigneeId: "",
    templateId: OffboardingTemplateKey.GENERAL,
  };
}

/**
 * Info: (20260812 - Julian) 改最後工作日時，退保日跟著移 —— 但只在使用者沒動過它時。
 *
 * 同報到端的「部門 → 主管」：自動帶入很好用，覆寫使用者的選擇很難發現。
 */
export function applyLastWorkingDateChange(
  form: IOffboardingInitiateForm,
  lastWorkingDate: string,
  isInsuranceDateTouched: boolean,
): IOffboardingInitiateForm {
  if (isInsuranceDateTouched || lastWorkingDate === "") {
    return { ...form, lastWorkingDate };
  }
  return {
    ...form,
    lastWorkingDate,
    insuranceOffDate: toIsoDate(
      addDays(parseIsoDate(lastWorkingDate), INSURANCE_OFF_DAY_OFFSET),
    ),
  };
}

export function validateOffboardingInitiateForm(
  form: IOffboardingInitiateForm,
  today: Date,
): IOffboardingInitiateErrors {
  const resolveNoticeDate = (): string | null => {
    if (form.noticeDate === "") return ERROR_KEY.REQUIRED;
    /**
     * Info: (20260812 - Julian) 提出日不可在未來。
     *
     * 「申請提出日」記的是這件事已經發生的那一天，不是預定要發生的那一天。
     * 允許填未來，預告期就會被算成比實際更長 —— 而預告期不足是有法律後果的。
     * 填過去則放行：HR 常常是隔幾天才進系統補登。
     */
    return differenceInDays(today, parseIsoDate(form.noticeDate)) > 0
      ? ERROR_KEY.NOTICE_IN_FUTURE
      : null;
  };

  const resolveLastWorkingDate = (): string | null => {
    if (form.lastWorkingDate === "") return ERROR_KEY.REQUIRED;
    if (form.noticeDate === "") return null;
    // Info: (20260812 - Julian) 最後工作日早於提出日是不可能的事，不是「預告期為 0」
    return differenceInDays(
      parseIsoDate(form.noticeDate),
      parseIsoDate(form.lastWorkingDate),
    ) < 0
      ? ERROR_KEY.LAST_DAY_BEFORE_NOTICE
      : null;
  };

  const resolveInsuranceOffDate = (): string | null => {
    if (form.insuranceOffDate === "") return ERROR_KEY.REQUIRED;
    if (form.lastWorkingDate === "") return null;
    // Info: (20260812 - Julian) 退保日不可早於最後工作日
    return differenceInDays(
      parseIsoDate(form.lastWorkingDate),
      parseIsoDate(form.insuranceOffDate),
    ) < 0
      ? ERROR_KEY.INSURANCE_BEFORE_LAST_DAY
      : null;
  };

  const resolveAssignee = (): string | null => {
    if (form.handoverAssigneeId === "") return ERROR_KEY.REQUIRED;
    // Info: (20260812 - Julian) 交接給自己等於沒有交接
    return form.handoverAssigneeId === form.employeeId
      ? ERROR_KEY.ASSIGNEE_IS_SELF
      : null;
  };

  return {
    employeeId: form.employeeId === "" ? ERROR_KEY.REQUIRED : null,
    noticeDate: resolveNoticeDate(),
    lastWorkingDate: resolveLastWorkingDate(),
    insuranceOffDate: resolveInsuranceOffDate(),
    handoverAssigneeId: resolveAssignee(),
  };
}

export function hasOffboardingInitiateError(
  errors: IOffboardingInitiateErrors,
): boolean {
  return Object.values(errors).some((value) => value !== null);
}

/**
 * Info: (20260812 - Julian) 依範本產生交接任務。
 *
 * 與報到端的差別是沒有開關可關 —— 交接、資產回收、退保三件事沒有一件
 * 是「這次不用做」的。範本只決定要不要多幾項職務別的移交。
 *
 * 資產序號由工號推導而不是亂數：同一個人重新整理後不該換一組序號。
 */
/**
 * Info: (20260812 - Julian) 這次要建立的任務清單：範本項目加上資遣才有的通報。
 *
 * 通報插在 HR 那一組的最前面（它是所有 HR 項目裡最早到期的，離職日前 10 天）。
 * 位置用 `findIndex` 算，共用清單增減項目時不會安靜地插錯組。
 *
 * 預覽與實際建立都走這一支：分成兩份的話，「畫面說 14 項、實際建了 13 項」
 * 是不會有人發現的差異，兩邊都各自合理，只是不同意。
 */
export function resolveOffboardingTemplateItems(
  form: IOffboardingInitiateForm,
): (typeof OFFBOARDING_LAYOFF_REPORT_TASK)[] {
  const items = OFFBOARDING_TEMPLATES[form.templateId];
  if (form.resignationType !== ResignationType.LAYOFF) return items;

  const hrGroupStart = items.findIndex(
    (item) => item.category === HandoverCategory.HR,
  );
  const insertAt = hrGroupStart === -1 ? items.length : hrGroupStart;
  return [
    ...items.slice(0, insertAt),
    OFFBOARDING_LAYOFF_REPORT_TASK,
    ...items.slice(insertAt),
  ];
}

export function buildInitiatedOffboardingTasks(
  employee: IEmployeeListItem,
  form: IOffboardingInitiateForm,
  translate: (i18nKey: string) => string,
): IOffboardingTask[] {
  const lastWorkingDate = parseIsoDate(form.lastWorkingDate);
  const serial = Number(employee.employeeNo.replace(/\D/g, "")) || 0;

  return resolveOffboardingTemplateItems(form).map((template, index) => ({
    id: `task-off-${employee.id}-${template.key}`,
    employeeId: employee.id,
    taskType: ProcessTaskType.OFFBOARDING as ProcessTaskType.OFFBOARDING,
    title: translate(
      OFFBOARDING_TASK_TITLE_I18N_KEY[template.key as OffboardingTaskKey],
    ),
    // Info: (20260812 - Julian) 全部從待處理開始；剛發起的案件不可能有任何一項已完成
    status: ProcessTaskStatus.PENDING,
    dueDate: toIsoDate(addDays(lastWorkingDate, template.dueOffset)),
    category: template.category,
    templateKey: template.key,
    assigneeName: OFFBOARDING_ASSIGNEE_BY_CATEGORY[template.category],
    completedBy: null,
    completedDate: null,
    assetNo: template.assetPrefix
      ? `${template.assetPrefix}${1000 + ((serial * 37 + index * 131) % 9000)}`
      : null,
    scheduledAt: template.isScheduled
      ? `${form.lastWorkingDate}T${ACCOUNT_REVOKE_DEFAULT_TIME}`
      : null,
    note: null,
  }));
}

/**
 * Info: (20260812 - Julian) 把表單攤成員工異動、任務與發起紀錄。
 *
 * 員工的 `status` **不動**：最後工作日還沒到的人仍然在職，
 * 提前改成 RESIGNED 會讓他當天就從在職人數與部門編制上消失。
 *
 * ToDo: (20260812 - Julian) 轉成 RESIGNED 應該是離職日當天由排程做，
 * 或由「結案」動作觸發 —— 那是另一條流程，不屬於發起。
 */
export function buildOffboardingInitiateResult(
  employee: IEmployeeListItem,
  form: IOffboardingInitiateForm,
  translate: (i18nKey: string) => string,
): IOffboardingInitiateResult {
  const updated: IEmployeeListItem = {
    ...employee,
    leaveDate: form.lastWorkingDate,
  };

  return {
    employee: updated,
    tasks: buildInitiatedOffboardingTasks(updated, form, translate),
    initiation: {
      employeeId: employee.id,
      noticeDate: form.noticeDate,
      lastWorkingDate: form.lastWorkingDate,
      insuranceOffDate: form.insuranceOffDate,
      resignationType: form.resignationType,
      reason: RESIGNATION_TYPE_DEFAULT_REASON[form.resignationType],
      reasonNote: form.reasonNote.trim(),
      handoverAssigneeId: form.handoverAssigneeId,
    },
  };
}
