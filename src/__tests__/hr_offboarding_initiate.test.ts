import { describe, it, expect } from "@jest/globals";
import {
  EmployeeStatus,
  Gender,
  HandoverCategory,
  OffboardingTaskKey,
  OffboardingTemplateKey,
  ResignationReason,
  ResignationType,
} from "@/constants/hr_management";
import {
  IEmployeeListItem,
  IOffboardingInitiateForm,
} from "@/interfaces/hr_management";
import { parseIsoDate } from "@/lib/utils/hr_date";
import {
  applyLastWorkingDateChange,
  resolveOffboardingTemplateItems,
  buildInitialOffboardingForm,
  buildInitiatedOffboardingTasks,
  buildOffboardingInitiateResult,
  hasOffboardingInitiateError,
  resolveNoticeEstimate,
  resolveOffboardingCandidates,
  resolveRequiredNoticeDaysByType,
  validateOffboardingInitiateForm,
} from "@/lib/utils/hr_offboarding_initiate";

/**
 * Info: (20260812 - Julian) 發起離職申請的驗證與試算。
 *
 * 預告期試算是這一支最值得測的東西：它有三條互相獨立的分支
 * （自請／資遣／契約期滿），而畫面測試一次只走得到一條。
 */

const TODAY = parseIsoDate("2026-08-11");

const buildPerson = (
  overrides: Partial<IEmployeeListItem> = {},
): IEmployeeListItem => ({
  id: "emp-001",
  employeeNo: "EMP001",
  name: "王小明",
  englishName: null,
  gender: Gender.MALE,
  email: "emp001@isunfa.com",
  maskedPhone: "*******678",
  birthMonthDay: null,
  age: null,
  status: EmployeeStatus.ACTIVE,
  // Info: (20260812 - Julian) 到 2026-09-10 為止年資 3 年 6 個月，落在 30 天那一級
  hireDate: "2023-03-01",
  leaveDate: null,
  departmentId: "dep-001",
  departmentName: "技術部",
  jobTitleId: "jt-005",
  jobTitle: "後端工程師",
  managerName: "張大明",
  ...overrides,
});

const buildForm = (
  overrides: Partial<IOffboardingInitiateForm> = {},
): IOffboardingInitiateForm => ({
  employeeId: "emp-001",
  noticeDate: "2026-08-11",
  lastWorkingDate: "2026-09-10",
  insuranceOffDate: "2026-09-11",
  resignationType: ResignationType.VOLUNTARY,
  reasonNote: "轉至其他產業發展",
  handoverAssigneeId: "emp-002",
  templateId: OffboardingTemplateKey.GENERAL,
  ...overrides,
});

describe("resolveRequiredNoticeDaysByType", () => {
  it.each([
    [ResignationType.VOLUNTARY, 42, 30],
    [ResignationType.LAYOFF, 42, 30],
    [ResignationType.VOLUNTARY, 13, 20],
    [ResignationType.VOLUNTARY, 4, 10],
    [ResignationType.VOLUNTARY, 2, 0],
  ])("should map %p at %p months to %p days", (type, months, expected) => {
    expect(resolveRequiredNoticeDaysByType(type, months)).toBe(expected);
  });

  /**
   * Info: (20260812 - Julian) 這一條是加 `ResignationType` 的主要理由。
   *
   * 定期契約期滿沒有「提前告知」可言。用同一張表算的話，每一個約聘期滿的人
   * 都會被標成預告期不足 —— 一個永遠亮著、因此沒有人會再看的警示。
   */
  it("should require no notice when a fixed-term contract simply ends", () => {
    expect(
      resolveRequiredNoticeDaysByType(ResignationType.CONTRACT_END, 120),
    ).toBe(0);
  });
});

