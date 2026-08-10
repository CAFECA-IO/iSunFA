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
