// Info: (20260731 - Tzuhan) 地圖截圖的空白判定(issue 08 實測)
// Info: (20260731 - Tzuhan) 第一條路線的四張圖不只完全相同,而且整張只有一種顏色(純黑):
// Info: (20260731 - Tzuhan) 樣式尚未載入就截圖,取到從未被繪製的 WebGL 緩衝區。
// Info: (20260731 - Tzuhan) 純黑方塊被當成證據比缺圖糟得多 —— 缺圖讀者知道沒有,黑方塊會被讀成「就是這樣」。

import { describe, it, expect } from "@jest/globals";
import {
  isUniformPixelData,
  MAP_BLANK_MAX_UNIQUE_COLORS,
} from "@/lib/utils/map_capture_quality";

const fill = (rgba: number[], count: number): number[] =>
  Array.from({ length: count }, () => rgba).flat();

describe("isUniformPixelData", () => {
  it("全黑判定為空白(這正是實測抓到的畫面)", () => {
    expect(isUniformPixelData(fill([0, 0, 0, 255], 64))).toBe(true);
  });

  it("全白也是空白(底圖未繪製時亦可能為白)", () => {
    expect(isUniformPixelData(fill([255, 255, 255, 255], 64))).toBe(true);
  });

  it("真實地圖的多色畫面判定為有內容", () => {
    const pixels = Array.from({ length: 64 }, (_, i) => [
      200 + (i % 40),
      210 + (i % 30),
      220 - (i % 20),
      255,
    ]).flat();
    expect(isUniformPixelData(pixels)).toBe(false);
  });

  it("允許少量顏色以容忍抗鋸齒,但超過上限即視為有內容", () => {
    const twoColors = [
      ...fill([10, 10, 10, 255], 32),
      ...fill([11, 11, 11, 255], 32),
    ];
    expect(isUniformPixelData(twoColors)).toBe(true);
    const threeColors = [
      ...fill([10, 10, 10, 255], 20),
      ...fill([11, 11, 11, 255], 20),
      ...fill([12, 12, 12, 255], 24),
    ];
    expect(MAP_BLANK_MAX_UNIQUE_COLORS).toBe(2);
    expect(isUniformPixelData(threeColors)).toBe(false);
  });

  it("忽略 alpha 差異(WebGL 畫布的 alpha 行為跨瀏覽器不一致)", () => {
    const sameColorDifferentAlpha = [
      ...fill([120, 130, 140, 255], 32),
      ...fill([120, 130, 140, 0], 32),
    ];
    expect(isUniformPixelData(sameColorDifferentAlpha)).toBe(true);
  });

  it("資料不足時保守視為空白(不把殘缺的畫面當證據)", () => {
    expect(isUniformPixelData([])).toBe(true);
    expect(isUniformPixelData([1, 2, 3])).toBe(true);
  });
});
