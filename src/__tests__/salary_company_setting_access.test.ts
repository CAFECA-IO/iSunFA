/**
 * Info: (20260915 - Julian) 「讀得到不等於改得動」這件事有沒有落在畫面上（review S1）。
 *
 * 授權本身是對的而且守得住：`GET = READ`（`OWNER + EDITOR`）、
 * `PUT = SETTINGS_WRITE`（只有 `OWNER`），`salary_route_wiring.test.ts` 釘著。
 *
 * 壞的是畫面那一側，而且**沒有任何錯誤訊息**：記帳士（`EDITOR`，
 * `salary_access.ts` 明文說這是本模組的主要使用者之一）進設定頁，
 * 看到一張空表單、以為這本帳沒設定過，把公司名、統編、負責人、地址、
 * 特休制度全部打一遍，按下儲存必定 403 —— 而畫面只說
 * 「儲存失敗，請稍後再試」。再試一百次也一樣，而他打的東西全部丟掉。
 *
 * `use_company_profile.ts` 的檔頭本來就寫著「`saveProfile` 失敗時
 * 呼叫端要能分辨 403」，而在 20260915 之前**沒有任何呼叫端分辨它** ——
 * 那是檢查清單 §1.14 的形狀：註解聲稱的行為不存在。
 * 更直接的證據是 `calculator.company_setting.read_only` 五個語系都寫好了，
 * 全 repo 沒有任何地方引用。文案備好、接線沒做。
 *
 * 本專案的測試不 render React，所以畫面那一側用掃原始碼守
 * （做法同 `salary_pay_slip_meta.test.ts`）；`isForbiddenError` 是純函式，
 * 直接測。
 */

import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { ApiError } from "@/lib/utils/request";
import { isForbiddenError } from "@/lib/utils/request";

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const read = (...segments: string[]): string =>
  stripComments(readFileSync(join(process.cwd(), "src", ...segments), "utf-8"));

const page = read(
  "components",
  "salary_calculator",
  "company_setting_page_body.tsx",
);
const gate = read("components", "salary_calculator", "salary_access_gate.tsx");

describe("isForbiddenError", () => {
  it("403 的 ApiError 是「沒有權限」", () => {
    expect(isForbiddenError(new ApiError("forbidden", 403))).toBe(true);
  });

  /**
   * Info: (20260915 - Julian) 其他狀態碼一律不是。
   *
   * 401 特別點出來：它由 `request` 集中通報（會清登入狀態），
   * 不該被這一支收成「你沒有權限」——那會讓過期的登入看起來像權限問題。
   */
  it.each([
    ["401（登入過期，另有集中處理）", 401],
    ["404", 404],
    ["429（限流，重試有意義）", 429],
    ["500", 500],
    ["0（網路錯誤）", 0],
  ])("%s 不是「沒有權限」", (_label, status) => {
    expect(isForbiddenError(new ApiError("x", status))).toBe(false);
  });

  /**
   * Info: (20260915 - Julian) 不是 `ApiError` 的東西一律回 false。
   *
   * 少了 `instanceof` 這道 narrow，寫成 `(error as ApiError).status === 403`
   * 的話，網路錯誤會靜靜地回 `undefined === 403` —— 剛好也是 false，
   * 所以這一條抓不到那個寫法。它抓的是另一種：把判斷寬鬆成
   * 「有 status 就算」會讓一個普通物件通過。
   */
  it.each([
    ["普通 Error", new Error("boom")],
    ["長得像但不是 ApiError 的物件", { status: 403 }],
    ["null", null],
    ["undefined", undefined],
  ])("%s 不是「沒有權限」", (_label, thrown) => {
    expect(isForbiddenError(thrown)).toBe(false);
  });
});

