import { describe, it, expect } from "@jest/globals";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { salaryCalculatorUrlOf } from "@/constants/url";

/**
 * Info: (20260904 - Julian) 員工列表頁（20260904 補回）的結構契約。
 *
 * 這一頁在 20260901 被移除過一次（03fd6075e），理由是「與挑人彈窗看的是
 * 同一份名單」—— 而當時那一頁與彈窗是**兩份各自演化的實作**。
 * 補回來的前提就是那件事不能重演，所以這裡守的第一件事是
 * 「頁面與彈窗渲染的是同一個元件」。
 *
 * 本專案的測試不 render React，所以這些是原始碼掃描。掃描的弱點是
 * 「換個寫法就掃不到」，因此每一條都綁在**具名的東西**（元件名、prop 名、
 * 路徑常數）上，而不是綁在版面字串上。
 */

const read = (relativePath: string): string =>
  readFileSync(path.join(process.cwd(), "src", relativePath), "utf-8");

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const PAGE_ROUTE =
  "app/user/account_book/[account_book_id]/salary_calculator/employee_list/page.tsx";

describe("員工列表頁存在且掛在帳本底下", () => {
  it("路由檔在帳本路徑之下", () => {
    expect(existsSync(path.join(process.cwd(), "src", PAGE_ROUTE))).toBe(true);
  });

  /**
   * Info: (20260904 - Julian) 名單屬於帳本，沒有公開版對應路由。
   * 放在 `/salary_calculator/**` 的話，匿名訪客會打到一支需要帳本 id 的端點。
   */
  it("沒有公開版的員工列表路由", () => {
    expect(
      existsSync(
        path.join(process.cwd(), "src", "app/salary_calculator/employee_list"),
      ),
    ).toBe(false);
  });

  it("路徑常數有 EMPLOYEE_LIST，而且就是這支路由", () => {
    expect(salaryCalculatorUrlOf("book-1").EMPLOYEE_LIST).toBe(
      "/user/account_book/book-1/salary_calculator/employee_list",
    );
  });

  /**
   * Info: (20260904 - Julian) `/user/**` 要登入才進得去，列進 sitemap
   * 只會讓爬蟲拿到一串 401。
   */
  it("不進 sitemap", () => {
    expect(read("app/sitemap.ts")).not.toContain("employee_list");
  });
});

