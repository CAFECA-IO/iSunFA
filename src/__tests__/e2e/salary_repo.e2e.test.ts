import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import {
  defaultSalaryCalculatorResult,
  ISalaryCalculatorOptions,
} from "@/interfaces/salary_calculator";
import {
  salaryCalculatorEmployeeRepo,
  SalaryEmployeeNumberTakenError,
} from "@/repositories/salary_calculator_employee.repo";
import { salaryRecordRepo } from "@/repositories/salary_record.repo";

/**
 * Info: (20260901 - Julian) 薪資模組兩支 repository 的防線（真資料庫）。
 *
 * ## 為什麼一定要對真資料庫跑
 *
 * `salary_record_service.test.ts` 用手寫假 repository 注入 service（方向是對的，
 * 比 `jest.mock` 好），但那兩個假 repo 用 `${accountBookId}|${id}` 當 key ——
 * **天生就是隔離的**。於是「讀不到別的帳本」這條在測試裡永遠綠，
 * 與真 repository 的 `where` 子句一點關係都沒有。實測：把
 *
 *   1. `getRecordById` 的 `where` 拿掉 `accountBookId`
 *   2. `deleteRecord` 的 `deleteMany` 拿掉 `accountBookId`
 *   3. `listRecords` 的 where builder 拿掉 `accountBookId`
 *   4. `listRecords` 拿掉 `skip` / `take`
 *   5. `getEmployeeById` / `listEmployees` 拿掉 `deletedAt: null`
 *   6. `updateEmployee` / `softDeleteEmployee` 拿掉 `accountBookId`
 *   7. `softDeleteEmployee` 不再把 `activeNumber` 設成 null
 *
 * 七處全部改壞，原有測試**全綠**。也就是說這 486 行目前是靠「作者寫對了」。
 *
 * 假 repo 還有兩個形狀上的問題，是 mock 這條路本質上補不了的（checklist §1.4 / §1.8）：
 * 它的 `softDeleteEmployee` 做的是**硬刪**（`rows.delete()`），所以
 * 「被刪的員工還在表裡但必須查不到」這個真實狀態在測試裡從未出現過；
 * 而員工編號的唯一約束用一個手動布林 `numberTaken` 模擬 ——
 * 那不是狀態，是一個開關，於是「軟刪之後同一個編號能不能重新加入」問不出來。
 * `activeNumber` 部分唯一索引的行為只有 Postgres 本人答得出來。
 *
 * ## 這支不做什麼
 *
 * 不碰業務判斷（金額換算、覆寫該不該問一句）—— 那些在
 * `salary_record_service.test.ts` 用假物件覆蓋，且在那一層測是對的。
 * 這裡只問 `where` 子句與唯一索引：**租戶過濾、`deletedAt` 過濾、
 * `activeNumber` 讓出與重新加入、upsert 覆寫、分頁。**
 * 無外部副作用，只建立與刪除自己的資料列。
 */

/**
 * Info: (20260901 - Julian) 🛑 正式機實體隔離（比照本目錄其他 e2e）。
 * `e2e_production_guard.test.ts` 會掃描本目錄確認這道閘存在。
 */
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試，以免污染真實薪資資料！",
  );
}

// Info: (20260901 - Julian) 前綴與 CLAUDE.md §8 的 `e2e-book-` 慣例一致，清理與人工排查都靠它
const STAMP = `${Date.now()}`;
const BOOK_ID = `e2e-book-salary-${STAMP}`;
const OTHER_BOOK_ID = `e2e-book-salary-other-${STAMP}`;

let teamId = "";
let userId = "";

const HIRE_DATE = Date.parse("2026-08-15T00:00:00.000Z") / 1000;

const EMPLOYEE_INPUT = {
  name: "E2E 王小明",
  number: "E2E-A001",
  email: `e2e.salary.${STAMP}@e2e.invalid`,
  baseSalary: 36000,
  mealAllowance: 3000,
  // Info: (20260902 - Julian) 常態屬性整組必填（ISalaryEmployeeProfile），刻意全部與預設值不同
  otherAllowanceTaxable: 2000,
  otherAllowanceTaxFree: 500,
  industryCode: 41,
  isForeignWorker: true,
  employmentType: "PART_TIME",
  baseSalary30Days: false,
  isLaborInsured: false,
  isHealthInsured: false,
  isPensionInsured: false,
  dependentsCount: 2,
  // Info: (20260902 - Julian) 百分點整數（0–6），不是 0.06
  voluntaryPensionRate: 6,
  hireDate: HIRE_DATE,
  resignDate: null,
};

