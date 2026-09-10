import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import path from "path";
import { TeamRole } from "@/constants/team";
import { toSalaryAccessStatus } from "@/hooks/use_salary_access";

/**
 * Info: (20260908 - Julian) 帳本版薪資計算機的角色閘。
 *
 * ## 這裡守的不是安全
 *
 * 安全邊界是伺服器：十三支端點各自 `assertSalaryAccountBookAccess`，
 * `VIEWER` 一律 403，那件事由 `salary_access_guard.test.ts` 與
 * `salary_access_roles.test.ts` 守著。**這一支即使全紅，也沒有任何資料外洩。**
 *
 * 它守的是兩件別的事：
 *
 * 1. 前端不要長出第二份角色清單。兩份清單遲早分岔，而分岔的症狀是
 *    「畫面讓你進去、伺服器擋你」—— 使用者看到的是壞掉，不是權限。
 * 2. 只有明確允許才 render 內容（fail closed）。
 *
 * 本專案的測試不 render React，所以第 2 點的一半掃的是原始碼；
 * 判斷本身抽成了純函式 `toSalaryAccessStatus`，那一半是真的跑。
 */

const read = (relativePath: string): string =>
  readFileSync(path.join(process.cwd(), "src", relativePath), "utf-8");

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const gate = stripComments(
  read("components/salary_calculator/salary_access_gate.tsx"),
);
const hook = stripComments(read("hooks/use_salary_access.ts"));
const layout = stripComments(
  read("app/user/account_book/[account_book_id]/salary_calculator/layout.tsx"),
);

describe("判斷交給同一張角色表", () => {
  /**
   * Info: (20260908 - Julian) 前端不自己列角色。
   *
   * 硬寫 `role !== "VIEWER"` 會通過今天所有的測試，然後在下一次調整
   * `SALARY_ACCESS_ROLES` 時安靜地留在原地 —— 那正是 20260901 建立那張表
   * 要避免的東西，只是搬到了前端。
   */
  it("用 isSalaryAccessAllowed，不在前端另列一份角色清單", () => {
    expect(hook).toContain("isSalaryAccessAllowed");
    expect(hook).toContain('from "@/constants/salary_access"');
    expect(hook).not.toMatch(/["']VIEWER["']/);
    expect(hook).not.toMatch(/["']EDITOR["']/);
    expect(hook).not.toMatch(/TeamRole\.\w+/);
  });

  /**
   * Info: (20260908 - Julian) 問的是 `READ`，不是 `WRITE`。
   *
   * 今天兩張表內容相同，所以問錯了**行為上看不出來** —— 與
   * `salary_access_guard.test.ts` 記載的是同一件事。日後放寬讀取
   * （例如讓 `VIEWER` 看得到某個子頁）時，問成 `WRITE` 的閘會把該放的人擋在外面，
   * 而那時候才發現的話，症狀是「權限開了卻沒生效」。
   */
  it("要求的是 READ 層級", () => {
    expect(hook).toMatch(/isSalaryAccessAllowed\([^)]*SalaryAccess\.READ\)/);
    expect(hook).not.toContain("SalaryAccess.WRITE");
  });
});

describe("角色 → 狀態（fail closed）", () => {
  it("OWNER 與 EDITOR 放行", () => {
    expect(toSalaryAccessStatus(TeamRole.OWNER)).toEqual({
      state: "allowed",
      role: TeamRole.OWNER,
    });
    expect(toSalaryAccessStatus(TeamRole.EDITOR)).toEqual({
      state: "allowed",
      role: TeamRole.EDITOR,
    });
  });

  it("VIEWER 擋下", () => {
    expect(toSalaryAccessStatus(TeamRole.VIEWER).state).toBe("denied");
  });

  /**
   * Info: (20260908 - Julian) **取不到角色時擋下，不是放行。**
   *
   * `IAccountBook.userRole` 是選填的，所以「拿到一本帳但它沒帶角色」
   * 在型別上是合法的。那種時候要嘛放行、要嘛擋下，沒有第三個選項：
   * 放行的代價是全公司薪資，擋下的代價是一句看得懂的錯誤訊息。
   */
  it("角色缺漏或不在表上，一律擋下", () => {
    expect(toSalaryAccessStatus(undefined).state).toBe("denied");
    expect(toSalaryAccessStatus(null).state).toBe("denied");
    expect(toSalaryAccessStatus("").state).toBe("denied");
    expect(toSalaryAccessStatus("ACCOUNTANT").state).toBe("denied");
  });

  /**
   * Info: (20260908 - Julian) 抓不到帳本算「錯誤」不算「無權限」。
   *
   * 兩者畫面上都是擋下來，差別只有那句話 —— 而說「您的角色無權檢視」
   * 是在斷言一件我們不知道的事：我們連他是不是這個團隊的人都沒問到。
   */
  it("抓不到帳本時走 error，不是 denied", () => {
    expect(hook).toMatch(/if \(!book\) \{[\s\S]{0,80}state: "error"/);
  });
});

describe("只有 allowed 才 render 內容", () => {
  /**
   * Info: (20260908 - Julian) 這一條是整支測試的重點。
   *
   * 缺陷的形狀是「閘寫了，但預設放行」—— 例如 loading 那一支忘了處理、
   * 或把 `children` 放在最外層再疊一個覆蓋層上去。那種寫法在 OWNER 身上
   * 完全正常，只有 `VIEWER` 會踩到，而 `VIEWER` 通常不是開發的人。
   *
   * 所以掃的是「`children` 只出現在 allowed 那一支裡」。
   */
  it("children 只出現在 state === allowed 的分支", () => {
    expect(gate).toMatch(
      /if \(status\.state === "allowed"\) \{\s*return <>\{children\}<\/>;\s*\}/,
    );
    expect(gate.match(/\{children\}/g)).toHaveLength(1);
  });

  it("loading、error、denied 三種狀態各有自己的畫面", () => {
    expect(gate).toContain("calculator.access.checking");
    expect(gate).toContain("calculator.access.check_failed");
    expect(gate).toContain("calculator.access.denied_title");
  });

  /**
   * Info: (20260908 - Julian) 被擋下來的人要有出口。
   *
   * 公開版計算機不需要任何角色、功能一樣完整，只是不碰這本帳的資料 ——
   * 被擋下來的人想做的事那裡多半做得到。死路會變成客服單。
   */
  it("無權限的畫面留一條通往公開版計算機的路", () => {
    expect(gate).toContain("ISUNFA_ROUTE.SALARY_CALCULATOR");
    expect(gate).toContain("calculator.access.denied_public_link");
  });
});

describe("掛的位置", () => {
  /**
   * Info: (20260908 - Julian) 掛在 layout，不是四個 page 各掛一次。
   *
   * layout 在同層路由之間切換時不重新掛載（這也是 `CalculatorProvider`
   * 提到那一層的理由），所以角色只問一次。掛在各頁會變成問四次，
   * 而且**漏掉其中一頁不會有任何症狀** —— 直到有人直接輸入那頁的網址。
   */
  it("角色閘在 salary_calculator/layout.tsx 上，包住 children", () => {
    expect(layout).toContain("SalaryAccessGate");
    expect(layout).toMatch(
      /<SalaryAccessGate accountBookId=\{accountBookId\}>[\s\S]*\{children\}[\s\S]*<\/SalaryAccessGate>/,
    );
  });
});
