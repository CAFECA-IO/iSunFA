import { describe, it, expect } from "@jest/globals";
import { existsSync, readFileSync } from "fs";
import path from "path";

/**
 * Info: (20260908 - Julian) 寄送薪資單的載入動畫。
 *
 * 這一支守三種缺陷，共同點是**畫面看起來只是「動畫沒出來」**，
 * 而真正的原因分別在三個不同的地方：
 *
 * 1. 檔案不在 `public/` 底下 → `<img>` 拿到 404，彈窗中間一片空白
 * 2. 有人把 SVG 內嵌成元件 → 動畫會動，但它的 `.paper` 類別開始污染整個頁面
 * 3. 重新匯出 SVG 時掉了 `prefers-reduced-motion` → 對動態敏感的使用者
 *    看到一個 3 秒循環的飛行動畫，而那個檔原本是有處理的
 */

/**
 * Info: (20260908 - Julian) 資產路徑**從元件裡讀出來**，不在測試裡再抄一次。
 *
 * 初版把檔名寫死在這裡，於是換動畫檔（`sending-animation` →
 * `mailbox-animation`）時這一支紅了 —— 而元件與檔案其實是一致的，
 * 紅的是測試自己抄的那一份。
 *
 * 抄兩份的測試守不住任何東西：真正要守的是
 * **「元件指向的那個檔案存在」**，而那句話只需要一個來源。
 */
const assetSrc = (): string => {
  const match = /src="(\/[^"]+\.svg)"/.exec(component);
  expect(match).not.toBeNull();
  return (match as RegExpExecArray)[1];
};

const assetPath = (): string => path.join(process.cwd(), "public", assetSrc());

const read = (relativePath: string): string =>
  readFileSync(path.join(process.cwd(), "src", relativePath), "utf-8");

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const component = stripComments(
  read("components/salary_calculator/sending_animation.tsx"),
);
const sending = stripComments(
  read("components/salary_calculator/sending_pay_slip_modal.tsx"),
);
const resending = stripComments(
  read("components/salary_calculator/resending_pay_slip_modal.tsx"),
);

describe("資產", () => {
  /**
   * Info: (20260908 - Julian) 檔案必須在 `public/` 底下才服務得到。
   *
   * 它原本在 repo 根目錄的 `anim/` —— Next.js 不會服務那裡，
   * 而 `<img src="/anim/...">` 會拿到 404。症狀是彈窗中間一片空白，
   * 不會有任何錯誤訊息（圖片載入失敗不進 console.error）。
   */
  it("元件指向的 SVG 真的存在於 public/ 底下", () => {
    expect(existsSync(assetPath())).toBe(true);
  });

  /**
   * Info: (20260908 - Julian) 路徑必須是絕對的、指到 `public/anim/`。
   *
   * 相對路徑（`anim/...`）在子路由下會解析成
   * `/user/account_book/xxx/anim/...` —— 404，而彈窗中間一片空白。
   */
  it("路徑是 /anim/ 開頭的絕對路徑", () => {
    expect(assetSrc()).toMatch(/^\/anim\/.+\.svg$/);
  });

  /**
   * Info: (20260908 - Julian) **`prefers-reduced-motion` 不能掉。**
   *
   * 那個檔案本身有處理（把動畫停在信封閉合的靜止狀態），所以元件層不必再管。
   * 但那也意味著：有人用設計工具重新匯出這個動畫時，那一段會**靜靜地消失** ——
   * 而它消失之後，對動態敏感的使用者會看到一個 3 秒循環的飛行動畫。
   *
   * 這一條是為了讓那次重新匯出會紅。
   */
  it("SVG 自己處理了 prefers-reduced-motion", () => {
    const svg = readFileSync(assetPath(), "utf-8");

    expect(svg).toContain("@media (prefers-reduced-motion: reduce)");
    expect(svg).toMatch(/prefers-reduced-motion[\s\S]{0,400}animation: none/);
  });
});

describe("用 img 載入，不內嵌", () => {
  /**
   * Info: (20260908 - Julian) **內嵌 SVG 的 `<style>` 是文件層級的。**
   *
   * 那份 SVG 的 class 名稱是 `.paper`、`.mail-group`、`.speed-line`、
   * `.envelope-flap-front` —— `.paper` 極容易撞名。一旦內嵌，它會套到頁面上
   * 任何叫這個名字的元素，而症狀是「某個不相關的區塊突然變成白色、還會動」，
   * 且只在這個彈窗開過之後才出現（style 進了 DOM 就留著）。
   * 那種 bug 幾乎不可能被聯想回這裡。
   *
   * 走 `<img>` 的話那份 style 留在 SVG 自己的文件裡，撞不到任何東西。
   */
  it("元件是 img，沒有把 svg 內容搬進 tsx", () => {
    expect(component).toContain("<img");
    expect(component).not.toContain("<svg");
    expect(component).not.toContain("mail-group");
  });

  /**
   * Info: (20260908 - Julian) `alt=""` —— 這張圖是裝飾。
   *
   * 兩個彈窗都在動畫旁邊有一行看得見的「寄送中…」，按鈕上也是同一句。
   * 給它 `alt="寄送中"` 會讓螢幕閱讀器把同一句話唸兩到三次。
   */
  it("alt 是空字串（旁邊已有可見的文字）", () => {
    expect(component).toMatch(/alt=""/);
  });
});

describe("兩個彈窗共用同一個元件", () => {
  /**
   * Info: (20260908 - Julian) 重寄與第一次寄出是同一件事（同一支端點、同一段等待）。
   *
   * 兩邊各用一種載入指示，會讓使用者以為發生了不同的事。
   * 而各自寫一個 `<img src="/anim/...">` 的話，路徑就有兩份 ——
   * 搬動資產時只改到一處。
   */
  it("寄出與重寄都用 SendingAnimation", () => {
    expect(sending).toContain("<SendingAnimation");
    expect(resending).toContain("<SendingAnimation");
  });

  it("兩個彈窗都不自己寫資產路徑", () => {
    expect(sending).not.toContain("sending-animation.svg");
    expect(resending).not.toContain("sending-animation.svg");
  });
});

describe("寄出彈窗的載入狀態", () => {
  /**
   * Info: (20260908 - Julian) 寄送中換掉的是**信箱確認區**。
   *
   * 那一段的用途是「按下去之前再看一次寄到哪」，而此刻已經按下去了。
   * 留著它並在上方疊一個動畫，會讓彈窗長高、內容跳動。
   */
  it("isSending 時渲染動畫而不是信箱確認區", () => {
    expect(sending).toMatch(/\{isSending \? \([\s\S]{0,300}<SendingAnimation/);
  });

  /**
   * Info: (20260908 - Julian) 按鈕裡不再有小轉圈。
   *
   * 動畫就在它上方，兩個載入指示同時轉只是噪音。而這一條也擋住
   * 「加了新動畫但忘了拿掉舊的」—— 那會同時出現兩個轉圈。
   */
  it("按鈕內沒有 Loader2", () => {
    expect(sending).not.toContain("Loader2");
  });
});