describe("設定頁對 EDITOR 是唯讀的", () => {
  /**
   * Info: (20260915 - Julian) 判準必須是 `SETTINGS_WRITE`，不是 `WRITE`。
   *
   * 換成 `WRITE` 的話 `EDITOR` 又變成改得動 —— 而畫面看起來完全正常，
   * 要按下儲存才會發現（那正是這一整組要修的東西）。
   */
  it("用 SETTINGS_WRITE 判斷能不能改，而不是 WRITE 或 READ", () => {
    expect(page).toContain("SalaryAccess.SETTINGS_WRITE");
    expect(page).not.toContain("SalaryAccess.WRITE");
    expect(page).not.toContain("SalaryAccess.READ");
  });

  /**
   * Info: (20260915 - Julian) 角色取自角色閘，**不另外再問一次**。
   *
   * `useSalaryAccess` 刻意掛在 layout 上（它自己的檔頭：角色只問一次、
   * 四個頁面共用）。頁面自己再呼叫一次就是回到「問四次」。
   */
  it("角色來自角色閘的 context，不是自己再發一次請求", () => {
    expect(page).toContain("useSalaryRole()");
    expect(page).not.toContain("useSalaryAccess(");
  });

  /**
   * Info: (20260915 - Julian) **反面釘**：前端不得自己列一份角色清單。
   *
   * 寫成 `role === "OWNER"` 的話，`SALARY_ACCESS_ROLES` 改了這裡不會跟著改 ——
   * 而兩份不一致的症狀是「畫面讓你按、伺服器擋你」，也就是這次修的那個 bug
   * 換一個方向再來一次。
   */
  it("不自己比對角色字串", () => {
    expect(page).not.toMatch(/===\s*"OWNER"/);
    expect(page).not.toMatch(/===\s*"EDITOR"/);
  });

  /**
   * Info: (20260915 - Julian) 五個輸入全部要擋，一個都不能漏。
   *
   * 數字寫死是刻意的：日後多一個欄位而忘了擋，這一條會紅並指出
   * 「你加了輸入但沒加保護」。漏掉的那一格的症狀是使用者改得動、
   * 存不進去 —— 與修正前一模一樣，只是範圍小一點。
   *
   * 文字欄用 `readOnly` 不用 `disabled`：`disabled` 的欄位在多數瀏覽器裡
   * 選不起來也複製不了，而 `EDITOR` 的正當用途正是「看公司抬頭是什麼」。
   * radio 沒有 `readOnly` 這個屬性，只能 `disabled`。
   */
  it("五個輸入都擋住：三個文字欄 readOnly、兩個 radio disabled", () => {
    expect(page.match(/readOnly=\{!canEdit\}/g) ?? []).toHaveLength(3);
    expect(page.match(/disabled=\{!canEdit\}/g) ?? []).toHaveLength(2);
    expect(page.match(/<input/g) ?? []).toHaveLength(5);
  });

  it("儲存按鈕在沒有權限時停用", () => {
    expect(page).toMatch(/isConfirmDisabled =\s*\n?\s*!canEdit/);
  });

  /**
   * Info: (20260915 - Julian) 理由要說在**打字之前**，不是按鈕旁邊。
   *
   * 放按鈕旁邊的話，使用者是把整張表填完、伸手去按的時候才讀到它 ——
   * 那時候該省下的力氣已經花掉了。
   */
  it("唯讀時顯示已經寫好的 read_only 文案", () => {
    expect(page).toContain('t("calculator.company_setting.read_only")');
    expect(page).toContain("{!canEdit && (");
  });

  /**
   * Info: (20260915 - Julian) 伺服器回 403 時不能說「請稍後再試」。
   *
   * 畫面那道防線（`canEdit`）擋的是一般情況；角色在載入之後被改掉時，
   * 按鈕當時還是能按的。兩道都要，而且第二道要說真話 ——
   * 403 不是暫時性的，「請稍後再試」是一句永遠不會成真的話。
   */
  it("catch 分得出 403 與一般失敗", () => {
    expect(page).toContain("isForbiddenError(error)");
    expect(page).toContain("setSaveDenied(true)");
    expect(page).toContain("setSaveFailed(true)");
  });
});

describe("角色閘把角色交給底下的頁面", () => {
  it("allowed 時用 SalaryAccessProvider 包住 children，並帶上角色", () => {
    expect(gate).toContain("<SalaryAccessProvider role={status.role}>");
  });

  /**
   * Info: (20260915 - Julian) 只有 `allowed` 才有 provider，其餘狀態一律不 render children。
   *
   * 這一條守的是既有的 fail-closed 設計沒有被這次改動鬆掉：
   * 把 provider 提到整個元件最外層（看起來更「乾淨」）的話，
   * 載入中與無權限的分支也會被包進去 —— 那本身無害，
   * 但它會讓「只有 allowed 才 render children」這句話變成要讀實作才知道。
   */
  it("其餘狀態仍然不 render children", () => {
    expect(gate.match(/\{children\}/g) ?? []).toHaveLength(1);
  });
});
