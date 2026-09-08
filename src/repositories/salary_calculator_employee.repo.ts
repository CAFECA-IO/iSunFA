import {
  Prisma,
  SalaryCalculatorEmployee,
  SalaryProfileChangeAction,
} from "@/generated";
import { prisma } from "@/lib/prisma";
import { MoneyUtil } from "@/lib/utils/money";
import {
  ISalaryCalculatorEmployee,
  ISalaryCalculatorEmployeeWriteInput,
  ISalaryEmployeeProfile,
  ISalaryProfileChangeContext,
  ISalaryProfileChangeRow,
} from "@/interfaces/salary_record";
import {
  changedFieldsOf,
  ISalaryEmployeeProfileSnapshot,
  SALARY_PROFILE_FIELDS,
} from "@/lib/utils/salary_profile_diff";
import {
  activeNumberFor,
  assertActiveNumberPairing,
} from "@/repositories/salary_calculator_employee_invariant";

/**
 * Info: (20260831 - Julian) 薪資計算機輕量員工名單的存取層。
 *
 * ## 租戶隔離不靠呼叫端記得
 *
 * 每一支方法都收 `accountBookId`，而且它一律是 `where` 的第一個 key ——
 * 包含單筆查詢。只用 `id` 查再由呼叫端比對帳本，是一個猜到別人的 uuid
 * 就能讀到別的帳本員工的設計（同 `leave_policy.repo.ts` 對 `replaceTiers` 的處置）。
 */
export interface ISalaryCalculatorEmployeeRepository {
  listEmployees(accountBookId: string): Promise<ISalaryCalculatorEmployee[]>;
  getActiveEmployeeById(
    accountBookId: string,
    employeeId: string,
  ): Promise<ISalaryCalculatorEmployee | null>;
  /**
   * Info: (20260908 - Julian) 三支寫入方法都收 `change`（誰改的、何時生效、為什麼）。
   *
   * 收在**介面**上而不是讓 repository 自己去拿，是因為 `changedByUserId`
   * 只有 route 那一層知道（來自 DeWT），而 repository 拿不到 request。
   * 讓它變成必填參數，等於讓「這次修改是誰做的」成為寫入員工檔的前提 ——
   * 忘記傳是**編譯錯誤**，不是一列少了 userId 的異動紀錄。
   */
  createEmployee(params: {
    accountBookId: string;
    input: ISalaryCalculatorEmployeeWriteInput;
    change: ISalaryProfileChangeContext;
  }): Promise<ISalaryCalculatorEmployee>;
  updateEmployee(params: {
    accountBookId: string;
    employeeId: string;
    input: ISalaryCalculatorEmployeeWriteInput;
    change: ISalaryProfileChangeContext;
  }): Promise<ISalaryCalculatorEmployee | null>;
  /** Info: (20260831 - Julian) soft delete。回 false 表示那一列不存在（或已被刪） */
  softDeleteEmployee(params: {
    accountBookId: string;
    employeeId: string;
    change: ISalaryProfileChangeContext;
  }): Promise<boolean>;
  /**
   * Info: (20260908 - Julian) 某位員工的薪資條件異動軌跡，**新的在前**。
   *
   * 讀的是 `salary_employee_profile_change`（與寫入同一張表，所以放在同一支
   * repository）。回傳的是**原始列**：前後快照仍是 Json，diff 由服務層算 ——
   * 「哪些欄位算變動」的規則只能有一份實作，而它在 `salary_profile_diff.ts`。
   */
  listProfileChanges(params: {
    accountBookId: string;
    employeeId: string;
    fields?: string[];
    page: number;
    pageSize: number;
  }): Promise<{
    rows: ISalaryProfileChangeRow[];
    totalCount: number;
    recordedSince: Date | null;
  }>;
}

/**
 * Info: (20260831 - Julian) 員工編號在這個帳本已經有存活中的員工在用。
 *
 * 丟具名型別而不是讓 P2002 冒出去：編號重複是使用者的輸入問題，
 * 而原始的 Prisma 錯誤讀起來像故障（coding_guidelines §5.2）。
 */
