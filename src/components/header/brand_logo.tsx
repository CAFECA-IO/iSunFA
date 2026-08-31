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
         * Info: (20260827 - Luphia) 手機版矮一格（`h-7 sm:h-8`）。
         *
         * 這不是美術偏好，是量出來的：320px 下 header 可用寬度 296px，而品牌區
         * 104px（**這張圖本身**，版號文字比它窄）＋ 右側四個控件 188px ＋ 間距
         * 18px ＝ 310px。差的 14px 只有三個地方能出——縮圖、拿掉一個控件、
         * 或讓整頁水平捲動。`h-8`→`h-7` 讓圖寬從 **104px 降到 88px**——兩個都是
         * 在瀏覽器裡量的（量的是這張圖的 border box，版號文字比它窄、不決定寬度）。
         * 按比例算會得到 91（32→28 是 ×0.875），而實際渲染是 88；
         * **以量到的為準**。剛好把差額補上（見 `landing_page/header.tsx` 與
         * `common/login_button.tsx` 的註解，那兩處吸收了另外的 56px）。
         *
         * `w-auto` 表示寬度由高度與原始比例決定，所以改高度就是改寬度。
         */}
        <BrandLogoImage className="h-7 w-auto sm:h-8" width={125} height={40} />
        <span className="text-text-muted font-mono text-[10px] md:text-xs lg:mb-1.5 lg:ml-1">
          v{pkg.version}
        </span>
      </Link>
    </div>
  );
}
