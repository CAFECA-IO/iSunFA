import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import path from "path";

/**
 * Info: (20260907 - Julian) 薪資單「隱藏數值」的結構契約。
 *
 * 本專案的測試不 render React，所以這裡掃的是原始碼。掃描的弱點是
 * 「換個寫法就掃不到」，因此每一條都綁在**具名的東西**上（屬性名、函式名），
 * 而不是綁在版面字串上。
 *
 * 真正要守的只有一件事：**遮罩不可以跟著進到下載的檔案裡。**
 * 其餘幾條是那件事成立的前提。
 */

const read = (relativePath: string): string =>
  readFileSync(path.join(process.cwd(), "src", relativePath), "utf-8");

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const paySlip = stripComments(
  read("components/salary_calculator/pay_slip.tsx"),
);
const resultBlock = stripComments(
  read("components/salary_calculator/result_block.tsx"),
);
const download = stripComments(read("lib/utils/pay_slip_download.ts"));
const globalsCss = read("app/globals.css");

describe("切換鈕本身", () => {
  it("用的是 lucide 的 Eye / EyeOff", () => {
    expect(paySlip).toContain('from "lucide-react"');
    expect(paySlip).toMatch(/\bEye\b/);
    expect(paySlip).toMatch(/\bEyeOff\b/);
    expect(paySlip).toMatch(/isHidden \? <EyeOff/);
  });

  /**
   * Info: (20260907 - Julian) 兩種狀態的文案不同 —— 一顆只寫「隱藏金額」的按鈕，
   * 在已經隱藏之後會讀成「再隱藏一次」。`aria-pressed` 讓螢幕閱讀器
   * 也拿得到目前的狀態。
   */
  it("兩種狀態各有文案，而且是可切換的按鈕", () => {
    expect(paySlip).toContain("calculator.result.hide_values");
    expect(paySlip).toContain("calculator.result.show_values");
    expect(paySlip).toContain("aria-pressed={isHidden}");
  });

  /**
   * Info: (20260907 - Julian) 狀態放在 `PaySlip` 裡面，而且預設看得見。
   *
   * 預設遮住的話，使用者打開薪資單看到一片模糊，第一個念頭是「算壞了」。
   */
  it("預設是看得見的", () => {
    expect(paySlip).toMatch(/useState<boolean>\(false\)/);
  });
});