describe("resolveNoticeEstimate", () => {
  const hireDate = "2023-03-01";

  it("should satisfy the notice period for a 30-day lead time at 3+ years", () => {
    const estimate = resolveNoticeEstimate(hireDate, buildForm());
    expect(estimate.tenureMonths).toBe(42);
    expect(estimate.requiredDays).toBe(30);
    expect(estimate.actualDays).toBe(30);
    expect(estimate.isSatisfied).toBe(true);
    expect(estimate.shortageDays).toBe(0);
  });

  it("should report the shortage when the last day is pulled in", () => {
    const estimate = resolveNoticeEstimate(
      hireDate,
      buildForm({ lastWorkingDate: "2026-08-25" }),
    );
    expect(estimate.actualDays).toBe(14);
    expect(estimate.shortageDays).toBe(16);
    expect(estimate.isSatisfied).toBe(false);
  });

  /**
   * Info: (20260812 - Julian) 年資算到最後工作日，不是今天。
   *
   * 到職 2025-09-05 的人，離職日訂在 2026-09-04 時年資 11 個月（20 天門檻不適用），
   * 訂在 09-05 就滿 12 個月跳到 20 天。用今天算的話這個跳動永遠不會發生，
   * 畫面上的日期改了、下面的數字卻不動。
   */
  it("should recompute the tenure threshold from the last working day", () => {
    const justUnder = resolveNoticeEstimate(
      "2025-09-05",
      buildForm({ noticeDate: "2026-08-11", lastWorkingDate: "2026-09-04" }),
    );
    const justOver = resolveNoticeEstimate(
      "2025-09-05",
      buildForm({ noticeDate: "2026-08-11", lastWorkingDate: "2026-09-05" }),
    );
    expect(justUnder.tenureMonths).toBe(11);
    expect(justUnder.requiredDays).toBe(10);
    expect(justOver.tenureMonths).toBe(12);
    expect(justOver.requiredDays).toBe(20);
  });

  it("should mark a fixed-term ending as not applicable", () => {
    const estimate = resolveNoticeEstimate(
      hireDate,
      buildForm({
        resignationType: ResignationType.CONTRACT_END,
        lastWorkingDate: "2026-08-12",
      }),
    );
    expect(estimate.isApplicable).toBe(false);
    expect(estimate.requiredDays).toBe(0);
    expect(estimate.isSatisfied).toBe(true);
  });
});

describe("resolveOffboardingCandidates", () => {
  const people = [
    buildPerson(),
    buildPerson({ id: "emp-002", employeeNo: "EMP002", name: "李佳蓉" }),
    // Info: (20260812 - Julian) 已有離職日的人不該再被發起一次
    buildPerson({
      id: "emp-003",
      employeeNo: "EMP003",
      leaveDate: "2026-09-01",
    }),
    buildPerson({
      id: "emp-004",
      employeeNo: "EMP004",
      status: EmployeeStatus.RESIGNED,
      leaveDate: "2026-01-31",
    }),
    // Info: (20260812 - Julian) 到職日在未來：要走的是「取消報到」，不是離職交接
    buildPerson({
      id: "emp-005",
      employeeNo: "EMP005",
      hireDate: "2026-09-20",
    }),
  ];

  it("should exclude people who already have a leave date or resigned", () => {
    const ids = resolveOffboardingCandidates(
      people,
      new Set<string>(),
      TODAY,
    ).map((person) => person.id);
    expect(ids).toEqual(["emp-001", "emp-002"]);
  });

  /**
   * Info: (20260812 - Julian) 身上已有流程任務的人要擋掉。
   *
   * `buildMovementCases` 依「第一筆任務的類型」決定案件屬性，
   * 同一個人同時有報到與離職任務時，另一種會整批從畫面上消失 ——
   * 與其在讀取端補救，不如讓它建不出來。
   */
  it("should exclude people who already have process tasks", () => {
    const ids = resolveOffboardingCandidates(
      people,
      new Set(["emp-001"]),
      TODAY,
    ).map((person) => person.id);
    expect(ids).toEqual(["emp-002"]);
  });
});

