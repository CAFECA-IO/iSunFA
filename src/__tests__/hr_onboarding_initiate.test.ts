import { describe, it, expect } from "@jest/globals";
import {
  EmployeeStatus,
  Gender,
  HandoverCategory,
  OnboardingTaskKey,
  OnboardingTemplateKey,
  OnboardingTrigger,
} from "@/constants/hr_management";
import {
  IDepartment,
  IEmployeeListItem,
  IJobTitle,
  IOnboardingInitiateForm,
} from "@/interfaces/hr_management";
import { parseIsoDate } from "@/lib/utils/hr_date";
import {
  applyDepartmentChange,
  buildInitiatedEmployee,
  buildInitiatedTasks,
  hasInitiateError,
  previewTaskKeys,
  resolveDefaultManagerId,
  suggestNextEmployeeNo,
  validateInitiateForm,
} from "@/lib/utils/hr_onboarding_initiate";

/**
 * Info: (20260812 - Julian) 發起新人報到的驗證與組裝。
 *
 * 這一層值得寫單元測試而不是只靠畫面驗證，理由是它有分支：
 * 同一個欄位在「空白」「格式錯」「重複」三種情況要回三種不同的訊息，
 * 而畫面測試一次只走得到其中一條 —— 走到哪一條取決於測試怎麼打字。
 */

const TODAY = parseIsoDate("2026-08-10");

const buildPerson = (
  overrides: Partial<IEmployeeListItem> = {},
): IEmployeeListItem => ({
  id: "emp-001",
  employeeNo: "EMP001",
  name: "張大明",
  englishName: null,
  gender: Gender.MALE,
  email: "emp001@isunfa.com",
  maskedPhone: "*******678",
  birthMonthDay: null,
  age: null,
  status: EmployeeStatus.ACTIVE,
  hireDate: "2020-01-01",
  leaveDate: null,
  departmentId: "dep-001",
  departmentName: "技術部",
  jobTitleId: "jt-002",
  jobTitle: "部門經理",
  managerName: null,
  ...overrides,
});

const PEOPLE: IEmployeeListItem[] = [
  buildPerson(),
  buildPerson({
    id: "emp-002",
    employeeNo: "EMP012",
    name: "李佳蓉",
    email: "emp012@isunfa.com",
  }),
  // Info: (20260812 - Julian) 已離職者：不該出現在主管候選，也仍然佔用工號
  buildPerson({
    id: "emp-003",
    employeeNo: "EMP030",
    name: "王小虎",
    email: "emp030@isunfa.com",
    status: EmployeeStatus.RESIGNED,
    leaveDate: "2026-07-01",
  }),
];

const DEPARTMENTS: IDepartment[] = [
  {
    id: "dep-001",
    code: "DEP-001",
    name: "技術部",
    description: null,
    parentId: null,
    managerId: "emp-001",
  },
  {
    id: "dep-002",
    code: "DEP-002",
    name: "財會部",
    description: null,
    parentId: null,
    managerId: null,
  },
  {
    id: "dep-003",
    code: "DEP-003",
    name: "法務部",
    description: null,
    parentId: null,
    // Info: (20260812 - Julian) 指向一個不在名冊裡的人，模擬主管已離職或資料不全
    managerId: "emp-ghost",
  },
];

const JOB_TITLES: IJobTitle[] = [
  {
    id: "jt-005",
    code: "JT-FE",
    title: "前端工程師",
    level: 2,
    description: null,
  },
];

const buildForm = (
  overrides: Partial<IOnboardingInitiateForm> = {},
): IOnboardingInitiateForm => ({
  employeeNo: "EMP031",
  name: "林小美",
  gender: Gender.FEMALE,
  email: "m.lin@isunfa.com",
  phone: "0912-345-678",
  departmentId: "dep-001",
  jobTitleId: "jt-005",
  managerId: "emp-001",
  hireDate: "2026-09-01",
  templateId: OnboardingTemplateKey.GENERAL,
  personalEmail: "may.lin@gmail.com",
  triggers: {
    [OnboardingTrigger.IT_SETUP]: true,
    [OnboardingTrigger.FACILITY_SETUP]: true,
    [OnboardingTrigger.PREONBOARDING_FORM]: true,
  },
  ...overrides,
});

