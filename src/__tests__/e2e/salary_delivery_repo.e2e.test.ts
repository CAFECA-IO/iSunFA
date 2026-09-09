import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import {
  defaultSalaryCalculatorResult,
  ISalaryCalculatorOptions,
} from "@/interfaces/salary_calculator";
import { salaryCalculatorEmployeeRepo } from "@/repositories/salary_calculator_employee.repo";
import { salaryRecordRepo } from "@/repositories/salary_record.repo";
import { salaryPaySlipDeliveryRepo } from "@/repositories/salary_pay_slip_delivery.repo";
import {
  SALARY_DELIVERY_FAILURE_REASON_MAX_LENGTH,
  SALARY_DELIVERY_STATUS,
} from "@/constants/salary_delivery";

/**
 * Info: (20260904 - Julian) 薪資單寄送紀錄 repository 的防線（真資料庫）。
 *
 * ## 為什麼一定要對真資料庫跑
 *
 * `salary_delivery_service.test.ts` 用手寫的假 repository 注入 service，
 * 而那個假物件把每一列原樣推進陣列 —— 它**天生就是隔離的、天生不截斷的**。
 * 於是三件事在那裡永遠綠，與真 repository 的 `where` 子句一點關係都沒有：
 *
 *   1. `listByRecord` 的 `where` 拿掉 `accountBookId`
 *   2. `recipientEmail` 改成查詢時 join 員工檔取現值
 *   3. `createDelivery` 不再截斷 `failureReason`
 *
 * 第 2 條尤其只有真資料庫答得出來：假物件根本沒有「員工檔」這個東西可以 join，
 * 「員工改了信箱之後這一列會不會跟著變」這個問題在那裡問不出口 ——
 * 而那正是這張表存在的理由（計畫書 §2）。
 *
 * ## 這支不做什麼
 *
 * 不碰業務判斷（哪一種失敗要落地、落地與丟錯誤的先後）—— 那些在
 * `salary_delivery_service.test.ts` 用假物件覆蓋，且在那一層測是對的。
 * 這裡只問 `where` 子句、欄位是否真的落地、以及快照會不會被 join 蓋掉。
 * 無外部副作用，只建立與刪除自己的資料列。
 */

/**
 * Info: (20260904 - Julian) 🛑 正式機實體隔離（比照本目錄其他 e2e）。
 * `e2e_production_guard.test.ts` 會掃描本目錄確認這道閘存在。
 */
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試，以免污染真實薪資資料！",
  );
}

const STAMP = `${Date.now()}`;
const BOOK_ID = `e2e-book-delivery-${STAMP}`;
const OTHER_BOOK_ID = `e2e-book-delivery-other-${STAMP}`;

let teamId = "";
let userId = "";
let employeeId = "";
let otherEmployeeId = "";
let recordId = "";
let otherRecordId = "";

const ORIGINAL_EMAIL = `e2e.delivery.${STAMP}@e2e.invalid`;

const optionsFor = (year: number, month: number): ISalaryCalculatorOptions => ({
  year,
  month,
  baseSalaryTaxable: 36000,
  baseSalaryTaxFree: 3000,
});

