"use client";

import Link from "next/link";
import pkg from "@/package";
import BrandLogoImage from "@/components/common/brand_logo_image";

export default function BrandLogo() {
  return (
    <div className="flex lg:flex-1">
      <Link
        href="/"
        className="-m-1.5 flex flex-col items-end gap-x-2 p-1.5 transition-opacity hover:opacity-80 lg:flex-row"
      >
        <span className="sr-only">iSunFA</span>
        {/**
         * Info: (20260831 - Luphia) 手機版矮一格（`h-7 sm:h-8`），而 `width` /
         * `height` 必須與 SVG 的內建比例一致（review #6731 二輪高-1）。
         *
         * 兩份 logo 的 SVG 都宣告 `width="224" height="64"`（比例 **3.5**），
         * 而這裡原本傳 `125 / 40`（比例 3.125）。`next/image` 把那兩個數字放進
         * `<img>` 屬性，UA 樣式因此是 `aspect-ratio: auto 125/40`——`auto` 表示
         * **圖片載入後以內建比例為準**，屬性只用來預留載入前的版位。後果是
         * logo 在載入瞬間從 87.5px 跳到 98px（一次版位跳動）。
         * `hr_management/hr_header.tsx` 早就寫對了（112×32）。
         *
         * **先前這段註解寫的 104 / 88 是錯的**，而錯法很有教育意義：那兩個數字
         * 是我在瀏覽器裡量的，但量在**圖片還沒載入**的狀態（`complete: false`、
         * `naturalWidth: 0`），也就是量到了屬性比例算出的預留框（28 × 3.125 =
         * 87.5 ≈ 88）。「量出來的」不等於「量對了」——量的時機也是量測方法的一部分。
         *
         * 載入後的實測（320px，等 `complete: true`）：
         *
         * | CSS 高度 | 未被壓縮時的寬 |
         * |---|---|
         * | `h-6`（24px） | 84 |
         * | `h-7`（28px） | **98** |
         * | `h-8`（32px） | **112** |
         *
         * 但 320px 下品牌區**會被壓縮**，所以實際畫出來比上表窄——完整的機制與
         * 承重項寫在 `landing_page/header.tsx` 的註解裡。
         */}
        <BrandLogoImage className="h-7 w-auto sm:h-8" width={112} height={32} />
        <span className="text-text-muted font-mono text-[10px] md:text-xs lg:mb-1.5 lg:ml-1">
          v{pkg.version}
        </span>
      </Link>
    </div>
  );
}
