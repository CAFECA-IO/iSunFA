/**
 * Info: (20260914 - Julian) 未儲存就離開的提示：三件會靜靜地壞掉的事。
 *
 * 這個功能失效的兩種方向都沒有錯誤訊息：
 *
 * - **該問而沒問** —— 使用者改了公司抬頭、點了導覽列，那幾個字就沒了。
 *   他大概會以為自己忘了按儲存。
 * - **不該問而問了** —— ⌘ 點開新分頁、按下載、點到同一頁的錨點都跳一個
 *   「確定要離開嗎」。這種提示很快就會被無視，等於把保護自己弄壞
 *   （`use_carbon_chat.ts` 與 `team/allocation_modal.tsx` 都踩過）。
 *
 * 所以判準與正規化都抽成純函式，而 `beforeunload` 的生命週期用掃原始碼守
 * —— 本專案的測試不 render React（做法同 `carbon_import_checkpoint.test.ts`）。
 */

import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { LeaveYearScheme } from "@/generated";
import { interceptableHrefOf } from "@/lib/utils/unsaved_navigation";
import {
  companyProfileFormToPayload,
  isCompanyProfileDirty,
  type ICompanyProfileForm,
} from "@/lib/utils/company_profile_form";
import { IAccountBookCompanyProfile } from "@/interfaces/salary_company_profile";

const HERE =
  "https://isunfa.test/user/account_book/b1/salary_calculator/company_setting";

// Info: (20260914 - Julian) 一次普通的左鍵點擊，點在一個站內連結上
const clickOn = (href: string | null, override = {}) => ({
  href,
  target: null,
  hasDownload: false,
  isModifiedClick: false,
  isDefaultPrevented: false,
  currentUrl: HERE,
  ...override,
});

describe("哪些點擊該被攔下來", () => {
  it("站內的另一頁：攔，並交出要去的路徑", () => {
    expect(
      interceptableHrefOf(
        clickOn("/user/account_book/b1/salary_calculator/records"),
      ),
    ).toBe("/user/account_book/b1/salary_calculator/records");
  });

  /**
   * Info: (20260914 - Julian) 相對路徑要解析成絕對路徑。
   *
   * 呼叫端拿回傳值去 `router.push`，而它吃的是絕對路徑 ——
   * 原樣交出去的話，`records` 會被當成根目錄底下的 `/records`。
   *
   * 解析基準是 `currentUrl` 的**目錄**（最後一段當檔名），
   * 這是 `URL` 的既有語意，不是這一支自己定的。
   */
  it("相對路徑會被解析成絕對路徑（呼叫端要拿它去 router.push）", () => {
    expect(interceptableHrefOf(clickOn("records"))).toBe(
      "/user/account_book/b1/salary_calculator/records",
    );
  });

  it("帶 query 的站內連結：query 要留著", () => {
    expect(interceptableHrefOf(clickOn("/a/b?page=2"))).toBe("/a/b?page=2");
  });

  /**
   * Info: (20260914 - Julian) 以下每一種都**不會離開現在這一頁**。
   *
   * 攔下來的代價不是「多問一次」而已 —— `preventDefault()` 會讓
   * 那個連結**完全沒有反應**（開新分頁、下載、寄信都不會發生），
   * 而使用者只會覺得按鈕壞了。
   */
  it.each([
    ["沒有 href（純粹當按鈕用的 a）", clickOn(null)],
    ["空的 href", clickOn("   ")],
    ["已經被別人擋掉的點擊", clickOn("/a", { isDefaultPrevented: true })],
    [
      "⌘／Ctrl／Shift 點或中鍵（開新分頁）",
      clickOn("/a", { isModifiedClick: true }),
    ],
    ["target=_blank（開新分頁）", clickOn("/a", { target: "_blank" })],
    ["download（存檔，不是導航）", clickOn("/a.csv", { hasDownload: true })],
    ["mailto:", clickOn("mailto:someone@example.com")],
    ["tel:", clickOn("tel:0212345678")],
    ["javascript:", clickOn("javascript:void(0)")],
    ["外站（交給 beforeunload）", clickOn("https://example.com/x")],
  ])("%s —— 不攔", (_label, click) => {
    expect(interceptableHrefOf(click)).toBeNull();
  });

  /**
   * Info: (20260914 - Julian) 同一頁不算離開，純錨點也是同一條規則涵蓋的。
   *
   * 跳到頁內某一段不會讓表單裡的東西消失。這裡各驗一種寫法：
   * 少了這一條，一個 `#top` 的回到頂端連結會變成「確定要離開嗎」。
   */
  it.each([
    ["純錨點", "#section"],
    [
      "同一個路徑再寫一次",
      "/user/account_book/b1/salary_calculator/company_setting",
    ],
    [
      "同一頁帶錨點",
      "/user/account_book/b1/salary_calculator/company_setting#top",
    ],
  ])("%s —— 不攔", (_label, href) => {
    expect(interceptableHrefOf(clickOn(href))).toBeNull();
  });

  /**
   * Info: (20260914 - Julian) 但**同路徑不同 query** 是真的換頁。
   *
   * 把「同頁」判成 pathname 相同就好的話，薪資紀錄頁的分頁連結
   * 全部會被放過去 —— 而那確實會換掉畫面上的內容。
   */
  it("同路徑但 query 不同 —— 攔", () => {
    expect(
      interceptableHrefOf(
        clickOn(
          "/user/account_book/b1/salary_calculator/company_setting?tab=2",
        ),
      ),
    ).toBe("/user/account_book/b1/salary_calculator/company_setting?tab=2");
  });
});