describe("applyLastWorkingDateChange", () => {
  it("should move the insurance date along when untouched", () => {
    const next = applyLastWorkingDateChange(buildForm(), "2026-10-31", false);
    expect(next.insuranceOffDate).toBe("2026-11-01");
  });

  it("should keep a manually chosen insurance date", () => {
    const next = applyLastWorkingDateChange(
      buildForm({ insuranceOffDate: "2026-09-30" }),
      "2026-10-31",
      true,
    );
    expect(next.lastWorkingDate).toBe("2026-10-31");
    expect(next.insuranceOffDate).toBe("2026-09-30");
  });
});

describe("validateOffboardingInitiateForm", () => {
  it("should pass a fully filled form", () => {
    expect(
      hasOffboardingInitiateError(
        validateOffboardingInitiateForm(buildForm(), TODAY),
      ),
    ).toBe(false);
  });

  /**
   * Info: (20260812 - Julian) 預告期不足**不是**驗證錯誤。
   *
   * 它在法律上不是無效，而是「要嘛雙方合意、要嘛雇主付預告期間工資」。
   * 擋下來只會讓 HR 去改一個假的日期繞過檢查，那比留下一筆誠實的紀錄糟。
   */
  it("should not reject a form whose notice period falls short", () => {
    const form = buildForm({ lastWorkingDate: "2026-08-15" });
    expect(resolveNoticeEstimate("2023-03-01", form).isSatisfied).toBe(false);
    expect(
      hasOffboardingInitiateError(validateOffboardingInitiateForm(form, TODAY)),
    ).toBe(false);
  });

  it("should reject a notice date in the future", () => {
    const errors = validateOffboardingInitiateForm(
      buildForm({ noticeDate: "2026-08-12" }),
      TODAY,
    );
    expect(errors.noticeDate).toContain("error_notice_in_future");
  });

  // Info: (20260812 - Julian) HR 常常隔幾天才進系統補登，過去的提出日必須放行
  it("should accept a notice date in the past", () => {
    const errors = validateOffboardingInitiateForm(
      buildForm({ noticeDate: "2026-07-01" }),
      TODAY,
    );
    expect(errors.noticeDate).toBeNull();
  });

  it("should reject a last working day before the notice date", () => {
    const errors = validateOffboardingInitiateForm(
      buildForm({ noticeDate: "2026-08-11", lastWorkingDate: "2026-08-10" }),
      TODAY,
    );
    expect(errors.lastWorkingDate).toContain("error_last_day_before_notice");
  });

  /**
   * Info: (20260812 - Julian) 退保日早於最後工作日 = 人還在上班卻已經沒有勞保。
   * 那段期間出事沒有保障，所以這一條是擋，不是提醒。
   */
  it("should reject an insurance end date before the last working day", () => {
    const errors = validateOffboardingInitiateForm(
      buildForm({ insuranceOffDate: "2026-09-09" }),
      TODAY,
    );
    expect(errors.insuranceOffDate).toContain(
      "error_insurance_before_last_day",
    );
  });

  it("should accept an insurance end date equal to the last working day", () => {
    const errors = validateOffboardingInitiateForm(
      buildForm({ insuranceOffDate: "2026-09-10" }),
      TODAY,
    );
    expect(errors.insuranceOffDate).toBeNull();
  });

  it("should reject handing over to the departing employee", () => {
    const errors = validateOffboardingInitiateForm(
      buildForm({ handoverAssigneeId: "emp-001" }),
      TODAY,
    );
    expect(errors.handoverAssigneeId).toContain("error_assignee_is_self");
  });

  it("should report every required field on an empty form", () => {
    const errors = validateOffboardingInitiateForm(
      buildForm({
        employeeId: "",
        noticeDate: "",
        lastWorkingDate: "",
        insuranceOffDate: "",
        handoverAssigneeId: "",
      }),
      TODAY,
    );
    expect(
      Object.values(errors).filter((value) => value !== null),
    ).toHaveLength(5);
  });
});

