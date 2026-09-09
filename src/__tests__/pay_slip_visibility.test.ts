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
 * 真正要守的只有兩件事：
 *
 * 1. **遮罩不可以跟著進到下載的檔案裡。**
 * 2. **遮罩只出現在薪資紀錄檢視，不出現在計算機。**
 *
 * 其餘幾條是這兩件事成立的前提。
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
const maskedAmount = stripComments(
  read("components/salary_calculator/masked_amount.tsx"),
);
const viewModal = stripComments(
  read("components/salary_calculator/view_pay_slip_modal.tsx"),
);
const resultSection = stripComments(
  read("components/salary_calculator/salary_result_section.tsx"),
);
const download = stripComments(read("lib/utils/pay_slip_download.ts"));
const globalsCss = read("app/globals.css");

describe("遮罩只在薪資紀錄檢視", () => {
  /**
   * Info: (20260909 - Julian) **`maskable` 預設是關的。**
   *
   * 這一條釘的是預設值的方向，而那是一個字的差別、兩種值的畫面都「正常」。
   * 預設 `false` 的話，新的呼叫端忘了想這件事會得到「沒有遮罩」——
   * 一個看得見的結果；預設 `true` 則會得到「遮了但不該遮」——
   * 要按一下才發現，而多半沒有人會按。
   */
  it("PaySlip 的 maskable 預設是 false", () => {
    expect(paySlip).toMatch(/maskable\?: boolean;/);
    expect(paySlip).toMatch(/maskable = false,/);
  });

  /**
   * Info: (20260909 - Julian) **計算機不遮，薪資紀錄檢視才遮。**
   *
   * `PaySlip` 只有兩個呼叫端，這一條把它們釘在相反的兩邊。
   *
   * 計算機那一頁的數字是使用者自己在同一個畫面上方剛剛輸入的 ——
   * 遮下面那份等於遮他自己的輸入，什麼也沒擋到，只是讓他每次算完
   * 都要多按一下才看得到結果。薪資紀錄檢視則是「別人的薪資單」。
   */
  it("只有 view_pay_slip_modal 開遮罩，salary_result_section 不開", () => {
    expect(viewModal).toMatch(/maskable/);
    expect(resultSection).not.toContain("maskable");
  });

  /**
   * Info: (20260909 - Julian) 不支援遮罩的時候，切換鈕**整顆不 render**。
   *
   * 留一顆按了沒有效果的鈕比沒有這顆鈕更糟 —— 使用者會以為遮罩壞了，
   * 而那個誤會沒有出路。
   */
  it("切換鈕包在 maskable 裡面", () => {
    expect(paySlip).toMatch(/\{maskable && \([\s\S]{0,240}?<button/);
  });

  /**
   * Info: (20260909 - Julian) 生效的是 `isMasked`，不是 `isHidden`。
   *
   * 這是「不遮」真正落地的那一行。少了 `maskable &&`，計算機那一頁
   * 會照樣帶上 `data-values-hidden`（state 預設是 true）而且**沒有切換鈕**
   * 可以解開 —— 一整頁解不開的星號。
   */
  it("根元素看的是 isMasked = maskable && isHidden", () => {
    expect(paySlip).toMatch(/const isMasked = maskable && isHidden;/);
    expect(paySlip).toMatch(
      /data-values-hidden=\{isMasked \? "true" : undefined\}/,
    );
  });
});

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
   * Info: (20260908 - Julian) 狀態放在 `PaySlip` 裡面，而且**預設遮住**。
   *
   * ## 這一條 20260908 反過來了
   *
   * 原本釘的是 `useState<boolean>(false)`（預設看得見），理由是
   * 「使用者打開薪資單看到一片模糊，第一個念頭是『算壞了』」。
   * 20260908 的商業決策把它改成預設遮住 —— 那個顧慮沒有被推翻，是被取捨掉的。
   *
   * 兩種預設值的失敗方向不對稱：預設看得見的失敗是**別人的薪資被第三人看到**
   * （不可回復）；預設遮住的失敗是**使用者以為算壞了**（按一下就解決，
   * 而且只會困惑一次）。完整理由寫在 `pay_slip.tsx` 該欄位的註解上。
   *
   * Info: (20260909 - Julian) 這條的適用範圍在 20260909 縮小了：現在只有
   * `maskable` 的呼叫端會用到這個初始值。它仍然要釘 —— 那一個呼叫端
   * 正是「別人的薪資單」。
   *
   * ## 為什麼還是要釘住它
   *
   * 預設值是這顆按鈕唯一有安全意義的部分。它是一個字的差別、
   * 而兩種值的畫面都「正常」—— 沒有測試的話，任何一次重構都可能把它翻回去，
   * 而翻回去之後沒有人會發現，直到某個人的薪資被旁邊的人看到。
   */
  it("預設是遮住的", () => {
    expect(paySlip).toMatch(/useState<boolean>\(true\)/);
  });

  /**
   * Info: (20260908 - Julian) 兩種狀態的文案都必須存在 —— 預設遮住之後這變成必要條件。
   *
   * 「第一個念頭是算壞了」這個代價要用別的方式付：使用者看到的是一排星號
   * **加上一顆寫著「顯示金額」的按鈕**。少了那句文案，星號就沒有出路了。
   *
   * 上面「兩種狀態各有文案」那一條驗的是同一組 key；這一條的存在是為了
   * 說明它在預設遮住之後不再只是體貼，而是預設值成立的前提。
   */
  it("遮住時看得到「顯示金額」這條出路", () => {
    expect(paySlip).toContain("calculator.result.show_values");
    expect(paySlip).toMatch(/isHidden \?/);
  });
});