const SAVED: IAccountBookCompanyProfile = {
  entityName: "測試股份有限公司",
  taxId: "12345678",
  responsiblePerson: null,
  address: null,
  leaveYearScheme: LeaveYearScheme.CALENDAR,
  leaveYearStartMonth: null,
  leaveYearStartDay: null,
};

// Info: (20260914 - Julian) 表單剛載回 SAVED 的樣子：`null` 一律顯示為空字串
const FORM: ICompanyProfileForm = {
  entityName: "測試股份有限公司",
  taxId: "12345678",
  responsiblePerson: "",
  address: "",
  scheme: LeaveYearScheme.CALENDAR,
  startMonth: "",
  startDay: "",
};

describe("有沒有未儲存的變更", () => {
  /**
   * Info: (20260914 - Julian) **這一條是整組裡最重要的。**
   *
   * 表單裡是字串、存下來的是 `null`。兩邊沒有走同一套正規化的話，
   * 一頁剛載完就會被判成「改過了」—— 於是每一次離開都跳對話框，
   * 而使用者會學會無視它。
   */
  it("剛載回來、什麼都沒動 —— 不算改過", () => {
    expect(isCompanyProfileDirty(FORM, SAVED)).toBe(false);
  });

  it.each([
    ["改了公司名稱", { entityName: "另一家公司" }],
    ["清空了統一編號", { taxId: "" }],
    ["補了負責人", { responsiblePerson: "王大明" }],
    ["換了特休年度制度", { scheme: LeaveYearScheme.ANNIVERSARY }],
  ])("%s —— 算改過", (_label, override) => {
    expect(isCompanyProfileDirty({ ...FORM, ...override }, SAVED)).toBe(true);
  });

  /**
   * Info: (20260914 - Julian) 只多打了空白不算改過。
   *
   * 送出時會 `trim()`，所以存下去的值一模一樣 —— 這時候攔住使用者，
   * 他會看著一份「沒有任何差別」的表單被告知有未儲存的變更。
   */
  it("只多了前後空白 —— 不算改過（送出時會被 trim 掉）", () => {
    expect(
      isCompanyProfileDirty(
        { ...FORM, entityName: "  測試股份有限公司  " },
        SAVED,
      ),
    ).toBe(false);
  });

  /**
   * Info: (20260914 - Julian) 從約定年度改回曆年制時，月／日會被清成 `null`。
   *
   * 那兩格留著的話會存進一份自相矛盾的設定。這一條同時證明
   * 「比較」與「送出」走的是同一支正規化 —— 各寫一份的話，
   * 比較那一份很可能忘了清。
   */
  it("非約定年度時月／日一律清成 null，比較與送出同一套", () => {
    const form = {
      ...FORM,
      scheme: LeaveYearScheme.CALENDAR,
      startMonth: "3",
      startDay: "1",
    };

    expect(companyProfileFormToPayload(form).leaveYearStartMonth).toBeNull();
    expect(isCompanyProfileDirty(form, SAVED)).toBe(false);
  });

  it("選了約定年度並填了月日 —— 算改過", () => {
    expect(
      isCompanyProfileDirty(
        {
          ...FORM,
          scheme: LeaveYearScheme.CUSTOM,
          startMonth: "3",
          startDay: "1",
        },
        SAVED,
      ),
    ).toBe(true);
  });
});

/**
 * Info: (20260914 - Julian) `beforeunload` 的生命週期只能掃原始碼守。
 *
 * 做法與理由同 `carbon_import_checkpoint.test.ts`：本專案的測試不 render
 * React，而這一段的兩種壞法（沒掛／常駐）都沒有任何錯誤訊息。
 */
describe("beforeunload 的掛與卸", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_unsaved_changes_guard.ts"),
    "utf8",
  );

  it("掛上 beforeunload，且兩種瀏覽器慣例都設", () => {
    expect(hook).toMatch(/addEventListener\("beforeunload"/);
    expect(hook).toMatch(/event\.preventDefault\(\)/);
    expect(hook).toMatch(/event\.returnValue/);
  });

  /**
   * Info: (20260914 - Julian) 乾淨之後要卸下，不常駐。
   *
   * 常駐的話，這一頁的任何離開都會被瀏覽器問一次 —— 包含什麼都沒改的時候。
   */
  it("沒有未儲存的變更時不掛，且會卸下", () => {
    expect(hook).toMatch(/removeEventListener\("beforeunload"/);
    expect(hook).toContain("if (!isDirty) return undefined;");
  });

  /**
   * Info: (20260914 - Julian) 點擊攔截必須是**捕獲階段**。
   *
   * `next/link` 的處理掛在 `<a>` 上、跑在冒泡階段，而它進入導航前會先看
   * `e.defaultPrevented`。改成冒泡的話 Link 已經先跑完了 ——
   * 而症狀是「對話框跳出來了，但頁面同時也換掉了」。
   */
  it("點擊攔截掛在捕獲階段，而且會卸下", () => {
    expect(hook).toMatch(/addEventListener\("click", intercept, true\)/);
    expect(hook).toMatch(/removeEventListener\("click", intercept, true\)/);
  });
});

