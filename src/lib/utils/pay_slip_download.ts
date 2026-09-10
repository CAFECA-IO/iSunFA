import { toPng } from "html-to-image";

/**
 * Info: (20260901 - Julian) 把一個節點連同它捲動範圍外的內容一起存成 PNG。
 *
 * ## 為什麼要自己算 width / height
 *
 * `html-to-image` 的畫布尺寸預設取自 `getNodeHeight(node) = node.clientHeight + 邊框`
 * （`html-to-image/lib/util.js:119`）—— 那是**可見範圍**，不是內容高度。
 * 於是一個 `overflow-y-auto` 的容器不論裡面有多長，截出來的圖都只有看得到的那一截，
 * 剩下的直接被裁掉：薪資單會停在「職災保險級距」那一行，
 * 而下面的勞退級距、投保薪資、雇主總負擔全部不見。
 *
 * `style` 裡的 `height: "auto"` 只作用在複製出來的節點上，改不動外層 SVG 畫布的大小，
 * 所以光靠它沒有用 —— 尺寸要用 `width` / `height` 明確蓋掉，值取 `scrollWidth`／`scrollHeight`。
 *
 * 實測（Chromium，pixelRatio 2，內容 1170px、可見 524px）：
 * 不指定尺寸得到 1340×1048 的圖，指定之後是 1340×2340，完整。
 *
 * `flex: "none"` 是另一半：複製出來的節點若還帶著 `flex: 1 1 0%`，
 * 在單獨渲染時會退回 0 基準高度。
 */
/**
 * Info: (20260907 - Julian) 截圖期間解除「隱藏數值」，並把畫面上的操作鈕排除掉。
 *
 * 薪資單上有一顆眼睛圖示可以把數值模糊掉（見 `pay_slip.tsx`）。那是給
 * 「有人走過來」用的，**不能跟著進到下載的圖裡** —— 那張 PNG 是要交給員工的
 * 憑據，一張模糊的薪資單沒有任何用處，而且使用者多半不會打開存下來的檔案
 * 去確認，等發現時已經寄出去了。
 *
 * 作法是在截圖前拔掉根元素上的 `data-values-hidden`，`finally` 再補回去。
 * 選擇「一個屬性」而不是「改 React state 等重繪」是因為前者是同步且確定的：
 * `toPng` 之後的複製與繪製全程都在屬性被拔掉的狀態下進行。
 */
const HIDDEN_ATTR = "data-values-hidden";

export const downloadNodeAsPng = async (
  node: HTMLElement,
  fileName: string,
): Promise<void> => {
  /**
   * Info: (20260908 - Julian) 往**整棵子樹**找，不是只看 `node` 自己。
   *
   * 20260907 初版寫的是 `node.hasAttribute(HIDDEN_ATTR)` —— 而兩個呼叫端
   * 傳進來的都是 `downloadRef` 那層外框 div，`PaySlip` 的根元素在它裡面。
   * 於是 `wasHidden` 永遠是 false、遮罩從來沒被拔掉，下載到的是一張
   * 整片模糊的薪資單。當時的測試只斷言「程式碼裡有 removeAttribute」，
   * 沒有驗它作用在哪個元素上 —— 機制存在，接錯了對象。
   *
   * 連 `node` 自己一起收，是因為呼叫端日後可能改成直接把 PaySlip 的根
   * 傳進來（`querySelectorAll` 不會回傳根節點自己）。
   */
  const masked = [
    ...(node.hasAttribute(HIDDEN_ATTR) ? [node] : []),
    ...Array.from(node.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}]`)),
  ];
  masked.forEach((element) => element.removeAttribute(HIDDEN_ATTR));

  let dataUrl: string;
  try {
    dataUrl = await toPng(node, {
      pixelRatio: 2,
      // Info: (20260901 - Julian) 取內容尺寸，不是可見尺寸 —— 這一行就是「圖被切斷」的解法
      width: node.scrollWidth,
      height: node.scrollHeight,
      /**
       * Info: (20260907 - Julian) 帶 `data-capture-exclude` 的節點不進圖。
       *
       * 今天只有那顆眼睛按鈕 —— 它是操作介面，不是薪資單的內容。
       * html-to-image 不會對根節點呼叫 filter，所以根元素不必自我排除。
       */
      filter: (element) =>
        !(element instanceof HTMLElement) ||
        element.dataset.captureExclude !== "true",
      style: {
        width: "100%",
        height: "auto",
        overflowY: "visible", // Info: (20250725 - Julian) 取消滾動條
        flex: "none",
      },
    });
  } finally {
    // Info: (20260907 - Julian) 截失敗也要把畫面還原成使用者原本設定的樣子
    masked.forEach((element) => element.setAttribute(HIDDEN_ATTR, "true"));
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
