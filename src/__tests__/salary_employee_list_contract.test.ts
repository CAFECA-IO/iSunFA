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
  /**
   * Info: (20260907 - Julian) 20260907 把整頁版拆成三個元件之後，
   * 這一組原本全部斷言在 `employee_list.tsx` 的判準跟著搬家：
   * 標示進了 `coverage_alert.tsx`、三條提示進了 `employee_list_notices.tsx`、
   * 表格進了 `employee_list_table.tsx`。
   *
   * **守的東西一條都沒有放寬** —— 只是換了指向的檔案，
   * 並補上兩條原本不存在的（提示框不得退回原生 `title`、兩種 variant 都要有標示）。
   */
  const alertComponent = stripComments(
    read("components/salary_calculator/coverage_alert.tsx"),
  );
  const issueFiltersComponent = stripComments(
    read("components/salary_calculator/employee_list_issue_filters.tsx"),
  );
  const tableComponent = stripComments(
    read("components/salary_calculator/employee_list_table.tsx"),
  );

  it("列上的標示來自共用的純函式，不是元件自己數陣列", () => {
    expect(alertComponent).toContain("hasMissingPeriods({ missingPeriods })");
    expect(alertComponent).toContain("previewMissingPeriods(missingPeriods)");
    expect(alertComponent).toContain("missing_records_badge");
    // Info: (20260907 - Julian) 自己 slice 一次的話，「另有 N 個月」與格子裡的數量會對不起來
    expect(alertComponent).not.toMatch(/missingPeriods\.slice\(/);
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
     * 守門長在左邊（`{withEmail && <CoverageAlert ...`），
     * 從標示往後切的話那個 `withEmail` 剛好被切掉 ——
     * 判準會對「加上 withEmail」這個改動完全無感。
     *
     * Info: (20260907 - Julian) 彈窗那一列現在渲染 `<CoverageAlert display="badge">`，
     * 判準改看它，語意不變。
     */
    const at = listComponent.indexOf("<CoverageAlert");
    expect(at).toBeGreaterThan(-1);
    expect(listComponent.slice(Math.max(0, at - 120), at)).not.toContain(
      "withEmail",
    );
  });

  /**
   * Info: (20260907 - Julian) **兩種 variant 都看得到標示。**
   *
   * 上一條守的是「彈窗那一列沒有被 withEmail 擋掉」；這一條守另一半 ——
   * 整頁版換成 `DataTable` 之後，標示是表格的第一欄，
   * 而那個欄位定義在另一個檔案裡。少了這一條，把 alert 欄從
   * `employee_list_table.tsx` 拿掉不會有任何測試變紅。
   */
  it("整頁版的表格也有標示，而且在第一欄", () => {
    expect(tableComponent).toContain("<CoverageAlert");
    // Info: (20260907 - Julian) 姓名是第一欄，而標示與姓名同一格
    expect(tableComponent).toMatch(/const columns:[\s\S]{0,200}?key: "name"/);
    expect(tableComponent).toMatch(
      /key: "name"[\s\S]{0,900}?<CoverageAlert[\s\S]{0,300}?employee\.name/,
    );
  });

  /**
   * Info: (20260907 - Julian) 標示**不得自成一欄**。
   *
   * 初版是獨立的第一欄，用 `className: "w-10 !px-3"` 壓窄 —— 而
   * `IDataTableColumn.className` **只套到 `<th>`**（`data_table.tsx:92`），
   * `<td>` 的 `px-6` 是寫死的（同檔 192 行）。表頭以為自己 40px 寬、
   * 內容格是 24+18+24，欄寬由內容格決定，畫面上就多出一段空白，
   * 而沒有缺漏的那幾列整格是空的。
   *
   * 這一條在有人「為了乾淨」把它拆回獨立欄位時轉紅。要拆的話，
   * 得先讓 `data_table.tsx` 的 `<td>` 也吃 `col.className`。
   */
  it("標示不是獨立欄位（DataTable 的 td 不吃 col.className）", () => {
    expect(tableComponent).not.toMatch(/key: "alert"/);
    expect(tableComponent).not.toMatch(/className: "w-10/);
  });

  /**
   * Info: (20260907 - Julian) 固定寬度的空位，讓每一列的姓名起點對齊。
   *
   * 少了它，有圖示的那幾列姓名會被推右邊 —— 一份五個人的名單裡
   * 只有一個人有警示，那一列就成了唯一沒對齊的那行。
   */
  it("沒有警示的列也佔同樣寬度，姓名才對齊", () => {
    expect(tableComponent).toMatch(/w-5 shrink-0/);
  });

  it("提示裡帶的是月份清單，不只是一個數字", () => {
    expect(alertComponent).toContain("shown.map(");
    expect(alertComponent).toContain("calculator.records.pay_period_value");
    expect(alertComponent).toContain("missing_records_rest");
  });

  /**
   * Info: (20260907 - Julian) **提示框不可以退回原生 `title`。**
   *
   * 初版把月份塞進 `title="2026/07、2026/06、…"`，實測回報兩件事：
   * 常常整段跳過不顯示（瀏覽器自己的延遲與「同一次 hover 只顯示一次」規則），
   * 以及讀不動 —— `title` 只能是純文字，折行由瀏覽器決定，斷在頓號後面，
   * 看起來像一句被切斷的話而不是一份清單。
   *
   * 這一條在有人「順手簡化成 title」的時候轉紅。
   */
  it("提示框是自己畫的 div，不是原生 title", () => {
    expect(alertComponent).toContain('role="tooltip"');
    expect(alertComponent).not.toMatch(/title=\{/);
  });

  /**
   * Info: (20260907 - Julian) 用 portal 掛到 body。
   *
   * 整頁版的列表是 `DataTable`：外層 `overflow-hidden` 的卡片、
   * 內層 `overflow-x-auto` 的捲動容器，兩者都會裁切絕對定位的子元素，
   * 而最後一列的提示框正好被裁掉 —— 那就是回報中的「卡住顯示不出來」。
   */
  it("提示框以 portal 掛在 body 上，不受表格裁切", () => {
    expect(alertComponent).toContain("createPortal(tooltip, document.body)");
    expect(alertComponent).toContain('typeof document !== "undefined"');
    expect(alertComponent).toMatch(/className="[^"]*\bfixed\b/);
  });

  /**
   * Info: (20260907 - Julian) 捲動時要收起來 —— 提示框是 `fixed`，
   * 觸發器會跟著列表捲走，不收的話它會留在原地指著另一個人那一列。
   * `capture` 是因為捲的是表格自己的容器，而 scroll 事件不冒泡。
   */
  it("捲動與改變視窗大小時收起提示框", () => {
    expect(alertComponent).toMatch(/addEventListener\("scroll", close, true\)/);
    expect(alertComponent).toMatch(/addEventListener\("resize", close\)/);
    expect(alertComponent).toMatch(
      /removeEventListener\("scroll", close, true\)/,
    );
  });

  /**
   * Info: (20260907 - Julian) 觸發器是 `<button>`：提示框是這份資訊唯一的入口，
   * 而鍵盤使用者到不了一個 span。`onFocus` 要與 `onMouseEnter` 成對出現。
   */
  it("鍵盤也叫得出提示框", () => {
    expect(alertComponent).toContain("onFocus={open}");
    expect(alertComponent).toContain("onBlur={close}");
    expect(alertComponent).toMatch(/<button\s+type="button"/);
  });

  /**
   * Info: (20260905 - Luphia) 橫幅與「只看這幾位」是一組：有數字就給得起
   * 篩選，因為使用者接下來要做的正是逐一補完。
   */
  it("整頁版有勾選 filter 與人數", () => {
    expect(listComponent).toContain("countMissingRecords(employees)");
    expect(listComponent).toContain("setOnlyMissingRecords");
    expect(issueFiltersComponent).toContain("filter_missing_records");
    /**
     * Info: (20260907 - Julian) **人數一定要留著。**
     *
     * 20260907 從橫幅改成勾選時，人數是唯一不能丟的東西 ——
     * 特別是「沒有到職日」：完整度算不出來時畫面什麼都不顯示，
     * 與「大家都很完整」長得一模一樣，人數是那半句「說出為什麼不知道」。
     */
    expect(issueFiltersComponent).toContain("count={missingRecordsCount}");
    expect(issueFiltersComponent).toContain("count={missingEmailCount}");
    expect(issueFiltersComponent).toContain("count={missingHireDateCount}");
    /**
     * Info: (20260907 - Julian) 勾選 filter 只在整頁版渲染 —— 彈窗的任務是
     * 挑一個人出來算薪水，整份名單有哪些問題在那個當下不是他要處理的事。
     *
     * 判準是「只出現一次，而且在 `if (withEmail)` 之後」而不是字元距離：
     * 距離會隨著 props 增減而變，寫死一個窗口的話這條測試遲早在一次
     * 無關的改動後紅掉，然後被人放寬。
     */
    const guardAt = listComponent.indexOf("if (withEmail) {");
    const filtersAt = listComponent.indexOf("<EmployeeListIssueFilters");
    expect(guardAt).toBeGreaterThan(-1);
    expect(filtersAt).toBeGreaterThan(guardAt);
    expect(listComponent.split("<EmployeeListIssueFilters").length - 1).toBe(1);
  });

  /**
   * Info: (20260905 - Luphia) 「清除搜尋」要把**兩個**篩選都關掉。
   *
   * 只關掉其中一個的話，使用者按了「清除」卻還是篩不到人 ——
   * 而畫面上已經沒有任何東西指出還有一個條件開著。
   */
  it("清除搜尋把每一個篩選都關掉", () => {
    const clear = listComponent.slice(listComponent.indexOf("clearKeyword();"));
    expect(clear.slice(0, 260)).toContain("setOnlyMissingEmail(false)");
    expect(clear.slice(0, 260)).toContain("setOnlyMissingRecords(false)");
    expect(clear.slice(0, 260)).toContain("setOnlyMissingHireDate(false)");
  });

  /**
   * Info: (20260906 - Luphia) 「沒有到職日」的提示（review #6777 應修-1）。
   *
   * 這一條守的是一個**以空白呈現**的失效：既有帳本的員工全部沒有到職日
   *（那一欄 20260902 才加、沒有回填），於是完整度算不出來、畫面什麼都不顯示，
   * 而那與「大家都很完整」長得一模一樣。把這段刪掉不會有任何測試變紅 ——
   * 除了這一條。
   */
  it("沒有到職日的人數有講出來，而且給得起篩選", () => {
    expect(listComponent).toContain("countMissingHireDate(employees)");
    expect(listComponent).toContain("setOnlyMissingHireDate");
    expect(issueFiltersComponent).toContain("filter_missing_hire_date");
    /**
     * Info: (20260907 - Julian) 「沒有到職日」的那句說明改掛在 `title` 上，
     * 但**不能消失**：另外兩個勾選的後果從標籤就看得出來
     * （沒信箱＝寄不出、缺薪資單＝要補算），而這一個的後果是看不見的。
     */
    expect(issueFiltersComponent).toContain("missing_hire_date_banner");
  });

  /**
   * Info: (20260906 - Luphia) 兩條橫幅的**順序**：到職日在前、缺薪資單在後。
   *
   * 兩者是一前一後不是兩種看法 —— 沒有到職日的人補完之後，才可能出現在
   * 缺薪資單那一條裡。顛倒的話，使用者會先去處理一份還不完整的名單。
   */
  it("到職日的勾選排在缺薪資單之前", () => {
    const hireAt = issueFiltersComponent.indexOf("filter_missing_hire_date");
    const recordsAt = issueFiltersComponent.indexOf("filter_missing_records");

    expect(hireAt).toBeGreaterThan(-1);
    expect(recordsAt).toBeGreaterThan(-1);
    expect(hireAt).toBeLessThan(recordsAt);
  });

  /**
   * Info: (20260907 - Julian) 人數為 0 時勾選框**停用而不是消失**。
   *
   * 消失的話這一列會隨資料跳動；而「0」本身是有意義的答案
   * （這個面向沒問題），不是沒有答案。停用則讓使用者不會按出一份空名單。
   */
  it("人數為 0 時勾選框停用，不是整條消失", () => {
    expect(issueFiltersComponent).toMatch(/const isEmpty = count === 0;/);
    expect(issueFiltersComponent).toContain("disabled={isEmpty}");
  });

  /**
   * Info: (20260907 - Julian) 三個勾選，不是一個「只看有問題的」。
   *
   * 三者要做的事完全不同：回頭編輯員工、補一個欄位、回計算機補算。
   * 併成一個的話，使用者勾了才發現名單裡混著三種毫不相干的待辦。
   */
  it("三種問題是三個獨立的勾選", () => {
    [
      "filter_missing_email",
      "filter_missing_hire_date",
      "filter_missing_records",
    ].map((key) => expect(issueFiltersComponent).toContain(key));
    expect(issueFiltersComponent.split("<IssueToggle").length - 1).toBe(3);
  });
});