const optionsFor = (year: number, month: number): ISalaryCalculatorOptions => ({
  year,
  month,
  baseSalaryTaxable: 36000,
  baseSalaryTaxFree: 3000,
});

const saveRecord = (params: {
  accountBookId: string;
  employeeId: string;
  year: number;
  month: number;
  totalPayment: bigint;
}) =>
  salaryRecordRepo.upsertRecord({
    accountBookId: params.accountBookId,
    employeeId: params.employeeId,
    createdByUserId: userId,
    year: params.year,
    month: params.month,
    input: optionsFor(params.year, params.month),
    result: defaultSalaryCalculatorResult,
    calculatorVersion: "e2e",
    totalPayment: params.totalPayment,
    totalSalaryTaxable: 36000n,
    totalEmployerCost: 42000n,
  });

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { address: `e2e_salary_${STAMP}`, name: "E2E 薪資" },
  });
  userId = user.id;

  const team = await prisma.team.create({ data: { name: `e2e-salary-${STAMP}` } });
  teamId = team.id;

  for (const id of [BOOK_ID, OTHER_BOOK_ID]) {
    await prisma.accountBook.create({
      data: {
        id,
        name: `E2E 薪資測試帳本 ${id}`,
        country: "tw",
        currency: "TWD",
        rule: "TW-GAAP",
        teamId,
      },
    });
  }
});

