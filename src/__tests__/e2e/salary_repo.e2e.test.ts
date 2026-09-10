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
 *   2. `deleteRecord` 的 `updateMany` 拿掉 `accountBookId`（20260909 起是軟刪除）
 *   3. `listRecords` 的 where builder 拿掉 `accountBookId`
 *   4. `listRecords` 拿掉 `skip` / `take`
 *   5. `getActiveEmployeeById` / `listEmployees` 拿掉 `deletedAt: null`
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
  // Info: (20260905 - Luphia) 留職停薪也是寫入契約的一部分（#6774）
  leaveStartDate: null,
  leaveEndDate: null,
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

  const team = await prisma.team.create({
    data: { name: `e2e-salary-${STAMP}` },
  });
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
  /**
   * Info: (20260909 - Julian) 刪除順序＝外鍵的反向拓樸序，**兩張表是後來加的**。
   *
   * CI 首次跑 `npm run test:e2e` 時這裡炸在
   * `salary_employee_profile_change_employee_id_fkey` —— 那張表是
   * 20260908 的調薪歷程加的，而它刻意用 `Restrict`（不是 `Cascade`）：
   * 「刪掉員工，他的調薪歷程也一起消失」會讓稽核軌跡可以用刪除來規避。
   * 應用層對員工是**軟刪除**，所以正式路徑從來不會撞到這條外鍵 ——
   * 只有測試收尾這種真刪會，而那正是它沒被發現的原因
   *（這兩支 e2e 在 CI 接上之前沒有人跑過）。
   *
   * `auditLog` 同理：20260909 起刪除薪資紀錄會寫一列，而它同時指向
   * `accountBook` 與 `user` —— 少了這一行，下面兩個 deleteMany 會接著炸。
   *
   * 一律以帳本為範圍，不 truncate：這兩支 e2e 跑在共用的資料庫上。
   */
  await prisma.auditLog.deleteMany({ where: books });
  await prisma.salaryEmployeeProfileChange.deleteMany({ where: books });
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
 * `hireDate` 存進去讀回來差一天（時區）、以及那些欄位裡有人漏接一欄
 * （`toProfile` / `toLeave` 與 `toWriteData` 是手寫的對照表）。
 */
/**
 * Info: (20260908 - Julian) 員工檔寫入一律要帶「誰改的、何時生效」（計劃書 §4）。
 *
 * 這是**必填**參數而不是選填：忘記傳是編譯錯誤，不是一列少了 userId 的異動紀錄。
 * 這一批呼叫端因此都被迫補上它 —— 那正是型別該做的事。
 *
 * 寫成函式而不是常數：`changedByUserId` 在 e2e 裡要等 `beforeAll` 建好 user
 * 才有值，模組載入時取一次會永遠是空字串（而外鍵會在執行期才抱怨）。
 */
const changeCtx = () => ({
  changedByUserId: userId,
  effectiveYear: 2026,
  effectiveMonth: 9,
});

