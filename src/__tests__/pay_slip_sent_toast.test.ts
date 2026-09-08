import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import path from "path";
import { calculator as zhTw } from "@/i18n/locales/zh_tw/calculator";

/**
 * Info: (20260908 - Julian) 薪資單寄出成功的吐司通知。
 *
 * 這一支守的缺陷全部是**畫面上什麼都不會發生**那一類，而它們正是這個功能
 * 存在的理由 —— 修好之前的行為就是「彈窗關掉、沒有任何反應」，
 * 而那是使用者回報的，不是任何測試發現的。
 *
 * 本專案的測試不 render React，所以掃的是原始碼。掃描的弱點是「換個寫法
 * 就掃不到」，因此每一條都綁在**具名的東西**上（函式名、屬性名、i18n 路徑）。
 */

const read = (relativePath: string): string =>
  readFileSync(path.join(process.cwd(), "src", relativePath), "utf-8");

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const modal = stripComments(
  read("components/salary_calculator/sending_pay_slip_modal.tsx"),
);
const shell = stripComments(
  read("components/salary_calculator/salary_calculator_shell.tsx"),
);
const context = stripComments(read("contexts/pay_slip_toast_context.tsx"));

describe("成功才通知，失敗不通知", () => {
  /**
   * Info: (20260908 - Julian) **通知必須在 `if (!delivered) return;` 之後。**
   *
   * 放在前面（或不放在那個守衛後面）的話，寄送失敗也會跳出「已寄出」——
   * 那比沒有通知糟得多：使用者會相信它，而薪資單其實沒有寄出去。
   *
   * 這裡比對的是兩者在原始碼裡的先後，因為那正是「在守衛之內」的
   * 可掃描形式。
   */
  it("notifySent 在失敗守衛之後", () => {
    const guard = modal.indexOf("if (!delivered) return;");
    const notify = modal.indexOf("notifySent(");

    expect(guard).toBeGreaterThanOrEqual(0);
    expect(notify).toBeGreaterThan(guard);
  });

  /**
   * Info: (20260908 - Julian) 通知在**關窗之前**。
   *
   * 反過來的話這個元件已經在卸載途中，而「卸載中的元件呼叫父層 setState」
   * 不是一件值得依賴的事 —— 它可能有效、可能靜靜什麼都沒發生，
   * 而後者就是修好之前的行為。
   */
  it("notifySent 在 modalVisibleHandler 之前", () => {
    const notify = modal.indexOf("notifySent(");
    const close = modal.indexOf("modalVisibleHandler();");

    expect(notify).toBeGreaterThanOrEqual(0);
    expect(close).toBeGreaterThan(notify);
  });

  /**
   * Info: (20260908 - Julian) 通知帶著姓名、信箱與月份。
   *
   * 信箱是這三個裡最重要的：計畫書 §10.2 登記的風險是
   * 「員工檔上的 email 打錯一個字，薪資單就寄給陌生人，而系統回報已寄出」。
   * 寄完之後再看一次信箱，是使用者唯一有機會發現的時刻。
   */
  it("通知帶著 employeeName、employeeEmail 與 monthLabel", () => {
    expect(modal).toMatch(
      /notifySent\(\{\s*employeeName,\s*employeeEmail,\s*monthLabel,?\s*\}\)/,
    );
  });
});

describe("吐司活在彈窗之外", () => {
  /**
   * Info: (20260908 - Julian) **彈窗自己不能持有那個吐司。**
   *
   * 成功路徑會把這個彈窗關掉（卸載），掛在它裡面的吐司會跟著消失 ——
   * 於是通知閃一下就不見，或根本沒出現。這是這個設計唯一的關鍵約束。
   */
  it("寄出彈窗裡沒有 SuccessNotification", () => {
    expect(modal).not.toContain("SuccessNotification");
  });

  /**
   * Info: (20260908 - Julian) provider 在 `SalaryCalculatorShell` 的**兩個分支**都要有。
   *
   * 公開版寄不出薪資單，所以那個吐司永遠不會出現 —— 但只包帳本版的話，
   * `usePaySlipToast()` 的「沒有 provider 就丟例外」會變成
   * 「看你在哪一版」，而公開版與帳本版共用的元件遲早會踩到。
   */
  it("shell 的兩個分支都包了 PaySlipToastProvider", () => {
    expect(shell).toContain("PaySlipToastProvider");
    expect(shell.match(/<PaySlipToastProvider>/g)).toHaveLength(2);
    expect(shell.match(/<\/PaySlipToastProvider>/g)).toHaveLength(2);
  });
});

describe("用既有的共用元件，不是第四份手寫吐司", () => {
  /**
   * Info: (20260908 - Julian) 這個 repo 沒有吐司套件，而
   * `components/common/success_notification.tsx` 已經有六個呼叫端。
   *
   * 另外三處（business_monitor、pdf_editor、account_management）各自手寫了
   * 一份 —— 那是既有的分歧。這一條釘住「不要再加第四份」。
   */
  it("provider 用 components/common/success_notification", () => {
    expect(context).toContain(
      'from "@/components/common/success_notification"',
    );
    expect(context).not.toMatch(/setTimeout\([\s\S]{0,40}3000\)/);
  });

  /**
   * Info: (20260908 - Julian) 沒有 provider 就丟例外，**不靜默 no-op**。
   *
   * 靜默 no-op 會重現這次要修的缺陷（寄出成功但畫面沒反應），
   * 而它只會再一次由使用者回報。
   */
  it("usePaySlipToast 在沒有 provider 時丟例外", () => {
    expect(context).toMatch(
      /if \(context === null\) \{[\s\S]{0,200}throw new Error/,
    );
  });

  /**
   * Info: (20260908 - Julian) 關閉時只轉 `show`，內容留著。
   *
   * `SuccessNotification` 有退場動畫；把內容一起清掉會讓那 100ms 裡的吐司
   * 先變成空白框再滑走。
   */
  it("關閉只改 show，不清掉內容", () => {
    expect(context).toContain("const hide = useCallback(() => setShow(false)");
    expect(context).not.toMatch(/setContent\(null\)/);
  });
});

describe("文案", () => {
  it("成功的標題與內容都在 zh_tw 字典裡", () => {
    expect(zhTw.message.send_pay_slip_success_title).toBeTruthy();
    expect(zhTw.message.send_pay_slip_success_content).toBeTruthy();
  });

  /**
   * Info: (20260908 - Julian) 內容必須帶 `{{email}}`。
   *
   * 只寫「薪資單已寄出」的話，那個吐司就只是「有反應了」——
   * 而它真正的價值是讓使用者看到**寄到哪個信箱**（§10.2 的緩解措施）。
   * 既有的重寄成功訊息就是只寫「已成功寄送至員工的電子郵件」，
   * 那句話回答不了「哪一個信箱」。
   */
  it("成功內容帶著收件信箱與月份", () => {
    expect(zhTw.message.send_pay_slip_success_content).toContain("{{email}}");
    expect(zhTw.message.send_pay_slip_success_content).toContain("{{month}}");
    expect(zhTw.message.send_pay_slip_success_content).toContain("{{name}}");
  });
});
