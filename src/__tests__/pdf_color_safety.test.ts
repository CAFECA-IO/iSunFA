import { describe, it, expect } from "@jest/globals";
import {
  createColorConverter,
  createColorSafeComputedStyle,
  rewriteColorValue,
} from "@/lib/utils/pdf_color_safety";

/**
 * Info: (20260810 - Emily) jsdom 沒有真的 canvas,故以替身驗證邏輯:
 * 「哪些值該被換掉」「換不掉時怎麼辦」「還原的時機」。
 *
 * 顏色換算本身是瀏覽器的解析器在做,測不了也不該測 ——
 * 那部分由 tools/pdf_harness/proxy.mjs 在真實 Chromium 驗證
 * (既有攔截 → rgb(17,24,39);換算 → rgb(249,250,251))。
 */
const buildContext = (
  rgba: [number, number, number, number],
  accepts = true,
) => {
  let fillStyle = "#000000";
  const context = {
    clearRect: () => undefined,
    fillRect: () => undefined,
    getImageData: () => ({ data: Uint8ClampedArray.from(rgba) }),
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(value: string) {
      // Info: (20260810 - Emily) 模擬 canvas 的行為:無效輸入靜默保留原值
      if (accepts || value.startsWith("#")) fillStyle = value;
    },
  };
  return context as unknown as CanvasRenderingContext2D;
};

describe("createColorConverter", () => {
  it("should convert an unsupported color function into rgba", () => {
    const convert = createColorConverter(buildContext([249, 250, 251, 255]));
    expect(convert("oklch(0.985 0.002 247.839)")).toBe(
      "rgba(249, 250, 251, 1.000)",
    );
  });

  /**
   * Info: (20260810 - Emily) 換不掉就原值回傳。
   * 既有做法在這裡回 rgb(17, 24, 39),把整片淺色底塗成近黑 ——
   * 換成錯的顏色比不換更糟:不換會拋錯(看得見),塗黑不會(看不見)。
   */
  it("should keep the original value when the browser rejects it", () => {
    const convert = createColorConverter(
      buildContext([17, 24, 39, 255], false),
    );
    expect(convert("oklch(not-a-color)")).toBe("oklch(not-a-color)");
  });

  it("should return the value untouched when there is no canvas context", () => {
    const convert = createColorConverter(null);
    expect(convert("oklch(0.5 0.1 200)")).toBe("oklch(0.5 0.1 200)");
  });

  /**
   * Info: (20260811 - Luphia) 釘住「為什麼要兩個哨兵」。
   *
   * `fillStyle` 對無效輸入是靜默保留原值,所以判定「瀏覽器接受了嗎」只能靠
   * 「設定後的值有沒有變」。單一哨兵無法區分「輸入無效」與「輸入剛好等於哨兵」,
   * 後者會被誤判成無效而原值退回。
   *
   * 這條契約是這支函式自己宣告的(「把**任意** CSS 顏色換成等值的 rgba()」)——
   * 目前唯一的呼叫端有 UNSUPPORTED_COLOR_PATTERN 擋在前面,碰不到這個輸入,
   * 但那是呼叫端的性質,不是這支函式的。少了這支測試,拿掉第二個哨兵不會有任何測試變紅。
   */
  it("should still convert a value that collides with the probe sentinel", () => {
    const convert = createColorConverter(buildContext([1, 2, 3, 255]));
    expect(convert("#010203")).toBe("rgba(1, 2, 3, 1.000)");
  });
});

