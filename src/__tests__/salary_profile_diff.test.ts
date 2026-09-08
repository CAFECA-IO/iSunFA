import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import path from "path";
import {
  changedFieldsOf,
  diffProfileSnapshot,
  ISalaryEmployeeProfileSnapshot,
  SALARY_PROFILE_FIELDS,
  SALARY_PROFILE_FIELD_VISIBILITY,
  isDefaultVisibleProfileField,
  profileChangesFor,
} from "@/lib/utils/salary_profile_diff";

/**
 * Info: (20260908 - Julian) 薪資異動紀錄的差異判準。
 *
 * 計劃書：`documents/architecture/salary_profile_change_history_plan.md`
 *
 * 這一支守的是整個功能的地基：**「什麼算一次薪資異動」只能有一個答案。**
 * 差異算錯的後果不是畫面壞掉 —— 是異動表裡少了一筆，
 * 而少的那一筆在三年後有人來要資料時才會被發現，那時候已經補不回來了。
 */

const BASE: ISalaryEmployeeProfileSnapshot = {
  name: "王小明",
  number: "A001",
  email: "ming@example.com",
  baseSalary: 40000,
  mealAllowance: 2400,
  otherAllowanceTaxable: 0,
  otherAllowanceTaxFree: 0,
  industryCode: 42,
  isForeignWorker: false,
  employmentType: "FULL_TIME",
  baseSalary30Days: false,
  isLaborInsured: true,
  isHealthInsured: true,
  isPensionInsured: true,
  dependentsCount: 0,
  voluntaryPensionRate: 0,
  hireDate: 1_767_225_600,
  resignDate: null,
};

const withChanges = (
  patch: Partial<ISalaryEmployeeProfileSnapshot>,
): ISalaryEmployeeProfileSnapshot => ({ ...BASE, ...patch });

describe("欄位清單的完整性", () => {
  /**
   * Info: (20260908 - Julian) 快照的形狀綁在 `ISalaryCalculatorEmployee` 上。
   *
   * `SALARY_PROFILE_FIELD_VISIBILITY` 的型別是
   * `Record<SalaryProfileField, boolean>`，所以漏一個欄位是**編譯錯誤**，
   * 不需要測試。這裡守的是編譯守不住的那一半：清單非空、且兩類都有人。
   *
   * 為什麼「兩類都有人」值得一條測試：若有人把整張表改成全 `true`，
   * 篩選功能就失去意義而不會有任何東西紅；反之全 `false` 則畫面預設空白。
   */
  it("欄位清單非空，而且預設顯示與預設隱藏兩類都有", () => {
    expect(SALARY_PROFILE_FIELDS.length).toBeGreaterThanOrEqual(15);

    const visible = SALARY_PROFILE_FIELDS.filter(isDefaultVisibleProfileField);
    const hidden = SALARY_PROFILE_FIELDS.filter(
      (field) => !isDefaultVisibleProfileField(field),
    );

    expect(visible.length).toBeGreaterThan(0);
    expect(hidden.length).toBeGreaterThan(0);
  });

  /**
   * Info: (20260908 - Julian) 金額四欄與投保三旗標必須是預設顯示。
   *
   * 這一條不是重述設定值，而是釘住「這張表存在的理由」：
   * 一份預設看不到本薪變動的調薪歷程，不叫調薪歷程。
   * 投保三欄放進來是因為勞檢問的第一批問題就在那裡。
   */
  it("本薪、加給與投保狀態預設看得到", () => {
    for (const field of [
      "baseSalary",
      "mealAllowance",
      "otherAllowanceTaxable",
      "otherAllowanceTaxFree",
      "isLaborInsured",
      "isHealthInsured",
      "isPensionInsured",
    ] as const) {
      expect(SALARY_PROFILE_FIELD_VISIBILITY[field]).toBe(true);
    }
  });
});

