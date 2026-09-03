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
export const downloadNodeAsPng = async (
  node: HTMLElement,
  fileName: string,
): Promise<void> => {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    // Info: (20260901 - Julian) 取內容尺寸，不是可見尺寸 —— 這一行就是「圖被切斷」的解法
    width: node.scrollWidth,
    height: node.scrollHeight,
    style: {
      width: "100%",
      height: "auto",
      overflowY: "visible", // Info: (20250725 - Julian) 取消滾動條
      flex: "none",
    },
  });

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