describe("rewriteColorValue", () => {
  const convert = (value: string) => `rgb(1, 2, 3)/*${value.slice(0, 4)}*/`;

  it("should leave already-parseable colors alone", () => {
    expect(rewriteColorValue("color", "rgb(249, 250, 251)", convert)).toBe(
      "rgb(249, 250, 251)",
    );
    expect(rewriteColorValue("background-color", "#111827", convert)).toBe(
      "#111827",
    );
  });

  /**
   * Info: (20260810 - Emily) 一個值可能含多個顏色(border-color 三段、漸層多段),
   * 逐段換而不是整串換。
   */
  it("should rewrite every color function in a multi-value property", () => {
    const rewritten = rewriteColorValue(
      "border-color",
      "oklch(0.5 0.1 20) rgb(0, 0, 0) oklab(0.6 0.1 0.1)",
      () => "rgb(9, 9, 9)",
    );
    expect(rewritten).toBe("rgb(9, 9, 9) rgb(0, 0, 0) rgb(9, 9, 9)");
  });

  it("should handle one level of nesting inside color-mix", () => {
    expect(
      rewriteColorValue(
        "background-color",
        "color-mix(in oklab, oklch(0.9 0 0) 5%, transparent)",
        () => "rgba(255, 255, 255, 0.051)",
      ),
    ).toBe("rgba(255, 255, 255, 0.051)");
  });

  /**
   * Info: (20260811 - Luphia) `color()` 也要換 —— 它是這組 pattern 的覆蓋漏洞。
   *
   * 舊版的 blanket check 含 `includes("color(")`,所以 `color(display-p3 …)`
   * 至少被塗黑(錯的顏色但不炸);改成具名 pattern 時漏掉它,就變成直接放行,
   * 而 html2canvas 1.4.1 一樣解析不了 —— 結果從「顏色錯」變成「整份匯出失敗」。
   * Chrome 認得這個語法,所以它是換算得出來的,漏的只是一個 token。
   */
  it("should rewrite color() as well", () => {
    expect(
      rewriteColorValue(
        "background-color",
        "color(display-p3 1 0.5 0)",
        () => "rgb(255, 122, 0)",
      ),
    ).toBe("rgb(255, 122, 0)");
  });

  /**
   * Info: (20260811 - Luphia) 巢狀超過一層時回原值,而不是換到一半的字串。
   *
   * pattern 只容許一層巢狀,兩層時只有內層會被換掉。兩種寫法最後都會讓
   * html2canvas 拋錯,差別在留給讀 log 的人什麼:半成品看起來像換算失敗,
   * 原值看起來像「這個寫法我們不支援」—— 後者才是實際發生的事。
   */
  it("should keep the original value when nesting is deeper than one level", () => {
    const value =
      "color-mix(in oklab, color-mix(in oklab, oklch(0.9 0 0) 50%, transparent) 5%, transparent)";
    expect(
      rewriteColorValue("background-color", value, () => "rgb(9, 9, 9)"),
    ).toBe(value);
  });

  /**
   * Info: (20260810 - Emily) `linear-gradient(in oklab, ...)` 的插值關鍵字不是函式呼叫,
   * 換不掉。陰影與圖片少了不影響判讀,才退回 none;一般顏色寧可原值拋錯。
   */
  it("should drop only shadows and images that stay unparseable", () => {
    const gradient = "linear-gradient(in oklab, red, blue)";
    expect(rewriteColorValue("background-image", gradient, convert)).toBe(
      "none",
    );
    expect(rewriteColorValue("box-shadow", "0 0 4px oklab-ish", convert)).toBe(
      "none",
    );
    expect(rewriteColorValue("color", "oklab-ish", convert)).toBe("oklab-ish");
  });
});

describe("createColorSafeComputedStyle", () => {
  const buildDeclaration = (values: Record<string, string>) =>
    ({
      ...values,
      getPropertyValue: (name: string) => values[name] ?? "",
      item: (index: number) => Object.keys(values)[index] ?? "",
    }) as unknown as CSSStyleDeclaration;

  it("should rewrite both property access and getPropertyValue", () => {
    const safe = createColorSafeComputedStyle(
      () =>
        buildDeclaration({
          backgroundColor: "oklch(0.985 0.002 247.839)",
          "background-color": "oklch(0.985 0.002 247.839)",
          color: "rgb(17, 24, 39)",
        }),
      () => "rgba(249, 250, 251, 1.000)",
    );
    const styles = safe({} as Element);
    expect(styles.backgroundColor).toBe("rgba(249, 250, 251, 1.000)");
    expect(styles.getPropertyValue("background-color")).toBe(
      "rgba(249, 250, 251, 1.000)",
    );
    expect(styles.color).toBe("rgb(17, 24, 39)");
  });

  it("should keep other methods callable", () => {
    const safe = createColorSafeComputedStyle(
      () => buildDeclaration({ color: "rgb(0, 0, 0)" }),
      (value) => value,
    );
    expect(safe({} as Element).item(0)).toBe("color");
  });

  it("should pass the pseudo-element through", () => {
    const seen: Array<string | null | undefined> = [];
    const safe = createColorSafeComputedStyle(
      (element, pseudoElement) => {
        seen.push(pseudoElement);
        return buildDeclaration({ color: "rgb(0, 0, 0)" });
      },
      (value) => value,
    );
    safe({} as Element, "::before");
    expect(seen).toEqual(["::before"]);
  });
});