describe("員工檔的常態屬性存得進去也讀得回來", () => {
  it("17 欄全部原樣回來，一欄不漏", async () => {
    const number = `${EMPLOYEE_INPUT.number}-PF1`;
    const created = await salaryCalculatorEmployeeRepo.createEmployee({
      change: changeCtx(),
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
      // Info: (20260905 - Luphia) 留職停薪走的是另一張對照表（`toLeave`），漏接是獨立的事（#6774）
      leaveStartDate: null,
      leaveEndDate: null,
    };

    expect(created).toMatchObject(expected);

    // Info: (20260902 - Julian) 成對：create 的回傳與重新讀出來的必須一致（前者可能是記憶體裡的值）
    const reloaded = await salaryCalculatorEmployeeRepo.getActiveEmployeeById(
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
   * Info: (20260905 - Luphia) 留職停薪的日期來回（#6774）。
   *
   * 與到職日同一類風險（Prisma 的 `DateTime` 轉換差一天），但走的是
   * 另一張手寫對照表 —— `toProfile` 沒漏不代表 `toLeave` 沒漏。
   *
   * 順便釘住「還沒復職」：`leaveEndDate` 為 null 是**合法且常見**的狀態，
   * 不是「沒有留停」。存成 1970 或被當成必填都會讓完整度警示算錯。
   */
  it("留職停薪的起訖來回不差一天，未復職留 null", async () => {
    const leaveStart = Date.parse("2026-10-01T00:00:00.000Z") / 1000;
    const created = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: {
        ...EMPLOYEE_INPUT,
        number: `${EMPLOYEE_INPUT.number}-LV1`,
        leaveStartDate: leaveStart,
        leaveEndDate: null,
      },
      change: changeCtx(),
    });

    expect(created.leaveStartDate).toBe(leaveStart);
    expect(created.leaveEndDate).toBeNull();

    const raw = await prisma.salaryCalculatorEmployee.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(raw.leaveStartDate?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(raw.leaveEndDate).toBeNull();

    const reloaded = await salaryCalculatorEmployeeRepo.getActiveEmployeeById(
      BOOK_ID,
      created.id,
    );
    expect(reloaded?.leaveStartDate).toBe(leaveStart);
  });

  /**
   * Info: (20260902 - Julian) 費率是 Int 不是 BigInt，而且 6 不能變成 0。
   *
   * 寫成 BigInt 的話這一條會在 create 就炸（Prisma 拒收），
   * 寫成 `BigInt(Math.round(0.06))` 則會靜靜存成 0 —— 後者只有這一條抓得到。
   */
  it("自提勞退費率存 6 讀回來還是 6", async () => {
    const created = await salaryCalculatorEmployeeRepo.createEmployee({
      change: changeCtx(),
      accountBookId: BOOK_ID,
      input: {
        ...EMPLOYEE_INPUT,
        number: `${EMPLOYEE_INPUT.number}-PF2`,
        voluntaryPensionRate: 6,
      },
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
      change: changeCtx(),
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
      change: changeCtx(),
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number },
    });

    const updated = await salaryCalculatorEmployeeRepo.updateEmployee({
      change: changeCtx(),
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

    const read = await salaryCalculatorEmployeeRepo.getActiveEmployeeById(
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
      change: changeCtx(),
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-X1` },
    });

    /**
     * Info: (20260901 - Julian) 拿著正確的 uuid，只是換一本帳。
     * 假 repo 的 `${accountBookId}|${id}` key 讓這件事永遠成立；
     * 真 repo 靠的是 `where` 裡的 `accountBookId`，而那一行可以被刪掉。
     */
    expect(
      await salaryCalculatorEmployeeRepo.getActiveEmployeeById(
        OTHER_BOOK_ID,
        mine.id,
      ),
    ).toBeNull();

    expect(
      await salaryCalculatorEmployeeRepo.updateEmployee({
        change: changeCtx(),
        accountBookId: OTHER_BOOK_ID,
        employeeId: mine.id,
        input: { ...EMPLOYEE_INPUT, name: "被別本帳改掉了" },
      }),
    ).toBeNull();

    expect(
      await salaryCalculatorEmployeeRepo.softDeleteEmployee({
        change: changeCtx(),
        accountBookId: OTHER_BOOK_ID,
        employeeId: mine.id,
      }),
    ).toBe(false);

    // Info: (20260901 - Julian) 成對斷言：不只「回 null」，那一列本身也必須沒被動到
    const untouched = await salaryCalculatorEmployeeRepo.getActiveEmployeeById(
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
      change: changeCtx(),
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-X2` },
    });

    expect(
      await salaryCalculatorEmployeeRepo.softDeleteEmployee({
        change: changeCtx(),
        accountBookId: BOOK_ID,
        employeeId: employee.id,
      }),
    ).toBe(true);

    expect(
      await salaryCalculatorEmployeeRepo.getActiveEmployeeById(
        BOOK_ID,
        employee.id,
      ),
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
      change: changeCtx(),
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-X3` },
    });
    await salaryCalculatorEmployeeRepo.softDeleteEmployee({
      change: changeCtx(),
      accountBookId: BOOK_ID,
      employeeId: employee.id,
    });

    expect(
      await salaryCalculatorEmployeeRepo.updateEmployee({
        change: changeCtx(),
        accountBookId: BOOK_ID,
        employeeId: employee.id,
        input: { ...EMPLOYEE_INPUT, name: "復活" },
      }),
    ).toBeNull();

    expect(
      await salaryCalculatorEmployeeRepo.softDeleteEmployee({
        change: changeCtx(),
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
      change: changeCtx(),
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number },
    });

    await expect(
      salaryCalculatorEmployeeRepo.createEmployee({
        change: changeCtx(),
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
      change: changeCtx(),
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number },
    });
    await salaryCalculatorEmployeeRepo.softDeleteEmployee({
      change: changeCtx(),
      accountBookId: BOOK_ID,
      employeeId: first.id,
    });

    const second = await salaryCalculatorEmployeeRepo.createEmployee({
      change: changeCtx(),
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
      change: changeCtx(),
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number },
    });

    const other = await salaryCalculatorEmployeeRepo.createEmployee({
      change: changeCtx(),
      accountBookId: OTHER_BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number },
    });

    expect(other.number).toBe(number);
  });
});

describe("薪資紀錄：租戶過濾、覆寫與分頁", () => {
  it("另一本帳的紀錄，用對的 id 也讀不到、刪不掉", async () => {
    const employee = await salaryCalculatorEmployeeRepo.createEmployee({
      change: changeCtx(),
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
        deletedByUserId: userId,
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
      change: changeCtx(),
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
      where: {
        accountBookId: BOOK_ID,
        employeeId: employee.id,
        year: 2026,
        month: 2,
      },
    });
    expect(rows).toBe(1);
  });

  it("覆寫不改 createdByUserId（那一欄記的是來源，不是最後動它的人）", async () => {
    const employee = await salaryCalculatorEmployeeRepo.createEmployee({
      change: changeCtx(),
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
      change: changeCtx(),
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
      change: changeCtx(),
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
      change: changeCtx(),
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
        deletedByUserId: userId,
      }),
    ).toBe(true);
    expect(await salaryRecordRepo.getRecordById(BOOK_ID, record.id)).toBeNull();

    /**
     * Info: (20260909 - Julian) **這一條 20260909 反過來了：改成軟刪除。**
     *
     * 原本斷言「那一列真的不見了」。薪資紀錄就是**工資清冊**的那一列，
     * 而勞基法 §23 II 要求工資清冊保存五年 —— 硬刪讓保存義務可以用
     * 一顆按鈕規避。完整脈絡見 `salary_pay_slip_delivery_plan.md` §7。
     *
     * 成對斷言：`getRecordById` 看不到（應用層的行為），
     * 而 `findUnique` 看得到且 `deletedAt` 有值（資料還在）。
     * 只驗前者的話，把 `deletedAt` 改成真刪也一樣綠。
     */
    const softDeleted = await prisma.salaryRecord.findUnique({
      where: { id: record.id },
    });
    expect(softDeleted).not.toBeNull();
    expect(softDeleted?.deletedAt).toBeInstanceOf(Date);

    /**
     * Info: (20260909 - Julian) 刪除留下一列 AuditLog（工資清冊的保存軌跡）。
     *
     * 這一條在 e2e 才問得到：`salary_repo_scope.test.ts` 用替身驗
     * 「有沒有呼叫」，而真資料庫多驗兩件事 —— 那一列寫得進去
     * （`userId` / `accountBookId` 兩條外鍵都成立），而且 `dataType`
     * 是資料庫認得的列舉值。假的 `userId` 在替身那邊完全看不出來。
     */
    const logs = await prisma.auditLog.findMany({
      where: { accountBookId: BOOK_ID, dataId: record.id },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("DELETE");
    expect(logs[0].dataType).toBe("SALARY_RECORD");
    expect(logs[0].userId).toBe(userId);

    // Info: (20260901 - Julian) 刪第二次回 false，不是丟例外
    expect(
      await salaryRecordRepo.deleteRecord({
        accountBookId: BOOK_ID,
        recordId: record.id,
        deletedByUserId: userId,
      }),
    ).toBe(false);

    /**
     * Info: (20260909 - Julian) 而且**沒有留下第二列軌跡**。
     *
     * `where` 帶著 `deletedAt: null`，所以第二次 `count === 0`。
     * 少了那個過濾的話這裡會有兩列 —— 稽核讀到的是「這筆被刪了兩次」，
     * 而那不是發生過的事。
     */
    expect(
      await prisma.auditLog.count({
        where: { accountBookId: BOOK_ID, dataId: record.id },
      }),
    ).toBe(1);
  });
});

/**
 * Info: (20260905 - Luphia) 完整度警示要的年月分佈（#6774）。
 *
 * 這一支是 `groupBy` —— 它與 `findMany` 不同：`by` 少列一個欄位、
 * 或 `where` 掉了帳本，回來的形狀仍然合法，只是**答案錯了**。
 * 純函式那一側（`salary_coverage.tz.test.ts`）看不到這一段，
 * service 的替身（`salary_record_service.test.ts`）也只回它被餵的東西。
 */
describe("listCoveredPeriods：整本帳的年月分佈", () => {
  it("同一人同一個月只回一列，跨員工分得開", async () => {
    const a = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-CV1` },
      change: changeCtx(),
    });
    const b = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-CV2` },
      change: changeCtx(),
    });

    await saveRecord({
      accountBookId: BOOK_ID,
      employeeId: a.id,
      year: 2026,
      month: 3,
      totalPayment: 41000n,
    });
    // Info: (20260905 - Luphia) 同一格覆寫一次：`upsert` 之後仍然只該有一列
    await saveRecord({
      accountBookId: BOOK_ID,
      employeeId: a.id,
      year: 2026,
      month: 3,
      totalPayment: 42000n,
    });
    await saveRecord({
      accountBookId: BOOK_ID,
      employeeId: b.id,
      year: 2026,
      month: 4,
      totalPayment: 41000n,
    });

    const covered = await salaryRecordRepo.listCoveredPeriods(BOOK_ID);
    const mine = covered.filter((row) => [a.id, b.id].includes(row.employeeId));

    expect(mine).toHaveLength(2);
    expect(mine).toContainEqual({ employeeId: a.id, year: 2026, month: 3 });
    expect(mine).toContainEqual({ employeeId: b.id, year: 2026, month: 4 });
  });

  /**
   * Info: (20260905 - Luphia) 別的帳本的紀錄不得算進來。
   *
   * `where` 掉了帳本的話，另一本帳裡同一個月的紀錄會把這裡的缺漏補平 ——
   * 而畫面上那個月看起來就是「已經建好了」。
   */
  it("只回本帳本的分佈", async () => {
    const mine = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-CV3` },
      change: changeCtx(),
    });
    const theirs = await salaryCalculatorEmployeeRepo.createEmployee({
      accountBookId: OTHER_BOOK_ID,
      input: { ...EMPLOYEE_INPUT, number: `${EMPLOYEE_INPUT.number}-CV4` },
      change: changeCtx(),
    });

    await saveRecord({
      accountBookId: OTHER_BOOK_ID,
      employeeId: theirs.id,
      year: 2026,
      month: 5,
      totalPayment: 41000n,
    });

    const covered = await salaryRecordRepo.listCoveredPeriods(BOOK_ID);

    expect(covered.map((row) => row.employeeId)).not.toContain(theirs.id);
    expect(covered.map((row) => row.employeeId)).not.toContain(mine.id);
  });
});
