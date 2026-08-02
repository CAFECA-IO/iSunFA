"use client";

/**
 * Info: (20260802 - Luphia) 會跟著主題換檔的 iSunFA logo。
 *
 * 兩份檔的差別只有字標填色 —— `isunfa_logo_color.svg` 是深藍 #1A2E50，
 * `isunfa_logo.svg` 是白色，太陽圖形的漸層兩者相同（連 gradient id 都一樣）。
 * 白色那份原本就存在，用於 PDF 版面的深色頁首，不是為了深色模式新做的。
 *
 * 抽成元件而非在各處複製兩個 <Image>：知道「有兩份檔、哪份配哪個主題」
 * 的地方只能有一個，否則日後換 logo 一定會漏掉其中一處，
 * 而漏掉的症狀是深色底上一個看不見的字標 —— 淺色模式下完全正常，很難發現。
 *
 * **底色不隨主題變的地方不要用這個元件。** 例如 A4 紙張預覽的深色頁首，
 * 那裡永遠是深底，應該直接指定白色版。
 */

import Image from "next/image";

const LOGO_SRC_LIGHT = "/isunfa_logo_color.svg";
const LOGO_SRC_DARK = "/isunfa_logo.svg";

export interface IBrandLogoImageProps {
  /** Info: (20260802 - Luphia) 兩份共用的尺寸 class，例如 `h-8 w-auto` */
  className: string;
  width: number;
  height: number;
  /**
   * Info: (20260802 - Luphia) 預設空字串。呼叫端通常已另有 `sr-only` 的品牌名，
   * 兩者都給會讓讀屏軟體把「iSunFA」唸兩次。
   */
  alt?: string;
}

export default function BrandLogoImage({
  className,
  width,
  height,
  alt = "",
}: IBrandLogoImageProps) {
  /**
   * Info: (20260802 - Luphia) 以兩個 <img> 互斥顯示切換，而非用 JS 換 src。
   *
   * 換 src 要等 JS 執行，第一幀會出現看不見的字標；用 CSS 則在
   * 樣式解析當下就決定，且「跟隨系統」那一態也自動涵蓋
   * （`dark:` 變體有 class 與 prefers-color-scheme 兩條路徑）。
   *
   * 代價是兩份檔案都會被下載，各約 5KB。刻意不加 `priority`：
   * 那會讓兩份都進 preload，其中一份永遠用不到，
   * 瀏覽器會在正式環境的 console 留下「preloaded but not used」警告。
   * logo 是文件開頭的 <img>，preload scanner 本來就會立刻抓到。
   *
   * `unoptimized` 是因為 SVG 本來就沒有可最佳化的空間，
   * 讓它繞過 `/_next/image` 少一次伺服器往返。原本 desk_board 那一處
   * 就是這樣寫的，此處統一。
   */
  return (
    <>
      <Image
        className={`${className} dark:hidden`}
        src={LOGO_SRC_LIGHT}
        alt={alt}
        width={width}
        height={height}
        unoptimized
      />
      <Image
        className={`${className} hidden dark:block`}
        src={LOGO_SRC_DARK}
        alt={alt}
        width={width}
        height={height}
        unoptimized
      />
    </>
  );
}