describe("遮罩的實作方式", () => {
  /**
   * Info: (20260909 - Julian) 遮罩是**根元素上的一個屬性**加三條 CSS，
   * 不是把每個數值在 React 裡換掉，也不是逐一掛 class。
   *
   * 這個形狀是下面「下載不受影響」那一條的前提：拔掉一個屬性是同步、
   * 確定的一次 DOM 操作；改 React state 再等重繪不是。
   */
  it("靠 data-values-hidden 與 MaskedAmount 的兩個屬性", () => {
    expect(paySlip).toContain("data-values-hidden");
    expect(maskedAmount).toContain("data-payslip-real");
    expect(maskedAmount).toContain("data-payslip-mask");
    expect(globalsCss).toContain(
      '[data-values-hidden="true"] [data-payslip-real]',
    );
    expect(globalsCss).toContain(
      '[data-values-hidden="true"] [data-payslip-mask]',
    );
  });

  /**
   * Info: (20260909 - Julian) **這裡 20260909 從模糊換成星號，推翻了 20260907 的決定。**
   *
   * 原本這條釘的是 `filter: blur(`，理由是「換字串會讓每一格的寬度變一次，
   * 整張單子在切換時抖一下」。那個理由沒有被推翻 —— **欄寬確實會變，
   * 這是已知代價**。換掉它是因為模糊的語意不夠明確：一片糊在低解析度螢幕、
   * 投影、或截圖轉貼之後看起來像畫面故障或字太小，而星號在任何情況下
   * 都只讀作「這裡被刻意遮住了」。
   *
   * 順帶：模糊過的字反白仍然複製得到原文（前一版得再補 `user-select: none`），
   * 而 `display: none` 的文字選不到也複製不到。
   */
  it("用星號而不是模糊", () => {
    expect(globalsCss).toMatch(
      /\[data-values-hidden="true"\] \[data-payslip-real\] \{\s*display: none;/,
    );
    expect(globalsCss).toMatch(
      /\[data-values-hidden="true"\] \[data-payslip-mask\] \{\s*display: inline;/,
    );
    // Info: (20260909 - Julian) 遮罩平常是藏著的，只有遮住時才冒出來
    expect(globalsCss).toMatch(/\[data-payslip-mask\] \{\s*display: none;/);
    // Info: (20260909 - Julian) 這條規則不得再回頭用模糊
    expect(globalsCss).not.toMatch(/\[data-payslip-[a-z]+\][^{]*\{[^}]*blur\(/);
  });

  /**
   * Info: (20260909 - Julian) **固定三顆星，不是一位數一顆。**
   *
   * `*******` 洩漏位數，也就是洩漏數量級 —— 而「這個人的薪水是六位數
   * 還是五位數」正是站在後面那個人最想知道的那一件事。
   * 固定長度什麼都不說。
   */
  it("遮罩是固定長度的字串", () => {
    expect(maskedAmount).toMatch(/PAY_SLIP_MASK = "\*\*\*"/);
    // Info: (20260909 - Julian) 這兩個是「照位數產生星號」最可能的長相
    expect(maskedAmount).not.toContain(".repeat(");
    expect(maskedAmount).not.toContain(".padStart(");
  });

  /**
   * Info: (20260909 - Julian) **`MaskedAmount` 不知道現在遮沒遮。**
   *
   * 它把真數字與星號兩份都 render 出來，二選一交給 CSS。
   * 這一條擋的是「看起來更直覺」的那個改法：
   *
   *     {isHidden ? PAY_SLIP_MASK : value}
   *
   * 那樣寫的話真數字根本沒進 DOM，於是 `pay_slip_download.ts` 拔掉屬性
   * 也變不出數字 —— 使用者下載到一張整片星號的薪資單。**畫面完全正常**，
   * 壞掉的只有存出去的那份檔案，而他多半不會打開它確認。
   *
   * （20260907 已經踩過同一個形狀的坑一次，見下面「下載的 PNG」那一組。）
   */
  it("真數字與星號兩份並存，元件本身不做判斷", () => {
    expect(maskedAmount).toMatch(
      /data-payslip-real[\s\S]{0,60}\{value\}[\s\S]{0,80}data-payslip-mask/,
    );
    expect(maskedAmount).not.toContain("isHidden");
    expect(maskedAmount).not.toContain("data-values-hidden");
  });

  /**
   * Info: (20260907 - Julian) 每一格數值都要標記到 —— 漏掉的那一格會在
   * 遮罩開著的時候大剌剌地留在畫面上，而那正是這個功能要擋的東西。
   * `ResultBlock` 有明細與總計兩種列，兩種都要。
   *
   * Info: (20260909 - Julian) 改成數 `<MaskedAmount`：現在那組屬性只有
   * 一個產地，而「有沒有走過那個產地」比「有沒有那個屬性」好守 ——
   * 自己手寫屬性的話，星號那一份會被漏掉。
   */
  it("明細與總計兩種列都走 MaskedAmount", () => {
    expect(resultBlock.split("<MaskedAmount").length - 1).toBe(2);
    // Info: (20260907 - Julian) PaySlip 自己還有「應報」與「實發」兩個大數字
    expect(paySlip.split("<MaskedAmount").length - 1).toBe(2);
  });

  /**
   * Info: (20260909 - Julian) 沒有人自己手寫那組屬性。
   *
   * 手寫 `data-payslip-real` 而忘了旁邊那份星號，症狀是那一格在遮住時
   * **整個消失**（而不是變成星號）—— 一張缺了幾格的薪資單。
   */
  it("屬性只從 MaskedAmount 產出", () => {
    expect(paySlip).not.toContain("data-payslip-real");
    expect(paySlip).not.toContain("data-payslip-mask");
    expect(resultBlock).not.toContain("data-payslip-real");
    expect(resultBlock).not.toContain("data-payslip-mask");
  });
});

describe("下載的 PNG 不受遮罩影響", () => {
  /**
   * Info: (20260907 - Julian) **這是這個檔案存在的主要理由。**
   *
   * 遮住數值是給「有人走過來」用的。它若跟著進到下載的圖裡，
   * 使用者會得到一張看不出金額的薪資單 —— 而那是要交給員工的憑據，
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
   * Info: (20260909 - Julian) **下載那條路徑不必為了改遮罩而動。**
   *
   * 20260909 把模糊換成星號，`pay_slip_download.ts` 一行都沒改 ——
   * 因為它只碰根元素上的那一個屬性，而遮罩換成什麼樣子都是 CSS 的事。
   *
   * 這一條釘的是那個邊界：下載的程式碼不得認得任何一種**遮罩長相**
   * （blur、星號、`data-payslip-*`）。一旦它開始認得，換遮罩就會變成
   * 「順便要記得改下載」，而那件事遲早會被忘記一次。
   */
  it("下載的程式碼只認得根元素那一個屬性，不認得遮罩長什麼樣", () => {
    expect(download).toContain('const HIDDEN_ATTR = "data-values-hidden"');
    expect(download).not.toContain("data-payslip-real");
    expect(download).not.toContain("data-payslip-mask");
    expect(download).not.toContain("blur");
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
   * 不小心沾到那些屬性，也就是說「遮住畫面」永遠不會影響寄出的檔案。
   */
  it("pay_slip_html 不認得遮罩的屬性", () => {
    const serverHtml = read("lib/utils/pay_slip_html.ts");

    expect(serverHtml).not.toContain("data-values-hidden");
    expect(serverHtml).not.toContain("data-payslip-real");
    expect(serverHtml).not.toContain("data-payslip-mask");
  });
});
