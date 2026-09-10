"use client";

import { FC } from "react";

interface ISendingAnimationProps {
  /** Info: (20260908 - Julian) 邊長（px）。SVG 的 viewBox 是 200×200，等比縮放 */
  size?: number;
}

/**
 * Info: (20260908 - Julian) 寄送薪資單時的載入動畫（信封飛出）。
 *
 * 資產：`public/anim/mailbox-animation.svg`（3 秒循環：紙張入袋 → 封口閉合 → 飛出）。
 *
 * ## 為什麼用 `<img>` 而不是把 SVG 內嵌成元件
 *
 * 那份 SVG 用自己的 `<style>` 定義動畫，而裡面的 class 名稱是
 * `.paper`、`.mail-group`、`.speed-line`、`.envelope-flap-front`。
 *
 * **內嵌 SVG 的 `<style>` 是文件層級的，不是元件層級的** —— 一旦內嵌，
 * `.paper` 就會套到整個頁面上任何叫這個名字的元素，而 `.paper` 是一個
 * 極容易撞名的類別。撞到的症狀是「某個不相關的區塊突然變成白色、還會動」，
 * 而它只在這個彈窗開過之後才出現（style 進了 DOM 就留著），
 * 於是幾乎不可能被聯想到這裡。
 *
 * 走 `<img>` 的話那份 style 留在 SVG 自己的文件裡，撞不到任何東西。
 * 順帶也不進 JS bundle（那個檔含 C2PA 出處後設資料，11 KB）。
 *
 * 全 repo 唯一另一個手寫 `<img>` 的地方是 `common/file_preview.tsx`
 * （`brand_logo_image.tsx` / `report_layout.tsx` / `brand_logo.tsx` 用的都是
 * `next/image` 的 `<Image>` —— 它們註解裡提到的 `<img>` 指的是產出的 DOM，
 * 不是自己寫的標籤）。
 *
 * ## 為什麼不是 `next/image`
 *
 * eslint 的 `@next/next/no-img-element` 會對這一行出 **warning**（不是 error），
 * 而那條規則講的是 LCP 與頻寬 —— 兩者在這裡都不適用：這張圖固定 160px、
 * 只在寄送中的那幾秒出現，而且 SVG 沒有 `next/image` 能做的那種最佳化
 * （縮圖、格式轉換），它還需要 `images.dangerouslyAllowSVG` 才載得動。
 *
 * **加 `eslint-disable`**，因為 `file_preview.tsx` 那個唯一的先例就是這樣寫的 ——
 * 這條規則在本 repo 的處置是「用註解說明為什麼，不是留一個 warning 在那裡」。
 * 加了之後 `npx eslint src` 是 0 error / 0 warning。
 *
 * ## 為什麼 `alt=""`
 *
 * 兩個使用它的彈窗都在動畫旁邊有一行看得見的「寄送中…」，
 * 而按鈕上也寫著同一句話。這張圖沒有多說任何事情 —— 它是裝飾。
 * 給它 `alt="寄送中"` 會讓螢幕閱讀器把同一句話唸兩到三次。
 *
 * （SVG 內部有 `role="img"` 與 `<title>寄送中</title>`，但透過 `<img>` 載入時
 * 那些不會暴露給輔助技術，所以無障礙名稱只能來自周圍的文字 —— 而那正好已經有了。）
 *
 * ## 減少動態偏好
 *
 * **由 SVG 自己處理** —— 那個檔案裡有 `@media (prefers-reduced-motion: reduce)`，
 * 會把動畫停在信封閉合的靜止狀態。這裡不重複實作，也不要在元件層再加一層判斷：
 * 兩處各判斷一次，遲早只有一處被改到。
 */
const SendingAnimation: FC<ISendingAnimationProps> = ({ size = 160 }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src="/anim/mailbox-animation.svg"
    alt=""
    width={size}
    height={size}
    className="shrink-0 select-none"
    draggable={false}
  />
);

export default SendingAnimation;