describe("差異計算", () => {
  it("沒有任何變動時回空陣列", () => {
    expect(diffProfileSnapshot(BASE, { ...BASE })).toEqual([]);
    expect(changedFieldsOf(BASE, { ...BASE })).toEqual([]);
  });

  it("一欄變動回一筆，帶前後值", () => {
    const changes = diffProfileSnapshot(
      BASE,
      withChanges({ baseSalary: 45000 }),
    );

    expect(changes).toEqual([
      { field: "baseSalary", before: 40000, after: 45000 },
    ]);
  });

  it("多欄變動一次回齊", () => {
    const changes = changedFieldsOf(
      BASE,
      withChanges({
        baseSalary: 45000,
        mealAllowance: 3000,
        dependentsCount: 2,
      }),
    );

    expect(changes.sort()).toEqual(
      ["baseSalary", "dependentsCount", "mealAllowance"].sort(),
    );
  });

  /**
   * Info: (20260908 - Julian) **`null` 與 `0` 必須分得開。**
   *
   * `resignDate: null` 是「還在職」，`resignDate: 0` 是「1970-01-01 離職」。
   * 任何 falsy 比較（`!before[field] === !after[field]`、`||` 補值）
   * 都會把這兩個事實塌成同一個，於是「員工離職」這件事在歷程上消失。
   *
   * 同理 `dependentsCount` 從 0 改成 0 不是變動，從 null 改成 0 是 ——
   * 而後者代表資料曾經缺漏。
   */
  it("null 與 0 是不同的值", () => {
    expect(changedFieldsOf(BASE, withChanges({ resignDate: 0 }))).toEqual([
      "resignDate",
    ]);

    expect(
      changedFieldsOf(
        withChanges({ resignDate: 0 }),
        withChanges({ resignDate: null }),
      ),
    ).toEqual(["resignDate"]);
  });

  /**
   * Info: (20260908 - Julian) 布林從 true 轉 false 要抓得到。
   *
   * 這是「停保」——勞檢會問的事。用 `if (after[field])` 這類寫法判斷有沒有變動，
   * 只抓得到「開啟」不抓得到「關閉」，而關閉才是會出事的那個方向。
   */
  it("投保從 true 改成 false 是一筆變動", () => {
    expect(
      diffProfileSnapshot(BASE, withChanges({ isLaborInsured: false })),
    ).toEqual([{ field: "isLaborInsured", before: true, after: false }]);
  });

  /**
   * Info: (20260908 - Julian) 快照少一欄時，寧可多報一筆也不要漏報。
   *
   * 快照是 Json，型別檢查不到內容。差異若走 `Object.keys(before)`，
   * 少掉的那一欄會變成「沒有變動」—— 漏報是看不見的。
   * 走常數清單的話它會被讀成 `undefined`、與實際值不同，於是**多報一筆**，
   * 而多報看得見、查得出來。
   */
  it("快照缺欄位時被視為變動（多報，不漏報）", () => {
    const incomplete = { ...BASE } as Record<string, unknown>;
    delete incomplete.baseSalary;

    const changes = changedFieldsOf(
      incomplete as unknown as ISalaryEmployeeProfileSnapshot,
      BASE,
    );

    expect(changes).toContain("baseSalary");
  });
});

describe("changedFields 與快照的一致性", () => {
  /**
   * Info: (20260908 - Julian) `changedFields` 是衍生資料，只能由 differ 產生。
   *
   * 它存在資料庫裡是為了讓「只看本薪的變動、翻三年」不必全表掃描，
   * 代價是它可能與快照不一致 —— 而不一致的症狀是**篩選會騙人**：
   * 使用者篩「本薪」，一筆真的改了本薪的列沒出現。
   *
   * 這一條釘住兩者由同一支函式產生。若日後有人在 repository 裡
   * 手組 `changedFields`，這一條不會紅（它測不到 repository）——
   * 那一半由 `salary_profile_change_repo.test.ts` 守。
   */
  it("changedFieldsOf 恆等於 diffProfileSnapshot 的欄位名", () => {
    const after = withChanges({
      baseSalary: 50000,
      isHealthInsured: false,
      email: "new@example.com",
      resignDate: 1_800_000_000,
    });

    expect(changedFieldsOf(BASE, after)).toEqual(
      diffProfileSnapshot(BASE, after).map((change) => change.field),
    );
  });
});