describe("buildInitialOffboardingForm", () => {
  const form = buildInitialOffboardingForm(TODAY);

  // Info: (20260812 - Julian) 預設值就在正下方的預告期試算裡被檢查，不會被 click 過去
  it("should default to today plus the longest statutory notice", () => {
    expect(form.noticeDate).toBe("2026-08-11");
    expect(form.lastWorkingDate).toBe("2026-09-10");
    expect(form.insuranceOffDate).toBe("2026-09-11");
  });

  it("should leave the employee and handover contact empty", () => {
    expect(form.employeeId).toBe("");
    expect(form.handoverAssigneeId).toBe("");
  });
});

describe("buildInitiatedOffboardingTasks", () => {
  const translate = (key: string) => key;
  const employee = buildPerson();

  it("should build the thirteen common tasks as pending", () => {
    const tasks = buildInitiatedOffboardingTasks(
      employee,
      buildForm(),
      translate,
    );
    expect(tasks).toHaveLength(13);
    expect(tasks.every((task) => task.status === "PENDING")).toBe(true);
    expect(tasks.every((task) => task.completedDate === null)).toBe(true);
  });

  // Info: (20260812 - Julian) 職務別移交要排在主管驗收之前，否則等於沒有被驗收到
  it("should insert the role handover before the approval task", () => {
    const keys = buildInitiatedOffboardingTasks(
      employee,
      buildForm({ templateId: OffboardingTemplateKey.ENGINEERING }),
      translate,
    ).map((task) => task.templateKey);

    expect(keys).toHaveLength(14);
    expect(keys.indexOf(OffboardingTaskKey.CODE_HANDOVER)).toBeLessThan(
      keys.indexOf(OffboardingTaskKey.HANDOVER_APPROVAL),
    );
  });

  it("should offset due dates from the last working day", () => {
    const tasks = buildInitiatedOffboardingTasks(
      employee,
      buildForm(),
      translate,
    );
    const documentHandover = tasks.find(
      (task) => task.templateKey === OffboardingTaskKey.DOCUMENT_HANDOVER,
    );
    const laborInsurance = tasks.find(
      (task) => task.templateKey === OffboardingTaskKey.LABOR_INSURANCE,
    );
    expect(documentHandover?.dueDate).toBe("2026-09-03");
    expect(laborInsurance?.dueDate).toBe("2026-09-13");
  });

  it("should give physical assets a serial and schedule the revokes", () => {
    const tasks = buildInitiatedOffboardingTasks(
      employee,
      buildForm(),
      translate,
    );
    const laptop = tasks.find(
      (task) => task.templateKey === OffboardingTaskKey.LAPTOP_RETURN,
    );
    const revoke = tasks.find(
      (task) => task.templateKey === OffboardingTaskKey.ACCOUNT_REVOKE,
    );
    expect(laptop?.assetNo).toMatch(/^C02X\d{4}$/);
    expect(revoke?.assetNo).toBeNull();
    expect(revoke?.scheduledAt).toBe("2026-09-10T18:00");
  });
});

describe("buildOffboardingInitiateResult", () => {
  const result = buildOffboardingInitiateResult(
    buildPerson(),
    buildForm(),
    (key) => key,
  );

  /**
   * Info: (20260812 - Julian) 離職不建人：回傳的是同一個 id、只多了 `leaveDate`。
   * 少了那個日期，`buildMovementCases` 會把整筆案件略過。
   */
  it("should set the leave date on the same employee record", () => {
    expect(result.employee.id).toBe("emp-001");
    expect(result.employee.leaveDate).toBe("2026-09-10");
  });

  /**
   * Info: (20260812 - Julian) 狀態不動。最後工作日還沒到的人仍然在職，
   * 提前改成 RESIGNED 會讓他當天就從在職人數與部門編制上消失。
   */
  it("should leave the employment status untouched", () => {
    expect(result.employee.status).toBe(EmployeeStatus.ACTIVE);
  });

  it("should derive a consistent resignation reason from the type", () => {
    expect(result.initiation.reason).toBe(ResignationReason.CAREER);
    expect(
      buildOffboardingInitiateResult(
        buildPerson(),
        buildForm({ resignationType: ResignationType.LAYOFF }),
        (key) => key,
      ).initiation.reason,
    ).toBe(ResignationReason.LAYOFF);
  });

  it("should carry the chosen dates and handover contact into the initiation", () => {
    expect(result.initiation.insuranceOffDate).toBe("2026-09-11");
    expect(result.initiation.handoverAssigneeId).toBe("emp-002");
    expect(result.initiation.reasonNote).toBe("轉至其他產業發展");
  });
});