export class SalaryEmployeeNumberTakenError extends Error {
  constructor(public readonly employeeNumber: string) {
    super(
      `SalaryCalculatorEmployee: employee number already used (number=${employeeNumber})`,
    );
    this.name = "SalaryEmployeeNumberTakenError";
  }
}

// Info: (20260831 - Julian) P2002 是唯一鍵衝突。不用 instanceof：Prisma 的錯誤類別跨版本換過位置
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === "P2002";

/**
 * Info: (20260831 - Julian) BigInt → number。
 *
 * 薪資是整數元，`Number()` 在這個值域內不會失真；走 `MoneyUtil` 是為了
 * 讓「金額轉換都經由同一個入口」這件事在 grep 上看得見（precision guideline §4）。
 */
const toAmount = (value: bigint): number =>
  MoneyUtil.toDecimal(value.toString()).toNumber();

// Info: (20260902 - Julian) DateTime → Unix 秒（沿用 IVoucher 的前端時間戳慣例），null 原樣帶出
const toUnixSecondsOrNull = (value: Date | null): number | null =>
  value === null ? null : Math.floor(value.getTime() / 1000);

// Info: (20260902 - Julian) Unix 秒 → DateTime。null 是「沒有這個日期」，不是 1970
const toDateOrNull = (value: number | null): Date | null =>
  value === null ? null : new Date(value * 1000);

/**
 * Info: (20260902 - Julian) 員工檔的常態屬性 → 前端格式。
 *
 * 與 `toWriteData` 成對維護：這 15 欄任何一邊漏接，症狀都是
 * 「選了員工，某一欄沒被帶進計算機」—— 而畫面上那一欄會是計算機的預設值，
 * 看起來完全正常。`ISalaryEmployeeProfile` 是把兩邊綁在一起的型別。
 */
const toProfile = (row: SalaryCalculatorEmployee): ISalaryEmployeeProfile => ({
  baseSalary: toAmount(row.baseSalary),
  mealAllowance: toAmount(row.mealAllowance),
  otherAllowanceTaxable: toAmount(row.otherAllowanceTaxable),
  otherAllowanceTaxFree: toAmount(row.otherAllowanceTaxFree),
  industryCode: row.industryCode,
  isForeignWorker: row.isForeignWorker,
  employmentType: row.employmentType,
  baseSalary30Days: row.baseSalary30Days,
  isLaborInsured: row.isLaborInsured,
  isHealthInsured: row.isHealthInsured,
  isPensionInsured: row.isPensionInsured,
  dependentsCount: row.dependentsCount,
  // Info: (20260902 - Julian) 落地是百分點整數，前端也是百分點整數；轉小數是 UI 那一層的事
  voluntaryPensionRate: row.voluntaryPensionRate,
  hireDate: toUnixSecondsOrNull(row.hireDate),
  resignDate: toUnixSecondsOrNull(row.resignDate),
});

// Info: (20260902 - Julian) 寫入方向。與 toProfile 成對，理由見該函式
const toWriteData = (input: ISalaryCalculatorEmployeeWriteInput) => ({
  baseSalary: BigInt(input.baseSalary),
  mealAllowance: BigInt(input.mealAllowance),
  otherAllowanceTaxable: BigInt(input.otherAllowanceTaxable),
  otherAllowanceTaxFree: BigInt(input.otherAllowanceTaxFree),
  industryCode: input.industryCode,
  isForeignWorker: input.isForeignWorker,
  employmentType: input.employmentType,
  baseSalary30Days: input.baseSalary30Days,
  isLaborInsured: input.isLaborInsured,
  isHealthInsured: input.isHealthInsured,
  isPensionInsured: input.isPensionInsured,
  dependentsCount: input.dependentsCount,
  /**
   * Info: (20260902 - Julian) **不是 BigInt。** 這一欄是費率的百分點（0–6）。
   * 寫成 `BigInt(input.voluntaryPensionRate)` 在型別上會過（它是 number），
   * 但 schema 那一欄是 Int —— Prisma 會在執行期才抱怨，而且訊息不會提到「費率」。
   */
  voluntaryPensionRate: input.voluntaryPensionRate,
  hireDate: toDateOrNull(input.hireDate),
  resignDate: toDateOrNull(input.resignDate),
});