describe("名單只有一份實作", () => {
  const listComponent = stripComments(
    read("components/salary_calculator/employee_list.tsx"),
  );
  const modal = stripComments(
    read("components/salary_calculator/employee_list_modal.tsx"),
  );
  const pageBody = stripComments(
    read("components/salary_calculator/employee_list_page_body.tsx"),
  );

  /**
   * Info: (20260904 - Julian) **這是這個檔案存在的主要理由。**
   *
   * 上一輪的失敗形態是：頁面有新增鈕、彈窗沒有；彈窗有搜尋、頁面沒有。
   * 兩邊都「能用」，所以沒有人發現它們早就不是同一份東西了。
   * 這一條在有人為了頁面的版面而複製一份列表出來的那一刻轉紅。
   */
  it("彈窗與頁面都渲染 EmployeeList", () => {
    expect(modal).toContain(
      'from "@/components/salary_calculator/employee_list"',
    );
    expect(modal).toContain("<EmployeeList");
    expect(pageBody).toContain(
      'from "@/components/salary_calculator/employee_list"',
    );
    expect(pageBody).toContain("<EmployeeList");
  });

  it("彈窗自己不再持有名單狀態", () => {
    expect(modal).not.toContain("useSalaryEmployees");
    expect(modal).not.toContain("EmployeeActionModal");
    expect(modal).not.toContain("RemoveEmployeeModal");
  });

  /**
   * Info: (20260904 - Julian) 新增／編輯／移除三件事都在共用元件裡，
   * 也就是兩個入口都有。缺任何一個，另一邊的使用者就得換頁才做得到。
   */
  it("共用元件同時具備新增、編輯與移除", () => {
    expect(listComponent).toContain("EmployeeActionModal");
    expect(listComponent).toContain("RemoveEmployeeModal");
    expect(listComponent).toContain("createEmployee");
    expect(listComponent).toContain("updateEmployee");
    expect(listComponent).toContain("removeEmployee");
  });

  /**
   * Info: (20260904 - Julian) 挑人是彈窗才有的能力，用 `onPick` 表達。
   * 頁面不傳它，於是列不是按鈕 —— 一顆按下去什麼都不會發生的按鈕，
   * 對鍵盤與螢幕閱讀器來說是雜訊。
   */
  it("只有彈窗傳 onPick", () => {
    expect(modal).toContain("onPick=");
    expect(pageBody).not.toContain("onPick");
    expect(listComponent).toMatch(/pickHandler \? \(/);
  });
});

describe("信箱欄與缺信箱提示", () => {
  const listComponent = stripComments(
    read("components/salary_calculator/employee_list.tsx"),
  );

  /**
   * Info: (20260904 - Julian) 信箱欄與缺信箱提示綁在 `variant === "page"`。
   *
   * 彈窗只有 560px，硬塞會把姓名擠成兩行；而且在「挑一個人出來算薪水」
   * 的當下，整份名單的信箱完整度不是使用者要處理的事。
   */
  it("信箱欄只在整頁版出現", () => {
    expect(listComponent).toContain('const withEmail = variant === "page"');
    expect(listComponent).toMatch(/withEmail && \(/);
  });

  it("缺信箱的人數與「只看缺信箱」都來自共用的純函式", () => {
    expect(listComponent).toContain("countMissingEmail(employees)");
    expect(listComponent).toContain("onlyMissingEmail");
    expect(listComponent).toContain(
      'from "@/lib/utils/salary_employee_filter"',
    );
  });

  /**
   * Info: (20260904 - Julian) 「未填寫」那一格本身要能點開編輯 ——
   * 只標示不給路的話，使用者的下一個動作是回頭找同一列的鉛筆，
   * 而他的游標已經在問題上了。
   */
  it("缺信箱的標示是補上的入口，不只是一個字", () => {
    expect(listComponent).toMatch(
      /no_email[\s\S]{0,400}?onClick=\{editHandler\}|onClick=\{editHandler\}[\s\S]{0,400}?no_email/,
    );
  });
});

/**
 * Info: (20260905 - Luphia) 薪資紀錄缺漏的標示接上去了（#6774）。
 *
 * 判斷本身由純函式守（`salary_employee_filter.test.ts` 與
 * `salary_coverage.tz.test.ts`）—— 這一組只回答「元件真的有呼叫它們」，
 * 也就是 §1.11 明文的降級用法。
 *
 * 為什麼非有不可：把標示與橫幅整段刪掉之後，全套 5,983 條測試**全綠**。
 * 純函式測得再細，沒有人接上去的話畫面上什麼都不會出現 ——
 * 這正是 #6742 踩過的那個洞。
 */
describe("薪資紀錄缺漏的標示", () => {
  const listComponent = stripComments(
    read("components/salary_calculator/employee_list.tsx"),
  );

  it("列上的標示來自共用的純函式，不是元件自己數陣列", () => {
    expect(listComponent).toContain("hasMissingPeriods(employee)");
    expect(listComponent).toContain("formatMissingPeriods(");
    expect(listComponent).toContain("missing_records_badge");
  });

  /**
   * Info: (20260905 - Luphia) 標示**兩種 variant 都有**（與信箱欄相反）。
   *
   * 綁上 `withEmail` 的話，計算機 Step 1 挑人時看不到「這個人缺六月」——
   * 而那正是最有用的時機：使用者當下就在挑人算薪水，補的路就在他手上。
   */
  it("標示沒有被綁在整頁版上", () => {
    /**
     * Info: (20260905 - Luphia) 看的是那一行**之前**的字，不是之後。
     *
     * 守門長在左邊（`{withEmail && hasMissingPeriods(...)`），
     * 從 `hasMissingPeriods` 往後切的話那個 `withEmail` 剛好被切掉 ——
     * 判準會對「加上 withEmail」這個改動完全無感。
     */
    const at = listComponent.indexOf("hasMissingPeriods(employee)");
    expect(at).toBeGreaterThan(-1);
    expect(listComponent.slice(Math.max(0, at - 120), at)).not.toContain(
      "withEmail",
    );
  });

  it("提示裡帶的是月份清單，不只是一個數字", () => {
    expect(listComponent).toContain("missing_records_more");
    expect(listComponent).toMatch(/title=\{missingTitle\}/);
  });

  /**
   * Info: (20260905 - Luphia) 橫幅與「只看這幾位」是一組：有數字就給得起
   * 篩選，因為使用者接下來要做的正是逐一補完。
   */
  it("整頁版有橫幅與只看這幾位", () => {
    expect(listComponent).toContain("countMissingRecords(employees)");
    expect(listComponent).toContain("missing_records_banner");
    expect(listComponent).toContain("only_missing_records");
    expect(listComponent).toContain("setOnlyMissingRecords");
  });

  /**
   * Info: (20260905 - Luphia) 「清除搜尋」要把**兩個**篩選都關掉。
   *
   * 只關掉其中一個的話，使用者按了「清除」卻還是篩不到人 ——
   * 而畫面上已經沒有任何東西指出還有一個條件開著。
   */
  it("清除搜尋把兩個篩選都關掉", () => {
    const clear = listComponent.slice(listComponent.indexOf("clearKeyword();"));
    expect(clear.slice(0, 200)).toContain("setOnlyMissingEmail(false)");
    expect(clear.slice(0, 200)).toContain("setOnlyMissingRecords(false)");
  });
});

/**
 * Info: (20260905 - Luphia) 留職停薪有編輯入口（#6774）。
 *
 * 沒有入口的話那兩欄永遠是 null，扣除留停的分支等於不存在 ——
 * 而純函式那一側會一直是綠的。
 */
describe("留職停薪的編輯入口", () => {
  const actionModal = stripComments(
    read("components/salary_calculator/employee_action_modal.tsx"),
  );

  it("表單有留停起訖兩格，而且送得出去", () => {
    expect(actionModal).toContain("leave_start_date");
    expect(actionModal).toContain("leave_end_date");
    expect(actionModal).toContain("patchLeave({");
    // Info: (20260905 - Luphia) 少了這一行，畫面填得進去但送出的 body 沒有它們
    expect(actionModal).toMatch(/\.\.\.leave,/);
  });

  /**
   * Info: (20260905 - Luphia) 計算機回寫員工檔時要**原樣帶回**留停兩欄。
   *
   * 帶預設值的話，使用者按「更新員工檔並儲存」就會把已登記的留停清成 null
   * —— 而畫面上什麼都不會說。
   */
  it("計算機回寫時把留停原樣帶回，新建才用預設", () => {
    const resultSection = stripComments(
      read("components/salary_calculator/salary_result_section.tsx"),
    );

    expect(resultSection).toContain("leaveStartDate: employee.leaveStartDate");
    expect(resultSection).toContain("leaveEndDate: employee.leaveEndDate");
    expect(resultSection).toContain("...DEFAULT_EMPLOYEE_LEAVE");
  });
});

describe("寄送與名單對「沒有信箱」的定義一致", () => {
  /**
   * Info: (20260904 - Julian) 薪資紀錄的寄出鈕與員工列表的缺信箱標示問的是
   * 同一個問題。各寫一次 `email.trim() === ""` 的話，改了其中一邊
   * （例如日後加上格式檢查）另一邊不會跟著動，於是同一位員工在一頁上
   * 顯示「可以寄」、在另一頁顯示「未填寫」。
   */
  it("薪資紀錄頁用的是 hasNoEmail，不是自己寫一次 trim", () => {
    const recordsPage = stripComments(
      read("components/salary_calculator/salary_records_page_body.tsx"),
    );

    expect(recordsPage).toContain("hasNoEmail(");
    expect(recordsPage).not.toContain('email.trim() === ""');
  });
});

describe("導覽列", () => {
  const nav = stripComments(
    read("components/salary_calculator/account_book_calculator_nav.tsx"),
  );

  it("三個分頁：計算機、薪資紀錄、員工列表", () => {
    expect(nav).toContain("urls.CALCULATOR");
    expect(nav).toContain("urls.RECORDS");
    expect(nav).toContain("urls.EMPLOYEE_LIST");
  });

  /**
   * Info: (20260904 - Julian) 「計算說明」原本靠 `ml-auto` 推到最右邊。
   * 多一個分頁之後如果它跟著擠在左邊，使用者會以為那也是一個頁面。
   */
  it("計算說明仍然被推到最右", () => {
    expect(nav).toMatch(/how_it_works|ml-auto/);
    expect(nav).toContain("ml-auto");
  });
});
