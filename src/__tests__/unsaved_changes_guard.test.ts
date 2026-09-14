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