describe("suggestNextEmployeeNo", () => {
  /**
   * Info: (20260812 - Julian) 取最大號 + 1，不是「筆數 + 1」。
   * 名冊有 3 人但最大號是 EMP030，用筆數會建議 EMP004 —— 一個已被佔用的號碼。
   */
  it("should take the largest existing serial rather than the head count", () => {
    expect(suggestNextEmployeeNo(PEOPLE)).toBe("EMP031");
  });

  it("should start from EMP001 when the roster is empty", () => {
    expect(suggestNextEmployeeNo([])).toBe("EMP001");
  });
});

describe("resolveDefaultManagerId", () => {
  it("should fill in the department manager", () => {
    expect(resolveDefaultManagerId("dep-001", DEPARTMENTS, PEOPLE)).toBe(
      "emp-001",
    );
  });

  it("should stay empty when the department has no manager", () => {
    expect(resolveDefaultManagerId("dep-002", DEPARTMENTS, PEOPLE)).toBe("");
  });

  /**
   * Info: (20260812 - Julian) 主管不在名冊時留空，而不是退回名冊上的任何一個人。
   * 猜一個值的代價是這筆資料看起來填好了，實際上簽核會送錯人。
   */
  it("should stay empty when the referenced manager is not on the roster", () => {
    expect(resolveDefaultManagerId("dep-003", DEPARTMENTS, PEOPLE)).toBe("");
  });
});

describe("applyDepartmentChange", () => {
  it("should fill the manager from the department when untouched", () => {
    const next = applyDepartmentChange(
      buildForm({ managerId: "" }),
      "dep-001",
      DEPARTMENTS,
      PEOPLE,
      false,
    );
    expect(next.managerId).toBe("emp-001");
  });

  // Info: (20260812 - Julian) 這條是整個連動邏輯存在的理由，不是邊角案例
  it("should keep a manually chosen manager when the department changes", () => {
    const next = applyDepartmentChange(
      buildForm({ managerId: "emp-002" }),
      "dep-001",
      DEPARTMENTS,
      PEOPLE,
      true,
    );
    expect(next.departmentId).toBe("dep-001");
    expect(next.managerId).toBe("emp-002");
  });
});