afterAll(async () => {
  const books = { accountBookId: { in: [BOOK_ID, OTHER_BOOK_ID] } };
  await prisma.salaryRecord.deleteMany({ where: books });
  await prisma.salaryCalculatorEmployee.deleteMany({ where: books });
  await prisma.accountBook.deleteMany({
    where: { id: { in: [BOOK_ID, OTHER_BOOK_ID] } },
  });
  await prisma.team.deleteMany({ where: { id: teamId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  // Info: (20260901 - Julian) 不關連線 jest 會抱怨有未結束的非同步操作
  await prisma.$disconnect();
});

/**
 * Info: (20260902 - Julian) 常態屬性 15 欄的來回。
 *
 * `salary_employee_profile.test.ts` 守的是「哪些欄位屬於員工」，
 * `salary_validators.test.ts` 守的是「送進來的形狀對不對」——
 * 這一支守的是**真的存進去、真的讀得回來**，而那是前兩者都碰不到的一段。
 *
 * 三個具體風險：`voluntaryPensionRate` 被當成金額寫成 BigInt（RangeError 或靜靜變 0）、
 * `hireDate` 存進去讀回來差一天（時區）、以及 13 個新欄位裡有人漏接一欄
 * （`toProfile` 與 `toWriteData` 是手寫的兩張對照表）。
 */
describe("員工檔的常態屬性存得進去也讀得回來", () => {
  it("15 欄全部原樣回來，一欄不漏", async () => {
    const number = `${EMPLOYEE_INPUT.number}-PF1`;
    const created = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number },
    });

    const expected = {
      baseSalary: 36000,
      mealAllowance: 3000,
      otherAllowanceTaxable: 2000,
      otherAllowanceTaxFree: 500,
      industryCode: 41,
      isForeignWorker: true,
      employmentType: "PART_TIME",
      baseSalary30Days: false,
      isLaborInsured: false,
      isHealthInsured: false,
      isPensionInsured: false,
      dependentsCount: 2,
      voluntaryPensionRate: 6,
      hireDate: HIRE_DATE,
      resignDate: null,
    };

    expect(created).toMatchObject(expected);

    // Info: (20260902 - Julian) 成對：create 的回傳與重新讀出來的必須一致（前者可能是記憶體裡的值）
    const reloaded = await salaryCalculatorEmployeeRepo.getEmployeeById(
      BOOK_ID,
      created.id,
    );
    expect(reloaded).toMatchObject(expected);

    const [listed] = (
      await salaryCalculatorEmployeeRepo.listEmployees(BOOK_ID)
    ).filter((row) => row.id === created.id);
    expect(listed).toMatchObject(expected);
  });

  /**
   * Info: (20260902 - Julian) 費率是 Int 不是 BigInt，而且 6 不能變成 0。
   *
   * 寫成 BigInt 的話這一條會在 create 就炸（Prisma 拒收），
   * 寫成 `BigInt(Math.round(0.06))` 則會靜靜存成 0 —— 後者只有這一條抓得到。
   */
  it("自提勞退費率存 6 讀回來還是 6", async () => {
    const created = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-PF2`, voluntaryPensionRate: 6 },
    });

    const raw = await prisma.salaryCalculatorEmployee.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(raw.voluntaryPensionRate).toBe(6);
    expect(typeof raw.voluntaryPensionRate).toBe("number");
  });

  /**
   * Info: (20260902 - Julian) 到職日存進去讀回來是同一天。
   *
   * 「差一天」是這一欄唯一會出的錯，而它在 UTC 與 UTC+8 都看不出來 ——
   * 純函式那一側由 `salary_employee_profile.tz.test.ts` 守，
   * 這裡守的是**資料庫來回**那一段（Prisma 的 DateTime 轉換）。
   */
  it("到職日來回不差一天", async () => {
    const created = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-PF3` },
    });

    expect(created.hireDate).toBe(HIRE_DATE);

    const raw = await prisma.salaryCalculatorEmployee.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(raw.hireDate?.toISOString()).toBe("2026-08-15T00:00:00.000Z");
  });

  it("更新會把 15 欄一起改掉，不是只改到金額", async () => {
    const number = `${EMPLOYEE_INPUT.number}-PF4`;
    const created = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number },
    });

    const updated = await salaryCalculatorEmployeeRepo.updateEmployee({
      accountBookId: BOOK_ID,
      employeeId: created.id,
      input: {
        ...EMPLOYEE_INPUT,
        number,
        dependentsCount: 0,
        isLaborInsured: true,
        voluntaryPensionRate: 0,
        industryCode: 42,
        hireDate: null,
      },
    });

    expect(updated).toMatchObject({
      dependentsCount: 0,
      isLaborInsured: true,
      voluntaryPensionRate: 0,
      industryCode: 42,
      hireDate: null,
    });
  });

  /**
   * Info: (20260902 - Julian) 既有員工（本次之前建立的列）讀出來是預設值，不是 null。
   *
   * 13 欄都有 `@default`，所以 `prisma db push` 之後既有列會被填上預設值。
   * 這一條用一列「繞過 repository 直接建的最小資料」模擬那個狀態 ——
   * 若哪一欄的 default 被拿掉，這裡會讀到 null 並炸在型別轉換上。
   */
  it("既有列（只有必填欄位）讀出來是預設值不是 null", async () => {
    const legacy = await prisma.salaryCalculatorEmployee.create({
      data: {
        accountBookId: BOOK_ID,
        name: "E2E 舊資料",
        number: `${EMPLOYEE_INPUT.number}-LEGACY`,
        activeNumber: `${EMPLOYEE_INPUT.number}-LEGACY`,
        baseSalary: 30000n,
      },
    });

    const read = await salaryCalculatorEmployeeRepo.getEmployeeById(
      BOOK_ID,
      legacy.id,
    );

    expect(read).toMatchObject({
      mealAllowance: 0,
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
    });
  });
});

