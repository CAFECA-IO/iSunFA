"use client";

import BrandLogo from "@/components/header/brand_logo";
import HeaderNav from "@/components/header/header_nav";
import LanguageSelector from "@/components/header/language_selector";
import ThemeToggle from "@/components/header/theme_toggle";
import UserActions from "@/components/header/user_actions";

export default function Header() {
  return (
    <header className="bg-surface-raised/90 ring-border-default sticky top-0 z-50 w-full shadow-sm ring-1 backdrop-blur-xl">
      <nav
        className="flex items-center justify-between p-3 lg:px-8"
        aria-label="Global"
      >
        <BrandLogo />
        {/**
         * Info: (20260831 - Luphia) 手機版的間距要小得多，否則右側這一排
         *（選單、主題、語言、登入）擠不進 320px——而擠壓的代價會落在最後那個
         * 能被壓縮的元素上（先前是登入按鈕被壓成一個圓）。
         *
         * **這張表在 08-27 那一版是錯的**（review #6731 二輪高-1）：那時的品牌區
         * 數字（104 / 88）量在圖片還沒載入的狀態，量到的是屬性比例算出的預留框。
         * 下面是等 `complete: true` 之後重量的。
         *
         * 320px 下**未被壓縮時**的需求：
         *
         * | 項目 | 未修（`h-8` / `gap-x-6`） | 現狀（`h-7` / `gap-x-1.5`） |
         * |---|---|---|
         * | 可用寬度（320 − `p-3` 24） | 296 | 296 |
         * | 品牌區（logo 寬 = 高 × 3.5） | 112 | 98 |
         * | 四個控件（選單／主題／語言／登入） | 188 | 188 |
         * | 三個間距 | 72 | 18 |
         * | **合計需要** | **372** | **304** |
         *
         * **304 > 296，而頁面仍然不溢出**——這是這個版面最需要知道的一件事：
         * 品牌區不是 `shrink-0`，所以它是唯一能被壓的那一項，而 Tailwind
         * preflight 的 `img { max-width: 100% }` 讓圖跟著縮。那 8px 赤字由
         * **logo 變小**吸收（實測畫出來的框是 95.42px，不是 98），不是由捲動表達。
         * 品牌區的下限是版號文字（`v0.12.0+xxx`），不是 logo。
         *
         * 承重的是哪幾項——**只改一項回原狀**的實測（3×3 全矩陣）：
         *
         * | logo | `gap-x-1.5` | `gap-x-3` | `gap-x-6` |
         * |---|---|---|---|
         * | `h-6` | 320 ✓ | **320 ✓** | 338 ✗ |
         * | `h-7` | **320 ✓（現狀）** | 322 ✗ | 338 ✗ |
         * | `h-8` | 322 ✗ | 322 ✗ | 338 ✗ |
         *
         * 也就是**間距與 logo 高度兩項都承重**（各自改回去都會溢出 2px），而
         * 登入按鈕的 `px-4` **不承重**——改回 `px-5` 實測仍是 320（logo 多壓
         * 2.4px 吸收掉）。08-27 那版註解說「三處各讓一步，少任何一處都還是會
         * 溢出」，對前兩項是真的，對 `px-4` 是錯的。
         *
         * **`gap-x-1.5`（6px）是產品決定的**（20260831）：四個控件都留在列上，
         * 不把語言或主題收進選單。已知的代價是 320px 下 6px 的誤觸間距，而誤觸
         * 的後果是切換語言或主題（都可逆、沒有破壞性）；不違反 WCAG 2.5.8
         *（那條管目標尺寸 24×24 而不是間距，四個控件本身都達標）。
         *
         * 真實的替代方案不是「6px 或整頁捲動」，而是上表那個矩陣：想要 12px 的
         * 間距，代價是 logo 降到 `h-6`（畫出來從 95.4px 縮到 80.7px）。那是一個
         * 可以再談的取捨，但它是**間距與 logo 大小的滑桿**，不是安全與否的問題。
         */}
        <div className="flex items-center gap-x-1.5 sm:gap-x-6 lg:gap-x-8">
          <HeaderNav />
          <ThemeToggle />
          <LanguageSelector />
          <UserActions />
        </div>
      </nav>
    </header>
  );
}