describe("validateInitiateForm", () => {
  it("should pass a fully filled form", () => {
    const errors = validateInitiateForm(buildForm(), PEOPLE, TODAY);
    expect(hasInitiateError(errors)).toBe(false);
  });

  it("should report every required field on an empty form", () => {
    const errors = validateInitiateForm(
      buildForm({
        employeeNo: "",
        name: "",
        gender: null,
        email: "",
        phone: "",
        departmentId: "",
        jobTitleId: "",
        managerId: "",
        hireDate: "",
        personalEmail: "",
      }),
      PEOPLE,
      TODAY,
    );
    const filled = Object.values(errors).filter((value) => value !== null);
    expect(filled).toHaveLength(10);
  });

  /**
   * Info: (20260812 - Julian) 三種工號錯誤要能分辨。
   * 全部回「格式不對」的話，撞號的人會一直在調整格式。
   */
  it.each([
    ["", "error_required"],
    ["E31", "error_employee_no_format"],
    ["EMP001", "error_employee_no_taken"],
    // Info: (20260812 - Julian) 已離職者仍佔用工號，號碼不回收
    ["EMP030", "error_employee_no_taken"],
    ["emp001", "error_employee_no_taken"],
  ])("should reject employeeNo %p", (employeeNo, expected) => {
    const errors = validateInitiateForm(
      buildForm({ employeeNo }),
      PEOPLE,
      TODAY,
    );
    expect(errors.employeeNo).toContain(expected);
  });

  it.each([
    ["", "error_required"],
    ["not-an-email", "error_email_format"],
    ["EMP001@isunfa.com", "error_email_taken"],
  ])("should reject email %p", (email, expected) => {
    const errors = validateInitiateForm(buildForm({ email }), PEOPLE, TODAY);
    expect(errors.email).toContain(expected);
  });

  // Info: (20260812 - Julian) 分隔符要放行 —— 使用者從通訊錄貼過來就是帶 `-` 的
  it.each([
    ["0912345678", null],
    ["0912-345-678", null],
    ["0912 345 678", null],
    ["02-27001234", "error_phone_format"],
    ["", "error_required"],
  ])("should validate phone %p", (phone, expected) => {
    const errors = validateInitiateForm(buildForm({ phone }), PEOPLE, TODAY);
    if (expected === null) expect(errors.phone).toBeNull();
    else expect(errors.phone).toContain(expected);
  });

  it("should accept a start date of today", () => {
    const errors = validateInitiateForm(
      buildForm({ hireDate: "2026-08-10" }),
      PEOPLE,
      TODAY,
    );
    expect(errors.hireDate).toBeNull();
  });

  it("should reject a start date in the past", () => {
    const errors = validateInitiateForm(
      buildForm({ hireDate: "2026-08-09" }),
      PEOPLE,
      TODAY,
    );
    expect(errors.hireDate).toContain("error_hire_date_past");
  });

  it("should require the personal email only when the invitation is enabled", () => {
    const form = buildForm({ personalEmail: "" });
    expect(validateInitiateForm(form, PEOPLE, TODAY).personalEmail).toContain(
      "error_required",
    );

    const withoutInvite = buildForm({
      personalEmail: "",
      triggers: {
        ...form.triggers,
        [OnboardingTrigger.PREONBOARDING_FORM]: false,
      },
    });
    expect(
      validateInitiateForm(withoutInvite, PEOPLE, TODAY).personalEmail,
    ).toBeNull();
  });

  /**
   * Info: (20260812 - Julian) 個人信箱填成公務信箱時要擋。
   *
   * 預填表單的信是在「還沒有公司帳號」的空窗期寄的 —— 寄到公務信箱
   * 等於寄進一個當下不存在的信箱：信不會退，只是永遠沒人收到，
   * 而畫面上會顯示已發送。
   */
  it("should reject a personal email identical to the work email", () => {
    const errors = validateInitiateForm(
      buildForm({ personalEmail: "M.Lin@isunfa.com" }),
      PEOPLE,
      TODAY,
    );
    expect(errors.personalEmail).toContain("error_personal_email_same");
  });
});

describe("previewTaskKeys", () => {
  it("should list the six common tasks for the general template", () => {
    expect(previewTaskKeys(buildForm())).toEqual([
      OnboardingTaskKey.FORM,
      OnboardingTaskKey.CONTRACT,
      OnboardingTaskKey.ACCOUNT,
      OnboardingTaskKey.LAPTOP,
      OnboardingTaskKey.BADGE,
      OnboardingTaskKey.ORIENTATION,
    ]);
  });

  // Info: (20260812 - Julian) 職務別權限插在 IT 那一組之後，不是接在整份清單最後
  it("should insert the role-specific access right after the IT group", () => {
    const keys = previewTaskKeys(
      buildForm({ templateId: OnboardingTemplateKey.ENGINEERING }),
    );
    expect(keys).toHaveLength(7);
    expect(keys[4]).toBe(OnboardingTaskKey.DEV_ACCESS);
  });

  /**
   * Info: (20260812 - Julian) 關掉開關是「不建立」，不是「建立後標 SKIPPED」。
   * SKIPPED 在 `isTaskDone` 裡視同完成，會讓沒準備電腦的新人顯示 IT 進度 100%。
   */
  it("should drop the IT tasks entirely when the IT trigger is off", () => {
    const form = buildForm();
    const keys = previewTaskKeys(
      buildForm({
        triggers: { ...form.triggers, [OnboardingTrigger.IT_SETUP]: false },
      }),
    );
    expect(keys).not.toContain(OnboardingTaskKey.ACCOUNT);
    expect(keys).not.toContain(OnboardingTaskKey.LAPTOP);
    expect(keys).toHaveLength(4);
  });

  // Info: (20260812 - Julian) 預填表單只影響「要不要寄信」，不砍任何任務
  it("should not change the task list when the invitation is disabled", () => {
    const form = buildForm();
    expect(
      previewTaskKeys(
        buildForm({
          triggers: {
            ...form.triggers,
            [OnboardingTrigger.PREONBOARDING_FORM]: false,
          },
        }),
      ),
    ).toHaveLength(6);
  });
});