/**
 * Info: (20260905 - Luphia) 留職停薪有編輯入口（#6774）。
 *
 * 沒有入口的話那兩欄永遠是 null，扣除留停的分支等於不存在 ——
 * 而純函式那一側會一直是綠的。
 */
describe("整頁版的版面：條件與結果兩塊", () => {
  const listComponent = stripComments(
    read("components/salary_calculator/employee_list.tsx"),
  );
  const filters = stripComments(
    read("components/salary_calculator/employee_list_filters.tsx"),
  );
  const tableComponent = stripComments(
    read("components/salary_calculator/employee_list_table.tsx"),
  );
  const pageBody = stripComments(
    read("components/salary_calculator/employee_list_page_body.tsx"),
  );

  /**
   * Info: (20260907 - Julian) 勾選 filter **在篩選卡片裡**。
   *
   * 這條判準當天改過方向，理由記在這裡免得看起來像反覆：
   * 早一版它們是三條橫幅，刻意拉出去當獨立的一塊 —— 橫幅是通知，
   * 不是條件，混進篩選卡片會讓那張卡片變成什麼都放的抽屜。
   * 改成勾選之後它們**就是**條件，收進來才對；一個「只看缺信箱」的勾選
   * 放在篩選卡片外面，會讓它看起來與搜尋是兩種不同的東西。
   *
   * 所以整頁版是兩塊（條件、結果），而勾選是條件那一塊的一部分。
   */
  it("勾選 filter 在篩選卡片裡，整頁版是兩塊", () => {
    expect(filters).toContain("issueFilters");
    expect(listComponent).toMatch(
      /<EmployeeListFilters[\s\S]{0,1200}?issueFilters=\{/,
    );
  });

  /**
   * Info: (20260907 - Julian) 兩塊各自渲染一次，順序是條件 → 結果。
   */
  it("篩選與表格依序各出現一次", () => {
    ["<EmployeeListFilters", "<EmployeeListTable"].map((tag) =>
      expect(listComponent.split(tag).length - 1).toBe(1),
    );

    expect(listComponent.indexOf("<EmployeeListFilters")).toBeLessThan(
      listComponent.indexOf("<EmployeeListTable"),
    );
  });

  /**
   * Info: (20260907 - Julian) 列表走全庫共用的 `DataTable`。
   *
   * 表頭、hover、空狀態、載入中、橫向捲動都在那裡（16 個列表頁在用）。
   * 手刻一份的話，這一頁會慢慢與其他列表長得不一樣，而每次只差一點點。
   * 原本的整頁版沒有表頭 —— 使用者看不出中間那一格是信箱還是別的什麼。
   */
  it("列表用共用的 DataTable，而且每一欄都有標題", () => {
    expect(tableComponent).toContain('from "@/components/common/data_table"');
    ["name", "number", "email", "hireDate", "baseSalary", "actions"].map(
      (key) => expect(tableComponent).toContain(`key: "${key}"`),
    );
    expect(tableComponent).toContain("calculator.employee_list.name");
    expect(tableComponent).toContain("calculator.employee_list.number");
    expect(tableComponent).toContain("calculator.employee_list.email");
    expect(tableComponent).toContain("calculator.employee_list.hire_date");
    expect(tableComponent).toContain("calculator.employee_list.base_salary");
    expect(tableComponent).toContain("common.actions");
  });

  /**
   * Info: (20260907 - Julian) 到職日走 `toDateInputValue`，不是 `timestampToString`。
   *
   * 到職日在這個模組一律 UTC 錨定（寫入是 `T00:00:00.000Z`），
   * 用本地時區格式化會讓負偏移時區的使用者看到**前一天** ——
   * 而那個錯誤在 UTC 與 UTC+08:00 的開發機上看不出來。
   */
  it("到職日以 UTC 格式化，沒填則給補上的入口", () => {
    expect(tableComponent).toContain("toDateInputValue(employee.hireDate)");
    expect(tableComponent).not.toContain("timestampToString");
    expect(tableComponent).toContain("hasNoHireDate(employee)");
    expect(tableComponent).toContain("calculator.employee_list.no_hire_date");
  });

  /**
   * Info: (20260907 - Julian) `DataTable` 自帶卡片外框，外面不能再包一層 ——
   * 那會變成卡片裡的卡片：邊框疊兩道、內距加倍。
   */
  it("頁面外框不再包一層卡片", () => {
    expect(pageBody).not.toContain("rounded-xl border border-gray-200");
  });

  /**
   * Info: (20260907 - Julian) 空狀態分兩種：一位員工都沒有（給一條建立第一位
   * 的路），與有員工但篩不到（給一條清除條件的路）。共用一句的話，
   * 正在搜尋的人會以為資料掉了。
   */
  it("空狀態分成「還沒有員工」與「篩不到」", () => {
    expect(listComponent).toMatch(
      /emptyState=\{employees\.length === 0 \? emptyState : noResultState\}/,
    );
    expect(listComponent).toContain("empty_title");
    expect(listComponent).toContain("no_filter_result");
  });
});

describe("留職停薪的編輯入口", () => {
  const actionModal = stripComments(
    read("components/salary_calculator/employee_action_modal.tsx"),
  );

  it("表單有留停起訖兩格，而且送得出去", () => {
    expect(actionModal).toContain("leave_start_date");
    expect(actionModal).toContain("leave_end_date");
    expect(actionModal).toContain("patchLeave({");
    /**
     * Info: (20260907 - Julian) 少了這個，畫面填得進去但送出的 body 沒有它們。
     *
     * 原本釘的是 `/\.\.\.leave,/`（就地展開）。組裝搬到
     * `buildEmployeeWriteInput` 之後改釘「leave 有被交給它」——
     * 守的是同一件事，而「交出去之後會發生什麼」由
     * `salary_employee_profile.test.ts` 逐條驗（§1.11 的分工）。
     */
    expect(actionModal).toContain("buildEmployeeWriteInput({");
    expect(actionModal).toMatch(
      /buildEmployeeWriteInput\(\{[\s\S]{0,120}?leave,/,
    );
  });

  /**
   * Info: (20260907 - Julian) 留停的 state **只能收窄後放進來**（review #6777 阻擋）。
   *
   * `data ?? DEFAULT_EMPLOYEE_LEAVE` 在型別上合法（`ISalaryCalculatorEmployee`
   * 繼承 `ISalaryEmployeeLeave`），而 runtime 它握著整個員工物件 ——
   * 送出時會把使用者剛改好的到職日、扶養人數、投保狀態全部還原。
   *
   * 這是一條反面斷言：退回去之後，上面每一條與純函式那一整組都照樣綠，
   * 只有這一條會紅。
   */
  it("留停的 state 只放那兩欄，不是整個員工物件", () => {
    expect(actionModal).toContain("pickEmployeeLeave(data)");
    expect(actionModal).not.toMatch(
      /useState<ISalaryEmployeeLeave>\(\s*data \?\?/,
    );
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
    /**
     * Info: (20260905 - Luphia) 判斷搬到 `resolveSendTarget` 了（#6775），
     * 而它是**兩頁共用**的 —— 所以「一致」現在比原本更強：
     * 不再是「兩頁各自都記得用 hasNoEmail」，而是「只有一個地方在判斷」。
     */
    const sendTarget = stripComments(read("lib/utils/salary_send_target.ts"));

    expect(sendTarget).toContain("hasNoEmail(");
    expect(sendTarget).not.toContain('email.trim() === ""');
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