/**
 * Info: (20260908 - Julian) 員工列 → 異動紀錄的快照。
 *
 * 刻意走 `toFrontendFormat` 再把 `id` 拿掉，而不是另寫一份轉換：
 * 快照必須與 API 回傳的形狀**逐欄一致**（BigInt → number、Date → Unix 秒、
 * email 的 null 打平成空字串），否則差異會把「格式不同」誤判成「值變了」。
 * 另寫一份轉換就是預約那個誤判。
 */
const toSnapshot = (
  row: SalaryCalculatorEmployee,
): ISalaryEmployeeProfileSnapshot => {
  const formatted = toFrontendFormat(row);
  /**
   * Info: (20260908 - Julian) 逐一列舉而不是解構掉 `id`。
   *
   * `const { id: _id, ...rest }` 讀起來更短，但 eslint 會抓那個沒用到的變數，
   * 而繞過它的寫法（`// eslint-disable`）等於在這裡放一個不會再被檢查的角落。
   * 這裡真正想表達的是「快照的欄位就是 `ISalaryEmployeeProfileSnapshot` 那一組」，
   * 而回傳型別已經在編譯期保證了這件事：多一欄或少一欄都不會過。
   */
  return {
    name: formatted.name,
    number: formatted.number,
    email: formatted.email,
    baseSalary: formatted.baseSalary,
    mealAllowance: formatted.mealAllowance,
    otherAllowanceTaxable: formatted.otherAllowanceTaxable,
    otherAllowanceTaxFree: formatted.otherAllowanceTaxFree,
    industryCode: formatted.industryCode,
    isForeignWorker: formatted.isForeignWorker,
    employmentType: formatted.employmentType,
    baseSalary30Days: formatted.baseSalary30Days,
    isLaborInsured: formatted.isLaborInsured,
    isHealthInsured: formatted.isHealthInsured,
    isPensionInsured: formatted.isPensionInsured,
    dependentsCount: formatted.dependentsCount,
    voluntaryPensionRate: formatted.voluntaryPensionRate,
    hireDate: formatted.hireDate,
    resignDate: formatted.resignDate,
  };
};

/**
 * Info: (20260908 - Julian) 追加一列異動紀錄。**只在交易裡呼叫。**
 *
 * 計劃書 §5.1。三個要求各自對應一個真實的失敗模式：
 *
 * 1. **在 repository，不在 service。** 員工檔的寫入有三個入口（新增、編輯、
 *    soft delete，其中新增還有計算機的「直接新增員工」那條路徑）。
 *    放在 service 就是三個地方各記一次，而漏掉其中一個**不會有任何症狀** ——
 *    直到有人發現某條路徑改的薪資沒留痕。
 * 2. **在同一個交易裡。** 分兩次寫，中間失敗就會出現「檔改了、沒有紀錄」
 *    或「有紀錄、檔沒改」。前者是靜默的資料遺失，後者是假的歷史。
 * 3. **`before` 必須來自資料庫當下那一列**，不能用前端送來的舊值 ——
 *    那份可能已經過期（別人剛改過），也可能被偽造。
 *
 * `changedFields` 一律由 `changedFieldsOf()` 產生，不手組（計劃書 §3.3）。
 */