describe("resolveOffboardingTemplateItems", () => {
  const keysOf = (form: IOffboardingInitiateForm) =>
    resolveOffboardingTemplateItems(form).map((item) => item.key);

  /**
   * Info: (20260812 - Julian) 這一組是「資遣通報做成任務」的核心保證。
   *
   * 通報義務（就業服務法第 33 條）只在資遣時存在。三種類型都產生一筆的話，
   * 那筆任務在另外兩種情境下永遠掛著沒人做，人會學會忽略它 ——
   * 然後連該做的那次也一起忽略。
   */
  it.each([[ResignationType.VOLUNTARY], [ResignationType.CONTRACT_END]])(
    "should not add the layoff report for %p",
    (resignationType) => {
      expect(keysOf(buildForm({ resignationType }))).not.toContain(
        OffboardingTaskKey.LAYOFF_REPORT,
      );
    },
  );

  it("should add the layoff report for a termination by employer", () => {
    const keys = keysOf(buildForm({ resignationType: ResignationType.LAYOFF }));
    expect(keys).toContain(OffboardingTaskKey.LAYOFF_REPORT);
    expect(keys).toHaveLength(14);
  });

  // Info: (20260812 - Julian) 通報是所有 HR 項目裡最早到期的，排在那一組的最前面
  it("should place the layoff report at the head of the HR group", () => {
    const items = resolveOffboardingTemplateItems(
      buildForm({ resignationType: ResignationType.LAYOFF }),
    );
    const index = items.findIndex(
      (item) => item.key === OffboardingTaskKey.LAYOFF_REPORT,
    );
    expect(items[index].category).toBe(HandoverCategory.HR);
    expect(items[index - 1].category).not.toBe(HandoverCategory.HR);
    expect(
      items.slice(index).every((item) => item.category === HandoverCategory.HR),
    ).toBe(true);
  });

  // Info: (20260812 - Julian) 通報由類型決定、職務別移交由範本決定，兩者互不排斥
  it("should combine with a role-specific template", () => {
    expect(
      keysOf(
        buildForm({
          resignationType: ResignationType.LAYOFF,
          templateId: OffboardingTemplateKey.ENGINEERING,
        }),
      ),
    ).toHaveLength(15);
  });
});

describe("buildInitiatedOffboardingTasks with a layoff report", () => {
  const translate = (key: string) => key;
  const employee = buildPerson();
  const form = buildForm({ resignationType: ResignationType.LAYOFF });
  const tasks = buildInitiatedOffboardingTasks(employee, form, translate);
  const report = tasks.find(
    (task) => task.templateKey === OffboardingTaskKey.LAYOFF_REPORT,
  );

  /**
   * Info: (20260812 - Julian) 期限是離職生效日前 10 天，不是發起當下。
   * 最後工作日 2026-09-10 對應 2026-08-31。
   */
  it("should fall due ten days before the last working day", () => {
    expect(report?.dueDate).toBe("2026-08-31");
  });

  it("should belong to HR with a real assignee", () => {
    expect(report?.category).toBe(HandoverCategory.HR);
    expect(report?.assigneeName).toBe("林巧芯");
    expect(report?.status).toBe("PENDING");
  });

  // Info: (20260812 - Julian) 預覽說會建幾項，實際就要建幾項
  it("should build exactly what the resolver promised", () => {
    expect(tasks.map((task) => task.templateKey)).toEqual(
      resolveOffboardingTemplateItems(form).map((item) => item.key),
    );
  });

  it("should carry the type into the initiation record", () => {
    expect(
      buildOffboardingInitiateResult(employee, form, translate).initiation
        .resignationType,
    ).toBe(ResignationType.LAYOFF);
  });
});