describe("員工名單：租戶過濾與軟刪除過濾", () => {
  it("另一本帳的員工，用對的 id 也讀不到、改不動、刪不掉", async () => {
    const mine = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-X1` },
    });

    /**
     * Info: (20260901 - Julian) 拿著正確的 uuid，只是換一本帳。
     * 假 repo 的 `${accountBookId}|${id}` key 讓這件事永遠成立；
     * 真 repo 靠的是 `where` 裡的 `accountBookId`，而那一行可以被刪掉。
     */
    expect(
      await salaryCalculatorEmployeeRepo.getEmployeeById(OTHER_BOOK_ID, mine.id),
    ).toBeNull();

    expect(
      await salaryCalculatorEmployeeRepo.updateEmployee({
        accountBookId: OTHER_BOOK_ID,
        employeeId: mine.id,
        input: { ...EMPLOYEE_INPUT, name: "被別本帳改掉了" },
      }),
    ).toBeNull();

    expect(
      await salaryCalculatorEmployeeRepo.softDeleteEmployee({
        accountBookId: OTHER_BOOK_ID,
        employeeId: mine.id,
      }),
    ).toBe(false);

    // Info: (20260901 - Julian) 成對斷言：不只「回 null」，那一列本身也必須沒被動到
    const untouched = await salaryCalculatorEmployeeRepo.getEmployeeById(
      BOOK_ID,
      mine.id,
    );
    expect(untouched?.name).toBe(EMPLOYEE_INPUT.name);

    const listedElsewhere =
      await salaryCalculatorEmployeeRepo.listEmployees(OTHER_BOOK_ID);
    expect(listedElsewhere.map((row) => row.id)).not.toContain(mine.id);
  });

  /**
   * Info: (20260901 - Julian) 軟刪除的真實狀態：**那一列還在表裡**。
   *
   * 這正是假 repo 做不到的那一格 —— 它的 `softDeleteEmployee` 是 `rows.delete()`，
   * 於是「查得到列、但 repository 必須當它不存在」這個狀態從未出現過。
   */
  it("軟刪之後：列還在，但查不到也列不出來", async () => {
    const employee = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-X2` },
    });

    expect(
      await salaryCalculatorEmployeeRepo.softDeleteEmployee({
        accountBookId: BOOK_ID,
        employeeId: employee.id,
      }),
    ).toBe(true);

    expect(
      await salaryCalculatorEmployeeRepo.getEmployeeById(BOOK_ID, employee.id),
    ).toBeNull();

    const listed = await salaryCalculatorEmployeeRepo.listEmployees(BOOK_ID);
    expect(listed.map((row) => row.id)).not.toContain(employee.id);

    // Info: (20260901 - Julian) 但它真的還在：這是軟刪除，不是硬刪
    const raw = await prisma.salaryCalculatorEmployee.findUnique({
      where: { id: employee.id },
    });
    expect(raw).not.toBeNull();
    expect(raw?.deletedAt).not.toBeNull();
    // Info: (20260901 - Julian) 讓出編號：這一欄是下面「加得回來」的全部
    expect(raw?.activeNumber).toBeNull();
    expect(raw?.number).toBe(`${EMPLOYEE_INPUT.number}-X2`);
  });

  it("已軟刪的員工不能再被更新或重複刪除", async () => {
    const employee = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-X3` },
    });
    await salaryCalculatorEmployeeRepo.softDeleteEmployee({
      accountBookId: BOOK_ID,
      employeeId: employee.id,
    });

    expect(
      await salaryCalculatorEmployeeRepo.updateEmployee({
        accountBookId: BOOK_ID,
        employeeId: employee.id,
        input: { ...EMPLOYEE_INPUT, name: "復活" },
      }),
    ).toBeNull();

    expect(
      await salaryCalculatorEmployeeRepo.softDeleteEmployee({
        accountBookId: BOOK_ID,
        employeeId: employee.id,
      }),
    ).toBe(false);
  });
});

describe("員工編號的唯一性走 activeNumber 部分唯一索引", () => {
  it("同一本帳的存活員工不能撞號", async () => {
    const number = `${EMPLOYEE_INPUT.number}-U1`;
    await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number },
    });

    await expect(
      salaryCalculatorEmployeeRepo.createEmployee({
        accountBookId: BOOK_ID,
        input: { ...EMPLOYEE_INPUT, name: "撞號的人", number },
      }),
    ).rejects.toBeInstanceOf(SalaryEmployeeNumberTakenError);
  });

  /**
   * Info: (20260901 - Julian) 這一條是 `activeNumber` 這個設計存在的唯一理由。
   *
   * 唯一鍵若直接掛在 `number` 上，被軟刪的那一列會永久佔住編號 ——
   * 使用者看到的是「這個人明明不在名單上，卻加不進來」（schema 註解自己寫了這句）。
   * 靠的是 Postgres 的唯一索引不約束 NULL，而那是資料庫的行為，
   * 手寫假物件只能假裝，假裝出來的版本永遠會通過。
   */
  it("軟刪之後同一個編號可以重新加入，且兩列並存", async () => {
    const number = `${EMPLOYEE_INPUT.number}-U2`;
    const first = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number },
    });
    await salaryCalculatorEmployeeRepo.softDeleteEmployee({
      accountBookId: BOOK_ID,
      employeeId: first.id,
    });

    const second = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, name: "同編號回鍋", number },
    });

    expect(second.id).not.toBe(first.id);

    const bothRows = await prisma.salaryCalculatorEmployee.findMany({
      where: { accountBookId: BOOK_ID, number },
    });
    expect(bothRows).toHaveLength(2);

    const active = await salaryCalculatorEmployeeRepo.listEmployees(BOOK_ID);
    expect(active.filter((row) => row.number === number)).toHaveLength(1);
  });

  // Info: (20260901 - Julian) 唯一性的範圍是帳本內，不是全域 —— 收太緊也是缺陷
  it("不同帳本可以用同一個編號", async () => {
    const number = `${EMPLOYEE_INPUT.number}-U3`;
    await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number },
    });

    const other = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: OTHER_BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number },
    });

    expect(other.number).toBe(number);
  });
});

describe("薪資紀錄：租戶過濾、覆寫與分頁", () => {
  it("另一本帳的紀錄，用對的 id 也讀不到、刪不掉", async () => {
    const employee = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-R1` },
    });
    const record = await saveRecord({
      accountBookId: BOOK_ID,
      employeeId: employee.id,
      year: 2026,
      month: 1,
      totalPayment: 40000n,
    });

    expect(
      await salaryRecordRepo.getRecordById(OTHER_BOOK_ID, record.id),
    ).toBeNull();

    expect(
      await salaryRecordRepo.deleteRecord({
        accountBookId: OTHER_BOOK_ID,
        recordId: record.id,
      }),
    ).toBe(false);

    // Info: (20260901 - Julian) 成對斷言：刪不掉，而且那一列真的還在
    expect(
      await salaryRecordRepo.getRecordById(BOOK_ID, record.id),
    ).not.toBeNull();

    const listedElsewhere = await salaryRecordRepo.listRecords({
      accountBookId: OTHER_BOOK_ID,
      page: 1,
      pageSize: 50,
    });
    expect(listedElsewhere.data.map((row) => row.id)).not.toContain(record.id);
  });

  /**
   * Info: (20260901 - Julian) 「重存即覆寫」不是靠先查再決定，是靠唯一鍵。
   * 同一個 `(帳本, 員工, 年, 月)` 存兩次必須是同一列被改寫，不是多一列。
   */
  it("同一個 (帳本, 員工, 年, 月) 重存是覆寫，不是新增一列", async () => {
    const employee = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-R2` },
    });

    const first = await saveRecord({
      accountBookId: BOOK_ID,
      employeeId: employee.id,
      year: 2026,
      month: 2,
      totalPayment: 40000n,
    });
    const second = await saveRecord({
      accountBookId: BOOK_ID,
      employeeId: employee.id,
      year: 2026,
      month: 2,
      totalPayment: 55300n,
    });

    expect(second.id).toBe(first.id);
    expect(second.totalPayment).toBe(55300);

    const rows = await prisma.salaryRecord.count({
      where: { accountBookId: BOOK_ID, employeeId: employee.id, year: 2026, month: 2 },
    });
    expect(rows).toBe(1);
  });

  it("覆寫不改 createdByUserId（那一欄記的是來源，不是最後動它的人）", async () => {
    const employee = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-R3` },
    });
    const first = await saveRecord({
      accountBookId: BOOK_ID,
      employeeId: employee.id,
      year: 2026,
      month: 3,
      totalPayment: 40000n,
    });

    const otherUser = await prisma.user.create({
      data: { address: `e2e_salary_other_${STAMP}`, name: "E2E 另一個人" },
    });

    await salaryRecordRepo.upsertRecord({
      accountBookId: BOOK_ID,
      employeeId: employee.id,
      createdByUserId: otherUser.id,
      year: 2026,
      month: 3,
      input: optionsFor(2026, 3),
      result: defaultSalaryCalculatorResult,
      calculatorVersion: "e2e",
      totalPayment: 41000n,
      totalSalaryTaxable: 36000n,
      totalEmployerCost: 42000n,
    });

    const raw = await prisma.salaryRecord.findUniqueOrThrow({
      where: { id: first.id },
    });
    expect(raw.createdByUserId).toBe(userId);

    await prisma.user.deleteMany({ where: { id: otherUser.id } });
  });

  /**
   * Info: (20260901 - Julian) 分頁真的有 `skip` / `take`。
   *
   * 拿掉那兩行的症狀是「一次撈回整本帳」—— 畫面看起來完全正常
   * （前 20 筆長得一樣），而查詢量隨資料成長。用「第 2 頁與第 1 頁不重疊」
   * 當判準，而不是「回傳筆數 ≤ pageSize」：後者在拿掉 `take` 之後才會紅，
   * 拿掉 `skip` 照樣綠。
   */
  it("分頁：每頁 2 筆，第 2 頁與第 1 頁不重疊，總數與頁數正確", async () => {
    const employee = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: OTHER_BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-P1` },
    });

    for (const month of [1, 2, 3, 4, 5]) {
      await saveRecord({
        accountBookId: OTHER_BOOK_ID,
        employeeId: employee.id,
        year: 2027,
        month,
        totalPayment: BigInt(40000 + month),
      });
    }

    const page1 = await salaryRecordRepo.listRecords({
      accountBookId: OTHER_BOOK_ID,
      employeeId: employee.id,
      page: 1,
      pageSize: 2,
    });
    const page2 = await salaryRecordRepo.listRecords({
      accountBookId: OTHER_BOOK_ID,
      employeeId: employee.id,
      page: 2,
      pageSize: 2,
    });

    expect(page1.data).toHaveLength(2);
    expect(page2.data).toHaveLength(2);
    expect(page1.totalCount).toBe(5);
    expect(page1.totalPages).toBe(3);

    const firstIds = page1.data.map((row) => row.id);
    for (const row of page2.data) {
      expect(firstIds).not.toContain(row.id);
    }

    // Info: (20260901 - Julian) 期間選單不吃 where：選定一個月之後還要看得到其他月份
    const filtered = await salaryRecordRepo.listRecords({
      accountBookId: OTHER_BOOK_ID,
      employeeId: employee.id,
      year: 2027,
      month: 3,
      page: 1,
      pageSize: 2,
    });
    expect(filtered.data).toHaveLength(1);
    expect(filtered.periods.length).toBeGreaterThanOrEqual(5);
  });

  it("關鍵字比對員工姓名與編號，且不會跨帳本", async () => {
    const employee = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: {
        ...EMPLOYEE_INPUT,
        name: `E2E 關鍵字 ${STAMP}`,
        number: `${EMPLOYEE_INPUT.number}-K1`,
      },
    });
    await saveRecord({
      accountBookId: BOOK_ID,
      employeeId: employee.id,
      year: 2028,
      month: 6,
      totalPayment: 40000n,
    });

    const hitByNumber = await salaryRecordRepo.listRecords({
      accountBookId: BOOK_ID,
      keyword: "-K1",
      page: 1,
      pageSize: 20,
    });
    expect(hitByNumber.data.map((row) => row.employee.id)).toContain(
      employee.id,
    );

    const hitByName = await salaryRecordRepo.listRecords({
      accountBookId: BOOK_ID,
      keyword: "關鍵字",
      page: 1,
      pageSize: 20,
    });
    expect(hitByName.data.map((row) => row.employee.id)).toContain(employee.id);

    const crossBook = await salaryRecordRepo.listRecords({
      accountBookId: OTHER_BOOK_ID,
      keyword: "-K1",
      page: 1,
      pageSize: 20,
    });
    expect(crossBook.data).toHaveLength(0);
  });

  it("刪除：本帳刪得掉，而且刪完就查不到", async () => {
    const employee = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-D1` },
    });
    const record = await saveRecord({
      accountBookId: BOOK_ID,
      employeeId: employee.id,
      year: 2029,
      month: 7,
      totalPayment: 40000n,
    });

    expect(
      await salaryRecordRepo.deleteRecord({
        accountBookId: BOOK_ID,
        recordId: record.id,
      }),
    ).toBe(true);
    expect(await salaryRecordRepo.getRecordById(BOOK_ID, record.id)).toBeNull();

    // Info: (20260901 - Julian) 薪資紀錄是硬刪，不是軟刪 —— 那一列真的不見了
    expect(
      await prisma.salaryRecord.findUnique({ where: { id: record.id } }),
    ).toBeNull();

    // Info: (20260901 - Julian) 刪第二次回 false，不是丟例外
    expect(
      await salaryRecordRepo.deleteRecord({
        accountBookId: BOOK_ID,
        recordId: record.id,
      }),
    ).toBe(false);
  });
});
