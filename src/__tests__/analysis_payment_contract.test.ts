import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Info: (20260813 - Luphia) 分析類付款的統一契約測試（設計書 §5.6）。
 *
 * 起因：系統裡有 6 個付款呼叫點，各自接一次 `useOrderTransaction` +
 * `PaymentConfirmModal`。於是「支援團隊額度」變成每個站點都要記得補的事，
 * 而里程試算就是漏掉的那一個——使用者回報時它已經上線一段時間了。
 *
 * 統一之後由 `useAnalysisPayment` 承載兩種來源，這個測試把它固定成硬性規則：
 * 任何直接使用 `useOrderTransaction()` 的畫面都會讓 CI 紅字，
 * 而不是等某天有人發現「這頁怎麼不能用團隊額度」。
 */

const SRC = join(process.cwd(), "src");

// Info: (20260813 - Luphia) 允許直接使用底層 hook 的檔案：統一入口本身，與碳盤查的付款重送
const ALLOWED = new Set([
  join("src", "hooks", "use_order_transaction.ts"),
  join("src", "hooks", "use_analysis_payment.tsx"),
  // Info: (20260813 - Luphia) 碳盤查用的是 payExistingOrder（付一張伺服器已建好的單），
  // Info: (20260813 - Luphia) 不是分析類的「建單並付款」流程，不適用來源選擇
  join("src", "hooks", "use_carbon_chat.ts"),
]);

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("analysis payment module", () => {
  const files = collectSourceFiles(SRC);

  it("routes every payment screen through the unified entry point", () => {
    const offenders = files
      .filter((file) => {
        const relative = file.slice(process.cwd().length + 1);
        if (ALLOWED.has(relative)) return false;
        if (relative.includes(join("src", "__tests__"))) return false;
        return /useOrderTransaction\s*\(/.test(readFileSync(file, "utf8"));
      })
      .map((file) => file.slice(process.cwd().length + 1));

    expect(offenders).toEqual([]);
  });

  /**
   * Info: (20260813 - Luphia) 用了統一入口還不夠：選擇器要真的畫出來，
   * 否則用戶看不到「團隊額度」這個選項，等於仍然只能用個人點數。
   */
  it("renders the payment source selector wherever the entry point is used", () => {
    const offenders = files
      .filter((file) => {
        const relative = file.slice(process.cwd().length + 1);
        if (relative === join("src", "hooks", "use_analysis_payment.tsx")) {
          return false;
        }
        const source = readFileSync(file, "utf8");
        if (!/useAnalysisPayment\s*\(/.test(source)) return false;
        /**
         * Info: (20260813 - Luphia) 必須檢查「有沒有渲染」而不是「有沒有提到」：
         * 站點從 hook 解構出 paymentSourceNode 就會讓名稱出現在檔案裡，
         * 只比對名稱的檢查抓不到「解構了卻沒畫出來」——那正是最容易犯的錯。
         */
        const rendered =
          /extraContent=\{paymentSourceNode\}/.test(source) ||
          /^\s*\{paymentSourceNode\}\s*$/m.test(source);
        return !rendered;
      })
      .map((file) => file.slice(process.cwd().length + 1));

    expect(offenders).toEqual([]);
  });

  it("covers the six known payment screens", () => {
    const screens = files.filter((file) =>
      /useAnalysisPayment\s*\(/.test(readFileSync(file, "utf8")),
    );
    // Info: (20260813 - Luphia) 6 個畫面 + hook 自身
    expect(screens.length).toBeGreaterThanOrEqual(6);
  });
});