const appendProfileChange = async (
  tx: Prisma.TransactionClient,
  params: {
    accountBookId: string;
    employeeId: string;
    action: SalaryProfileChangeAction;
    before: ISalaryEmployeeProfileSnapshot | null;
    after: ISalaryEmployeeProfileSnapshot | null;
    changedFields: string[];
    change: ISalaryProfileChangeContext;
  },
): Promise<void> => {
  await tx.salaryEmployeeProfileChange.create({
    data: {
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      action: params.action,
      beforeSnapshot: params.before ?? Prisma.DbNull,
      afterSnapshot: params.after ?? Prisma.DbNull,
      changedFields: params.changedFields,
      effectiveYear: params.change.effectiveYear,
      effectiveMonth: params.change.effectiveMonth,
      reason: params.change.reason ?? null,
      changedByUserId: params.change.changedByUserId,
    },
  });
};

const toFrontendFormat = (
  row: SalaryCalculatorEmployee,
): ISalaryCalculatorEmployee => ({
  id: row.id,
  name: row.name,
  // Info: (20260831 - Julian) 編號是身分鍵，schema 上是必填，直接帶出
  number: row.number,
  // Info: (20260831 - Julian) Email 可空，null 打平成空字串（沿用 IVoucher.note 的既有慣例）
  email: row.email ?? "",
  ...toProfile(row),
});

export class SalaryCalculatorEmployeeRepository implements ISalaryCalculatorEmployeeRepository {
  public async listEmployees(
    accountBookId: string,
  ): Promise<ISalaryCalculatorEmployee[]> {
    const rows = await prisma.salaryCalculatorEmployee.findMany({
      where: { accountBookId, deletedAt: null },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    });

    return rows.map(toFrontendFormat);
  }

  /**
   * Info: (20260905 - Luphia) 名稱說出承諾：**存活中**的員工（review #6769）。
   *
   * 原名 `getEmployeeById` 沒有講出 `deletedAt: null` 這一半，於是
   * 「為什麼要濾軟刪除」變成一件要讀實作才知道的事 —— 而讀不到的人
   * 想放寬顯示範圍時，最順手的動作是把那個條件拿掉。
   *
   * 它今天的兩個呼叫端都是**動作**路徑：
   *
   * - `saveRecord`：替已移除的員工建立新的薪資紀錄
   * - `deliver`：把薪資單 PDF 寄給已經離開的人
   *
   * 兩者都不該對已刪除的員工成立，所以這一支恆濾。要列出含已刪除的
   * 員工（歷史清單之類）請另開一支 `findEmployeeById`，不要放寬這一支 ——
   * 放寬的話上面兩件事會一起靜靜變成可能，而畫面上看不出來。
   *
   * `accountBookId` 是**授權**不是識別：`employeeId` 是 uuid 主鍵，
   * 拿它就找得到列；帶帳本才讓「別人家的員工」變成查無此人。
   * `saveRecord` 的 `employeeId` 來自 request body，所以這一層是走得到的。
   */
  public async getActiveEmployeeById(
    accountBookId: string,
    employeeId: string,
  ): Promise<ISalaryCalculatorEmployee | null> {
    const row = await prisma.salaryCalculatorEmployee.findFirst({
      where: { accountBookId, id: employeeId, deletedAt: null },
    });

    return row ? toFrontendFormat(row) : null;
  }

  public async createEmployee({
    accountBookId,
    input,
    change,
  }: {
    accountBookId: string;
    input: ISalaryCalculatorEmployeeWriteInput;
    change: ISalaryProfileChangeContext;
  }): Promise<ISalaryCalculatorEmployee> {
    const data: Prisma.SalaryCalculatorEmployeeUncheckedCreateInput = {
      accountBookId,
      name: input.name,
      number: input.number,
      email: input.email ?? null,
      activeNumber: activeNumberFor(input.number, null),
      ...toWriteData(input),
    };

    assertActiveNumberPairing({
      number: data.number,
      activeNumber: data.activeNumber ?? null,
      deletedAt: null,
    });

    try {
      /**
       * Info: (20260908 - Julian) 建檔與它的異動紀錄在同一個交易裡（計劃書 §5.1）。
       *
       * `changedFields` 給的是**全部欄位**，不是空陣列 —— 建檔時每一欄都是
       * 「從無到有」，而讀取端的欄位篩選（「只看本薪的變動」）應該要撈到
       * 這一列：一個人的第一筆本薪也是他薪資歷程的一部分。
       */
      const row = await prisma.$transaction(async (tx) => {
        const created = await tx.salaryCalculatorEmployee.create({ data });

        await appendProfileChange(tx, {
          accountBookId,
          employeeId: created.id,
          action: SalaryProfileChangeAction.CREATE,
          before: null,
          after: toSnapshot(created),
          changedFields: [...SALARY_PROFILE_FIELDS],
          change,
        });

        return created;
      });

      return toFrontendFormat(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new SalaryEmployeeNumberTakenError(input.number);
      }
      throw error;
    }
  }