const employeeInput = (number: string, email: string) => ({
  name: "E2E 寄送小明",
  number,
  email,
  baseSalary: 36000,
  mealAllowance: 3000,
  otherAllowanceTaxable: 0,
  otherAllowanceTaxFree: 0,
  industryCode: 42,
  isForeignWorker: false,
  employmentType: "FULL_TIME",
  baseSalary30Days: true,
  isLaborInsured: true,
  isHealthInsured: true,
  isPensionInsured: true,
  dependentsCount: 0,
  voluntaryPensionRate: 0,
  hireDate: null,
  resignDate: null,
  // Info: (20260905 - Luphia) 留職停薪也是寫入契約的一部分（#6774）
  leaveStartDate: null,
  leaveEndDate: null,
});

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { address: `e2e_delivery_${STAMP}`, name: "E2E 寄送者" },
  });
  userId = user.id;

  const team = await prisma.team.create({
    data: { name: `e2e-delivery-${STAMP}` },
  });
  teamId = team.id;

  for (const id of [BOOK_ID, OTHER_BOOK_ID]) {
    await prisma.accountBook.create({
      data: {
        id,
        name: `E2E 寄送測試帳本 ${id}`,
        country: "tw",
        currency: "TWD",
        rule: "TW-GAAP",
        teamId,
      },
    });
  }

  const employee = await salaryCalculatorEmployeeRepo.createEmployee({
    accountBookId: BOOK_ID,
    input: employeeInput("E2E-D001", ORIGINAL_EMAIL),
  });
  employeeId = employee.id;

  const otherEmployee = await salaryCalculatorEmployeeRepo.createEmployee({
    accountBookId: OTHER_BOOK_ID,
    input: employeeInput("E2E-D001", `other.${ORIGINAL_EMAIL}`),
  });
  otherEmployeeId = otherEmployee.id;

  const record = await salaryRecordRepo.upsertRecord({
    accountBookId: BOOK_ID,
    employeeId,
    createdByUserId: userId,
    year: 2026,
    month: 9,
    input: optionsFor(2026, 9),
    result: defaultSalaryCalculatorResult,
    calculatorVersion: "e2e",
    totalPayment: 41234n,
    totalSalaryTaxable: 36000n,
    totalEmployerCost: 42000n,
  });
  recordId = record.id;

  const otherRecord = await salaryRecordRepo.upsertRecord({
    accountBookId: OTHER_BOOK_ID,
    employeeId: otherEmployeeId,
    createdByUserId: userId,
    year: 2026,
    month: 9,
    input: optionsFor(2026, 9),
    result: defaultSalaryCalculatorResult,
    calculatorVersion: "e2e",
    totalPayment: 41234n,
    totalSalaryTaxable: 36000n,
    totalEmployerCost: 42000n,
  });
  otherRecordId = otherRecord.id;
});