/**
 * Info: (20260915 - Julian) 上一層的接線：設定頁有沒有真的用上這道防線（review B3）。
 *
 * 上面那組掃的是 `use_unsaved_changes_guard.ts` —— **hook 本身**。
 * hook 寫得再對，設定頁沒有接上去的話這個功能整個不存在，
 * 而症狀正是這個檔案檔頭列的第一種失效方向：
 * 改了公司抬頭、點導覽列，那幾個字直接消失，不問一聲 ——
 * 使用者會以為自己忘了按儲存。
 *
 * 做法照 `salary_pay_slip_meta.test.ts`（它掃的是薪資紀錄頁與計算機頁）。
 */
describe("設定頁真的接上了這道防線", () => {
  const stripComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  const page = stripComments(
    readFileSync(
      join(
        process.cwd(),
        "src",
        "components",
        "salary_calculator",
        "company_setting_page_body.tsx",
      ),
      "utf-8",
    ),
  );

  /**
   * Info: (20260915 - Julian) 參數必須是**算出來的** `isDirty`，不是常數。
   *
   * 換成 `useUnsavedChangesGuard(false)` 的話，hook 的兩個 effect 都不會掛 ——
   * 而 hook 自己的測試會全綠，因為它們掃的是 hook。
   */
  it("把算出來的 isDirty 交給 guard，而不是一個常數", () => {
    expect(page).toContain("useUnsavedChangesGuard(isDirty)");
  });

  /**
   * Info: (20260915 - Julian) `isDirty` 要走共用的比較，而且讀取中／讀失敗時算乾淨。
   *
   * 少了前兩個條件的話，`profile` 還是 `EMPTY` 就被拿去比 ——
   * 一進頁面就被判成「使用者清空了公司名稱」，於是每一次離開都被攔。
   */
  it("isDirty 走共用的比較，且讀取中與讀失敗時一律算乾淨", () => {
    expect(page).toContain("isCompanyProfileDirty(form, profile)");
    expect(page).toContain("!isLoading && !loadFailed");
  });

  /**
   * Info: (20260915 - Julian) 沒改就不能按儲存（review S4）。
   *
   * `upsertProfile` 每一次呼叫都無條件寫一筆 `AuditLog`，而那份軌跡
   * 沒有 before/after —— 混進「其實沒改」的 `UPDATE` 之後，
   * 真的要查「特休制度是什麼時候被改的」時，每一筆都要人工對照
   * 才知道是不是雜訊。「打開頁面、什麼都沒改、按一下確認」是很常見的動作，
   * 連按三次就三筆。
   *
   * 這一條與 `canEdit` 那一條分開驗：它們防的是不同的事
   * （一個是權限，一個是軌跡的雜訊），而共用一條斷言的話，
   * 其中一個被拿掉時看不出是哪一個。
   */
  it("沒有未儲存的變更時，儲存按鈕停用", () => {
    expect(page).toMatch(/isConfirmDisabled =[\s\S]{0,80}?!isDirty/);
  });

  it("被攔下來時真的畫出對話框，而且兩顆鈕都接上 guard 交回來的動作", () => {
    expect(page).toContain("pendingHref !== null");
    expect(page).toContain(
      "<LeaveWithoutSavingModal stayHandler={stay} leaveHandler={leave} />",
    );
  });

  /**
   * Info: (20260915 - Julian) **反面釘**（檢查清單 §1.11）。
   *
   * 判準與正規化抽出去之後，最可能的回歸是下一個人「順手」把它們搬回元件裡 ——
   * 那時純函式的測試會繼續全綠，而元件裡的那一份沒有任何東西守著。
   *
   * 三條各對一種搬法：
   *
   * 1. `entityName: entityName.trim()` —— 這**正是** 20260914 之前元件裡的那一行。
   *    搬回來的話，「送出」與「有沒有改過」會各有一份正規化，而其中一種
   *    走鐘方向的症狀是**離開時不問、改的東西直接消失**。
   * 2. 逐欄比對 `profile.` —— 比較搬回元件。
   * 3. `beforeunload` —— 生命週期搬回元件，而元件不在上面那組掃描的範圍內。
   */
  it("正規化、比較與 beforeunload 都不得搬回元件裡", () => {
    expect(page).not.toMatch(/entityName:\s*entityName\.trim\(\)/);
    expect(page).not.toMatch(/!==\s*profile\./);
    expect(page).not.toContain('addEventListener("beforeunload"');
  });
});