  public async updateEmployee({
    accountBookId,
    employeeId,
    input,
    change,
  }: {
    accountBookId: string;
    employeeId: string;
    input: ISalaryCalculatorEmployeeWriteInput;
    change: ISalaryProfileChangeContext;
  }): Promise<ISalaryCalculatorEmployee | null> {
    /**
     * Info: (20260901 - Luphia) 先組 `data`，再拿**它**餵斷言（review 異常 2）。
     *
     * 斷言與寫入必須讀同一個物件。分開寫時兩邊各自呼叫一次
     * `activeNumberFor(input.number, null)`，於是斷言驗的是它自己算的值、
     * 不是真的要寫進去的值 —— 那種斷言在寫入被改壞時照樣通過。
     * `createEmployee` 一直是這樣做的，這裡與軟刪除是後來才對齊的。
     */
    /**
     * Info: (20260902 - Julian) `...toWriteData(input)` 曾經在這裡被 merge 靜默吃掉。
     *
     * 20260902 把 develop 併進來時，這一段被 `9dc404ff0`（把斷言接到真正的寫入）
     * 整塊取代，而那一版是在 15 個常態屬性落地**之前**寫的 ——
     * 於是編輯員工只寫得進姓名、編號、Email 與兩個金額，
     * 行業別、投保狀態、扶養人數、自提比例、到離職日全部原地不動。
     *
     * 症狀完全靜默：`updateEmployee` 回傳的是重新查出來的那一列，所以畫面
     * 「更新成功」；使用者要等到下次打開員工表單才發現剛才改的東西沒進去。
     * 抓到它的是 `salary_repo.e2e.test.ts` 的「更新會把 15 欄一起改掉」——
     * 而那一支只在 CI 的獨立步驟跑。`salary_repo_scope.test.ts` 現在也守著
     * 交給資料庫的 `data`，那一支在預設套件裡。
     */
    const data = {
      name: input.name,
      number: input.number,
      email: input.email ?? null,
      activeNumber: activeNumberFor(input.number, null),
      ...toWriteData(input),
    };

    assertActiveNumberPairing({
      number: data.number,
      activeNumber: data.activeNumber,
      deletedAt: null,
    });

    try {
      /**
       * Info: (20260908 - Julian) 讀舊值 → 更新 → 追加異動，三件事一個交易。
       *
       * ## `before` 為什麼要多讀一次資料庫
       *
       * 前端手上有它載入時抓的舊值，拿它省一次查詢很誘人。**不可以** ——
       * 那份可能已經過期（別人剛改過），也可能被偽造。
       * 異動紀錄的 `before` 是稽核證據，只能來自資料庫當下那一列（計劃書 §5.1）。
       *
       * ## `after` 也重讀，而不是拿 `data` 當結果
       *
       * `data` 是「我們要求寫成什麼」，重讀拿到的是「資料庫實際變成什麼」。
       * 兩者理當一致，但差異若存在，稽核紀錄要記後者。
       * 順帶讓 `@updatedAt` 這類由資料庫產生的值也進得了快照。
       *
       * ## 讀寫都走 `tx`，不走全域 `prisma`
       *
       * 原本這裡回傳 `this.getActiveEmployeeById(...)`，那一支用的是全域 client ——
       * 在交易中間呼叫它會走另一條連線，讀到的可能是交易外的舊狀態。
       */
      return await prisma.$transaction(async (tx) => {
        const before = await tx.salaryCalculatorEmployee.findFirst({
          where: { accountBookId, id: employeeId, deletedAt: null },
        });

        if (!before) return null;

        const result = await tx.salaryCalculatorEmployee.updateMany({
          where: { accountBookId, id: employeeId, deletedAt: null },
          data,
        });

        if (result.count === 0) return null;

        const after = await tx.salaryCalculatorEmployee.findFirst({
          where: { accountBookId, id: employeeId, deletedAt: null },
        });

        if (!after) return null;

        const beforeSnapshot = toSnapshot(before);
        const afterSnapshot = toSnapshot(after);
        const changedFields = changedFieldsOf(beforeSnapshot, afterSnapshot);

        /**
         * Info: (20260908 - Julian) **沒有實際變動就不寫列**（計劃書 §5.2）。
         *
         * 使用者打開彈窗、什麼都沒改就按儲存，是很常見的操作。
         * 每一次都留一列的話，歷程會被無意義的列淹沒 ——
         * 而淹沒的後果是真正的調薪找不到。
         */
        if (changedFields.length > 0) {
          await appendProfileChange(tx, {
            accountBookId,
            employeeId,
            action: SalaryProfileChangeAction.UPDATE,
            before: beforeSnapshot,
            after: afterSnapshot,
            changedFields,
            change,
          });
        }

        return toFrontendFormat(after);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new SalaryEmployeeNumberTakenError(input.number);
      }
      throw error;
    }
  }

  public async softDeleteEmployee({
    accountBookId,
    employeeId,
    change,
  }: {
    accountBookId: string;
    employeeId: string;
    change: ISalaryProfileChangeContext;
  }): Promise<boolean> {
    const deletedAt = new Date();

    /**
     * Info: (20260901 - Luphia) 斷言讀的是**要寫出去的那個物件**（review 異常 2）。
     *
     * 這裡原本傳的是三個就地造出來的常數（`number: ""`、
     * `activeNumberFor("", deletedAt)`、`deletedAt`），與下面的 `data` 沒有
     * 任何關係 —— 而 `activeNumberFor` 在 `deletedAt` 非空時恆回 `null`，
     * 所以那個斷言恆真。實測：把 `activeNumber: null` 從 `data` 拿掉，
     * 斷言照樣通過、5,441 條測試全綠。
     *
     * 寫對與寫錯被同一個觀測量塌成同一個值，正是檢查清單 §1.9 的形狀；
     * 而它守的那件事有具體後果：`activeNumber` 沒讓出，同一個編號就
     * 再也加不回來，使用者看到的是「這個人明明不在名單上卻加不進來」。
     *
     * `number` 仍傳空字串：刪除路徑本來就不碰它，而不變式在已刪除的分支
     * 只看 `activeNumber`（`number` 只進錯誤訊息）。真正要綁住的是下面那一欄。
     */
    const data = {
      deletedAt,
      // Info: (20260831 - Julian) 讓出 activeNumber，同一個編號之後才能重新加入
      activeNumber: activeNumberFor("", deletedAt),
    };

    assertActiveNumberPairing({
      number: "",
      activeNumber: data.activeNumber,
      deletedAt: data.deletedAt,
    });

    /**
     * Info: (20260908 - Julian) 移除也是一次異動，同一個交易裡留一列。
     *
     * `after` 為 null（這個人不在名單上了），`changedFields` 為空陣列 ——
     * 移除不是某個欄位的變動，它由 `action` 表達。
     *
     * **讀取端的欄位篩選必須一律保留 DELETE 列**，否則使用者篩「本薪」時，
     * 「這個人被移除了」這件事會消失，而歷程的最後一列不見比錯還糟。
     * 那一半由 PR B 的服務層負責。
     */
    return await prisma.$transaction(async (tx) => {
      const before = await tx.salaryCalculatorEmployee.findFirst({
        where: { accountBookId, id: employeeId, deletedAt: null },
      });

      if (!before) return false;

      const result = await tx.salaryCalculatorEmployee.updateMany({
        where: { accountBookId, id: employeeId, deletedAt: null },
        data,
      });

      if (result.count === 0) return false;

      await appendProfileChange(tx, {
        accountBookId,
        employeeId,
        action: SalaryProfileChangeAction.DELETE,
        before: toSnapshot(before),
        after: null,
        changedFields: [],
        change,
      });

      return true;
    });
  }

  public async listProfileChanges({
    accountBookId,
    employeeId,
    fields,
    page,
    pageSize,
  }: {
    accountBookId: string;
    employeeId: string;
    fields?: string[];
    page: number;
    pageSize: number;
  }): Promise<{
    rows: ISalaryProfileChangeRow[];
    totalCount: number;
    recordedSince: Date | null;
  }> {
    /**
     * Info: (20260908 - Julian) 欄位篩選：命中其中一個就算，而 `DELETE` 一律保留。
     *
     * 移除不是某個欄位的變動（它的 `changedFields` 是空陣列），
     * 所以純用 `hasSome` 會把它濾掉 —— 而使用者篩「本薪」時，
     * 若連「這個人被移除了」都消失，歷程的最後一列不見比錯還糟。
     *
     * 建檔（`CREATE`）不必特別處理：它的 `changedFields` 是全部欄位，
     * 任何篩選都命中。
     */
    const fieldFilter =
      fields && fields.length > 0
        ? {
            OR: [
              { changedFields: { hasSome: fields } },
              { action: SalaryProfileChangeAction.DELETE },
            ],
          }
        : {};

    const where = { accountBookId, employeeId, ...fieldFilter };

    /**
     * Info: (20260908 - Julian) 排序用 `recordedAt`，**不是生效期間**。
     *
     * 這是稽核軌跡，它自己的順序就是被寫下來的順序。改用生效期間排序的話，
     * 一筆 4/20 補登的「4 月起生效」會被插回 4 月的位置 ——
     * 而「這筆是後來才補的」正是稽核最需要看見的那件事，排序一動就藏起來了。
     *
     * 畫面兩個時間都顯示，所以讀者仍然看得出生效順序。
     */
    const [rows, totalCount, earliest] = await Promise.all([
      prisma.salaryEmployeeProfileChange.findMany({
        where,
        orderBy: { recordedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { changedBy: { select: { id: true, name: true } } },
      }),
      prisma.salaryEmployeeProfileChange.count({ where }),
      /**
       * Info: (20260908 - Julian) 最早一列**不套欄位篩選**。
       *
       * 它回答的是「這位員工從什麼時候開始被記錄」，那個答案不該隨著
       * 使用者當下篩了哪些欄位而改變 —— 套了篩選的話，
       * 篩「本薪」會讓起始日跳到第一次調薪那天，而畫面上那句
       * 「本紀錄自 X 起」就變成一句錯的話。
       */
      prisma.salaryEmployeeProfileChange.findFirst({
        where: { accountBookId, employeeId },
        orderBy: { recordedAt: "asc" },
        select: { recordedAt: true },
      }),
    ]);

    return {
      rows: rows.map((row) => ({
        id: row.id,
        action: row.action,
        beforeSnapshot: row.beforeSnapshot,
        afterSnapshot: row.afterSnapshot,
        changedFields: row.changedFields,
        effectiveYear: row.effectiveYear,
        effectiveMonth: row.effectiveMonth,
        reason: row.reason,
        recordedAt: row.recordedAt,
        changedBy: row.changedBy,
      })),
      totalCount,
      recordedSince: earliest?.recordedAt ?? null,
    };
  }
}

export const salaryCalculatorEmployeeRepo: ISalaryCalculatorEmployeeRepository =
  new SalaryCalculatorEmployeeRepository();