describe("遮罩的實作方式", () => {
  /**
   * Info: (20260907 - Julian) 遮罩是**根元素上的一個屬性**加一條 CSS，
   * 不是把每個數值換成「•••」，也不是逐一掛 `blur-sm`。
   *
   * 這個形狀是下面「下載不受影響」那一條的前提：拔掉一個屬性是同步、
   * 確定的一次 DOM 操作；改 React state 再等重繪不是。
   */
  it("靠 data-values-hidden 與 data-payslip-amount 兩個屬性", () => {
    expect(paySlip).toContain("data-values-hidden");
    expect(paySlip).toContain("data-payslip-amount");
    expect(resultBlock).toContain("data-payslip-amount");
    expect(globalsCss).toContain(
      '[data-values-hidden="true"] [data-payslip-amount]',
    );
  });

  /**
   * Info: (20260907 - Julian) 用模糊而不是換字串：換字串會讓每一格的寬度
   * 變一次，整張單子在切換時抖一下；模糊之後欄位寬度完全不變，
   * 而且看得出「這裡本來有一個數字」（空白讀起來像沒有資料）。
   */
  it("用模糊，版面不因切換而跳動", () => {
    expect(globalsCss).toMatch(/filter: blur\(/);
    expect(paySlip).not.toMatch(/•+/);
  });

  /**
   * Info: (20260907 - Julian) 每一格數值都要標記到 —— 漏掉的那一格會在
   * 遮罩開著的時候大剌剌地留在畫面上，而那正是這個功能要擋的東西。
   * `ResultBlock` 有明細與總計兩種列，兩種都要。
   */
  it("明細與總計兩種列都標記了", () => {
    expect(resultBlock.split("data-payslip-amount").length - 1).toBe(2);
    // Info: (20260907 - Julian) PaySlip 自己還有「應報」與「實發」兩個大數字
    expect(paySlip.split("data-payslip-amount").length - 1).toBe(2);
  });
});

describe("下載的 PNG 不受遮罩影響", () => {
  /**
   * Info: (20260907 - Julian) **這是這個檔案存在的主要理由。**
   *
   * 遮住數值是給「有人走過來」用的。它若跟著進到下載的圖裡，
   * 使用者會得到一張模糊的薪資單 —— 而那是要交給員工的憑據，
   * 他多半不會打開存下來的檔案確認，等發現時已經寄出去了。
   *
   * 截圖前拔掉根元素的屬性、`finally` 補回去。用 `finally` 而不是
   * 截完再補：截圖失敗時畫面也要還原成使用者原本設定的樣子。
   */
  it("截圖前解除遮罩，結束後還原", () => {
    expect(download).toContain("removeAttribute(HIDDEN_ATTR)");
    expect(download).toMatch(
      /finally \{[\s\S]{0,200}?setAttribute\(HIDDEN_ATTR/,
    );
  });

  /**
   * Info: (20260908 - Julian) **要往整棵子樹找，不能只看 `node` 自己。**
   *
   * 20260907 初版寫的是 `node.hasAttribute(HIDDEN_ATTR)`，而兩個呼叫端
   * 傳進來的都是 `downloadRef` 那層外框 div —— `PaySlip` 的根元素在它裡面。
   * 於是遮罩從來沒被拔掉，下載到的是一張整片模糊的薪資單。
   *
   * 當時的測試只斷言「程式碼裡有 removeAttribute」就過了：機制存在，
   * 但接錯了對象。這一條補的正是那個缺口 —— 它問的是「作用在哪」，
   * 而不是「有沒有做」。
   */
  it("解除遮罩是往整棵子樹找，不是只看傳進來的那一個節點", () => {
    expect(download).toContain("querySelectorAll");
    expect(download).toMatch(
      /querySelectorAll<HTMLElement>\(`\[\$\{HIDDEN_ATTR\}\]`\)/,
    );
    // Info: (20260908 - Julian) 就是這個寫法漏掉了子孫節點
    expect(download).not.toContain(
      "const wasHidden = node.hasAttribute(HIDDEN_ATTR)",
    );
  });

  /**
   * Info: (20260908 - Julian) 只還原「原本就遮著」的那些。
   *
   * 無條件對整棵子樹補上屬性的話，本來沒遮的元素會在下載之後變成遮住的 ——
   * 使用者按了一次下載，畫面自己糊掉了。
   */
  it("還原的對象就是剛才拔掉的那些，不是無條件補上", () => {
    expect(download).toMatch(/const masked = \[[\s\S]{0,400}?\];/);
    expect(download).toMatch(
      /masked\.forEach\([\s\S]{0,120}?removeAttribute\(HIDDEN_ATTR\)/,
    );
    expect(download).toMatch(
      /masked\.forEach\([\s\S]{0,120}?setAttribute\(HIDDEN_ATTR/,
    );
  });

  /**
   * Info: (20260907 - Julian) 切換鈕不進圖 —— 那張圖是要給員工看的，
   * 上面不該有一顆操作鈕。html-to-image 不會對根節點呼叫 filter，
   * 所以根元素不必自我排除。
   */
  it("帶 data-capture-exclude 的節點被排除", () => {
    expect(download).toContain("filter:");
    expect(download).toContain('dataset.captureExclude !== "true"');
    expect(paySlip).toContain('data-capture-exclude="true"');
  });
});

describe("寄出的 PDF 不經過這個元件", () => {
  /**
   * Info: (20260907 - Julian) 伺服器端的薪資單 HTML 是另外組出來的
   * （`pay_slip_html.ts`），與畫面上的遮罩無關 —— 這一條確認它沒有
   * 不小心沾到那兩個屬性，也就是說「遮住畫面」永遠不會影響寄出的檔案。
   */
  it("pay_slip_html 不認得遮罩的屬性", () => {
    const serverHtml = read("lib/utils/pay_slip_html.ts");

    expect(serverHtml).not.toContain("data-values-hidden");
    expect(serverHtml).not.toContain("data-payslip-amount");
  });
});