describe("buildInitiatedEmployee", () => {
  const employee = buildInitiatedEmployee(
    buildForm(),
    DEPARTMENTS,
    JOB_TITLES,
    PEOPLE,
  );

  /**
   * Info: (20260812 - Julian) 電話在組裝時就被遮掉。
   *
   * 這條是 ADR 018 在 DTO 層的落點：`IEmployeeListItem` 沒有明文電話欄位，
   * 因此就算有人把整份清單送到前端，也不會連同一百多支電話一起送出去。
   */
  it("should mask the phone number and keep no plaintext field", () => {
    expect(employee.maskedPhone).toBe("****-***-678");
    expect(employee).not.toHaveProperty("phone");
  });

  // Info: (20260812 - Julian) 發起報到時不收生日，那是新人自己在預填表單上填的
  it("should leave the birthday-derived fields empty", () => {
    expect(employee.birthMonthDay).toBeNull();
    expect(employee.age).toBeNull();
  });

  it("should resolve department, job title and manager names", () => {
    expect(employee.departmentName).toBe("技術部");
    expect(employee.jobTitle).toBe("前端工程師");
    expect(employee.managerName).toBe("張大明");
  });

  it("should start as PROBATION with no leave date", () => {
    expect(employee.status).toBe(EmployeeStatus.PROBATION);
    expect(employee.leaveDate).toBeNull();
  });

  // Info: (20260812 - Julian) id 由工號推導，重跑同一份表單不會長出第二個人
  it("should derive a stable id from the employee number", () => {
    const again = buildInitiatedEmployee(
      buildForm(),
      DEPARTMENTS,
      JOB_TITLES,
      PEOPLE,
    );
    expect(again.id).toBe(employee.id);
  });
});

describe("buildInitiatedTasks", () => {
  const translate = (key: string) => key;
  const employee = buildInitiatedEmployee(
    buildForm(),
    DEPARTMENTS,
    JOB_TITLES,
    PEOPLE,
  );

  it("should build every task as pending", () => {
    const tasks = buildInitiatedTasks(employee, buildForm(), translate);
    expect(tasks).toHaveLength(6);
    expect(tasks.every((task) => task.status === "PENDING")).toBe(true);
  });

  /**
   * Info: (20260812 - Julian) 到期日由到職日與範本的相對天數推得。
   * 報到前資料表是 -3 天，因此 9/1 到職對應 8/29。
   */
  it("should offset the due date from the start date", () => {
    const tasks = buildInitiatedTasks(employee, buildForm(), translate);
    const formTask = tasks.find(
      (task) => task.templateKey === OnboardingTaskKey.FORM,
    );
    expect(formTask?.dueDate).toBe("2026-08-29");
  });

  it("should assign each task to the window of its category", () => {
    const tasks = buildInitiatedTasks(employee, buildForm(), translate);
    const laptop = tasks.find(
      (task) => task.templateKey === OnboardingTaskKey.LAPTOP,
    );
    expect(laptop?.category).toBe(HandoverCategory.IT);
    expect(laptop?.assigneeName).toBe("許庭瑋");
  });

  // Info: (20260812 - Julian) 預覽說會建幾項，實際就要建幾項 —— 兩邊走同一組篩選
  it("should build exactly what the preview promised", () => {
    const form = buildForm({
      templateId: OnboardingTemplateKey.SALES,
      triggers: {
        [OnboardingTrigger.IT_SETUP]: true,
        [OnboardingTrigger.FACILITY_SETUP]: false,
        [OnboardingTrigger.PREONBOARDING_FORM]: true,
      },
    });
    expect(
      buildInitiatedTasks(employee, form, translate).map((t) => t.templateKey),
    ).toEqual(previewTaskKeys(form));
  });
});
