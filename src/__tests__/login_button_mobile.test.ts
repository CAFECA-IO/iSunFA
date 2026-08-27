import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Info: (20260827 - Luphia) 手機版的登入按鈕被壓成一個圓（2026-08-27 回報）。
 *
 * 症狀：按鈕變成一個圓形，「登入」兩字上下疊著。
 *
 * 成因是 CSS 的一個組合，而每一半單獨看都很正常：
 *
 * 1. `UserActions` 未登入時**直接**回傳這顆按鈕，所以它是 header 右側 flex
 *    群組的直接子項。
 * 2. 中文**每一個字之間都是合法斷點**，因此 flex 算出的 min-content 只有一個字
 *    的寬度。空間不足時按鈕被壓到一個字寬，而 `rounded-full` 讓那個結果成為
 *    一個圓。
 *
 * 為什麼 review 不容易抓到：**英文介面完全正常**（"Login" 是一個不可斷的詞），
 * 而 desktop 也完全正常（空間夠，不會觸發壓縮）。
 */
describe("手機版的登入按鈕不會被壓成一個圓", () => {
  const button = readFileSync(
    join(process.cwd(), "src", "components", "common", "login_button.tsx"),
    "utf8",
  );
  const header = readFileSync(
    join(process.cwd(), "src", "components", "landing_page", "header.tsx"),
    "utf8",
  );

  /**
   * Info: (20260827 - Luphia) 只取 `className` 那一段，不對整個檔案斷言。
   *
   * 上面那幾段註解本身就寫著 `whitespace-nowrap` 與 `gap-x-6`——對整個檔案做
   * 「不包含」斷言時，**解釋為什麼不用它的那句話會讓斷言失敗**。
   * 這個坑寫這一組測試時當場踩到了。
   */
  const classOf = (source: string): string => {
    const at = source.indexOf('className="');
    expect(at).toBeGreaterThan(-1);
    const start = at + 'className="'.length;
    return source.slice(start, source.indexOf('"', start));
  };
  const buttonClass = classOf(button);
  const headerGroupClass = (() => {
    // Info: (20260827 - Luphia) 錨在 `gap-x-`：只寫 `flex items-center` 會抓到 nav
    const at = header.indexOf('className="flex items-center gap-x-');
    expect(at).toBeGreaterThan(-1);
    const start = at + 'className="'.length;
    return header.slice(start, header.indexOf('"', start));
  })();

  /**
   * Info: (20260827 - Luphia) `shrink-0` 是這顆按鈕維持形狀的**全部依據**。
   * 拿掉它，中文介面的手機版就會回到圓形。
   */
  it("按鈕不可被 flex 壓縮", () => {
    expect(buttonClass).toContain("shrink-0");
  });

  /**
   * Info: (20260827 - Luphia) 刻意**不加** `whitespace-nowrap`：實測 `shrink-0`
   * 已經足夠保住形狀，而這顆按鈕有 7 個使用端，其中幾個傳的是長標籤
   *（`analysis.login_to_generate`、"Please login to comment"）——那些地方在窄
   * 容器裡需要換行，禁止換行只會把裁切換成溢出。
   */
  it("不禁止換行（長標籤的使用端需要換行）", () => {
    expect(buttonClass).not.toContain("whitespace-nowrap");
  });

  /**
   * Info: (20260827 - Luphia) 手機版的內距要小一格。320px 下 header 右側那一排
   * 差 14px 才擠得進去，而差額必須有地方吸收。
   */
  it("手機版的水平內距小一格", () => {
    expect(buttonClass).toContain("px-4");
    expect(buttonClass).toContain("sm:px-5");
  });

  /**
   * Info: (20260827 - Luphia) header 右側群組的間距在手機版必須遠小於
   * `gap-x-6`：那是 24px × 4 個間距 = 96px，而 320px 下整排只有 10px 可用。
   * 這一條擋住「順手改回統一間距」。
   */
  /**
   * Info: (20260827 - Luphia) 品牌 logo 在手機版矮一格。
   *
   * 這是三處讓步裡最後補上的一處：光靠縮間距與按鈕內距，320px 下仍差 14px。
   * `w-auto` 表示寬度由高度與原始比例決定，所以 `h-8`→`h-7` 就是把品牌區
   * 從 104px 降到 88px。
   */
  it("logo 手機版矮一格，桌機不變", () => {
    const brand = readFileSync(
      join(process.cwd(), "src", "components", "header", "brand_logo.tsx"),
      "utf8",
    );
    const at = brand.indexOf("<BrandLogoImage");
    expect(at).toBeGreaterThan(-1);
    const tag = brand.slice(at, brand.indexOf("/>", at));
    expect(tag).toContain("h-7");
    expect(tag).toContain("sm:h-8");
    // Info: (20260827 - Luphia) w-auto 是「改高度就是改寬度」的依據
    expect(tag).toContain("w-auto");
  });

  it("header 右側群組的手機間距遠小於桌機", () => {
    expect(headerGroupClass).toMatch(/gap-x-(1|1\.5|2)\s/);
    expect(headerGroupClass).toContain("sm:gap-x-6");
  });
});