describe("實作方式", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src", "lib", "utils", "salary_profile_diff.ts"),
    "utf-8",
  ).replace(/\/\*[\s\S]*?\*\//g, "");

  /**
   * Info: (20260908 - Julian) 快照型別必須從 `ISalaryCalculatorEmployee` 推導。
   *
   * 手列一遍欄位的話，新增員工檔欄位時快照會靜靜地不含它 ——
   * 那一欄的變動從此不被記錄，而且沒有任何東西會紅。
   * 綁在 `Omit<...>` 上，新欄位會自動進來，而分類表會編譯失敗。
   */
  it("快照型別綁在 ISalaryCalculatorEmployee 上，不是手列欄位", () => {
    expect(source).toMatch(
      /ISalaryEmployeeProfileSnapshot = Omit<\s*ISalaryCalculatorEmployee,\s*"id"\s*>/,
    );
  });

  it("欄位清單來自分類表，差異不從資料的 key 取", () => {
    expect(source).toContain(
      "Object.keys(\n  SALARY_PROFILE_FIELD_VISIBILITY,\n)",
    );
    expect(source).not.toContain("Object.keys(before)");
    expect(source).not.toContain("Object.keys(after)");
  });
});

describe("一列異動 → 逐欄前後值（讀取端）", () => {
  /**
   * Info: (20260908 - Julian) 建檔列出**全部欄位**，`before` 為 null。
   *
   * 那是這個人的起點，而稽核要看得到起點的值 ——
   * 「他一開始的本薪是多少」與「他後來調到多少」是同一個問題的兩半。
   * 回空陣列的話，歷程的第一列會是一個沒有內容的「建檔」。
   */
  it("CREATE：全部欄位，before 是 null", () => {
    const changes = profileChangesFor("CREATE", null, BASE);

    expect(changes).toHaveLength(SALARY_PROFILE_FIELDS.length);
    expect(changes.every((change) => change.before === null)).toBe(true);
    expect(changes.find((change) => change.field === "baseSalary")?.after).toBe(
      40000,
    );
  });

  it("UPDATE：只有真的變了的欄位", () => {
    const changes = profileChangesFor(
      "UPDATE",
      BASE,
      withChanges({ baseSalary: 45000 }),
    );

    expect(changes).toEqual([
      { field: "baseSalary", before: 40000, after: 45000 },
    ]);
  });

  /**
   * Info: (20260908 - Julian) 移除回空陣列，**不是**「每一欄都變成 null」。
   *
   * 硬要 diff 的話，畫面上會出現 18 筆「本薪 40,000 → —」這種假的變動 ——
   * 而那個人的本薪並沒有變成空的，他只是不在名單上了。
   * 移除這件事由 `action` 表達。
   */
  it("DELETE：空陣列（移除不是欄位變動）", () => {
    expect(profileChangesFor("DELETE", BASE, null)).toEqual([]);
  });

  /**
   * Info: (20260908 - Julian) **`action` 說了算，即使 after 有值。**
   *
   * 這一條是上一條的補位。DELETE 的列按建構是 `after === null`，
   * 所以上面那條測試就算把 `action === "DELETE"` 這個判斷整個拿掉也會綠 ——
   * 它其實只驗到了 `after === null` 那一半（實測：拿掉 action 判斷，36 條全綠）。
   *
   * 這裡刻意餵一個「DELETE 但 after 有值」的畸形列。它今天寫不出來，
   * 但日後若有人重用這個 action、或資料寫壞，正確的行為是**相信 action**：
   * 那個人是被移除了，不是他的每一欄都變了。
   */
  it("DELETE 即使帶著 after 也回空陣列（action 說了算）", () => {
    expect(
      profileChangesFor("DELETE", BASE, withChanges({ baseSalary: 45000 })),
    ).toEqual([]);
  });

  /**
   * Info: (20260908 - Julian) 快照缺漏時回空陣列，而不是把整份當成變動。
   *
   * `afterSnapshot` 為 null 只該發生在 DELETE 列。若某一天出現一列
   * action 是 UPDATE 而 after 是 null（資料寫壞了），
   * 回「18 筆全部變成 null」會在畫面上長得像一次真的大改動 ——
   * 空的比錯的好。
   */
  it("after 缺漏時回空陣列，不編故事", () => {
    expect(profileChangesFor("UPDATE", BASE, null)).toEqual([]);
  });
});
