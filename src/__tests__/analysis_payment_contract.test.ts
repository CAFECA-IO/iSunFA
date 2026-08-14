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

  /**
   * Info: (20260813 - Luphia) 選擇器畫出來還不夠：modal 必須知道付款來源。
   * 不告知的後果有兩層——顯示層是「支付後餘額 100 - 5 = 95」這個與事實相反的數字
   * （團隊額度不扣個人點數），功能層是確認鈕會以個人餘額擋下付款，
   * 讓「個人 0 點、團隊有額度」的成員完全付不了款。後者比顯示錯誤嚴重得多。
   */
  it("tells the modal which source pays", () => {
    const offenders = files
      .filter((file) => {
        const relative = file.slice(process.cwd().length + 1);
        if (relative === join("src", "hooks", "use_analysis_payment.tsx")) {
          return false;
        }
        const source = readFileSync(file, "utf8");
        if (!/useAnalysisPayment\s*\(/.test(source)) return false;
        return !/paidByTeamQuota=\{paysWithTeamQuota\}/.test(source);
      })
      .map((file) => file.slice(process.cwd().length + 1));

    expect(offenders).toEqual([]);
  });

  /**
   * Info: (20260813 - Luphia) 告知來源還不夠：團隊來源要一併把該團隊的可用額度交給 modal。
   * 少了它，modal 只有個人餘額可比對，於是「團隊額度不足」這件事在按下支付之前
   * 完全看不出來——用戶按下去，server 回 402，訂單留在資料庫裡。
   */
  it("gives the modal the team quota available for the selected team", () => {
    const offenders = files
      .filter((file) => {
        const relative = file.slice(process.cwd().length + 1);
        if (relative === join("src", "hooks", "use_analysis_payment.tsx")) {
          return false;
        }
        const source = readFileSync(file, "utf8");
        if (!/useAnalysisPayment\s*\(/.test(source)) return false;
        return !/teamAvailableCredits=\{teamAvailableCredits\}/.test(source);
      })
      .map((file) => file.slice(process.cwd().length + 1));

    expect(offenders).toEqual([]);
  });

  /**
   * Info: (20260814 - Luphia) 精確比對而非下限（PR #6652 review B-5）。
   *
   * 原本寫 `toBeGreaterThanOrEqual(6)`，而實際命中數就是 6——門檻等於事實時，
   * 少掉任何一個畫面都會讓它變紅；但若門檻比事實低，移除一個畫面的團隊額度選項
   * 依然全綠。新增付款畫面時請一併更新這個數字，那正是提醒你「新畫面也要接上」的時機。
   */
  it("covers exactly the known payment screens", () => {
    const screens = files
      .filter((file) =>
        /useAnalysisPayment\s*\(/.test(readFileSync(file, "utf8")),
      )
      .map((file) => file.slice(process.cwd().length + 1));

    expect(screens.length).toBe(6);
  });

  /**
   * Info: (20260814 - Luphia) 上面四條檢查掃的都是**呼叫端**的字面 JSX，
   * 而那些值全由 `use_analysis_payment` 產生：把 `paymentSourceNode` 改成 `null`、
   * 或把 `paysWithTeamQuota` 寫死 `false`，六個畫面一個字都不用改、五條檢查全綠——
   * 而 `paysWithTeamQuota: false` 的後果正是「個人 0 點、團隊有額度」的成員完全付不了款。
   * 因此把 hook 自身的接線也一併釘住。
   */
  it("keeps the entry point actually wired to the selector and the team source", () => {
    const hook = readFileSync(
      join(process.cwd(), "src", "hooks", "use_analysis_payment.tsx"),
      "utf8",
    );

    // Info: (20260814 - Luphia) 選擇器必須是真的元件，不是 null 或佔位
    expect(hook).toMatch(/paymentSourceNode\s*=\s*\(\s*<PaymentSourceSelector/);
    // Info: (20260814 - Luphia) 付款來源必須由「有團隊且選了團隊」推導，不能是常數
    expect(hook).toMatch(/paysWithTeamQuota:\s*useTeamSource/);
    expect(hook).toMatch(
      /const\s+useTeamSource\s*=\s*team\.teams\.length\s*>\s*0\s*&&/,
    );
  });
});