afterAll(async () => {
  const books = { accountBookId: { in: [BOOK_ID, OTHER_BOOK_ID] } };
  await prisma.salaryPaySlipDelivery.deleteMany({ where: books });
  await prisma.salaryRecord.deleteMany({ where: books });
  await prisma.salaryCalculatorEmployee.deleteMany({ where: books });
  await prisma.accountBook.deleteMany({
    where: { id: { in: [BOOK_ID, OTHER_BOOK_ID] } },
  });
  await prisma.team.deleteMany({ where: { id: teamId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  // Info: (20260904 - Julian) 不關連線 jest 會抱怨有未結束的非同步操作
  await prisma.$disconnect();
});

describe("成功與失敗都真的落地", () => {
  it("SENT 那一列的每個欄位都存得進去也讀得回來", async () => {
    const created = await salaryPaySlipDeliveryRepo.createDelivery({
      accountBookId: BOOK_ID,
      salaryRecordId: recordId,
      sentByUserId: userId,
      recipientEmail: ORIGINAL_EMAIL,
      status: SALARY_DELIVERY_STATUS.SENT,
      failureReason: null,
    });

    expect(created).toMatchObject({
      salaryRecordId: recordId,
      recipientEmail: ORIGINAL_EMAIL,
      status: SALARY_DELIVERY_STATUS.SENT,
      failureReason: null,
    });
    expect(created.sentBy.id).toBe(userId);
    expect(created.sentBy.name).toBe("E2E 寄送者");
    expect(created.createdAt).toBeGreaterThan(0);
  });

  /**
   * Info: (20260904 - Julian) 「寄不出去就當作沒發生」會讓兩件事永遠查不出來：
   * 寄了幾次，以及薪資資料曾經嘗試離開組織（計畫書 §2.1）。
   */
  it("FAILED 那一列同樣落地，帶著失敗原因", async () => {
    const created = await salaryPaySlipDeliveryRepo.createDelivery({
      accountBookId: BOOK_ID,
      salaryRecordId: recordId,
      sentByUserId: userId,
      recipientEmail: ORIGINAL_EMAIL,
      status: SALARY_DELIVERY_STATUS.FAILED,
      failureReason: "Error: smtp down",
    });

    expect(created.status).toBe(SALARY_DELIVERY_STATUS.FAILED);
    expect(created.failureReason).toBe("Error: smtp down");
  });

  /**
   * Info: (20260904 - Julian) 沒有唯一鍵是刻意的：補寄、改了信箱再寄、
   * 對方說沒收到，都是真實情境（計畫書 §2.3）。
   */
  it("同一筆紀錄可以有很多列，資料庫不擋", async () => {
    const before = await salaryPaySlipDeliveryRepo.listByRecord({
      accountBookId: BOOK_ID,
      salaryRecordId: recordId,
    });

    await salaryPaySlipDeliveryRepo.createDelivery({
      accountBookId: BOOK_ID,
      salaryRecordId: recordId,
      sentByUserId: userId,
      recipientEmail: ORIGINAL_EMAIL,
      status: SALARY_DELIVERY_STATUS.SENT,
    });

    const after = await salaryPaySlipDeliveryRepo.listByRecord({
      accountBookId: BOOK_ID,
      salaryRecordId: recordId,
    });
    expect(after.length).toBe(before.length + 1);
  });

  it("失敗原因超過上限時在寫入那一側就被截斷", async () => {
    const long = "x".repeat(SALARY_DELIVERY_FAILURE_REASON_MAX_LENGTH + 500);

    const created = await salaryPaySlipDeliveryRepo.createDelivery({
      accountBookId: BOOK_ID,
      salaryRecordId: recordId,
      sentByUserId: userId,
      recipientEmail: ORIGINAL_EMAIL,
      status: SALARY_DELIVERY_STATUS.FAILED,
      failureReason: long,
    });

    expect(created.failureReason).toHaveLength(
      SALARY_DELIVERY_FAILURE_REASON_MAX_LENGTH,
    );

    // Info: (20260904 - Julian) 讀回來也要是截斷後的 —— 證明截的是進資料庫的那一份
    const [latest] = await salaryPaySlipDeliveryRepo.listByRecord({
      accountBookId: BOOK_ID,
      salaryRecordId: recordId,
    });
    expect(latest.failureReason).toHaveLength(
      SALARY_DELIVERY_FAILURE_REASON_MAX_LENGTH,
    );
  });
});

describe("租戶過濾", () => {
  /**
   * Info: (20260904 - Julian) 只用 `salaryRecordId` 查再由呼叫端比對帳本，
   * 是一個猜到別人的 uuid 就能讀到別的帳本收件信箱的設計。
   */
  it("拿別的帳本的 recordId 查，讀不到任何一列", async () => {
    await salaryPaySlipDeliveryRepo.createDelivery({
      accountBookId: OTHER_BOOK_ID,
      salaryRecordId: otherRecordId,
      sentByUserId: userId,
      recipientEmail: `other.${ORIGINAL_EMAIL}`,
      status: SALARY_DELIVERY_STATUS.SENT,
    });

    const leaked = await salaryPaySlipDeliveryRepo.listByRecord({
      accountBookId: BOOK_ID,
      salaryRecordId: otherRecordId,
    });

    expect(leaked).toHaveLength(0);
  });

  it("整本帳的清單只含自己這一本的列", async () => {
    const rows = await salaryPaySlipDeliveryRepo.listByAccountBook({
      accountBookId: BOOK_ID,
      limit: 100,
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.salaryRecordId === recordId)).toBe(true);
    expect(
      rows.some((row) => row.recipientEmail === `other.${ORIGINAL_EMAIL}`),
    ).toBe(false);
  });

  it("limit 真的限制筆數", async () => {
    const rows = await salaryPaySlipDeliveryRepo.listByAccountBook({
      accountBookId: BOOK_ID,
      limit: 2,
    });

    expect(rows).toHaveLength(2);
  });

  it("清單新的在前", async () => {
    const rows = await salaryPaySlipDeliveryRepo.listByAccountBook({
      accountBookId: BOOK_ID,
      limit: 100,
    });

    const timestamps = rows.map((row) => row.createdAt);
    expect([...timestamps].sort((a, b) => b - a)).toEqual(timestamps);
  });
});

describe("薪資紀錄帶得出最近一次成功寄送", () => {
  /**
   * Info: (20260904 - Julian) 薪資紀錄列表每一列要顯示「已寄出／未寄出」。
   * 那個值由 `listRecords` 的關聯 `take: 1` 算出來，只有真資料庫驗得到 ——
   * 假 repo 沒有關聯可以查。
   */
  it("從未寄過的紀錄回 null", async () => {
    const fresh = await salaryRecordRepo.upsertRecord({
      accountBookId: BOOK_ID,
      employeeId,
      createdByUserId: userId,
      year: 2026,
      month: 7,
      input: optionsFor(2026, 7),
      result: defaultSalaryCalculatorResult,
      calculatorVersion: "e2e",
      totalPayment: 1n,
      totalSalaryTaxable: 1n,
      totalEmployerCost: 1n,
    });

    expect(fresh.lastSentAt).toBeNull();
    expect(fresh.lastSentTo).toBeNull();
  });

  it("寄過的紀錄回最近一次成功的時間與當初的信箱", async () => {
    await salaryPaySlipDeliveryRepo.createDelivery({
      accountBookId: BOOK_ID,
      salaryRecordId: recordId,
      sentByUserId: userId,
      recipientEmail: ORIGINAL_EMAIL,
      status: SALARY_DELIVERY_STATUS.SENT,
    });

    const detail = await salaryRecordRepo.getRecordById(BOOK_ID, recordId);

    expect(detail?.lastSentAt).toBeGreaterThan(0);
    expect(detail?.lastSentTo).toBe(ORIGINAL_EMAIL);
  });

  /**
   * Info: (20260904 - Julian) 失敗的列不算「已寄出」—— 對方什麼都沒收到。
   * 把 `where: { status: SENT }` 拿掉的話這一條會紅。
   */
  it("只有失敗紀錄的那一筆仍然算「從未寄出」", async () => {
    const failedOnly = await salaryRecordRepo.upsertRecord({
      accountBookId: BOOK_ID,
      employeeId,
      createdByUserId: userId,
      year: 2026,
      month: 6,
      input: optionsFor(2026, 6),
      result: defaultSalaryCalculatorResult,
      calculatorVersion: "e2e",
      totalPayment: 1n,
      totalSalaryTaxable: 1n,
      totalEmployerCost: 1n,
    });

    await salaryPaySlipDeliveryRepo.createDelivery({
      accountBookId: BOOK_ID,
      salaryRecordId: failedOnly.id,
      sentByUserId: userId,
      recipientEmail: ORIGINAL_EMAIL,
      status: SALARY_DELIVERY_STATUS.FAILED,
      failureReason: "Error: smtp down",
    });

    const reloaded = await salaryRecordRepo.getRecordById(
      BOOK_ID,
      failedOnly.id,
    );

    expect(reloaded?.lastSentAt).toBeNull();
  });

  it("列表那條路徑也帶得出來（三個 include 站點各自獨立）", async () => {
    const page = await salaryRecordRepo.listRecords({
      accountBookId: BOOK_ID,
      page: 1,
      pageSize: 50,
    });

    const listed = page.data.find((row) => row.id === recordId);
    expect(listed?.lastSentTo).toBe(ORIGINAL_EMAIL);
  });
});

describe("recipientEmail 是快照，不是 join", () => {
  /**
   * Info: (20260904 - Julian) **這是本檔最重要的一條。**
   *
   * 員工的 email 之後會被改。查「這封九月的薪資單當初寄到哪」時，
   * 若 repository 改成查詢時 join 員工檔，得到的會是今天的信箱 ——
   * 而那正是稽核最需要答案的那一格。
   *
   * 假 repository 驗不到這件事：它根本沒有員工檔可以 join。
   */
  it("員工改了信箱之後，既有的列仍是當初那一個", async () => {
    const created = await salaryPaySlipDeliveryRepo.createDelivery({
      accountBookId: BOOK_ID,
      salaryRecordId: recordId,
      sentByUserId: userId,
      recipientEmail: ORIGINAL_EMAIL,
      status: SALARY_DELIVERY_STATUS.SENT,
    });

    const changedEmail = `changed.${ORIGINAL_EMAIL}`;
    await salaryCalculatorEmployeeRepo.updateEmployee({
      accountBookId: BOOK_ID,
      employeeId,
      input: employeeInput("E2E-D001", changedEmail),
    });

    // Info: (20260904 - Julian) 先確認員工檔真的變了，否則下面那條會是空歡喜
    const employee = await salaryCalculatorEmployeeRepo.getActiveEmployeeById(
      BOOK_ID,
      employeeId,
    );
    expect(employee?.email).toBe(changedEmail);

    const rows = await salaryPaySlipDeliveryRepo.listByRecord({
      accountBookId: BOOK_ID,
      salaryRecordId: recordId,
    });
    const reloaded = rows.find((row) => row.id === created.id);

    expect(reloaded?.recipientEmail).toBe(ORIGINAL_EMAIL);
    expect(reloaded?.recipientEmail).not.toBe(changedEmail);
  });
});
